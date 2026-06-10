---
layout: chapter-title
chapter: "04"
heading: "OpenShift Container Platform"
subtitle: "Enterprise Kubernetes on an immutable, self-managing platform"
---

<!--
Chapter 4: OpenShift — ~60 min lecture, 3 optional labs (~40 min).
OCP 4.20+. No DeploymentConfig, no S2I, no BuildConfig, no Jaeger, no Elasticsearch.
Core mental model shift: OCP = Kubernetes + immutable OS + self-managing platform components + enterprise security defaults.
Every platform component is a Kubernetes Operator. You configure it via CRs, not config files.
Callback: Chapter 3 gave us the Kubernetes primitives — Pods, Deployments, Services. OCP keeps all of them
(every kubectl command works as oc) and wraps a managed platform layer around them.
-->

---

## What You'll Be Able to Do

<v-clicks>

- Place OCP among its siblings (K8s, OKD, OKE, OVE) and read cluster health with `oc get co`
- Configure RHCOS nodes with `MachineConfig` and debug them with `oc debug node/`
- Diagnose and fix a Security Context Constraint rejection
- Expose a Service with an edge-TLS Route
- Install platform capabilities through Operators and OLM
- Give a team self-service metrics, and place the logging/tracing stack
- Deploy and self-heal an application with OpenShift GitOps and Kustomize overlays

</v-clicks>

<!--
Every kubectl command works with oc. oc is a superset — all OCP-specific commands live under oc adm or as new resource types.
The big mindset shift from vanilla Kubernetes: you don't manage platform components directly.
Cluster Operators do. You edit their configuration CRs; they reconcile the rest.
-->

---
layout: section
---

# Platform Overview

<div class="text-sm opacity-50 mt-2">Module 1 of 7</div>

---

## The OpenShift Family

<div class="grid grid-cols-2 gap-4">
<div>

| Distribution | Vendor | Support | Purpose |
|---|---|---|---|
| **Kubernetes** | CNCF | Community | Upstream reference |
| **OKD** | Community | Community | OCP dev preview |
| **OKE** | Red Hat | Red Hat | K8s-only subscription tier |
| **OCP** | Red Hat | Red Hat | Full enterprise platform |
| **OVE** | Red Hat | Red Hat | VM workloads (KubeVirt) |

</div>
<div>

**OKD** — Open Kubernetes Distribution. Tracks OCP closely; no SLA. Use for labs and evaluation.

**OKE** — OpenShift Kubernetes Engine. Stripped-down OCP subscription: RHCOS + Kubernetes + CRI-O. No monitoring stack, no OperatorHub add-ons included.

**OCP** — Full OpenShift: monitoring, logging, GitOps, Pipelines, Web Console, OperatorHub, RBAC, OAuth server.

**OVE** — OpenShift Virtualization Engine. OCP-based subscription for migrating VM workloads from VMware (KubeVirt / OpenShift Virtualization). Same RHCOS base as OCP; different licensing model (VMs per socket).

</div>
</div>

<!--
All tiers (OKE/OCP/OVE) run RHCOS and share the same Kubernetes API — the difference is subscription scope and which managed operators are included/supported.
OKD is the upstream community project for OCP, similar to how Fedora is upstream for RHEL.
OVE was introduced in 2024/2025 as many enterprises migrated off VMware following the Broadcom acquisition.
OKE is sometimes offered as a lower-cost entry point for customers who only need the container runtime and basic K8s — no full platform tooling.
-->

---

## What OCP Adds to Kubernetes

<div class="grid grid-cols-2 gap-6">
<div>

**Always-on platform layer**
- ~40 Cluster Operators — self-managing platform components
- RHCOS — immutable OS, managed via MachineConfig API
- CRI-O — container runtime pinned to K8s version (no Docker socket)
- Integrated OAuth server
- Automated etcd backup and TLS rotation
- `Route` — HAProxy-backed ingress with wildcard DNS

</div>
<div>

**OLM-managed add-ons**
- Monitoring: Prometheus + Thanos + Alertmanager
- Logging: LokiStack + Vector (replaces ES + Fluentd)
- GitOps: OpenShift GitOps (ArgoCD)
- Pipelines: OpenShift Pipelines (Tekton)
- Service Mesh: OSSM 3.x (Istio, ambient mode GA)
- Tracing: Tempo + OpenTelemetry

</div>
</div>

<!--
"Always-on" components are part of the OCP release payload managed by Cluster Operators — you cannot remove or upgrade them independently.
"Add-ons" are installed via OLM from OperatorHub and have their own lifecycle (Subscriptions, channels, install plan approval).
CRI-O instead of containerd: version-pinned to K8s, no Docker socket, use crictl for runtime debugging or podman for image operations.
-->

---

## The Cluster Operator Model

Every OCP platform component manages itself as a **Kubernetes Operator**:

<v-clicks>

- **Cluster Version Operator (CVO)**: watches the release image; orchestrates upgrades across ~40 Cluster Operators in dependency order
- Each CO reconciles its component toward declared config — continuously
- A Degraded CO **blocks upgrades** — you cannot ignore it
- Never edit resources in `openshift-*` namespaces directly — the CO will overwrite them

</v-clicks>

