---
layout: chapter-title
chapter: "02"
heading: "Linux Containers"
subtitle: "Namespaces, cgroups, images, and Podman"
---

<!--
Chapter 2: Linux Containers — ~90 minutes including labs.
We take the Linux primitives from Chapter 1 and show how containers
are built on top of them: namespaces for isolation, cgroups for limits,
union mounts for images.
-->

---

## What We'll Cover

<v-clicks>

- Linux namespaces — process isolation primitives
- cgroups v2 — resource limits and accounting
- OCI container images — layers, digests, and registries
- Podman — running and building containers on RHEL

</v-clicks>

<!--
Key message: a container is not a VM. It's a process with namespace isolation
and cgroup limits. Once you see it this way, debugging becomes much easier.
-->

---
layout: section
---

# Linux Namespaces

---

## Namespaces Give Containers Their Isolation

Each namespace type restricts what a process can see:

<v-clicks>

- **pid** — process tree (PID 1 inside the container)
- **net** — network interfaces, routes, iptables rules
- **mnt** — filesystem mount points
- **uts** — hostname and domain name
- **ipc** — System V IPC, POSIX message queues
- **user** — UID/GID mappings (user namespaces)
- **cgroup** — cgroup root visibility

</v-clicks>

<!--
These are kernel features, not container-specific. You can create namespaces manually
with `unshare`. That's essentially what a container runtime does.
-->

---
layout: two-cols-code
---

## Creating Namespaces with `unshare`

`unshare` runs a command in a new namespace.
This is the manual equivalent of starting a container.

- `-p` — new PID namespace
- `-n` — new network namespace
- `-m` — new mount namespace
- `--fork` — fork before exec (required for PID ns)

::right::

```bash {1-3|5-8|10-13}
# New network namespace — no network
sudo unshare -n bash
ip link show   # only loopback

# New PID namespace — PID 1 is bash
sudo unshare -p --fork --mount-proc bash
ps aux         # only sees bash and ps

# Inspect namespaces of a running process
sudo unshare -n -p --fork --mount-proc sleep infinity &
PID=$(pgrep sleep | head -1)
sudo lsns -p $PID
sudo ls -la /proc/$PID/ns/
```

<!--
Demo: run the unshare -n example. Show that ping fails — no network.
This is the same isolation a container gets from its --network option.
-->

---
layout: two-cols-code
---

## Entering Namespaces with `nsenter`

`nsenter` attaches your shell to an **existing** process's namespaces.
The key use case: debug a running container with **host tools** — even when the image has no shell.

::right::

```bash {1-4|6-8|10-12|14-19}
# Resolve the PID of a running container
sudo unshare -n -p --fork --mount-proc \
  sleep infinity &
PID=$(pgrep sleep | head -1)

# Enter only the network namespace 
sudo nsenter -t $PID -n \
  ip link show

# Combine net + mount for a fuller view
sudo nsenter -t $PID -n -m \
  ss -tlnp

# Full namespace join 
sudo nsenter -t $PID -a \
  bash
```

<!--
Real-world scenario: a distroless or ubi-micro container has no shell and no ss/ip.
You can still inspect its listening ports and routes by entering its net namespace with nsenter.
Demo flow: podman run -d --name web nginx, get PID, nsenter -t $PID -n ip link show — audience sees
the container's veth pair from the host side without ever exec-ing into the container.
-->

---
layout: section
---

# cgroups v2

---

## cgroups Limit and Account for Resources

While namespaces control *visibility*, cgroups control *resource usage*:

<v-clicks>

- **cpu** — CPU time allocation and throttling
- **memory** — memory limit and OOM behavior
- **io** — block I/O bandwidth and IOPS limits
- **pids** — maximum number of processes

</v-clicks>

<TipBox type="note" title="RHEL 9 uses cgroup v2">
  The unified hierarchy is the default. Some Docker v1 flags (`--cpuset-cpus`) behave differently.
</TipBox>

<!--
The OOM killer in cgroups v2 is memory.oom.group — when one process in a container OOMs,
the entire cgroup is killed. This is why your container dies instead of just one thread.
-->

---
layout: two-cols-code
---

## Inspecting cgroups

The cgroup hierarchy is exposed under `/sys/fs/cgroup/`.
Podman automatically creates a cgroup per container.

::right::

```bash {1-3|5-7|9-12}
# Your shell's cgroup
cat /proc/$$/cgroup

# Container's cgroup (after running one)
podman run -d --name test busybox sleep infinity 
cat /proc/$(pgrep sleep)/cgroup

# Memory limit set by Podman
CG=/sys/fs/cgroup/$(cat /proc/$(pgrep sleep)/cgroup | cut -d: -f3)
cat $CG/memory.max
cat $CG/memory.current
cat $CG/cpu.max
```

