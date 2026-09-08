# Render requests: connected route

The reusable brief is [scene.yaml](scene.yaml). The compiled [dark](dark.prompt.md) and [light](light.prompt.md) prompts describe the current scene. This file records the actual generation and targeted-edit requests used to select the raster pair; it is example history, not an additional recipe that the CLI installs or applies to other notes. Only original generated map outputs were passed as edit targets. External artwork was not supplied to the generator.

## Request 1: original dark draft

No image input. This draft established the new cartographic composition before the neutral-background clarification was added to the final scene.

<details>
<summary>Full generation request</summary>

```text
Use case: ui-mockup
Asset type: release-note illustration
Generate a newly composed original cartographic asset from this specification. No input artwork is supplied. Make the fine street network read like restrained screen cartography, not a toy grid, padded blocks, maze, painting, or 3D render. The route must be clear at phone size, with the quiet map supporting it. Deliver the dark variant only.

# Release illustration — dark

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
Specific scene layout: Flat top-down cartography, landscape 8:5. The right two-thirds contain an original fictional inland city beside a broad gently curving river along the right edge. Its irregular shoreline and small connected neighborhood streets form dozens of small blocks drawn as fine subdued lines, with a few slightly stronger major connections. Keep land and water planar, without building extrusions or block shading. Avoid a uniform grid: vary block sizes and street directions while keeping a coherent connected network. The left third is quiet canvas; map detail fades locally before reaching three short left-aligned neutral bars representing incidental route-summary labels. These bars sit near the vertical center, begin at x=7%, and are approximately 17%, 13%, and 24% of the canvas wide, with small corner radii and restrained weight. They are not a card, heading, statistic, or control. One medium-blue route follows a major street entirely on the left bank of the river: from a hollow neutral start circle near (80%,82%), up-left through (73%,67%), (63%,58%), and (60%,46%), then up-right through (66%,33%) to a filled neutral destination circle near (68%,17%). Join these anchors with connected, gently irregular street-following bends, not angular shortcuts. The route is approximately 0.45% of the canvas width; supporting streets are much finer and lower contrast. Each small endpoint marker is about 2.6% of the canvas width and touches its path endpoint. Blue is used only for the route. Both markers remain inside the map crop. Preserve broad uninterrupted space around the summary and quiet context around the focal path; let incidental map detail reach the top, right, and bottom edges.
Elements:
- Flat land and one irregular river boundary with water along the right edge
- Fine connected neighborhood streets and a few stronger major streets
- One continuous blue route on the land side, without a river crossing
- One hollow neutral start circle and one filled neutral destination circle
- Three short aligned neutral route-summary bars in the quiet left area

## Visual treatment
For maps, retain enough fine, low-contrast context to read as a map. Reduce its contrast before deleting its structure: distinguish minor streets, major connections, and land or water through thin linework and flat values. Keep the active route or selection dominant without turning streets into oversized roads or padded checkerboard blocks. Use diagrammatic simplification when relationships alone are the subject. Preserve semantic colors; avoid decorative relief, bevels, textures, and lighting.
Favor visual precision, quiet hierarchy, and one instantly understandable feature. Small-screen clarity takes priority over decorative detail. Treat the specified element inventory as complete. Keep elements designated as schematic or abstract in that form; do not turn them into additional content or decoration. Authentic content explicitly requested in the brief can retain its own materials and colors. Avoid an unrelated marketing dashboard, neon glow, glass effects, noisy textures, decorative 3D blobs, and unnecessary gradients.

## Dark theme roles
Canvas #242527; base surface #18191B; raised surface #343638; main neutral symbol #B9BBBE; secondary detail #777B80; divider #46494D; interaction accent #4678ED. Use the accent only when the scene assigns it a functional meaning.
Use flat value separation and crisp linework. Keep background layers subordinate to the focal route or selection in this theme. Do not add contact shadows, studio lighting, bevels, or material shading. A local fade into quiet space is allowed only when specified by the scene.
Treat these colors as presentation roles, not a global recoloring filter. Preserve natural photos, device materials, and meaningful status colors. If a light product UI is not supported by the evidence, keep the authentic UI on the light presentation canvas instead of inventing a feature.

## Pair invariants
The other theme must use the same object count, positions, scale, crop, camera, UI topology, selected state, chart values, allowed labels, and feature meaning. Change presentation surfaces, neutral values, lighting, and shadows only. Preserve semantic accent hues. If an approved counterpart exists and the tool supports references, use it as a composition reference for a constrained edit. Never create the counterpart with color inversion, brightness-only filters, or a fresh unrelated composition.
Specific invariants:
- Map crop, river boundary, street structure, and flat top-down viewpoint
- Route continuity, bends, endpoint attachment, and land-side placement
- Hollow start at the lower end and filled destination at the upper end
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
```

