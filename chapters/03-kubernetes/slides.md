---
layout: chapter-title
chapter: "03"
title: "Kubernetes"
subtitle: "Orchestrating containers at scale"
---

<!--
Chapter 3: Kubernetes — ~90 minutes including labs.
We move from running individual containers to declaring desired state
and letting Kubernetes reconcile the cluster toward it.
-->

---

## What We'll Cover

<v-clicks>

- Kubernetes architecture — control plane and worker nodes
- Pods, Deployments, and ReplicaSets
- Services and Ingress — network exposure
- ConfigMaps and Secrets — externalizing configuration
- Persistent storage basics

</v-clicks>

<!--
Key mental model shift: stop thinking "run a container", start thinking "declare desired state".
The scheduler, controller, and kubelet handle the rest.
-->

---
layout: section
---

# Architecture

---

## Control Plane and Worker Nodes

<div class="grid grid-cols-2 gap-6">
<div>

**Control Plane**
- `kube-apiserver` — all requests go here
- `etcd` — cluster state store (Raft consensus)
- `kube-scheduler` — assigns pods to nodes
- `kube-controller-manager` — reconciliation loops

</div>
<div>

**Worker Node**
- `kubelet` — ensures pods run as declared
- `kube-proxy` — iptables/nftables for Service IPs
- Container runtime (CRI-O, containerd)

</div>
</div>

<!--
Everything in Kubernetes is a reconciliation loop: desired state vs actual state.
The controller watches etcd via the apiserver and drives actual state toward desired.
-->

---
layout: two-cols-code
---

## The Pod: The Smallest Deployable Unit

A Pod wraps one or more containers that share:
- The same network namespace (same IP)
- The same PID namespace (optional)
- Volumes mounted at the same path

A Pod is **ephemeral** — don't store state in it.

::right::

```yaml {all|1-3|5-10|12-17}
apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 8080

  - name: log-shipper
    image: fluent/fluent-bit:2.2
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
```

<!--
The sidecar pattern: two containers in one Pod. log-shipper reads nginx's logs
from the shared volume. They communicate via localhost since they share the network ns.
-->

---
layout: two-cols-code
---

## Deployments Manage Pod Replicas

A Deployment declares:
- Which Pod template to run
- How many replicas
- How to roll out updates (strategy)

The ReplicaSet controller keeps the replica count correct.

::right::

```yaml {1-3|5-11|13-22}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            memory: 256Mi
```

<!--
Always set resource requests and limits. Without requests, the scheduler can't make good placement decisions.
Without limits, a runaway container can starve other pods on the node.
-->

---
layout: lab-exercise
lab: "3.1"
title: "Deploy and Scale an Application"
duration: "20 min"
---

## Objectives

1. Apply a Deployment manifest with `kubectl`
2. Scale the Deployment and observe rolling update
3. Simulate a pod failure and watch self-healing

## Steps

```bash
# Apply the Deployment
kubectl apply -f https://raw.githubusercontent.com/your-repo/workshop/main/manifests/web-deployment.yaml

# Watch rollout
kubectl rollout status deployment/web

# Scale up
kubectl scale deployment/web --replicas=5
kubectl get pods -w

# Update the image (triggers rolling update)
kubectl set image deployment/web nginx=nginx:1.26
kubectl rollout status deployment/web

# Delete a pod — watch it get replaced
POD=$(kubectl get pods -l app=web -o name | head -1)
kubectl delete $POD
kubectl get pods -w

# Check rollout history
kubectl rollout history deployment/web
```

<!--
FACILITATOR NOTE:
- Expected: after delete, a new pod starts within seconds (self-healing)
- Show that the Deployment keeps 3+ pods running during the rolling update
- Common issue: image pull failure — check imagePullPolicy and registry access
-->

---
layout: section
---

# Services and Ingress

---

## Services: Stable Network Identity for Pods

Pods come and go. A Service provides a stable virtual IP (ClusterIP) that:

<v-clicks>

- Always resolves to healthy pods via label selectors
- Load-balances across all matching pods (round-robin)
- Is accessible by DNS name within the cluster: `web.default.svc.cluster.local`

</v-clicks>

---
layout: two-cols-code
---

## Service Types

| Type | Accessible from |
|------|----------------|
| ClusterIP | Inside cluster only |
| NodePort | Node IP + high port |
| LoadBalancer | Cloud LB (external IP) |

::right::

```yaml {1-4|6-14|16-21}
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  rules:
  - host: web.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

<!--
NodePort range: 30000–32767. LoadBalancer only works with a cloud provider or MetalLB.
In OpenShift, you'll use Routes instead of Ingress — same concept, different resource.
-->

---
layout: section
---

# Configuration and Secrets

---
layout: two-cols-code
---

## ConfigMaps and Secrets

Separate configuration from the container image.
ConfigMaps for non-sensitive data; Secrets for credentials.

- Both can be mounted as files or injected as env vars
- Secrets are base64-encoded at rest (not encrypted by default — use etcd encryption)

::right::

```yaml {1-9|11-20}
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: "info"
  DB_HOST: "postgres.default.svc"
  nginx.conf: |
    server { listen 8080; }

---
apiVersion: v1
kind: Secret
metadata:
  name: db-creds
type: Opaque
stringData:
  username: appuser
  password: changeme
```

<!--
stringData is a write-only convenience field — Kubernetes base64-encodes it for you.
Warn: Secrets are not encrypted by default in etcd. Use sealed-secrets or Vault for production.
-->

---
layout: lab-exercise
lab: "3.2"
title: "Externalize Configuration"
duration: "20 min"
---

## Objectives

1. Create a ConfigMap and mount it as environment variables
2. Create a Secret and mount it as a file
3. Update the ConfigMap and observe the pod picking up the change

## Steps

```bash
# Create the ConfigMap
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=debug \
  --from-literal=APP_PORT=8080

# Create the Secret
kubectl create secret generic db-creds \
  --from-literal=username=appuser \
  --from-literal=password=workshop123

# Apply a Deployment that uses both
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: configured-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: configured-app
  template:
    metadata:
      labels:
        app: configured-app
    spec:
      containers:
      - name: app
        image: ubi9/ubi-minimal
        command: ["/bin/bash", "-c", "env && sleep 3600"]
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: db-creds
EOF

# Verify environment variables inside the pod
kubectl exec -it deploy/configured-app -- env | grep -E "LOG|APP|username"
```

<!--
FACILITATOR NOTE:
- Expected: all four env vars visible inside the pod
- Note: ConfigMap changes don't automatically restart pods using envFrom — they need a rollout
- Volumes (not envFrom) do get updated automatically when ConfigMap changes
-->

---
layout: center
---

## Chapter 3 Summary

<v-clicks>

- Kubernetes reconciles desired state (YAML) with actual cluster state
- Pods are ephemeral; Deployments manage replicas and rolling updates
- Services provide stable DNS and load-balancing across pods
- ConfigMaps and Secrets decouple configuration from container images

</v-clicks>

<div class="mt-8">
  <ProgressBar :current="3" :total="4" />
</div>

<!--
Final break before Chapter 4: OpenShift builds on Kubernetes and adds
developer workflows, integrated builds, and enterprise security features.
-->
