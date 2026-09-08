---
name: releasekit-image
description: Create, revise, or import ReleaseKit release illustrations with consistent composition and project-configured dark and light variants. Use for visual release-note assets and generation prompts, not general UI implementation or arbitrary image work.
---

Read the release's captured visual policy and the affected note. Read [the visual language](references/visual-language.md), choose the applicable [composition recipe](references/composition-recipes.md), and use [the pairing guide](references/theme-pairing.md) for configured themes, cost-aware reuse, and importing images. Consult [the file contract](references/format.md) when editing a brief.

Complete one shared scene brief before generating. Keep reference identities and attributed style names out of prompts and assets. Encode the actual feature, focal detail, geometry, materials, and constraints. Use project-appropriate original subjects. Inspect product reference files as evidence.

Run `releasekit image plan <version>` and inspect the pending asset count. Generate only the requested missing or stale variants with the image tools available to the current agent. Review and import the first variant before planning its counterpart, so a composition reference is available. Keep layout, state, semantic color, and content consistent across the pair. Do not invert or duplicate a file to simulate a second theme.

If no image generator is available, preserve the generated prompt files and report the pending assets. Continue independent editorial work. Do not silently call a paid API, install a provider, or replace requested raster illustrations with placeholders. Import user-supplied PNG, JPEG, or WebP files when they become available.

Inspect selected images at full resolution and small-card size. Check the pair by sight; automated checks do not establish visual correspondence. Use a targeted revision for a specific defect and preserve accepted files.