```bash {1-2|4-9}
# Your primary cluster health signal — run this first, every time
oc get clusteroperators

# NAME                     VERSION   AVAILABLE  PROGRESSING  DEGRADED
# authentication           4.20.0    True       False        False
# dns                      4.20.0    True       False        False
# etcd                     4.20.0    True       False        False
# ingress                  4.20.0    True       False        False
# monitoring               4.20.0    True       False        False
```

<!--
Linux analogy: Cluster Operators are like systemd services that watch a "desired config" CRD and reconcile their component to match it — except they also manage their own upgrades and dependencies.
oc get co is the equivalent of systemctl status for the entire platform.
To change platform behavior (e.g., ingress TLS profile, OAuth configuration), edit the CO's config CR in the config.openshift.io/v1 API group — not the pods or configmaps in the operator namespace.
A Degraded=True CO means the platform is not in a healthy state. Fix it before proceeding with any change or upgrade.
-->

---
layout: section
---

# RHCOS & Node Management

<div class="text-sm opacity-50 mt-2">Module 2 of 7</div>

---

## RHCOS: The Immutable OS

RHCOS (Red Hat CoreOS) is the mandatory OS for OCP control-plane nodes:

<v-clicks>

- **Read-only root filesystem** — `yum install` on the node is not supported
- **OS distributed as a container image** — updates are atomic and transactional (rpm-ostree)
- **Ignition runs once at first boot** — configures the full OS state before kubelet starts (not cloud-init)
- **After first boot, the MCO owns all configuration** via `MachineConfig` objects
- **Any direct node change will be overwritten** on the next MCO render

</v-clicks>

<TipBox type="warning" title="RHCOS is not a general-purpose RHEL">
  Do not SSH into nodes to fix things. Changes made directly are overwritten by the MCO.
  Use <code>oc debug node/&lt;name&gt;</code> to inspect; use <code>MachineConfig</code> to change.
</TipBox>

