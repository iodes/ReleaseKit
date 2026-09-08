---
name: releasekit-image
description: Create, revise, or import ReleaseKit release illustrations with consistent composition and project-configured dark and light variants. Use for visual release-note assets and generation prompts, not general UI implementation or arbitrary image work.
---

Read the release's captured visual policy and the affected note. Read [the visual language](references/visual-language.md), choose the applicable [composition recipe](references/composition-recipes.md), and use [the pairing guide](references/theme-pairing.md) for configured themes, cost-aware reuse, and importing images. Consult [the file contract](references/format.md) when editing a brief.

Derive one visual message from the release note and its Git/product evidence. Choose an archetype for that message; the scaffold deliberately leaves it unselected. A status symbol, relationship, interface control, physical detail, spatial view, chart, or content scene each needs different geometry and review criteria. Examples illustrate individual features, not a default layout to copy.

Complete one shared scene brief before generating. Encode product facts and uncertainties in `context`, the relevant state and relationships in `composition`, and the feature-specific correctness constraints in `preserve` and `avoid`. Keep reference identities and attributed style names out of prompts and assets. Inspect product references as evidence. Do not invent a concrete UI or physical design to fill missing evidence; use a supported abstraction or leave the unresolved detail in the brief.

Run `releasekit image plan <version>` and inspect the pending asset count. Generate only the requested missing or stale variants with the image tools available to the current agent. Review and import the first variant before planning its counterpart, so a composition reference is available. Keep layout, state, semantic color, and content consistent across the pair. Do not invert or duplicate a file to simulate a second theme.

If no image generator is available, preserve the generated prompt files and report the pending assets. Continue independent editorial work. Do not silently call a paid API, install a provider, or replace requested raster illustrations with placeholders. Import user-supplied PNG, JPEG, or WebP files when they become available.

Inspect selected images at full resolution and small-card size. First compare the image with the note, product evidence, and scene-specific constraints using the selected recipe's review criteria. Then check visual clarity and theme correspondence. The CLI checks files and metadata; it does not decide whether an image truthfully depicts the feature. Two matching variants can share the same factual or structural mistake. Correct a defect in its own scene or applicable recipe; promote it into common guidance only when the principle applies across features.
