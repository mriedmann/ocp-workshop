# OCP Workshop — AI Agent Guide

## Project Purpose

A full-day technical workshop slide deck built with [Slidev](https://sli.dev/). Target audience: Linux administrators, application operations engineers, and SREs. The workshop builds from Linux fundamentals to deploying applications on OpenShift.

**Four modules (chapters):**
1. Linux Fundamentals — processes, filesystem, networking, systemd
2. Linux Containers — namespaces, cgroups, Docker/Podman, images, registries
3. Kubernetes — pods, deployments, services, ingress, config/secrets
4. OpenShift — OCP architecture, routes, builds, DeploymentConfigs, RBAC

## Directory Structure

```
ocp-workshop/
├── slides.md                 Root entry: cover + agenda + src: imports of all chapters
├── global-bottom.vue         Persistent footer (slide counter). Root-level, auto-loaded by Slidev.
├── package.json              All dev/build/export scripts
├── .gitignore
│
├── chapters/
│   ├── 01-linux/
│   │   ├── slides.md         Standalone Slidev deck for chapter 1
│   │   └── snippets/         Runnable code files imported via <<< @/chapters/01-linux/snippets/foo.sh
│   ├── 02-containers/
│   ├── 03-kubernetes/
│   └── 04-openshift/
│
├── components/               Auto-imported Vue components — use in any slide without import
│   ├── LabBadge.vue          Red "LAB" pill badge
│   ├── TipBox.vue            Callout box: type="tip|note|warning|danger", optional title prop
│   ├── ProgressBar.vue       Chapter progress bar: :current="N" :total="4"
│   └── CommandBlock.vue      Dark terminal block: prompt prop (default "$")
│
├── layouts/                  Custom layouts — override theme layouts by name
│   ├── chapter-title.vue     Dark full-bleed chapter opener (props: chapter, title, subtitle)
│   ├── lab-exercise.vue      Blue header lab slide (props: lab, title, duration)
│   └── two-cols-code.vue     Prose left | code right (::right:: slot)
│
├── public/images/            Static assets — reference as /images/foo.png in slides
├── styles/custom.css         CSS variable overrides (auto-loaded by Slidev)
│
├── templates/
│   ├── chapter-template.md   Skeleton for a new chapter — copy and fill in TODOs
│   └── lab-template.md       Skeleton for a standalone lab exercise
│
└── prompts/
    ├── generate-chapter.md   Prompt template for generating a full chapter
    └── generate-lab.md       Prompt template for generating a single lab exercise
```

## Commands

```bash
npm run dev          # Full deck, hot reload, opens browser
npm run dev:ch01     # Chapter 1 only (fast, use when authoring a specific chapter)
npm run dev:ch02     # Chapter 2 only
npm run dev:ch03     # Chapter 3 only
npm run dev:ch04     # Chapter 4 only

npm run build        # Build full SPA to dist/full/
npm run build:ch01   # Build chapter 1 SPA to dist/ch01/
npm run build:all    # Build all five targets

npm run export       # Full deck PDF to dist/ocp-workshop.pdf
npm run export:ch01  # Chapter 1 PDF
npm run export:all   # All PDFs (requires playwright-chromium)
```

## Slide Type Reference

Every slide is separated by `---`. The first `---` block of a file is the **headmatter** (YAML frontmatter for that file). Subsequent `---` blocks open new slides with optional per-slide frontmatter.

### Chapter Title Slide

```markdown
---
layout: chapter-title
chapter: "02"
title: "Linux Containers"
subtitle: "Namespaces, cgroups, images, and runtimes"
---

<!--
Speaker note: Context for this chapter, what they'll be able to do after.
-->
```

### Section Divider

```markdown
---
layout: section
---

# Namespaces
```

### Content Slide (default layout)

```markdown
---

## Slide Heading

- First point — keep bullets short, max one line
- Second point
- Third point

<!--
Speaker note: elaboration, examples, context not on the slide.
-->
```

### Animated Bullet List

```markdown
---

## What We'll Cover

<v-clicks>

- Point revealed on click 1
- Point revealed on click 2
- Point revealed on click 3

</v-clicks>
```

### Two-Column: Prose + Code

```markdown
---
layout: two-cols-code
---

## Inspecting Namespaces

Every container gets its own:
- PID namespace
- Network namespace
- Mount namespace

::right::

```bash {1|3-5|7}
# List namespaces for a process
lsns -p $$

# Enter a container's network ns
nsenter -t <PID> -n \
  ip link show

# List all net namespaces
ip netns list
```

```

### Code Demo (full-width)

```markdown
---

## Building an Image

```dockerfile {all|1|3-5|7-8}
FROM ubi9/ubi-minimal:latest

RUN microdnf install -y nginx && \
    microdnf clean all

COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

```

### Import Code from Snippet File

```markdown
<<< @/chapters/02-containers/snippets/dockerfile.example dockerfile {1|3-5}
```

Snippet files live in `chapters/NN-*/snippets/` and should be valid, runnable files.

### Lab Exercise Slide

```markdown
---
layout: lab-exercise
lab: "2.1"
title: "Run Your First Container"
duration: "15 min"
---

## Objectives

1. Pull and run a UBI 9 container image
2. Inspect its PID and network namespaces
3. Build a simple image with Podman

## Steps

```bash
# Pull the image
podman pull registry.access.redhat.com/ubi9/ubi-minimal

# Run interactively
podman run -it ubi9/ubi-minimal bash

# Inside the container — observe the isolated environment
ls /proc
ip link show
exit
```

<!--
Walk around during the lab. Common issue: registry auth on lab VMs.
Solution: podman login registry.access.redhat.com
-->
```

### Chapter Summary Slide

```markdown
---
layout: center
---

## Chapter 2 Summary

<v-clicks>

- Containers are Linux processes with namespace isolation
- cgroups limit CPU, memory, and I/O per container
- Container images are layered filesystems (OCI format)
- Podman is a daemonless drop-in for Docker on RHEL

</v-clicks>

<div class="mt-8">
  <ProgressBar :current="2" :total="4" />
</div>

<!--
5 minute break. Next: Kubernetes.
-->
```

### Using Components

```markdown
<!-- TipBox: types are tip (blue), note (gray), warning (amber), danger (red) -->
<TipBox type="warning" title="RHEL 9 and cgroup v2">
  cgroup v2 is the default on RHEL 9. Some older Docker CLI flags differ.
</TipBox>

<!-- CommandBlock: for commands that need to stand out on lab slides -->
<CommandBlock>podman run -it ubi9/ubi-minimal bash</CommandBlock>

<!-- LabBadge: inline marker linking to a lab -->
See <LabBadge /> 2.1 for hands-on practice.
```

## How to Add a New Chapter

1. Create `chapters/05-newchapter/` and `chapters/05-newchapter/snippets/`
2. Copy `templates/chapter-template.md` to `chapters/05-newchapter/slides.md`
3. Fill in all `<!-- TODO: -->` placeholders
4. Add a new `src:` import block in `slides.md`:
   ```markdown
   ---
   src: ./chapters/05-newchapter/slides.md
   ---
   ```
5. Add a new dev/build/export script to `package.json`
6. Verify: `npm run dev:ch05`

## Content Guidelines

- **Audience:** Linux admins and SREs. Assume comfort with bash, systemd, file permissions. Do not explain what a terminal is.
- **Tone:** Direct and practical. No marketing language. Explain the "why" (not just "how").
- **Depth:** Intermediate. Cover real operational scenarios, not toy examples.
- **Code:** All shell examples must run on RHEL 9 / UBI 9. All YAML must be valid.
- **Labs:** Minimum 2 labs per chapter. Each lab must have: clear objectives, numbered steps, runnable commands.
- **Speaker notes:** Every slide should have at least one sentence of speaker notes in `<!-- -->`.
- **Slide length:** Max ~8 bullet points or ~20 lines of code per slide. Split if longer.
- **Snippets:** Complex code examples (>10 lines) go in `chapters/NN-*/snippets/` and are imported with `<<< @/...`.
