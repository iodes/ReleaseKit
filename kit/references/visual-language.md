# Quiet product illustration

This is an original, brand-neutral visual language for product release notes. Its purpose is recognition: a reader should understand which capability changed before reading the paragraph. Translate external references into abstract design decisions. Keep reference-company names, reference-site URLs, attributed styles, recognizable unrelated products, and copied artwork out of briefs and generated assets.

## Start with the change, then choose the picture

Read the end-state diff and the product context. Write a one-sentence visual message: what the user can now do, what changed, and which visible detail proves it. Separate established product facts from an illustrative metaphor. Do not turn an internal refactor into a new feature, or invent a control path, metric, security guarantee, or device to make an image more interesting.

Select the simplest useful archetype in [composition-recipes.md](composition-recipes.md). A release can mix archetypes while sharing the same canvas treatment and restraint. A UI workflow deserves a UI fragment; a generic shield cannot explain a new selection interaction. Conversely, a routine status notice rarely needs a complete application dashboard.

Choose [generated or supplied media](media-sources.md) before rendering. Generate restrained flat explanations; use actual captures, photographs, or approved artwork when the appearance itself is the subject. Physical details and content previews require supplied images. A missing source stays pending; a fictional written scene is not a replacement for an actual product or content capture.

For each standalone note, derive the scene from that feature independently. Grouped minor notes follow [common-image reuse](common-images.md), keeping one generic scene per kind across releases and languages instead of deriving a new scene from each bullet list. Describe the relevant state and relationships: a control's state, two capabilities' association, a physical assembly, spatial connections, data proportions, or the announced content. Record supported facts and limits in `context`; write concrete correctness constraints in `composition`, `preserve`, and `avoid`. Those constraints are local to the note. A worked example supplies a reasoning pattern, not a layout to apply to other features. The agent chooses the representation and reviews its meaning; the CLI compiles the chosen brief and validates files.

## Composition grammar

- Use a landscape canvas, normally 1280 × 800 (8:5). This is an illustration asset, not a screenshot of the release-note viewer. Keep the heading, release number, paragraph, back navigation, and outer page chrome outside the image.
- Keep one focal idea. Let the archetype determine subject size: compact symbols need substantial empty space; UI fragments and spatial views can occupy most of the frame. Do not apply a single occupancy rule to every asset.
- Center compact subjects optically. For an interaction, center the changed control or the gesture's result rather than a large irrelevant panel.
- Keep essential content about 6% away from edges. A deliberate bottom crop of a device or side crop of a list can increase readability; accidental clipped icons, labels, and action targets cannot.
- Reduce irrelevant UI labels to neutral bars of varied length. Keep alignment, padding, hierarchy, groupings, and interaction topology recognizable. Avoid uniform skeleton placeholders that obscure the actual action.
- Preserve the relationships that make this feature correct. Specify containment and selected state for controls, fixed and changing parts for transitions, assembly and contact for objects, connections for spatial views, and quantitative relationships for charts. Apply only relationships relevant to the actual subject.
- Treat the scene's visible-element inventory as complete. Keep schematic elements abstract; do not invent additional content or decoration. Include authentic photographic or detailed content when the brief calls for it.
- An authentic photo, product material, map layer, or content preview can keep natural detail and color. Most surrounding interface scaffolding should remain quiet.
- Quiet does not always mean sparse. A map may retain many fine streets at low contrast so its subject still reads as geography; establish hierarchy through value and line weight before removing useful structure. Use the selected recipe's scale and density, not a universal icon-like simplification.
- Use one viewpoint. UI crops are normally straight-on; spatial relationships can use an orthographic or elevated camera; a physical detail can use a restrained three-quarter angle.

## Value, depth, and materials

Separate the canvas, base surface, raised surface, primary symbol, secondary detail, and divider. These are semantic roles, not a global color filter. The project defines their dark and light values.

On dark backgrounds, distinguish charcoal layers and use mid-light neutral symbols. Do not crush a dark object into the canvas or turn every small glyph pure white. On light backgrounds, use near-white space, subtle gray separation, and medium-gray symbols with lighter supporting details. Do not use charcoal glyphs or dark placeholder bars by default. A dark device or natural photo may stay dark in a light presentation.

For icons, use a compact flat rounded-square tile with a neutral monochrome filled glyph and clear negative space. A typical tile occupies 20–24% of the canvas width, with the glyph around 50–65% of the tile width. Keep broad margins, uniform background fills, and related corner radii. Use color only when the feature gives it a functional meaning. Do not default to a colored badge, physical object, or modeled icon.

Flat icons and symbol pairs have no perspective, extrusion, material texture, gradients, lighting, or shadows. Simplified interfaces may use restrained layer separation where it explains the actual control hierarchy. Preserve shading already present in supplied media. Do not add sculpted objects, decorative 3D, studio lighting, glass, glow, or bevels to generated release illustrations.