<!--
Show that the cgroup path includes the container ID.
This is how systemd and the kubelet track container resource usage.
-->

---
layout: lab-exercise
lab: "2.1"
heading: "Run and Inspect Your First Container"
duration: "15 min"
---

## Objectives

1. Pull and run a UBI 9 container image with Podman
2. Inspect the container's namespace isolation
3. Set a memory limit and observe cgroup enforcement

## Steps

```bash
# Pull the image
podman pull registry.access.redhat.com/ubi9/ubi-minimal

# Run interactively
podman run -it --name lab21 \
  registry.access.redhat.com/ubi9/ubi-minimal bash

# Inside the container — observe isolation
ps aux           # only container processes
ip link show     # only loopback (no host network)
cat /etc/hostname
exit

# Run with a memory limit
podman run -d --name limited --memory=128m \
  registry.access.redhat.com/ubi9/ubi-minimal sleep infinity

# Find the cgroup and check the limit
cat /sys/fs/cgroup/$(cat /proc/$(pgrep sleep)/cgroup \
  | grep '0::' | cut -d: -f3)/memory.max

# Clean up
podman rm -f lab21 limited
```

<!--
FACILITATOR NOTE:
- Expected: ps inside container shows 2-3 processes max; hostname is the container ID
- Common issue: registry.access.redhat.com requires login in some lab environments
  Solution: podman login registry.access.redhat.com (credentials provided)
- Memory limit: 128m = 134217728 bytes
-->

---
layout: section
---

# OCI Images

---

## Images Are Layered Filesystems

An OCI image is a stack of read-only filesystem layers:

<v-clicks>

- Each `RUN`, `COPY`, or `ADD` in a Dockerfile creates a new layer
- Layers are content-addressed by SHA256 digest
- At runtime, a writable layer is added on top (overlay filesystem)
- Layers are shared across containers — only the writable layer is unique

</v-clicks>

<!--
This is why container startup is fast — no OS boot, no disk copy.
The layers already exist; the runtime just mounts them.
-->

---
layout: two-cols-code
---

## Writing a Minimal Containerfile

Use Red Hat Universal Base Images (UBI) as your base.
They are freely redistributable and supported on RHEL.

::right::

```dockerfile {all|1|3-5|7-8|9|10-11}
FROM registry.access.redhat.com/ubi9/ubi-minimal:latest

RUN microdnf install -y nginx && \
    microdnf clean all && \
    rm -rf /var/cache/dnf

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

<!--
microdnf instead of dnf — it's the minimal package manager in UBI minimal.
Always clean the cache in the same RUN layer to keep image size down.
EXPOSE is documentation only — it doesn't open a port.
-->

---
layout: lab-exercise
lab: "2.2"
heading: "Build and Push a Container Image"
duration: "20 min"
---

## Objectives

1. Write a Containerfile for a simple web application
2. Build the image with Podman
3. Inspect image layers with `podman history`

## Steps

```bash
# Create a working directory
mkdir ~/lab22 && cd ~/lab22

# Create a simple HTML page
echo "<h1>OCP Workshop Lab 2.2</h1>" > index.html

# Write the Containerfile
cat > Containerfile <<'EOF'
FROM registry.access.redhat.com/ubi9/ubi-minimal:latest
RUN microdnf install -y httpd && microdnf clean all
COPY index.html /var/www/html/index.html
EXPOSE 8080
CMD ["httpd", "-D", "FOREGROUND"]
EOF

# Build the image
podman build -t workshop/lab22:v1 .

# Inspect layers
podman history workshop/lab22:v1

# Run it and test
podman run -d -p 8080:8080 --name lab22 workshop/lab22:v1
curl http://localhost:8080

# Clean up
podman rm -f lab22
```

<!--
FACILITATOR NOTE:
- Expected: curl returns the HTML page
- Common issue: port 8080 already in use — try -p 8081:8080
- Ask: how many layers does the image have? Why?
- Show `podman image inspect` for the digest and layer list
-->

---
layout: center
---

## Chapter 2 Summary

<v-clicks>

- Containers are Linux processes with namespace isolation, not mini-VMs
- Namespaces control what a process can see; cgroups control what it can use
- OCI images are immutable, content-addressed layer stacks
- Podman is a daemonless, rootless-capable alternative to Docker on RHEL

</v-clicks>

<div class="mt-8">
  <ProgressBar :current="2" :total="4" />
</div>

<!--
5-minute break. Chapter 3: we take single containers and orchestrate them at scale with Kubernetes.
-->
