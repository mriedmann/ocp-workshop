---
name: run-ocp-workshop
description: Run, screenshot, and interact with the ocp-workshop Slidev presentation. Use when asked to start, run, screenshot, preview, or export slides for the Linux-to-OpenShift workshop.
---

# run-ocp-workshop

This is a Slidev presentation project (`ocp-workshop`). It has a full combined deck (`slides.md`) and four chapter decks under `chapters/`. The driver is `.claude/skills/run-ocp-workshop/driver.mjs` — a Node.js script that starts the dev server, takes screenshots via `playwright-chromium` (already installed), and handles PDF export.

All commands run from the project root (`/home/riedmi/projects/ocp-workshop`).

## Prerequisites

No OS package installs needed. `playwright-chromium` and Slidev are already in `node_modules`. Chromium is at:

```
/home/riedmi/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome
```

## Run (agent path)

### Smoke test (start + screenshot slide 1 + count + stop)

```bash
node .claude/skills/run-ocp-workshop/driver.mjs full 3030 smoke
```

### Start server (leaves running)

```bash
node .claude/skills/run-ocp-workshop/driver.mjs full 3030 start
# → http://localhost:3030/          main slides
# → http://localhost:3030/overview  all slides grid
# → http://localhost:3030/presenter presenter view
```

### Chapter decks

Deck names: `full` `ch01` `ch02` `ch03` `ch04`. Each maps to its `chapters/XX-*/slides.md`.

```bash
node .claude/skills/run-ocp-workshop/driver.mjs ch01 3031 start
```

### Screenshot a slide

```bash
node .claude/skills/run-ocp-workshop/driver.mjs full 3030 screenshot 5
# → /tmp/slidev-ss/slide-5.png
```

### Get slide count

```bash
node .claude/skills/run-ocp-workshop/driver.mjs full 3030 count
# prints title + stats bar from overview page
```

### Export to PDF

```bash
node .claude/skills/run-ocp-workshop/driver.mjs full 3030 export dist/ocp-workshop.pdf
# wraps: npx slidev export slides.md --output dist/ocp-workshop.pdf
```

### Stop server

```bash
node .claude/skills/run-ocp-workshop/driver.mjs full 3030 stop
```

## Run (human path)

```bash
npm run dev          # full deck, opens browser
npm run dev:ch01     # ch01 only
npm run build:all    # build all decks to dist/
npm run export:all   # export all to PDF
```

## Gotchas

**chapter-title slides appear blank in Playwright screenshots.** The custom `layouts/chapter-title.vue` uses `background: linear-gradient(#151515, #1a2e44)` with white text. Headless Chromium with `--disable-gpu` does not render CSS gradients — the background is transparent, the white text is invisible. Affected slides are chapter dividers only (e.g. slide 4 in the full deck). Navigate to the slide *after* the chapter title (e.g. slide 5) to get a content slide. The Slidev built-in `export` command renders them correctly (it uses its own Playwright instance without `--disable-gpu`).

**Chapter deck layouts require the project root as CWD.** The `layouts/` and `components/` directories live at the project root. Slidev v52 resolves these relative to the entry file's directory, so if you start a chapter deck without being at the project root, custom layouts fall back to `default`. The driver always runs from the project root, so this is handled automatically.

**`npx slidev` resolves to global install inside chapter dirs.** The server output may show `Slidev (global)` instead of the local version when the CWD is different from where `node_modules` lives. The driver passes the correct entry path so this is cosmetic only.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `EADDRINUSE` on start | Run the `stop` command first: `node driver.mjs full 3030 stop` |
| Screenshot is all white | The slide uses `chapter-title` layout. Navigate to `slideN+1` for a content slide. |
| `Cannot find module 'playwright-chromium'` | Run `npm install` from the project root |
| Export hangs | Slidev export starts its own server on a random port. Ensure port 3030 is free (it avoids it but pick a clean env). |
