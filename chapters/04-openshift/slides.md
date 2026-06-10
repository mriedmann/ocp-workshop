---
layout: chapter-title
chapter: "04"
heading: "OpenShift"
subtitle: "Enterprise Kubernetes with integrated developer workflows"
---

<!--
Chapter 4: OpenShift — ~90 minutes including labs.
OpenShift is Red Hat's Kubernetes distribution. Everything from Chapters 1–3 still applies.
OCP adds: Routes, BuildConfigs, ImageStreams, SCCs, and the `oc` CLI.
-->

---

## What We'll Cover

<v-clicks>

- OpenShift vs upstream Kubernetes — what's added
- Routes — exposing applications with TLS
- Source-to-Image (S2I) and BuildConfigs
- Security Context Constraints (SCCs)
- The `oc` CLI and the web console

</v-clicks>

<!--
OCP 4.x is built on top of Kubernetes. Every `kubectl` command works — `oc` is a superset.
The additions are about making the platform production-ready for enterprises:
integrated builds, RBAC, security policies, and observability.
-->

---
layout: section
---

# OpenShift vs Kubernetes

---

## What OpenShift Adds

<div class="grid grid-cols-2 gap-6">
<div>

**Developer workflow**
- `BuildConfig` — in-cluster image builds
- `ImageStream` — image versioning and triggers
- Source-to-Image (S2I) — build without Dockerfile
- `DeploymentConfig` — extended rollout controls

</div>
<div>

**Operations & security**
- `Route` — HAProxy-based ingress with TLS
- Security Context Constraints (SCCs)
- OAuth server (built-in IdP)
- Integrated monitoring (Prometheus + Alertmanager)
- Cluster Operators — self-managing components

</div>
</div>

<!--
OCP 4.14 aligns closely with Kubernetes 1.27. Most upstream resources work unchanged.
The main gotcha: the default SCC (restricted-v2) blocks root containers and host paths.
-->

---
layout: section
---

# Routes

---

## Routes: OCP's Ingress

A Route exposes a Service externally via the HAProxy-based Router:

<v-clicks>

- Automatic DNS via the wildcard subdomain (`*.apps.<cluster>`)
- TLS termination: edge, passthrough, or re-encrypt
- Created automatically with `oc expose svc`
- Replaces the need for Ingress in most OCP workflows

</v-clicks>

---
layout: two-cols-code
---

## Creating a Route

```bash
# From an existing Service
oc expose svc/web
```

Or declaratively in YAML:

::right::

```yaml {all|1-3|5-8|10-16}
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: web
spec:
  host: web.apps.cluster.example.com
  to:
    kind: Service
    name: web
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
  port:
    targetPort: 8080
```

<!--
Edge TLS: HAProxy decrypts traffic, forwards plain HTTP to the pod.
Re-encrypt: HAProxy re-encrypts to the pod — use when the pod must not see plain traffic.
Passthrough: TLS goes straight to the pod — HAProxy can't inspect or modify.
-->

---
layout: section
---

# Source-to-Image (S2I) and BuildConfigs

---

## Build Inside the Cluster

OCP can build your container images without a Dockerfile:

<v-clicks>

- **Source-to-Image (S2I)**: point at a Git repo, OCP detects the runtime and builds
- **BuildConfig**: Kubernetes resource that defines the build inputs, strategy, and output
- **ImageStream**: tracks image versions; triggers Deployments on new pushes
- Builds run as unprivileged Pods inside the cluster (no Docker socket)

</v-clicks>

<!--
S2I was designed so developers don't need to understand containers at all.
They push code; the platform builds and deploys. For SREs, the BuildConfig is what you'll debug.
-->

---
layout: two-cols-code
---

## Creating a Build from Source

`oc new-app` is the fastest way to go from Git to running pod:

::right::

```bash {1-4|6-10|12-14}
# Auto-detect language and build
oc new-app \
  https://github.com/sclorg/django-ex.git \
  --name myapp

# Follow the build log
oc logs -f bc/myapp

# Watch the deployment
oc rollout status deploy/myapp

# Expose it
oc expose svc/myapp
oc get route myapp
```

<!--
oc new-app detects Python/Django via the repo content and uses the python S2I builder.
It creates: BuildConfig, ImageStream, Deployment, Service — all wired together.
-->

---
layout: lab-exercise
lab: "4.1"
heading: "Deploy an App from Source"
duration: "20 min"
---

## Objectives

1. Use `oc new-app` to build and deploy from a Git repository
2. Expose the application via a Route with TLS
3. Trigger a rebuild and observe the rolling update

## Steps

