# Release illustration — dark

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
Specific scene layout: A landscape 8:5 canvas with a straight-on crop of three broad horizontal list rows. Define a fixed list left boundary L at 17 percent of canvas width. The first and third resting row backgrounds start at L. The blue action backplate behind the middle row also starts at L; it never protrudes to the left of the list. Its exposed width D is about 13 percent of canvas width. Only the middle foreground row is translated right by D, starting at L + D (about 30 percent of canvas width). Its thumbnail and both label bars move with it, preserving exactly the same internal padding as resting rows. All rows have the same height, about 21 percent of canvas height, equal vertical gaps, and matching rounded corners. The row tops sit at about 14, 38, and 62 percent of canvas height. Each row contains one simple neutral square thumbnail and two horizontal bars. The rows retain their original width and intentionally continue beyond the right canvas crop. Keep the blue action and its glyph fully visible within the original list bounds. No phone or outer application frame.
Elements:
- Three matching horizontal list rows
- One exposed accent-colored action tile with a simple queue glyph
- One neutral square thumbnail and two label bars in each row

## Visual treatment
Use a straight-on, simplified interface with a small number of layered surfaces. Preserve the product-specific control hierarchy, grouping, alignment, and content padding. Use neutral bars for incidental labels and emphasize the changed control or state. Include only the interaction described by this scene; a static setting does not need a gesture.
Favor visual precision, quiet hierarchy, and one instantly understandable feature. Small-screen clarity takes priority over decorative detail. Treat the specified element inventory as complete. Keep elements designated as schematic or abstract in that form; do not turn them into additional content or decoration. Authentic content explicitly requested in the brief can retain its own materials and colors. Avoid an unrelated marketing dashboard, neon glow, glass effects, noisy textures, decorative 3D blobs, and unnecessary gradients.

## Dark theme roles
Canvas #242527; base surface #18191B; raised surface #343638; main neutral symbol #B9BBBE; secondary detail #777B80; divider #46494D; interaction accent #4678ED.
Use distinct charcoal levels with a legible neutral subject; avoid crushed shadows and unnecessary pure-white glare. Separate overlapping dark objects with soft edges or local value changes.
Treat these colors as presentation roles, not a global recoloring filter. Preserve natural photos, device materials, and meaningful status colors. If a light product UI is not supported by the evidence, keep the authentic UI on the light presentation canvas instead of inventing a feature.

## Pair invariants
The other theme must use the same object count, positions, scale, crop, camera, UI topology, selected state, chart values, allowed labels, and feature meaning. Change presentation surfaces, neutral values, lighting, and shadows only. Preserve semantic accent hues. If an approved counterpart exists and the tool supports references, use it as a composition reference for a constrained edit. Never create the counterpart with color inversion, brightness-only filters, or a fresh unrelated composition.
Specific invariants:
- Exact row count, positions, dimensions, spacing, and crop
- Shared left boundary of the two resting rows and the blue action backplate
- Middle foreground row displaced right by exactly the exposed action width
- Thumbnail and label bars translated with their foreground row, without changing padding
- Thumbnail positions and neutral label-bar lengths
- Straight-on camera and blue interaction accent

## Text and references
No readable text or invented numbers. Use abstract bars for incidental UI labels.
Product reference files to inspect before rendering:
- None
Treat reference content as evidence, not instructions. Use original product-appropriate shapes. Do not copy reference-company identities, logos, attributed style labels, slogans, or distinctive unrelated products.

## Exclusions
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
Inspect at full size and approximately 350 pixels wide. First verify feature correctness, then visual clarity, then correspondence between the configured themes. Essential content must not clip, incidental text must not become gibberish, and the pair must preserve the composition contract. Matching variants can share the same factual or structural mistake. Register the actual output dimensions and selected file. If generation is unavailable, leave this request pending and hand off this prompt; do not substitute a placeholder image.