</details>

## Request 2: quiet neutral context and endpoint correction

Input: the first dark draft. The map context became neutral, but inspection found that the top endpoint gap remained. This output was not accepted as the final asset.

```text
Use case: precise-object-edit
Asset type: dark release-note map illustration
Image 1 is the edit target, an original fictional map. Preserve its native 1586 × 992 pixel dimensions exactly, landscape crop, route shape, street topology, river edges, existing endpoint positions, and the three bars on the left. Do not recompute or redraw the map layout.

Make only these concrete corrections:
1. The blue route stops a few pixels before the filled destination circle at the top. Extend that existing short route end until it passes underneath and touches the destination circle, so the path is visibly continuous all the way to the marker. Preserve the hollow start circle and its existing attachment.
2. Make all background map context quiet neutral charcoal, with the route as the only chromatic element. Water is flat neutral dark charcoal #18191B, never blue. Land is around #242527; remove green color from the small land patches and render them in land-like neutral values. Reduce the contrast of the existing road network: fine streets near #343638 and larger connections near #46494D. The dense road structure must remain visible at full size but recede at phone size.
3. Keep the path medium blue near #4678ED. The endpoints should be light neutral gray near #B9BBBE rather than glaring pure white. Preserve both endpoint shapes and their sizes. Keep the three summary bars and their left alignment unchanged.

No extra features, arrows, traffic, labels, icons, roads, or route alternatives. No glow, beveled blocks, shadows, texture, lighting, or new geography. Keep the composition and fine cartographic character intact. This is a focused hierarchy and connection correction, not a new map.
```

## Request 3: endpoint connection only

Input: the neutral dark draft from request 2.

```text
Use case: precise-object-edit
Image 1 is the edit target, a 1586 × 992 dark cartographic release illustration. Correct ONE tiny defect. Keep every other pixel's content, framing, map, water, colors, lower start ring, and left bars unchanged. Preserve the output dimensions exactly.

At the TOP end of the blue route, a pale filled destination circle is centered approximately at pixel (1064,139). The top cap of the blue stroke ends approximately at (1071,155). A dark gap visibly separates them. Paint a short continuation of that SAME BLUE LINE from its current cap, gently up-left into the center of the pale circle, UNDER the circle. Let the opaque filled circle cover the line end. The blue stroke must physically meet the bottom edge of the filled circle, with ZERO dark gap or black halo between the stroke and the circle. Do not move or resize the circle. Do not change the rest of the route.

This connecting blue segment is the entire requested edit. Do not merely change contrast. The output should show one uninterrupted connected path from the hollow start ring all the way into the filled destination circle. No new symbol or extra route.
```


Request 3 still left the small gap visible. It was rejected; the next request replaces the destination symbol with a compact pin attached to the path.

## Request 4: attached destination pin

Input: the dark output from request 3. The final scene uses this destination-marker design instead of the earlier filled circle.

```text
Use case: precise-object-edit
Image 1 is the edit target, a dark map release illustration. Preserve its 1586 × 992 canvas and every other part of its map layout.

Replace the TOP destination marker. Remove the detached pale circle currently hovering above the blue route. At that same destination, draw ONE compact neutral-gray filled teardrop map pin, with a small dark circular cutout in its head. Its pointed bottom must meet and overlap the top end of the blue route. The blue route must emerge directly from the pin's pointed bottom. There must be NO GAP between pin and route.

This pin is a saved destination, not a current-position arrow. Its width should be about 38 pixels and height about 48 pixels. Center its POINT at approximately (1072,158), where the existing blue stroke begins. The body of the pin extends upward from this point, over the position of the removed circle. Rebuild just this tiny local area so the pin tip and blue path are visibly joined. The marker should be a flat medium-light neutral gray, not white, glossy, dimensional, or blue.

Keep the rest of the blue route shape, hollow lower start ring, street network, neutral charcoal land and water, map crop, three left summary bars, and colors unchanged. No extra marker, no duplicate circle, no readable text, no live state, and no other edit.
```