<!--
Compare to RHEL: RHEL is mutable (yum install, edit /etc, restart services). RHCOS is immutable — the OS is a versioned artifact, not a configuration accumulation.
Ignition vs cloud-init: Ignition runs once, pre-OS, transactional (all-or-nothing — if the config fails, the node won't start). cloud-init runs on every boot, procedural, and idempotent-ish. Ignition is closer to kickstart + firstboot.
After first boot: the MCO translates MachineConfig objects back into Ignition and applies them. MachineConfig is the day-2 interface to Ignition.
-->

---
layout: two-cols-code
---

## MachineConfig: Declarative Node Configuration

`MachineConfig` objects encode Ignition state for a pool of nodes.  
MCO renders multiple MCs into one "rendered config" per pool → reboots nodes one at a time.

**MachineConfigPools** (default: `master`, `worker`). Custom pools (e.g., `gpu`, `infra`) let you target subsets and control rollout timing.

::right::

```yaml {all|1-6|7-16|17-19}
apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  name: 99-worker-sysctl-tuning
  labels:
    machineconfiguration.openshift.io/role: worker
spec:
  config:
    ignition:
      version: 3.4.0
    storage:
      files:
      - path: /etc/sysctl.d/99-custom.conf
        contents:
          source: "data:,net.core.somaxconn%3D65535%0A"
        mode: 0644
  kernelArguments:
    shouldExist:
    - "skew_tick=1"
```

<!--
Terminology bridge from Chapter 3: the control-plane nodes are managed by the MachineConfigPool still named `master`.
When you see the `master` pool, read it as "the control-plane nodes."
Label machineconfiguration.openshift.io/role: worker assigns this MC to the worker pool.
After apply: MCO cordons, drains, and reboots each worker one at a time (respecting maxUnavailable in the pool spec).
CRITICAL: never apply an untested MC directly to master or worker pools — test on a custom pool first. A bad MC (invalid Ignition, wrong file path) renders nodes unbootable.
Node Disruption Policies (OCP 4.17+): you can declare that certain config changes (e.g., reloading a systemd service) don't require a full reboot — only a Reload or Restart action — using spec.nodeDisruptionPolicy on the MachineConfiguration cluster object.
RHCOS Image Layering (OCP 4.18+ production-ready): for custom kernel modules or third-party drivers, use MachineOSConfig + Containerfile to build a custom OS layer on-cluster. Use carefully: custom-layered nodes are not auto-updated by OCP.
-->

---

## Node Inspection and Debugging

Traditional SSH is replaced by `oc debug`. Nodes are cattle:

```bash {1-6|8-11|13-14|16-18}
# Open a privileged shell into the node OS (no SSH daemon needed)
NODE=$(oc get nodes -l node-role.kubernetes.io/worker -o name | head -1)
oc debug $NODE
# Inside the debug pod — chroot into the host filesystem
chroot /host
journalctl -u crio --no-pager | tail -50     # CRI-O log

# Inspect OS + kubelet state on the node
rpm-ostree status          # current + staged OS image (transactional)
systemctl status kubelet
exit; exit

# Which rendered MachineConfig is the node on? (read via API — no node tooling)
oc get $NODE -o jsonpath='{.metadata.annotations.machineconfiguration\.openshift\.io/currentConfig}{"\n"}'

# Scale to replace a node (MachineSet = Deployment for nodes)
oc get machineset -n openshift-machine-api
oc scale machineset <name> --replicas=3 -n openshift-machine-api
```

<!--
oc debug node/<name> creates a privileged pod on the node, no SSH daemon needed. The chroot /host step enters the host filesystem from the debug container.
Debugging a broken deployment: oc debug deployment/<name> creates a copy of the pod spec with probes disabled and starts a shell — invaluable for diagnosing startup failures.
MachineSet is to nodes what Deployment is to pods: declares desired count and provisions RHCOS machines. Scale down by 1 to delete a bad node; scale back up to provision a fresh one.
For bare-metal: nodes are managed by BareMetalHost + Metal3 via the baremetal-operator, not by cloud MachineSet controllers.
-->

---

## Bare-Metal Install: Agent-Based Installer

The recommended bare-metal installation path for OCP 4.18+ — no external service required:

<v-clicks>

1. Write `install-config.yaml` (cluster topology, networking) + `agent-config.yaml` (per-host: MAC, BMC, static IP)
2. `openshift-install agent create image` → bootable ISO with embedded discovery agent
3. Boot target machines from the ISO (PXE, virtual media, or physical)
4. Agents auto-discover hardware, validate prerequisites, and bootstrap
5. DNS records for `api.<cluster>` and `*.apps.<cluster>` **must exist before booting**

</v-clicks>

<TipBox type="tip" title="Fully air-gapped support">
  Use a local mirror registry with <code>oc-mirror v2</code> and embed the mirror CA in
  <code>install-config.yaml</code>. The ISO and bootstrapping work with zero internet access.
</TipBox>

<!--
Agent-Based Installer replaced bare-metal IPI as the recommended path for new on-prem deployments.
Compared to bare-metal IPI: no Ironic/IPMI required for the install (though you can use BMC via agent-config.yaml). No bootstrap VM. The ISO itself does the bootstrap.
Supported topologies: SNO (single-node), compact 3-node (control plane + workloads on same machines), full HA (3 control + N workers).
Assisted Installer (console.redhat.com) provides a web UI for the same flow but requires internet connectivity. Use for connected environments and first-time installs.
Pre-requisite checklist: DNS (api + wildcard), DHCP or static IPs in agent-config.yaml, NTP, and a reachable mirror registry for disconnected environments.
-->

---
layout: lab-exercise
lab: "4.1"
heading: "Explore RHCOS Node State"
duration: "10 min"
---

## Objectives

1. Check MachineConfigPool status across the cluster
2. Use `oc debug node/` to inspect the node OS
3. Read the active MachineConfig name from the node

## Steps

```bash
# Check MachineConfigPool health
oc get mcp
# NAME     CONFIG                   UPDATED  UPDATING  DEGRADED
# master   rendered-master-<hash>   True     False     False
# worker   rendered-worker-<hash>   True     False     False

# Describe worker pool — see active rendered config
oc describe mcp worker | grep -A5 "Configuration:"

# Open a debug shell on a worker node
NODE=$(oc get nodes -l node-role.kubernetes.io/worker -o name | head -1)
oc debug $NODE

# Inside the debug shell:
chroot /host
cat /etc/os-release
rpm-ostree status
exit; exit

# Back on your workstation — which rendered config is the node on?
oc get $NODE -o jsonpath='{.metadata.annotations.machineconfiguration\.openshift\.io/currentConfig}{"\n"}'
```

**✓ Expected:** `oc get mcp` shows `UPDATED=True` for both pools, and the node's `currentConfig` matches the worker pool's rendered config. *(Read-only — no cleanup.)*

<!--
FACILITATOR NOTE:
- Expected: rpm-ostree status shows current RHCOS version and empty layered packages (unless custom layers applied)
- MachineConfigPool UPDATED=True: all nodes are on the current rendered config
- UPDATING=True: a MC change is rolling out — safe, just in-progress
- DEGRADED=True: a node failed to apply — oc describe mcp worker for the specific error and node name
- the currentConfig annotation should print rendered-worker-<hash> matching the mcp output
-->

---
layout: section
---

# Security

<div class="text-sm opacity-50 mt-2">Module 3 of 7</div>

---

## Projects, RBAC, and Identity

OCP wraps Kubernetes Namespaces with **Projects**:

<v-clicks>

- `oc new-project <name>` creates a Project and grants you `admin` within it
- A **ProjectRequest** template can auto-apply ResourceQuota, LimitRange, and NetworkPolicy to every new project
- **Identity Providers** (HTPasswd, LDAP, OIDC) configure via the `OAuth` cluster resource
- After configuring an IdP, **delete `kubeadmin`** — it has no audit trail

</v-clicks>

```bash {1-4|6-9|11-12}
# Patch OAuth to add an HTPasswd IdP (htpasswd-secret must exist in openshift-config)
oc patch oauth cluster --type=merge -p \
  '{"spec":{"identityProviders":[{"name":"htpasswd","type":"HTPasswd",
    "htpasswd":{"fileData":{"name":"htpasswd-secret"}}}]}}'

# Grant roles — always to service accounts or groups, not individual users
oc adm policy add-role-to-user edit   <user> -n <ns>   # create/update/delete resources
oc adm policy add-role-to-user view   <user> -n <ns>   # read-only
oc adm policy add-cluster-role-to-user cluster-admin <user>   # use sparingly

# Remove temporary bootstrap credential
oc delete secret kubeadmin -n kube-system
```

<!--
Default self-provisioner ClusterRoleBinding lets all authenticated users create Projects. In multi-tenant environments, remove this and manage project creation centrally via the ProjectRequest template.
Groups (user.openshift.io/v1 Group) allow you to bind roles to a team: oc adm groups new myteam user1 user2; bind roles to the group, not individuals.
LDAP group sync: oc adm groups sync --sync-config=ldap-sync.yaml adds group membership from your directory automatically.
-->

---

## Security Context Constraints (SCCs)

SCCs are OCP's pod security admission layer — they define what a pod **is allowed to do** on the node:

<v-clicks>

- **`restricted-v2`** (default for all authenticated users): no root UID, no privilege escalation, `seccomp: RuntimeDefault`, all Linux capabilities dropped
- **`anyuid`**: allows any UID including root — grant only when the image genuinely requires it and you've documented why
- **`privileged`**: effectively no restrictions — cluster infrastructure only
- Assigned to a **service account**, ranked by priority, first matching SCC wins

</v-clicks>

<TipBox type="warning" title="#1 cause of 'works with Podman, fails on OCP'">
  A container image that hardcodes UID 0 or writes to <code>/</code> at startup will be rejected
  by <code>restricted-v2</code>. Fix: build images that run as any non-root UID.
  Don't grant <code>anyuid</code> as a shortcut — it's the OCP equivalent of running everything as root.
</TipBox>

<!--
SCC admission flow: pod request → webhook checks the pod's service account → available SCCs for that SA ranked by priority (higher first), then restrictiveness (more restrictive preferred) → first match applied → no match = pod rejected.
restricted-v2 aligns with the Kubernetes restricted Pod Security Standard, so workloads that pass restricted-v2 also pass upstream PSA restricted enforcement.
Linux admin analogy: SCCs are like SELinux policies for pods — they constrain what the process can do at the OS level, enforced by the admission webhook rather than the kernel.

🔎 ASK THE ROOM: an image that runs fine under `podman run` is rejected on OCP with a "must run as non-root" error. What changed? (Answer: nothing about the image — restricted-v2 forbids the root UID the image assumes by default.)
Common trap: granting anyuid cluster-wide to "fix things quickly." Instead, create a dedicated ServiceAccount, grant anyuid to that SA only, and patch the deployment to use it. Better still: fix the image.
-->

---
layout: two-cols-code
---

## Diagnosing and Fixing SCC Violations

When a pod fails to start on OCP, SCC is the first suspect:

::right::

```bash {1-4|6-9|11-14|16-18|20-23}
# Identify the SCC assigned (or missing)
oc describe pod <pod> | grep -E "scc|Warning|Error"
oc get pod <pod> \
  -o jsonpath='{.metadata.annotations.openshift\.io/scc}'

# Read the rejection event
oc get events --sort-by='.lastTimestamp' | tail -10
# Error: container has runAsNonRoot and image
# will run as root (no runAsNonRoot in spec)

# Fix 1 — dedicated SA with minimum SCC
oc create serviceaccount myapp-sa
oc adm policy add-scc-to-user anyuid -z myapp-sa
oc set serviceaccount deployment/myapp myapp-sa

# Fix 2 (preferred) — use a non-root UBI image
# ubi9/nginx, ubi9/python-39, ubi9/openjdk-21
# run non-root under restricted-v2 with zero changes

# Verify
oc rollout status deployment/myapp
oc get pod -l app=myapp \
  -o jsonpath='{.items[0].metadata.annotations.openshift\.io/scc}'
```

<!--
Fix 1 is an operational workaround — acceptable when you cannot modify the image (third-party software).
Fix 2 is always preferable for new workloads: Red Hat UBI container images are explicitly built to run as non-root under restricted-v2.
Always scope the anyuid grant to a dedicated ServiceAccount, not to the default SA (which all pods in the namespace inherit by default).
oc adm policy who-can use scc anyuid shows all users/SAs currently able to use a given SCC — use before granting to understand blast radius.
-->

---
layout: lab-exercise
lab: "4.2"
heading: "Debug SCC Violations and Configure RBAC"
duration: "15 min"
---

## Objectives

1. Deploy a root-requiring image and observe the SCC failure
2. Diagnose the error using events and pod description
3. Apply the minimum required SCC via a dedicated service account
4. Configure namespace-scoped RBAC for a second user

## Steps

```bash
# Part 1: SCC failure and fix
oc new-project lab42-$(whoami)
oc create deployment nginx-root --image=nginx:1.25
oc get pods -w
# Expect: CreateContainerConfigError or CrashLoopBackOff

oc describe pod -l app=nginx-root | grep -A8 "Warning\|Error"
oc get events --sort-by='.lastTimestamp' | tail -5

# Fix with dedicated service account
oc create serviceaccount nginx-sa
oc adm policy add-scc-to-user anyuid -z nginx-sa
oc set serviceaccount deployment/nginx-root nginx-sa
oc rollout status deployment/nginx-root

# Verify which SCC was applied
oc get pod -l app=nginx-root \
  -o jsonpath='{.items[0].metadata.annotations.openshift\.io/scc}'

# Part 2: RBAC
oc adm policy add-role-to-user view   partner-user -n lab42-$(whoami)
oc adm policy add-role-to-user edit   dev-user     -n lab42-$(whoami)
# Log in as dev-user and verify: can create pods, cannot delete namespace
```

**✓ Expected:** nginx fails under `restricted-v2`, then runs after the `anyuid` service account is set; the `view` user can read but not create. **Cleanup:** `oc delete project lab42-$(whoami)`

<!--
FACILITATOR NOTE:
- Expected first run: nginx:1.25 runs as root (UID 0). restricted-v2 rejects it.
  Event message: "container has runAsNonRoot and image will run as root"
- After SA + anyuid: pod Running, annotation shows anyuid SCC
- Follow-up discussion: what would happen if we used ubi9/nginx instead?
  Answer: it runs as UID 1001 by default, no SCC grant needed
- Part 2: view user should fail on oc create; edit user should succeed
- Key teaching point: always try Fix 2 (better image) before Fix 1 (permissive SCC)
-->

---
layout: section
---

# Routes & Networking

<div class="text-sm opacity-50 mt-2">Module 4 of 7</div>

---

## Routes: OCP's Ingress Primitive

OCP uses `Route` (`route.openshift.io/v1`) as its primary external ingress resource:

<div class="grid grid-cols-2 gap-4">
<div>

| Feature | Route | K8s Ingress |
|---|---|---|
| Wildcard DNS | `*.apps.<cluster>` built-in | manual DNS required |
| TLS modes | edge / passthrough / re-encrypt | controller-specific |
| Traffic weight | per-backend weight | controller-specific |
| Operator | HAProxy Ingress Operator | nginx / traefik / others |

</div>
<div>

```bash
# Expose a service (auto-generates hostname)
oc expose svc/myapp

# Edge TLS with HTTP redirect
oc create route edge myapp \
  --service=myapp \
  --insecure-policy=Redirect

# Get the URL
oc get route myapp \
  -o jsonpath='{.spec.host}'
```

</div>
</div>

<!--
Routes predate Kubernetes Ingress. Kubernetes Ingress is also supported in OCP but lacks Route-specific features (weight, timeout annotations, passthrough TLS).
HAProxy Ingress Operator deploys HAProxy pods in openshift-ingress. Each Route becomes an HAProxy config block. The wildcard DNS record *.apps.<cluster>.<domain> means any Route hostname under that subdomain resolves automatically — no manual DNS entry per app.
TLS termination: edge (HAProxy decrypts, forwards HTTP to pod — easiest), passthrough (TLS all the way to pod, HAProxy can't inspect — use for mutual TLS apps), re-encrypt (HAProxy decrypts and re-encrypts to pod — for end-to-end encryption with an internal CA).
Route sharding: create additional IngressController resources with routeSelector to route specific traffic (internal vs external, per-tenant) to dedicated HAProxy instances with separate load balancers.
-->

---
layout: two-cols-code
---

## Route YAML and Certificate Automation

::right::

```yaml {all|6-10|11-12|13-15}
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: myapp
spec:
  host: myapp.apps.cluster.example.com
  to:
    kind: Service
    name: myapp
    weight: 100
  port:
    targetPort: 8080-tcp
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

<TipBox type="tip" title="cert-manager Operator for OpenShift">
  Available in OperatorHub. Manages <code>Certificate</code>, <code>Issuer</code>,
  and <code>ClusterIssuer</code> CRDs. Supports Let's Encrypt, HashiCorp Vault, and Venafi.
  Automates certificate provisioning and rotation — no manual secret updates.
</TipBox>

<!--
cert-manager workflow: create a ClusterIssuer (points to ACME/Let's Encrypt or internal CA), create a Certificate resource (specifies the secret name and DNS names), cert-manager provisions the TLS secret. Patch the Route to reference the secret or use the cert-manager Route annotation.
External Secrets Operator (GA in OCP 4.20): sync credentials from HashiCorp Vault, AWS Secrets Manager, Azure Key Vault into Kubernetes Secrets automatically. Works alongside cert-manager for full secrets lifecycle management.
-->

---

## Networking Essentials

<v-clicks>

- **OVN-Kubernetes**: default CNI (OpenShift SDN is deprecated and being removed). Enforces NetworkPolicy natively
- **NetworkPolicy baseline**: deploy deny-all default + explicit allow per project — OVN enforces it without additional tooling
- **MetalLB Operator**: `LoadBalancer` type Services on bare metal via BGP or L2 mode
- **Service Mesh (OSSM 3.2)**: east-west mTLS + traffic management — **ambient mode is GA** (ztunnel DaemonSet replaces per-pod sidecars, ~90% less memory)
- Routes handle north-south; Service Mesh handles east-west service-to-service

</v-clicks>

```yaml
# Apply to every project as a baseline
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
```

<!--
NetworkPolicy: OVN-Kubernetes enforces NetworkPolicy by default in OCP. Unlike vanilla clusters where you must install a CNI that supports it, OCP ships with full NetworkPolicy enforcement out of the box.
MetalLB modes: L2 mode (ARP-based, single node handles traffic, failover via ARP table update) and BGP mode (routes announced to external BGP peers, traffic spreads across nodes). Use BGP for production.
OSSM 3.2 ambient mode: workloads don't restart when mesh is added. ztunnel handles L4 mTLS at the node level (DaemonSet). Waypoint proxies are optional per-namespace L7 proxies for richer policies. Deploy OSSM and Routes together — they're complementary, not competing.
-->

---
layout: section
---

# Operators & OLM

<div class="text-sm opacity-50 mt-2">Module 5 of 7</div>

---

## Operators and the Operator Lifecycle Manager

In OCP, everything optional is an **Operator** installed via OLM:

<v-clicks>

- **Operator**: a controller that extends Kubernetes with custom CRDs and reconciliation logic
- **OLM** (Operator Lifecycle Manager): handles install, dependency resolution, channel-based upgrades, and uninstall
- Unlike Helm (push-once): OLM operators continuously reconcile; upgrades are controlled via channels; uninstall removes CRDs
- **OperatorHub**: curated catalog of Red Hat, certified ISV, and community operators

</v-clicks>

```
CatalogSource ──► Subscription ──► InstallPlan ──► ClusterServiceVersion (running)
 (catalog pod)    (intent + channel)  (resources to    (operator pod + owned CRDs)
                  Manual|Automatic     create)
```

<!--
OLM v0 is the current operational baseline. OLM v1 (ClusterExtension, GA since OCP 4.17) coexists alongside v0 but most operators in OperatorHub still use v0.
Install approval: Automatic means upgrades apply immediately when available in the channel. Manual means each upgrade requires an admin to approve the generated InstallPlan. Use Manual in production to control change timing.
Upgrade channels: operators define channels (e.g., stable, fast, alpha). Subscribing to stable means you get stable releases only. Changing channels is supported for controlled upgrades.
In OCP 4.20, the "Operators" nav item in the console is renamed "Ecosystem" and integrates with the Red Hat Software Catalog.
For disconnected installs: use oc-mirror v2 with an ImageSetConfiguration to mirror operator catalogs to a local registry, then create a custom CatalogSource pointing to the mirror.
-->

---
zoom: 0.9
---

## Key Operators Every SRE Should Know

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

**Delivery & observability**
- **OpenShift GitOps** — ArgoCD continuous delivery
- **OpenShift Pipelines** — Tekton CI/CD
- **OpenShift Logging + Loki** — LokiStack aggregation (v6.x)
- **Cluster Observability Operator** — Grafana + UI plugins
- **Distributed Tracing** — Tempo
- **Red Hat build of OpenTelemetry** — collector + auto-instrumentation

</div>
<div>

**Security & platform**
- **cert-manager** — TLS certificate lifecycle
- **External Secrets Operator** — Vault/AWS/Azure (GA 4.20)
- **Compliance Operator** — CIS/NIST scan + remediation
- **MetalLB** — bare-metal LoadBalancer services
- **Network Observability** — eBPF flow analysis
- **Service Mesh (OSSM 3.x)** — east-west mTLS, ambient mode

</div>
</div>

<!--
Installing: Operators → OperatorHub in console, search by name, click Install.
Channels at a glance: GitOps/Pipelines = latest; Logging + Loki = stable-6.x; cert-manager = stable-v1; most others = stable; Cluster Observability Operator = development.
Filter by "Red Hat" for operators with Red Hat support. "Certified" means ISV-tested on OCP but supported by the vendor. "Community" means no support guarantee.
OpenShift Logging v6.x requires three operators: OpenShift Logging + Loki Operator + Cluster Observability Operator.
Tekton Hub: deprecated January 2026. Migrate task/pipeline definitions to ArtifactHub.
-->

---
layout: section
---

# Monitoring & Observability

<div class="text-sm opacity-50 mt-2">Module 6 of 7</div>

---

## Built-in Monitoring Stack

OCP ships a fully pre-configured monitoring stack — no installation required:

<div class="grid grid-cols-2 gap-6">
<div>

**Platform monitoring** (`openshift-monitoring`)
- Prometheus (2 replicas) + Thanos sidecars
- Thanos Querier — federated query layer
- Alertmanager (3 replicas, HA)
- kube-state-metrics + node-exporter
- Prometheus Adapter (HPA scaling metrics)

</div>
<div>

**User workload monitoring** (opt-in)
- Deployed into `openshift-user-workload-monitoring`
- Per-team Prometheus scoped to user namespaces
- Thanos Ruler evaluates PrometheusRules
- Federated via the same Thanos Querier

</div>
</div>

```bash
# Enable user workload monitoring (one-time cluster config)
oc -n openshift-monitoring patch configmap cluster-monitoring-config \
  --patch '{"data":{"config.yaml":"enableUserWorkload: true\n"}}'
```

<!--
Platform monitoring is managed by the Cluster Monitoring Operator. Do not edit resources in openshift-monitoring directly — the CO will overwrite them. Configure it via the cluster-monitoring-config ConfigMap.
Thanos Querier federates both platform and user workload metrics. The console Observe → Metrics tab and any Grafana instance query against Thanos Querier, not directly against Prometheus.
User workload Prometheus is scoped: a developer in namespace A cannot query metrics from namespace B via the Prometheus HTTP API.
OCP 4.20 monitoring additions: sysctl node-exporter collector (new — exposes kernel sysctl metrics directly), improved LokiStack Ready vs Running state distinction, NetworkPolicy support for restricting monitoring stack access.
-->

---
layout: two-cols-code
---

## User Workload Monitoring: ServiceMonitor and Alerts

Grant teams monitoring access, then let them own their observability:

```bash
# Grant monitoring-edit role to a team member
oc adm policy add-role-to-user \
  monitoring-edit dev-user -n my-team
```

**RBAC roles available:**
- `monitoring-edit` — ServiceMonitor, PodMonitor, PrometheusRule, AlertmanagerConfig
- `monitoring-rules-edit` — PrometheusRule only
- `alert-routing-edit` — AlertmanagerConfig only

::right::

```yaml {1-12|14-27}
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp
  namespace: my-team
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
  - port: metrics
    interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: myapp-alerts
  namespace: my-team
spec:
  groups:
  - name: myapp
    rules:
    - alert: HighErrorRate
      expr: rate(http_errors_total[5m]) > 0.1
      for: 2m
      annotations:
        summary: "Error rate above 10% for 2 minutes"
```

<!--
ServiceMonitor selects pods via the Service's label selector and scrapes the named port. The app must expose a /metrics endpoint (Prometheus format).
PrometheusRule is evaluated by the Thanos Ruler in openshift-user-workload-monitoring, not by the platform Prometheus.
AlertmanagerConfig allows a team to route their own alerts to Slack/PagerDuty/email without touching the platform Alertmanager config — true operational self-service.
If a team uses PodMonitor instead of ServiceMonitor: same concept, but selects pods directly (useful when no Service exists in front of the pods being scraped).
-->

---

## Logging and Distributed Tracing

**Elasticsearch and Kibana are removed from the catalog.** The new stack:

<div class="grid grid-cols-2 gap-6">
<div>

**Logging 6.x (LokiStack)**
- **Vector** collector on each node (replaces Fluentd)
- **LokiStack** aggregation (S3-backed, not Elasticsearch)
- **LogQL** queries (similar to PromQL)
- Console: Observe → Logs (COO UI plugin)
- Log types: `application`, `infrastructure`, `audit`

</div>
<div>

**Distributed Tracing (Tempo)**
- Jaeger is deprecated — use **Tempo Operator**
- **Red Hat build of OpenTelemetry** for collection + auto-instrumentation
- S3-backed (same pattern as LokiStack)
- Multi-tenant: single TempoStack, RBAC-gated tenants
- Console integration via COO UI plugin

</div>
</div>

<!--
LokiStack requires S3-compatible object storage: OpenShift Data Foundation (ODF/Ceph) on bare metal, or AWS S3 / Azure Blob / GCS on cloud. Size tiers: 1x.demo (no HA, labs), 1x.pico (HA, production minimum).
Three operators needed for logging: OpenShift Logging Operator + Loki Operator + Cluster Observability Operator. The ClusterLogForwarder (observability.openshift.io/v1) defines log pipelines.
Jaeger removal timeline: Red Hat OpenShift distributed tracing platform (Jaeger-based) is deprecated. No hard removal date confirmed — but do not start new deployments on Jaeger.
Tempo multi-tenancy gotcha: RBAC and gateway configuration determine whether traces are visible or silently dropped. Configure the authentication/authorization section of TempoStack carefully.
-->

---
layout: section
---

# GitOps with OpenShift GitOps

<div class="text-sm opacity-50 mt-2">Module 7 of 7</div>

---

## Why GitOps?

GitOps applies version control discipline to cluster state:

<v-clicks>

- **Git is the source of truth** — not the running cluster state
- Every change goes through a PR → review → merge → automated deploy
- **Drift detection**: ArgoCD continuously compares desired state (Git) vs actual state (cluster)
- **Audit trail**: who changed what, when, and why — in git history, not cluster events
- **Self-healing**: if someone `oc apply`s directly to the cluster, ArgoCD reverts it

</v-clicks>

<TipBox type="tip" title="GitOps vs CI/CD">
  CI builds and tests code. CD pushes the artifact (image) to a registry.
  GitOps manages the deployment declaration separately — a pipeline writes the new image tag to Git;
  ArgoCD reads it and reconciles the cluster. The pipeline never touches the cluster directly.
</TipBox>

<!--
Key mental model: pipelines write to git (update image tag in kustomization.yaml). ArgoCD reads from git and reconciles the cluster. The cluster never has "unknown" state — every running resource traces back to a git commit.
OpenShift Pipelines (Tekton) handles CI+CD: builds images, runs tests, updates git manifests. OpenShift GitOps (ArgoCD) handles cluster reconciliation. They're complementary.
Argo Rollouts (available in OpenShift GitOps): the Rollout resource replaces Deployment for progressive delivery. Supports canary, blue-green, and analysis-based strategies with automatic Prometheus-based rollback.
-->

---
layout: two-cols-code
---

## OpenShift GitOps: The ArgoCD Application

Install OpenShift GitOps from OperatorHub.  
A default ArgoCD instance is created in `openshift-gitops`.

The **Application** CR declares source (Git) and destination (cluster + namespace):

::right::

```yaml {all|6-11|12-14|15-21}
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-prod
  namespace: openshift-gitops
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp-config
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
    - ServerSideApply=true
```

<!--
targetRevision: branch, tag, or commit SHA. Pin to a tag for production; use main for dev.
destination.server: https://kubernetes.default.svc targets the local cluster. For multi-cluster, use the managed cluster's API URL registered in ArgoCD.
syncPolicy.automated.selfHeal: true means ArgoCD reverts any manual cluster change within ~3 minutes. This enforces Git as source of truth.
prune: true deletes cluster resources when they are removed from Git. Without this, removed manifests leave orphaned resources.
OpenShift GitOps integrates with OCP RBAC via Dex (spec.dex.openShiftOAuth: true). Users who can authenticate to OCP can log into ArgoCD with the same credentials.
-->

---

## Kustomize Overlays: Multi-Environment Config

Separate environment-specific config from the application base — no templating language required:

```
myapp-config/
├── base/
│   ├── deployment.yaml     # image: myapp:placeholder
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    │   └── kustomization.yaml   # replicas: 1, image tag: dev-latest
    └── production/
        ├── kustomization.yaml   # replicas: 3, image tag: v1.2.3
        └── patch-hpa.yaml       # adds HorizontalPodAutoscaler
```

```yaml
# overlays/production/kustomization.yaml
resources:
  - ../../base
images:
  - name: myapp
    newTag: v1.2.3          # pipeline updates this line and commits
patches:
  - path: patch-hpa.yaml
```

<!--
Kustomize is built into oc, kubectl, and ArgoCD — no additional tooling needed.
CI pipeline workflow: build image → push to registry → update newTag in overlays/production/kustomization.yaml → commit + PR → merge → ArgoCD detects the change → syncs cluster.
ApplicationSet + Git Directory generator: automatically creates one ArgoCD Application per overlay directory. Add a new directory to git, get a new Application automatically. Essential for managing many environments or tenants.
Multi-cluster GitOps: RHACM (Red Hat Advanced Cluster Management) integrates with ArgoCD via the gitopscluster.apps.open-cluster-management.io resource. As RHACM provisions new clusters, ApplicationSet automatically deploys to them.
-->

---
layout: lab-exercise
lab: "4.3"
heading: "Deploy with OpenShift GitOps"
duration: "15 min"
---

## Objectives

1. Verify the OpenShift GitOps Operator and access ArgoCD
2. Create an ArgoCD Application from a Kustomize overlay
3. Trigger drift and observe self-healing

## Steps

```bash
# Verify OpenShift GitOps is installed
oc get csv -n openshift-gitops | grep gitops

# Get the ArgoCD route and admin password
oc get route openshift-gitops-server -n openshift-gitops \
  -o jsonpath='{.spec.host}'
oc get secret openshift-gitops-cluster -n openshift-gitops \
  -o jsonpath='{.data.admin\.password}' | base64 -d

# Create an Application
oc apply -f - <<'EOF'
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: lab43-app
  namespace: openshift-gitops
spec:
  project: default
  source:
    repoURL: https://github.com/<workshop-repo>/gitops-examples
    targetRevision: main
    path: overlays/lab
  destination:
    server: https://kubernetes.default.svc
    namespace: lab43-$(whoami)
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
EOF

# Watch sync
oc get application lab43-app -n openshift-gitops -w

# Trigger drift — scale up manually
oc scale deployment/myapp --replicas=5 -n lab43-$(whoami)
# Within ~3 minutes ArgoCD reverts to the declared count
oc get deployment myapp -n lab43-$(whoami) -w
```

**✓ Expected:** ArgoCD reports the app `Synced`/`Healthy`; after you scale to 5, it reverts to the declared replica count within ~3 min. **Cleanup:** `oc delete application lab43-app -n openshift-gitops` (prune removes the app's resources)

<!--
FACILITATOR NOTE:
- Pre-requisite: workshop git repo with gitops-examples/overlays/lab/ containing a Deployment (replicas: 2)
- Show the ArgoCD web UI at the route — the visual sync graph makes "Git as source of truth" concrete
- selfHeal demo: scale to 5 → ArgoCD reverts to 2. Point to the ArgoCD sync history showing the revert event.
- Common issue: ArgoCD can't reach the git repo — check NetworkPolicy and egress in openshift-gitops namespace
- OCP OAuth integration: users can log into ArgoCD with their OCP credentials if dex.openShiftOAuth is enabled
-->

---
layout: center
---

## Chapter 4 Summary

<v-clicks>

- OCP manages itself via ~40 Cluster Operators — `oc get co` is your primary health check
- RHCOS is immutable — configure nodes with `MachineConfig`, debug with `oc debug node/`
- `restricted-v2` blocks root containers by default — fix images, don't grant `anyuid`
- Operators/OLM add platform capabilities; user workload monitoring gives teams their own metrics
- GitOps (ArgoCD) makes Git the source of truth; Kustomize overlays separate environments

</v-clicks>

<div class="mt-8">
  <ProgressBar :current="4" :total="4" />
</div>

<!--
Workshop complete. Key resources for attendees:
- OCP 4.20 docs: docs.openshift.com/container-platform/4.20
- Interactive labs: lab.redhat.com (Red Hat Learning Subscription)
- Release notes and errata: access.redhat.com/errata
- OpenShift Blog: cloud.redhat.com/blog/tag/openshift

Next steps for this audience:
1. EX280 (Red Hat OpenShift Administrator I) certification
2. DO480 (Multicluster Management with Red Hat OpenShift Platform Plus)
3. DO370 (Enterprise Kubernetes Storage with OpenShift Data Foundation)
-->
