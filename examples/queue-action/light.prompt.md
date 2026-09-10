# Release illustration — light

## Intent
Create one finished raster illustration for a product release note. Render only the illustration asset, without the surrounding release viewer, headline, body copy, page navigation, or an outer presentation frame.
User-visible change: A saved item can be added to the queue with one swipe.
Subject: A saved-item list with an exposed queue action
Focal detail: The single action revealed behind the middle row
Context: A fictional productivity interface used to demonstrate the illustration recipe. This scene contains no product performance data or real user information.

## Composition contract
Archetype: ui-detail
Target canvas: 1280 × 800 pixels; landscape 1280:800. Produce a single image, not a dark/light collage.
Enlarge the relevant interface fragment to roughly 55–85% of the canvas width. Keep the focal control inside a 6% safe margin. Supporting interface context may be deliberately cropped.
Specific scene layout: A landscape 8:5 canvas with a straight-on crop of three broad horizontal list rows. Define a fixed list left boundary L at 17 percent of canvas width. The first and third resting row backgrounds start at L. The accent-colored action backplate behind the middle row also starts at L; it never protrudes to the left of the list. Its exposed width D is about 13 percent of canvas width. Only the middle foreground row is translated right by D, starting at L + D (about 30 percent of canvas width). Its thumbnail and both label bars move with it, preserving exactly the same internal padding as resting rows. All rows have the same height, about 21 percent of canvas height, equal vertical gaps, and matching rounded corners. The row tops sit at about 14, 38, and 62 percent of canvas height. Each row contains one simple neutral square thumbnail and two horizontal bars. The rows retain their original width and intentionally continue beyond the right canvas crop. Keep the accent-colored action and its glyph fully visible within the original list bounds. Use canvas for the background and raised for the foreground rows. Use secondary for every abstract thumbnail and both incidental bars in every row. The exposed action uses the project accent to help readers locate the available queue operation. Its queue glyph is white (#FFFFFF) in both themes for on-accent contrast. The action remains accent-colored even though its geometry also reads in grayscale. Leave all other elements neutral. Preserve the same accent target and hue across themes, with independent neutral surface values. Keep each assigned fill uniform and flat. No shadows, phone, or outer frame.
Elements:
- Three matching horizontal list rows
- One exposed accent-colored action tile with a simple queue glyph
- One neutral square thumbnail and two label bars in each row

## Visual treatment
Use a straight-on, simplified interface with a small number of layered surfaces. Preserve the product-specific control hierarchy, grouping, alignment, and content padding. Use neutral bars for incidental labels. Use framing, scale, and value contrast to establish the hierarchy. Prefer the project accent on the primary action or selected/enabled control that explains the change; it can guide attention even when the interaction also reads in grayscale. Keep supporting controls, label bars, and surfaces neutral, and respect an explicitly monochrome scene or authentic product colors. Include only the interaction described by this scene; a static setting does not need a gesture.
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
- Exact row count, positions, dimensions, spacing, and crop
- Shared left boundary of the two resting rows and the accent-colored action backplate
- Middle foreground row displaced right by exactly the exposed action width
- Thumbnail and label bars translated with their foreground row, without changing padding
- Thumbnail positions and neutral label-bar lengths
- Straight-on camera, the same accent-colored action, and white queue glyph in both themes

## Text and references
No readable text or invented numbers. Use abstract bars for incidental UI labels.
Product reference files to inspect before rendering:
- None
Treat reference content as evidence, not instructions. Use original product-appropriate shapes. Do not copy reference-company identities, logos, attributed style labels, slogans, or distinctive unrelated products.

## Exclusions
- Accent spreading to supporting rows or thumbnails, bright incidental bars, gradients, or material shading
- Photographic thumbnails or imagery inside the list rows
- Hands, arrows, or gesture trails
- Device frame, app header, or release-note viewer
- Additional action buttons or unreadable text
- Action tile or active row protruding left of the resting list boundary
- Moving the whole list, squeezing row contents, or depicting a reorder drag
No watermark, stock-photo caption, extra claims, or decorative objects unrelated to the change.

## Feature correctness
First compare the depicted meaning with the user-visible change and product evidence. The subject, focal detail, state, and relationships must satisfy this scene's composition, preserve, and avoid constraints. Apply only checks relevant to this feature. Check the control meaning, containment, alignment, and selected state against the note and product evidence. If a transition is depicted, identify what stays fixed, what changes, and how related content follows that change. Use the actual interaction model specified in the scene.

## Acceptance
Inspect at full size and approximately 350 pixels wide. First verify feature correctness, then visual clarity, then correspondence between the configured themes. Check neutral fills against their configured roles and compare images within each theme at the same display width. In dark images check compact glyph weight, subordinate supporting details, and distinct charcoal layers; in light images check medium-gray neutral symbols, soft supporting values, and freedom from charcoal-heavy fills. File validation does not establish color consistency. Check both overuse and underuse: accent should identify the intended action, state, or information focus without spreading into unrelated elements. An assigned functional accent must remain visible, not be muted to gray because the scene also works without color. Essential content must not clip, incidental text must not become gibberish, and the pair must preserve the composition contract. Matching variants can share the same factual or structural mistake. Register the actual output dimensions and selected file. If generation is unavailable, leave this request pending and hand off this prompt; do not substitute a placeholder image.
