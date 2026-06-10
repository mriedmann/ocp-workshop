SLIDEV := npx slidev
DIST   := dist

# Auto-discover every chapter that has a slides.md
CHAPTER_NAMES  := $(patsubst chapters/%/slides.md,%,$(wildcard chapters/*/slides.md))

CHAPTER_PDFS   := $(addprefix $(DIST)/ch,$(addsuffix .pdf,$(CHAPTER_NAMES)))
CHAPTER_BUILDS := $(addprefix $(DIST)/ch,$(CHAPTER_NAMES))
FULL_PDF       := $(DIST)/ocp-workshop.pdf

.PHONY: all pdfs builds present dev clean \
        $(addprefix dev-,$(CHAPTER_NAMES))

# ── Default ──────────────────────────────────────────────────────────────────

all: pdfs

# ── Present (full deck, opens browser) ───────────────────────────────────────

present:
	$(SLIDEV) slides.md --open --remote --tunnel

# ── Development (hot-reload) ─────────────────────────────────────────────────

dev:
	$(SLIDEV) slides.md --open

# Per-chapter dev targets: make dev-01-linux, make dev-02-containers, …
define CHAPTER_DEV_RULE
dev-$(1):
	$(SLIDEV) chapters/$(1)/slides.md --open
endef
$(foreach ch,$(CHAPTER_NAMES),$(eval $(call CHAPTER_DEV_RULE,$(ch))))

# ── PDF exports ───────────────────────────────────────────────────────────────

pdfs: $(FULL_PDF) $(CHAPTER_PDFS)

$(DIST):
	mkdir -p $@

$(FULL_PDF): slides.md | $(DIST)
	$(SLIDEV) export $< --output $@ --with-toc

$(DIST)/ch%.pdf: chapters/%/slides.md | $(DIST)
	$(SLIDEV) export $< --output $@

# ── SPA builds ────────────────────────────────────────────────────────────────

builds: $(DIST)/full $(CHAPTER_BUILDS)

$(DIST)/full: slides.md | $(DIST)
	$(SLIDEV) build $< --out $@

$(DIST)/ch%: chapters/%/slides.md | $(DIST)
	$(SLIDEV) build $< --out $@

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean:
	rm -rf $(DIST)