```bash
# Log in to the cluster (credentials from your lab sheet)
oc login https://api.cluster.example.com:6443 -u developer -p workshop

# Create a new project
oc new-project lab41-$(whoami)

# Deploy from source
oc new-app \
  registry.access.redhat.com/ubi9/python-39~https://github.com/sclorg/django-ex.git \
  --name workshop-app

# Watch the build
oc logs -f bc/workshop-app

# Expose with TLS
oc create route edge --service=workshop-app --insecure-policy=Redirect

# Get the URL and test
URL=$(oc get route workshop-app -o jsonpath='{.spec.host}')
curl -L https://$URL

# Trigger a rebuild (e.g., after a code change)
oc start-build workshop-app --follow
```

<!--
FACILITATOR NOTE:
- Expected: app is accessible at https://workshop-app-<project>.apps.<cluster>
- Common issue: build fails due to Git network access — check cluster proxy settings
- Show oc get all to see all created resources at once
- If build succeeds but deploy fails: check oc describe pod for SCC violations
-->

---
layout: section
---

# Security Context Constraints

---

## SCCs: OCP's Pod Security Policy

SCCs define what a pod is **allowed to do** on the node:

<v-clicks>

- Which UIDs a container can run as
- Whether it can mount host paths
- Whether it can use privileged mode
- Which Linux capabilities it can add

</v-clicks>

<TipBox type="warning" title="Default SCC: restricted-v2">
  On OCP 4.11+, the default SCC runs containers as a random non-root UID.
  Container images that hardcode UID 0 or write to `/` will fail.
  Design images to run as any UID.
</TipBox>

<!--
SCCs are the most common reason a container that works with Podman fails on OCP.
The fix is almost always: make the image work as a non-root, non-fixed UID.
-->

---
layout: two-cols-code
---

## Diagnosing SCC Violations

When a pod fails to start on OCP, SCC is a top suspect:

::right::

```bash {1-3|5-8|10-14}
# Check why a pod won't start
oc describe pod <pod-name> | grep -A5 "Warning"

# See which SCC was assigned
oc get pod <pod-name> \
  -o jsonpath='{.metadata.annotations.openshift\.io/scc}'

# Check what SCCs a service account can use
oc adm policy who-can use scc anyuid

# Grant a specific SCC to a service account (use sparingly)
oc adm policy add-scc-to-user anyuid \
  -z my-serviceaccount
```

<!--
The `anyuid` SCC allows running as UID 0. Only grant it when you've confirmed
the image genuinely requires root and there's no alternative. Document the reason.
-->

---
layout: lab-exercise
lab: "4.2"
heading: "Debug an SCC Violation"
duration: "20 min"
---

## Objectives

1. Deploy an image that requires root and observe the failure
2. Diagnose the SCC violation using `oc describe` and events
3. Apply the correct SCC and verify the pod starts

## Steps

```bash
# Deploy an image known to require root (nginx default)
oc apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-scc-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-scc-test
  template:
    metadata:
      labels:
        app: nginx-scc-test
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
EOF

# Observe the failure
oc get pods -w
oc describe pod -l app=nginx-scc-test | grep -A10 "Warning"

# Check the events
oc get events --sort-by='.lastTimestamp' | tail -10

# Create a service account and grant anyuid SCC
oc create serviceaccount nginx-sa
oc adm policy add-scc-to-user anyuid -z nginx-sa

# Patch the deployment to use the service account
oc patch deployment nginx-scc-test \
  -p '{"spec":{"template":{"spec":{"serviceAccountName":"nginx-sa"}}}}'

# Verify the pod starts
oc rollout status deployment/nginx-scc-test
```

<!--
FACILITATOR NOTE:
- Expected first: pod stuck in CreateContainerError or similar SCC-related error
- Expected after fix: pod running with anyuid SCC
- Key teaching point: show the event message — it names the SCC that was tried and failed
- Better long-term fix: use ubi9/nginx instead of nginx:1.25 — it's designed for non-root
-->

---
layout: center
---

## Chapter 4 Summary

<v-clicks>

- OpenShift adds Routes, BuildConfigs, ImageStreams, and SCCs on top of Kubernetes
- Routes provide HAProxy-backed TLS ingress with automatic wildcard DNS
- S2I and BuildConfigs enable in-cluster builds from source, no Dockerfile required
- SCCs enforce pod security — the default SCC requires non-root, non-fixed UID images

</v-clicks>

<div class="mt-8">
  <ProgressBar :current="4" :total="4" />
</div>

<!--
That's the full workshop. You now have a path from Linux process model all the way to
deploying and securing applications on OpenShift.

Resources:
- Red Hat Learning Subscription: learning.redhat.com
- OCP docs: docs.openshift.com
- Interactive labs: lab.redhat.com
-->
