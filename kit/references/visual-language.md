# Quiet product illustration

This is an original, brand-neutral visual language for product release notes. Its purpose is recognition: a reader should understand which capability changed before reading the paragraph. Translate external references into abstract design decisions. Keep reference-company names, reference-site URLs, attributed styles, recognizable unrelated products, and copied artwork out of briefs and generated assets.

## Start with the change, then choose the picture

Read the end-state diff and the product context. Write a one-sentence visual message: what the user can now do, what changed, and which visible detail proves it. Separate established product facts from an illustrative metaphor. Do not turn an internal refactor into a new feature, or invent a control path, metric, security guarantee, or device to make an image more interesting.

Select the simplest useful archetype in [composition-recipes.md](composition-recipes.md). A release can mix archetypes while sharing the same canvas treatment and restraint. A UI workflow deserves a UI fragment; a generic shield cannot explain a new selection interaction. Conversely, a routine status notice rarely needs a complete application dashboard.

For each note, derive the scene from that feature independently. Describe the relevant state and relationships: a control's state, two capabilities' association, a physical assembly, spatial connections, data proportions, or the announced content. Record supported facts and limits in `context`; write concrete correctness constraints in `composition`, `preserve`, and `avoid`. Those constraints are local to the note. A worked example supplies a reasoning pattern, not a layout to apply to other features. The agent chooses the representation and reviews its meaning; the CLI compiles the chosen brief and validates files.

## Composition grammar

- Use a landscape canvas, normally 1280 × 800 (8:5). This is an illustration asset, not a screenshot of the release-note viewer. Keep the heading, release number, paragraph, back navigation, and outer page chrome outside the image.
- Keep one focal idea. Let the archetype determine subject size: compact symbols need substantial empty space; UI fragments and spatial views can occupy most of the frame. Do not apply a single occupancy rule to every asset.
- Center compact subjects optically. For an interaction, center the changed control or the gesture's result rather than a large irrelevant panel.
- Keep essential content about 6% away from edges. A deliberate bottom crop of a device or side crop of a list can increase readability; accidental clipped icons, labels, and action targets cannot.
- Reduce irrelevant UI labels to neutral bars of varied length. Keep alignment, padding, hierarchy, groupings, and interaction topology recognizable. Avoid uniform skeleton placeholders that obscure the actual action.
- Preserve the relationships that make this feature correct. Specify containment and selected state for controls, fixed and changing parts for transitions, assembly and contact for objects, connections for spatial views, and quantitative relationships for charts. Apply only relationships relevant to the actual subject.
- Treat the scene's visible-element inventory as complete. Keep schematic elements abstract; do not invent additional content or decoration. Include authentic photographic or detailed content when the brief calls for it.
- An authentic photo, product material, map layer, or content preview can keep natural detail and color. Most surrounding interface scaffolding should remain quiet.
- Use one viewpoint. UI crops are normally straight-on; spatial relationships can use an orthographic or elevated camera; a physical detail can use a restrained three-quarter angle.

## Value, depth, and materials

Separate the canvas, base surface, raised surface, primary symbol, secondary detail, and divider. These are semantic roles, not a global color filter. The project defines their dark and light values.

On dark backgrounds, distinguish charcoal layers and use mid-light neutral symbols. Do not crush a dark object into the canvas or turn every small glyph pure white. On light backgrounds, use near-white space, subtle gray separation, and darker neutral symbols. A dark device or natural photo may stay dark in a light presentation.

Prefer filled silhouettes and consistent medium-weight strokes that survive reduction. A symbol may sit on a rounded tile, stand alone, or carry one small status badge. Keep corner radii and line weights related across a release.

Use soft contact shadows where they explain separation. Restrained gradient modeling can clarify a lens, button, material, or native application icon. Avoid decorative glass, broad atmospheric gradients, cinematic glow, heavy bevels, and glossy objects that have no relationship to the feature.

## Color has a job

Use the project accent for the changed control, selected item, active route, or direct interaction cue. Do not color every surface. Preserve established meanings such as warnings, completed states, traffic or map semantics, and authentic content colors between themes.

Limited color is a default for interface explanation, not a prohibition on colorful features. A newly announced creative tool can show colorful output. A spatial view can require several functional colors. A content or seasonal experience can support a full scene. The color should belong to the feature, rather than decorate a routine release card.

## Language independence

Keep illustrations reusable across locales. Put release copy in Markdown and alt text in each locale. Omit readable text and numbers by default. If a short label or numeric value is indispensable, include it verbatim in the brief's `text` list and trace it to evidence or an explicitly illustrative example. Do not let the model fabricate microcopy, timestamps, status-bar details, or statistics.

The generator may use neutral bars in place of labels, but it must preserve the hierarchy and shape of the real workflow. If exact UI fidelity matters, use a supplied product capture as evidence and describe the specific simplification to make. Do not fabricate a light product UI merely because the output canvas is light.

## Scene brief contract

Each image-enabled note has one shared scene in `visuals/<note>.yaml`:

- `archetype`: the selected recipe.
- `subject`: the actual feature or its justified visual metaphor.
- `message`: the user-visible change, in one sentence.
- `focus`: the exact part a reader should notice first.
- `composition`: explicit placement, scale, crop, camera, and surrounding context.
- `context`: product facts and any limits on what the image can claim.
- `elements`: a short inventory of visible objects or UI groups.
- `preserve`: invariants shared by theme variants and revisions.
- `avoid`: exclusions specific to this scene.
- `text`: the only literal labels permitted in the raster; normally empty.
- `references`: portable project-relative files to inspect before generation.

Make the brief concrete enough that another model can render the same scene. “Clean, modern, minimal” alone is not a useful composition specification. State the subject's anchors, grouping, relationships, and any allowed change in state, as well as the safe margin. A chart may need fixed category proportions; a device detail may need a preserved attachment point; a setting may need one enabled control with its associated fields. Read only the worked brief relevant to the current feature.

## Review the actual output

Inspect the selected image at full resolution and at roughly 350 pixels wide. First compare the image with the release note, product evidence, and scene-specific constraints; use the chosen recipe's correctness checks. Then assess whether the changed capability reads in a moment, the focal object remains distinct, incidental detail stays subordinate, and every explicit label and crop is correct. Attractive styling and theme similarity do not establish factual or structural correctness.

For a pair, compare both outputs side by side using [theme-pairing.md](theme-pairing.md). Automated checks establish file integrity, dimensions, configured variants, and scene freshness; they do not prove visual correspondence or truthfulness. Correct a specific defect with a targeted edit instead of randomly regenerating every asset. Preserve accepted files and import the newly selected version.
