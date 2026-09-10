# Release illustration — light

## Intent
Create one finished raster illustration for a product release note. Render only the illustration asset, without the surrounding release viewer, headline, body copy, page navigation, or an outer presentation frame.
User-visible change: A category breakdown shows how saved files use storage.
Subject: A storage breakdown with three categories
Focal detail: One stacked bar and its matching category legend
Context: Fictional view illustration. The proportions 20, 30, and 50 percent are explicitly illustrative and are not measurements or a claim of improved storage efficiency.

## Composition contract
Archetype: data-view
Target canvas: 1280 × 800 pixels; landscape 1280:800. Produce a single image, not a dark/light collage.
Focus on one panel or device showing one dominant visualization and a few supporting rows. Give the primary metric or interaction clear breathing room.
Specific scene layout: A single panel occupies about 68 percent of an 8:5 canvas width. One horizontal stacked bar contains three contiguous segments with lengths in the ratio 2:3:5. Below it, three equally spaced legend items appear in the same order as the segments. Each legend item has one matching swatch and an abstract label bar. The first two categories use distinguishable neutral values; the largest category uses the accent. Omit literal numbers, axes, trend lines, and unrelated controls.
Elements:
- One panel
- One stacked bar containing exactly three contiguous segments
- Three matching legend swatches with abstract label bars

## Visual treatment
Use sparse neutral chart scaffolding and use the assigned accent to make the scene's focal series, selected value, or category comparison easy to locate, with matching legend semantics. Preserve an explicitly neutral presentation when appropriate. Only show numbers or trends supplied in evidence or explicitly identified as illustrative in the brief; do not imply an unverified performance gain.
Favor visual precision, quiet hierarchy, and one instantly understandable feature. Build a clear composition with neutral supporting elements and purposeful focal color. Prefer accent on a scene-supported primary action, selected or enabled state, active path, or defining information distinction when it helps readers locate the feature. Color need not be indispensable to comprehension. Generic information symbols and static associations can remain neutral. Small-screen clarity takes priority over decorative detail. Treat the specified element inventory as complete. Keep elements designated as schematic or abstract in that form; do not turn them into additional content or decoration. Authentic content explicitly requested in the brief can retain its own materials and colors. Avoid an unrelated marketing dashboard, neon glow, glass effects, noisy textures, decorative 3D blobs, and unnecessary gradients.

## Light theme roles
| Role | Color | Assignment |
| --- | --- | --- |
| canvas | #F8F8F8 | Uniform illustration background |
| surface | #FFFFFF | Base or recessed interface panels |
| raised | #ECECEC | Foreground panels, controls, and quiet tile fills |
| primary | #999999 | Main neutral glyphs, focal controls, and feature-defining marks |
| secondary | #B8B8B8 | Supporting glyphs, incidental bars, and abstract content |
| divider | #D9D9D9 | Thin separators and necessary surface boundaries |
Use these configured roles consistently across the scene and release. Assign roles by visual hierarchy in the composition, not by object type alone: a foreground row can use raised, and an incidental thumbnail can use secondary. Keep equivalent roles consistent across the release. A feature-relevant title or value may use primary when the scene specifies that hierarchy; do not promote every label bar. Repeated elements with the same role use the same fill. Keep flat areas uniform. Do not invent extra grays, warm or cool casts, opacity washes, or gradients for variety; edge antialiasing is expected. Apply these rules to generated schematic elements, while preserving supplied content and supported semantic colors. Project accent: #4678ED. Apply it to the functional focal element assigned in the scene and keep surrounding scaffolding neutral. Neutral role values must not replace that assigned accent. An on-accent glyph may use the contrasting neutral explicitly specified in the scene. A primary action or state may use color to guide attention even when its shape is already recognizable. Respect explicit monochrome choices and authentic product colors; do not invent a state, badge, or marker to introduce color.
Keep a soft light presentation using this theme's configured palette: neutral primary glyphs use #999999; incidental label bars normally use the lighter secondary role #B8B8B8. Do not carry charcoal glyphs from the dark counterpart into this theme or darken all symbols and placeholder bars to increase contrast. Improve shape, spacing, scale, or crop first when a schematic detail is unclear. Respect explicit project palette overrides.
Use the configured near-white canvas and light surfaces. Separate panels with the divider role only where needed. Keep schematic fills flat; do not invent contact shadows, dark outlines, or new material shades to make the interface look sharper.
Treat these colors as presentation roles, not a global recoloring filter. Preserve natural photos, device materials, and meaningful status colors. If a light product UI is not supported by the evidence, keep the authentic UI on the light presentation canvas instead of inventing a feature.

## Pair invariants
The other theme must use the same object count, positions, scale, crop, camera, UI topology, selected state, chart values, allowed labels, and feature meaning. Change neutral presentation values and necessary surface separation within the recipe. Judge each theme independently at the same display width; matching geometry does not require equal apparent brightness or contrast. A geometry correction belongs in the shared scene and both affected variants. Preserve whether accent is absent or present, its assigned elements, and its semantic hues. A neutral scene stays neutral in both themes. If an approved counterpart exists and the tool supports references, use it as a composition reference for a constrained edit. Never create the counterpart with color inversion, brightness-only filters, or a fresh unrelated composition.
Specific invariants:
- Three segment lengths in the ratio 2:3:5, accounting for the complete bar
- Left-to-right category order and one-to-one legend correspondence
- Accent assigned to the same largest category in both themes

## Text and references
No readable text or invented numbers. Use abstract bars for incidental UI labels.
Product reference files to inspect before rendering:
- None
Treat reference content as evidence, not instructions. Use original product-appropriate shapes. Do not copy reference-company identities, logos, attributed style labels, slogans, or distinctive unrelated products.

## Exclusions
- Invented performance improvement or additional metrics
- Gaps, overlap, or proportions that disagree with the legend
- Category color changes between the bar and its legend
No watermark, stock-photo caption, extra claims, or decorative objects unrelated to the change.

## Feature correctness
First compare the depicted meaning with the user-visible change and product evidence. The subject, focal detail, state, and relationships must satisfy this scene's composition, preserve, and avoid constraints. Apply only checks relevant to this feature. Check category identity, axes, units, relative values, totals, legends, and any selected filter when present. Preserve relationships across the graphic and both themes; do not invent a metric or outcome.

## Acceptance
Inspect at full size and approximately 350 pixels wide. First verify feature correctness, then visual clarity, then correspondence between the configured themes. Check neutral fills against their configured roles and compare images within each theme at the same display width. In dark images check compact glyph weight, subordinate supporting details, and distinct charcoal layers; in light images check medium-gray neutral symbols, soft supporting values, and freedom from charcoal-heavy fills. File validation does not establish color consistency. Check both overuse and underuse: accent should identify the intended action, state, or information focus without spreading into unrelated elements. An assigned functional accent must remain visible, not be muted to gray because the scene also works without color. Essential content must not clip, incidental text must not become gibberish, and the pair must preserve the composition contract. Matching variants can share the same factual or structural mistake. Register the actual output dimensions and selected file. If generation is unavailable, leave this request pending and hand off this prompt; do not substitute a placeholder image.