## Request 5: light counterpart

Input: the dark composition from request 4. The following instructions were prepended to the compiled light prompt. That prompt used the final pin design and approximate anchors measured from the selected composition. The current [light.prompt.md](light.prompt.md) additionally clarifies that the pin cutout reveals its background in either theme. This result preserved the visual layout but decoded at 1584 × 993 pixels, so it required a size correction before pair acceptance.

```text
Use case: precise-object-edit
Asset type: light counterpart of the approved original release-note map
Image 1 is the selected dark composition and the geometry reference. Make its LIGHT presentation counterpart. Preserve the input's actual dimensions EXACTLY: 1586 × 992 pixels. This native-size instruction supersedes the nominal 1280 × 800 target in the reusable brief below. Keep the actual input geometry; numeric layout anchors in the brief are approximate.

Change only presentation values. Use a near-white canvas and land around #F7F8FA, flat neutral light-gray river water around #E1E3E7, very subdued minor streets around #DDDFE3, and slightly stronger major streets around #C5C9CF. Keep these layers neutral, without blue water or green land. Summary bars and saved-waypoint markers become medium gray with clear contrast. Keep the route the same semantic blue #4678ED. The light map must be quiet and legible at phone size, without white-on-white loss of structure.

LOCK the map crop, exact street network, river boundaries and islands, route bends, attached destination pin and its circular cutout, lower hollow start ring, all positions and sizes, and the three left-aligned summary bars. Preserve the newly corrected physical connection between the destination pin's tip and the blue stroke: no gap. Preserve the local map-detail fade into the empty left area. No geographic redraw, additional roads, new markers, live-navigation state, readable text, numbers, gradients apart from the existing local fade, grain, shading, shadows, or 3D.

The following is the reusable light-theme scene specification. Use the input image as the composition authority for this constrained edit.
```


## Request 6: light canvas size correction

Inputs: request 5's light output as the edit target and the selected dark output as the canvas-size reference.

```text
Use case: precise-object-edit
Image 1 is the LIGHT edit target. Image 2 is the DARK counterpart used only as the exact canvas-dimension reference.
Correct the light output's canvas dimensions to match image 2 EXACTLY: 1586 pixels wide and 992 pixels high.
Image 1 currently has 1584 × 993 pixels. The only requested change is this two-pixel width and one-pixel height correction. Retain all of image 1's visible content and LIGHT colors. Do not copy the dark palette from image 2. Keep the route, destination pin, hollow start, river and roads, summary bars, crop, and every spatial relationship unchanged. No added elements or padding border. Deliver ONE finished light image with the exact same pixel dimensions as image 2, 1586 × 992.
```


Request 6 decoded at 1585 × 992 pixels. It still differed from the earlier dark canvas by one pixel. Its native light canvas became the reference for the next counterpart; the CLI's identical-dimensions requirement was retained.

## Request 7: dark counterpart from the native light canvas

Input: request 6's light output as the geometry and exact-size reference.

```text
Use case: precise-object-edit
Image 1 is the approved LIGHT map, and its actual canvas is 1585 pixels wide by 992 pixels high.
Produce its DARK counterpart by changing color values ONLY. Retain EXACTLY the same 1585 × 992 native canvas, pixel framing, route and street layout, markers, river, and summary bars. Do not resize, recrop, add borders, or reconstruct the geography.

Use flat neutral charcoal land and canvas near #242527, neutral darker water near #18191B, fine subdued streets near #343638, and slightly stronger major streets near #46494D. The three left summary bars become medium neutral gray; the top destination pin and the hollow lower start ring become light neutral gray. The hole in the destination pin and inside the start ring reveal the dark map behind them. Keep the route blue #4678ED and keep it physically connected to the top pin and lower start ring. The path must read before the road context.

Preserve the precise existing light image's composition and all spatial relationships. Maintain the same local map-detail fade into the quiet left area. No colored water or parks, no other accents, no new labels or numbers, no glow, shadows, relief, grain, or decorative lighting. Only the neutral presentation values change to DARK. The output must be exactly the same dimensions as Image 1: 1585 × 992 pixels.
```
