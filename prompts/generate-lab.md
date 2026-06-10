# Prompt: Generate a Lab Exercise

Use this prompt to generate a single lab exercise slide (and its solution slide).
The output can be pasted directly into a chapter's `slides.md`.

---

## Variables to Fill In

```
LAB_NUMBER:    [e.g. 2.1]
LAB_TITLE:     [e.g. "Run Your First Container"]
DURATION:      [e.g. 15 min]
TOPIC:         [what skill or concept the lab practices]
OBJECTIVES:    [comma-separated list of 2–4 things the learner will do]
TOOLS:         [tools available in the lab environment]
DIFFICULTY:    [beginner | intermediate | advanced]
```

---

## Prompt Template

```
You are generating a lab exercise slide for the OCP Workshop.
Read CLAUDE.md in the project root for component usage and content rules.

Generate a lab exercise using the `lab-exercise` layout for the following scenario:

- Lab number: {{LAB_NUMBER}}
- Title: {{LAB_TITLE}}
- Duration: {{DURATION}}
- Topic: {{TOPIC}}
- Objectives: {{OBJECTIVES}}
- Available tools: {{TOOLS}}
- Difficulty: {{DIFFICULTY}}

Requirements:
1. Use the `lab-exercise` layout with props: lab, title, duration.
2. List objectives as a numbered list (2–4 items max).
3. Provide step-by-step bash commands. Each step has a comment explaining it.
4. All commands must be copy-paste ready and work on RHEL 9 / UBI 9.
5. Include a <TipBox> hint if the lab has a non-obvious step.
6. Add a facilitator note in <!-- --> covering: expected outcome, common mistakes.
7. After the lab slide, generate a Solution slide:
   - layout: default
   - Shows the complete solution with expected output as bash comments.
   - Preceded by a <TipBox type="note"> saying "Try it yourself first."

Output: two complete Slidev slide blocks (lab + solution), fenced in triple backticks.
```

---

## Example Usage

```
LAB_NUMBER:  2.1
LAB_TITLE:   Run Your First Container
DURATION:    15 min
TOPIC:       Running and inspecting containers with Podman
OBJECTIVES:  Pull a UBI image, run a container interactively, inspect namespaces
TOOLS:       podman 4.x, lsns, nsenter, ip
DIFFICULTY:  beginner
```
