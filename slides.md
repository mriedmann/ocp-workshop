---
theme: default
title: "Linux to OpenShift: A Full-Day Workshop"
author: Workshop Team
highlighter: shiki
lineNumbers: true
transition: slide-left
colorSchema: light
aspectRatio: 16/9
canvasWidth: 980
fonts:
  sans: "Red Hat Display"
  mono: "Red Hat Mono"
  provider: google
themeConfig:
  primary: '#0066CC'
download: true
exportFilename: ocp-workshop-full
htmlAttrs:
  lang: en
---

# Linux to OpenShift

## A Full-Day Workshop for Linux Admins and SREs

<div class="mt-8 text-xl opacity-70">
  Linux · Containers · Kubernetes · OpenShift
</div>

<div class="mt-6 text-sm opacity-60">
  Prerequisites: comfort with bash, file permissions, and systemd. No prior container or Kubernetes experience required.
</div>

<!--
Welcome everyone. Today we'll build from the Linux fundamentals you already know
all the way up to deploying applications on OpenShift.

Housekeeping: breaks at top of each hour, labs follow each section.
-->

---
layout: center
---

## Agenda

| # | Module | Lecture | Labs | Total |
|---|--------|---------|------|-------|
| 1 | Linux Fundamentals | ~55 min | 2 × (35 min) | ~90 min |
| 2 | Linux Containers | ~55 min | 2 × (35 min) | ~90 min |
| 3 | Kubernetes | ~50 min | 2 × (40 min) | ~90 min |
| 4 | OpenShift | ~60 min | 3 × (40 min) | ~100 min |

<div class="mt-6 text-sm opacity-60">
Each module includes hands-on lab exercises. Lab environments are pre-provisioned.
Breaks at the top of each hour; Chapter 4 is the largest and goes deepest.
</div>

---
src: ./chapters/01-linux/slides.md
---

---
src: ./chapters/02-containers/slides.md
---

---
src: ./chapters/03-kubernetes/slides.md
---

---
src: ./chapters/04-openshift/slides.md
---

---
layout: section
---

# References & Further Reading

---

## References — Modules 1–3

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

**Module 1 — Linux Fundamentals**
- [RHEL 9 Product Documentation](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9)
- [`namespaces(7)` — man7.org](https://man7.org/linux/man-pages/man7/namespaces.7.html)
- [`proc(5)` — man7.org](https://man7.org/linux/man-pages/man5/proc.5.html)
- [systemd.service / systemd docs](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)

**Module 2 — Linux Containers**
- [Podman Documentation](https://docs.podman.io/en/latest/)
- [Red Hat Universal Base Images (UBI)](https://developers.redhat.com/products/rhel/ubi)
- [OCI Image Format Specification](https://github.com/opencontainers/image-spec)
- [Control Group v2 — kernel.org](https://docs.kernel.org/admin-guide/cgroup-v2.html)

</div>
<div>

**Module 3 — Kubernetes**
- [Kubernetes Documentation](https://kubernetes.io/docs/home/)
- [Cluster Components](https://kubernetes.io/docs/concepts/overview/components/)
- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [ConfigMaps & Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)

</div>
</div>

<!--
These are the canonical, vendor-maintained sources. Encourage attendees to bookmark
docs.redhat.com and kubernetes.io rather than relying on blog posts, which age quickly.
-->

---

## References — Module 4: OpenShift 4.20+

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

**Platform & architecture**
- [OCP 4.20 Documentation (home)](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20)
- [OCP 4.20 Release Notes](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/release_notes/ocp-4-20-release-notes)
- [Architecture & Cluster Operators](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/architecture/index)

**Nodes & installation**
- [Machine Config & RHCOS](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/machine_configuration/index)
- [Agent-based Installer](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/installing_an_on-premise_cluster_with_the_agent-based_installer/index)

**Security**
- [Managing Security Context Constraints](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/authentication_and_authorization/managing-pod-security-policies)

</div>
<div>

**Networking**
- [Configuring Routes & Ingress](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/networking/index)

**Operators**
- [Operators & OLM](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/operators/index)

**Observability**
- [Monitoring](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/monitoring/index)
- [Logging (LokiStack)](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/logging/index)

**GitOps**
- [Red Hat OpenShift GitOps (Argo CD)](https://docs.redhat.com/en/documentation/red_hat_openshift_gitops)

</div>
</div>

<!--
OCP version-pinned docs matter: features and defaults change between minor releases.
Always link 4.20 (or the cluster's actual version), not a generic "latest" URL.
For certification paths: EX280 (Administrator) and the DO180/DO280/DO380 course series.
-->

---
layout: end
---

# Thank You

Questions? Feedback?

<!--
Point attendees to the resource list in their lab environment.
Remind them that the slides will be shared as PDF after the session.
-->
