# Prompt: Generate a Workshop Chapter

Use this prompt template to generate a complete Slidev chapter for the OCP Workshop.
Fill in the variables below, then send the completed prompt to the AI.

---

## Variables to Fill In

```
CHAPTER_NUMBER:  [01 | 02 | 03 | 04]
CHAPTER_TITLE:   [e.g. "Linux Containers"]
CHAPTER_SUBTITLE:[e.g. "Namespaces, cgroups, images, and runtimes"]
AUDIENCE:        Linux administrators, application ops engineers, SREs
DURATION:        90 minutes including labs
TOPICS:          [comma-separated list of major topics]
NUM_LABS:        [minimum 2]
LAB_ENVIRONMENT: RHEL 9, Podman 4.x, kubectl 1.28+, oc 4.14+
```

---

## Prompt Template

```
You are generating slide content for a technical workshop chapter.
Read CLAUDE.md in the project root before writing any content — it contains
the slide type reference, component usage, and content guidelines you must follow.

Generate a complete Slidev chapter file for `chapters/{{CHAPTER_NUMBER}}-*/slides.md`.

Chapter details:
- Number: {{CHAPTER_NUMBER}}
- Title: {{CHAPTER_TITLE}}
- Subtitle: {{CHAPTER_SUBTITLE}}
- Audience: {{AUDIENCE}}
- Duration: {{DURATION}}
- Major topics to cover: {{TOPICS}}
- Number of lab exercises: {{NUM_LABS}} (minimum)
- Lab environment: {{LAB_ENVIRONMENT}}

Requirements:
1. Start with a `chapter-title` layout slide (props: chapter, title, subtitle).
2. Follow with a "What We'll Cover" slide using <v-clicks>.
3. Organize content into 3–5 major sections, each starting with a `section` layout.
4. Use `two-cols-code` layout for any slide showing a command alongside explanation.
5. Include at least {{NUM_LABS}} lab exercises using the `lab-exercise` layout.
   - Each lab: clear numbered objectives, step-by-step bash commands, facilitator note in <!-- -->.
   - All commands must run on {{LAB_ENVIRONMENT}}.
6. End with a `center` layout summary slide with <v-clicks> bullets and <ProgressBar />.
7. Every slide must have at least one sentence of speaker notes in <!-- -->.
8. Complex code (>10 lines) goes in a snippet file — reference it as:
   <<< @/chapters/{{CHAPTER_NUMBER}}-*/snippets/filename.sh bash {lines}
   List each snippet file's content separately after the slides.md.
9. Do not use "Hello World" examples. Use realistic operational scenarios.
10. Assume the audience knows bash and Linux basics. Do not over-explain.

Output format:
- First: the complete `slides.md` content, fenced in triple backticks with language `markdown`.
- Then: each snippet file, labeled with its path and fenced in triple backticks.
```

---

## Example Usage

Fill in and send:

```
CHAPTER_NUMBER:  02
CHAPTER_TITLE:   Linux Containers
CHAPTER_SUBTITLE:Namespaces, cgroups, images, and runtimes
TOPICS:          Linux namespaces, cgroups v2, OCI images, Podman, container registries
NUM_LABS:        2
```