## Assign neutral colors by role

Use the release's captured palette as the source of truth. The default light palette deliberately uses a narrow neutral hierarchy:

| Role | Default light value | Assignment |
| --- | --- | --- |
| `canvas` | `#F8F8F8` | Uniform background |
| `surface` | `#FFFFFF` | Base panels and resting rows |
| `raised` | `#ECECEC` | Quiet tiles, inset areas, and abstract thumbnails |
| `primary` | `#999999` | Main glyphs and feature-defining marks |
| `secondary` | `#B8B8B8` | Incidental label bars and supporting detail |
| `divider` | `#D9D9D9` | Thin separators and necessary boundaries |

Map visible schematic groups to these roles in `composition`; do not choose a fresh gray for each object or each image. Equivalent label bars share `secondary`; a second tone needs an actual hierarchy in the feature. Use the configured values, including explicit project overrides, instead of copying hex values from a worked example. Keep uniform flat fills without arbitrary warm or cool casts, opacity washes, gradients, or invented shading. Antialiased edges can contain intermediate pixels.

Light illustrations explain shapes and relationships without the contrast of a text document. If something is unclear at card size, improve silhouette, spacing, stroke width, scale, or crop first. Do not globally darken glyphs and placeholder bars or introduce shadows to make every element sharper. Preserve authentic dark hardware, supplied UI, content colors, and justified semantic colors; the neutral role map applies to generated schematic elements.

Review same-role objects across the release's light images together, not only each dark/light pair. A successful decode and matching dimensions do not validate the palette or visual weight.

## Color has a job

Start with a fully neutral composition. Establish the focal point through placement, scale, shape, spacing, and value contrast. An image can be complete without any accent, and a release can contain many entirely neutral images. A new feature, an important capability, or the main subject does not by itself represent an active or selected state.

Treat the project accent as an available color, not an instruction to use it. Add it only when a specific supported state, action, or information distinction needs color to explain the change: for example, an enabled switch, a selected item, a revealed action, or an active route. Even an interaction can remain neutral when its geometry and value contrast already make it clear. Keep the colored area confined to that meaningful element; leave unrelated glyphs, tiles, and supporting surfaces neutral.

In the shared scene's `composition`, explicitly state either that no accent is used or which element uses it and what it communicates. Preserve that assignment, including the absence of accent, in both themes. Do not invent a selection, badge, status dot, or secondary marker to justify color. For `icon-tile`, ordinary capability and maintenance symbols stay neutral. For `symbol-pair`, a simple association uses the same neutral treatment for both symbols.

Preserve established meanings such as warnings, completed states, traffic or map semantics, chart categories, and authentic content colors between themes. These colors belong to supported information; a generic improvement or security note is not itself a success or protection status.

Functional color remains available for colorful features. A supplied capture of a creative tool can retain its colorful output. A spatial view can require several functional colors. Actual content artwork retains its original appearance. The color should belong to the feature, rather than decorate a routine release card.

## Language independence

Keep illustrations reusable across locales. Put release copy in Markdown and alt text in each locale. Omit readable text and numbers by default. If a short label or numeric value is indispensable, include it verbatim in the brief's `text` list and trace it to evidence or an explicitly illustrative example. Do not let the model fabricate microcopy, timestamps, status-bar details, or statistics.

The generator may use neutral bars in place of labels, but it must preserve the hierarchy and shape of the real workflow. If exact UI fidelity matters, use a supplied product capture as evidence and describe the specific simplification to make. Do not fabricate a light product UI merely because the output canvas is light.

## Scene brief contract

Each image-enabled note has one shared scene in `visuals/<note>.yaml`:

- `archetype`: the selected recipe.
- `source`: `generated` for a flat explanation or `provided` for an existing capture/image; physical details and content previews require `provided`.
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

Inspect the selected image at full resolution and at roughly 350 pixels wide. First compare the image with the release note, product evidence, and scene-specific constraints; use the chosen recipe's correctness checks. Then assess whether the changed capability reads in a moment, the focal object remains distinct, incidental detail stays subordinate, and every explicit label and crop is correct. For each accent, identify the supported meaning that would become less clear without it; if there is none, remove it. Review the release images together for repeated decorative accents. Do not give every note one colored point or enforce a fixed quota of colored images. Attractive styling and theme similarity do not establish factual or structural correctness.

For a pair, compare both outputs side by side using [theme-pairing.md](theme-pairing.md). Automated checks establish file integrity, dimensions, configured variants, and scene freshness; they do not prove visual correspondence or truthfulness. Correct a specific defect with a targeted edit instead of randomly regenerating every asset. Preserve unrelated accepted assets. Import a reviewed replacement into the same note and theme slot so unused older managed files are removed; keep the previous selection until that import succeeds.
