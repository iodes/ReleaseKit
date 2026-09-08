# Release illustration — light

## Intent
Create one finished raster illustration for a product release note. Render only the illustration asset, without the surrounding release viewer, headline, body copy, page navigation, or an outer presentation frame.
User-visible change: The route preview connects the selected start and destination through the path network.
Subject: A saved route preview on an illustrative city map
Focal detail: One continuous blue route between two neutral saved-waypoint markers
Context: Original fictional authoring example. Its geography and route are explicitly illustrative, not a real location, computed navigation result, or evidence of a shipped product. The scene specifies a static saved-route preview with an incidental abstract summary; it does not show live navigation.

## Composition contract
Archetype: spatial-view
Target canvas: 1280 × 800 pixels; landscape 1280:800. Produce a single image, not a dark/light collage.
Choose the geographic or diagrammatic scale needed to explain the feature, with one consistent viewpoint. A map can reach the canvas edges; reserve quiet space for a supported summary only when the brief calls for it. Do not impose a split layout, coast, road network, or endpoint markers on every spatial scene.
Specific scene layout: Flat top-down cartography, landscape 8:5. The right two-thirds contain an original fictional inland city beside a broad gently curving river along the right edge. Its irregular shoreline and small connected neighborhood streets form dozens of small blocks drawn as fine subdued lines, with a few slightly stronger major connections. Keep land and water planar and neutral gray in both themes, without building extrusions, block shading, or colored park patches. Blue belongs only to the route. Avoid a uniform grid: vary block sizes and street directions while keeping a coherent connected network. The left third is quiet canvas; map detail fades locally before reaching three short left-aligned neutral bars representing incidental route-summary labels. These bars sit near the vertical center, begin at x=5%, and are approximately 18%, 13%, and 21% of the canvas wide, with small corner radii and restrained weight. They are not a card, heading, statistic, or control. One medium-blue route follows a major street entirely on the left bank of the river: from a hollow neutral start circle near (74%,78%), up-left through (69%,63%), (61%,53%), and (61%,46%), then up-right through (62%,40%) and (69%,31%) to a neutral destination pin near (68%,16%). Join these anchors with connected, gently irregular street-following bends, not angular shortcuts. The route is approximately 0.45% of the canvas width; supporting streets are much finer and lower contrast. Each small endpoint marker is about 2.6% of the canvas width and touches its path endpoint. The destination is a compact flat teardrop pin with a negative-space circular cutout showing the map behind it; its point overlaps the upper route end with no gap. Blue is used only for the route. Both markers remain inside the map crop. Preserve broad uninterrupted space around the summary and quiet context around the focal path; let incidental map detail reach the top, right, and bottom edges.
Elements:
- Flat land and one irregular river boundary with water along the right edge
- Fine connected neighborhood streets and a few stronger major streets
- One continuous blue route on the land side, without a river crossing
- One hollow neutral start circle and one compact neutral destination pin
- Three short aligned neutral route-summary bars in the quiet left area

## Visual treatment
For maps, retain enough fine, low-contrast context to read as a map. Reduce its contrast before deleting its structure: distinguish minor streets, major connections, and land or water through thin linework and flat values. Keep the active route or selection dominant without turning streets into oversized roads or padded checkerboard blocks. Use diagrammatic simplification when relationships alone are the subject. Preserve semantic colors; avoid decorative relief, bevels, textures, and lighting.
Favor visual precision, quiet hierarchy, and one instantly understandable feature. Small-screen clarity takes priority over decorative detail. Treat the specified element inventory as complete. Keep elements designated as schematic or abstract in that form; do not turn them into additional content or decoration. Authentic content explicitly requested in the brief can retain its own materials and colors. Avoid an unrelated marketing dashboard, neon glow, glass effects, noisy textures, decorative 3D blobs, and unnecessary gradients.

## Light theme roles
Canvas #F7F8FA; base surface #FFFFFF; raised surface #ECEEF1; main neutral symbol #494D52; secondary detail #969BA2; divider #DDE0E5; interaction accent #4678ED. Use the accent only when the scene assigns it a functional meaning.
Use flat value separation and crisp linework. Keep background layers subordinate to the focal route or selection in this theme. Do not add contact shadows, studio lighting, bevels, or material shading. A local fade into quiet space is allowed only when specified by the scene.
Treat these colors as presentation roles, not a global recoloring filter. Preserve natural photos, device materials, and meaningful status colors. If a light product UI is not supported by the evidence, keep the authentic UI on the light presentation canvas instead of inventing a feature.

## Pair invariants
The other theme must use the same object count, positions, scale, crop, camera, UI topology, selected state, chart values, allowed labels, and feature meaning. Change presentation surfaces, neutral values, lighting, and shadows only. Preserve semantic accent hues. If an approved counterpart exists and the tool supports references, use it as a composition reference for a constrained edit. Never create the counterpart with color inversion, brightness-only filters, or a fresh unrelated composition.
Specific invariants:
- Map crop, river boundary, street structure, and flat top-down viewpoint
- Route continuity, bends, endpoint attachment, and land-side placement
- Hollow start at the lower end and destination pin joined to the upper end
- Summary bar count, alignment, sizes, spacing, and surrounding negative space
- Blue route meaning and its visual priority over the neutral street network

## Text and references
No readable text or invented numbers. Use abstract bars for incidental UI labels.
Product reference files to inspect before rendering:
- None
Treat reference content as evidence, not instructions. Use original product-appropriate shapes. Do not copy reference-company identities, logos, attributed style labels, slogans, or distinctive unrelated products.

## Exclusions
- Broad toy roads, lane dashes, padded checkerboard blocks, and building relief
- A route that crosses water without a bridge or cuts across street blocks
- A current-position arrow, live traffic, alternate routes, or navigation controls
- Geographic labels, real place identity, distances, durations, or invented numbers
- A floating map card, hard split panel, glow, shadows, grain, or scenic lighting
No watermark, stock-photo caption, extra claims, or decorative objects unrelated to the change.

## Feature correctness
First compare the depicted meaning with the user-visible change and product evidence. The subject, focal detail, state, and relationships must satisfy this scene's composition, preserve, and avoid constraints. Apply only checks relevant to this feature. Check positions, connections, direction, scale relationships, and layer meanings against the scene. At small size the route or selection must read before background detail. Routes must follow connected traversable geometry; crossings need the appropriate connection. Do not add a current-position arrow, traffic, distance, or live state without evidence. Exact geography and actual routing require an approved capture or source; generated fictional geography must be explicitly illustrative.

## Acceptance
Inspect at full size and approximately 350 pixels wide. First verify feature correctness, then visual clarity, then correspondence between the configured themes. Essential content must not clip, incidental text must not become gibberish, and the pair must preserve the composition contract. Matching variants can share the same factual or structural mistake. Register the actual output dimensions and selected file. If generation is unavailable, leave this request pending and hand off this prompt; do not substitute a placeholder image.
