# Composition recipes

Choose an archetype from the feature's explanatory need. Numeric occupancy ranges below are starting points, not replacements for the scene brief.

The rules below are conditional on the selected subject. Choose the [media source](media-sources.md) first. These are eight presentation categories; physical details and content previews require supplied media. A worked brief demonstrates one feature's constraints; its objects, coordinates, gestures, or data relationships must not become defaults for unrelated notes.

| Archetype | Use when | Starting composition | Common failure |
| --- | --- | --- | --- |
| `icon-tile` | A capability or status is recognizable through one symbol | Flat tile about 20–24% of canvas width; neutral monochrome filled glyph about 50–65% of tile width | A sculpted 3D object, colored decorative badge, or oversized glyph |
| `symbol-pair` | Two capabilities are connected | Two equally weighted neutral symbols, a short subtle divider, broad empty space | Coloring one symbol merely for emphasis, unequal weights, or an unsupported direction |
| `ui-detail` | A specific interaction or setting changed | One enlarged fragment occupying about 55–85% of width | A complete invented dashboard with the useful control too small |
| `device-view` | The device or cross-device context matters | One unobtrusive front-facing display, around 28–48% of width | Decorative device mockups unrelated to the workflow |
| `object-detail` | A real physical part explains the feature | Supplied photograph or capture, with a useful crop | Inventing a physical product or generating a 3D substitute |
| `spatial-view` | Topology, route, location, or layout is the subject | One appropriate scale and viewpoint; fine subdued context around a clear route or selection | An oversized toy street grid, competing map layers, or impossible spatial relationships |
| `data-view` | A new view of information is the feature | One dominant chart or metric panel plus sparse support | Fake improvement numbers or decorative chart noise |
| `editorial-scene` | The announced content or experience is the subject | Supplied content artwork or screenshot, with original colors | Inventing a still life or decorative illustration |

## Decision sequence

1. Does the reader need to understand where or how to act? Prefer `ui-detail`; use `device-view` only when device context carries meaning.
2. Is spatial topology essential? Choose `spatial-view`. Is a real physical part essential? Choose `object-detail` and request or reuse its image.
3. Is the new information display itself the change? Choose `data-view`.
4. Is the actual announced content the subject? Choose `editorial-scene` and request or reuse its artwork or capture.
5. Otherwise, use `icon-tile` for one concept or `symbol-pair` for one relationship.

## Correctness checks by subject

Select only the relevant checks and make them concrete in the note's `composition`, `preserve`, and `avoid` fields before generating.

| Archetype | Check against the release note and product evidence |
| --- | --- |
| `icon-tile` | The symbol conveys the announced capability or status without suggesting an unsupported guarantee |
| `symbol-pair` | The association and any direction are accurate; no invented transfer, synchronization, or automation |
| `ui-detail` | Control meaning, hierarchy, containment, alignment, and state are correct; any transition identifies fixed and changing elements |
| `device-view` | Device identity, count, screen content, and cross-device relationships match the feature |
| `object-detail` | Shape, scale, assembly, contact points, and materials preserve the physical feature |
| `spatial-view` | Positions, connections, direction, and layer meanings form a consistent spatial model; the focal layer reads first at small size |
| `data-view` | Categories, values, proportions, units, legends, and selected filters agree wherever present |
| `editorial-scene` | The depicted experience matches the announced content without added capabilities or unrelated subjects |

Review correctness before visual polish and theme correspondence. If a detail is unsupported, reduce specificity to a justified abstraction or resolve it before rendering. A successful theme pair can still repeat the same incorrect feature depiction.

## Worked brief: list interaction

Message: a saved item can be added to a queue with one swipe.

Choose `ui-detail`. Three broad horizontal list rows extend slightly past the right crop. Define the resting list left boundary as `L` and the exposed action width as `D`. The top and bottom row backgrounds and the middle row's action backplate all start at `L`. For this rightward swipe, only the middle foreground row starts at `L + D`; its thumbnail and label bars move with it and retain their original padding. The action occupies the space revealed inside the original row bounds. Its left edge must not protrude outside the resting list. Do not shift the entire list or compress the active row to make room.

Represent incidental text as two or three neutral bars with consistent padding. Assign these bars to `secondary`, base rows to `surface`, and abstract thumbnails to `raised`. Keep repeated roles consistent; vary tone only for a hierarchy supported by the scene. Keep the action icon recognizable and the entire interaction inside the safe margin. This is a horizontal reveal gesture, not a vertical reorder drag: the rows keep their order and vertical positions. Keep one interaction. The exposed action may use accent if color helps distinguish it; neutral value contrast is also valid. Do not add a floating hand, arrow trail, extra feature, or surrounding app navigation.

Before pairing, check that the resting rows and action backplate share a left boundary, the foreground displacement equals the revealed action width, and its contents moved as one unit. For the theme pair, lock row dimensions, offset, action width, bars, crop, and selected state. Change only canvas and surface roles, neutral label values, and local shadows. A second view that selects another row is a failed pair. Two matching images can still share the same interaction error, so correspondence alone is insufficient.

## Worked brief: a saved-location preference

Message: a setting can be saved for a selected location.

Choose `symbol-pair` if the association itself is sufficient: a simple adjustment glyph and a location pin, balanced around a narrow neutral divider. Choose `ui-detail` if users need to discover the new menu action. Do not add a device just to fill the empty space. A location pin is a metaphor; it must not imply geofencing or automatic behavior absent from the evidence.

## Worked brief: activity information

Message: users can see an activity breakdown in a new panel.

Choose `data-view`. One panel contains a dominant simple chart and two supporting rows. If actual values are not available, omit literal numbers and avoid a rising curve that implies a performance gain. Make the new view, not an invented result, the focus. Use a selected segment or one active filter to establish hierarchy if that interaction is supported.

## Map hierarchy within spatial views

Choose the level of abstraction from the feature. A relationship diagram can be sparse; a map preview usually needs recognizable cartographic context. Simplify a map by reducing the contrast of minor detail before removing its structure. Use thin, connected local streets, a slightly stronger major network, and quiet flat land or water values. Avoid replacing a regional map with a few broad roads, lane dashes, padded blocks, or a raised checkerboard.

Make the route or selected area the first read at roughly 350 pixels wide. Supporting detail may merge into a quiet texture at that size, while the focal path and its meaningful endpoints remain legible. Give the active path a clear stroke hierarchy without making it a glowing cable. Keep geographic context planar; do not add bevels, modeled terrain, grain, or studio lighting for polish.

Choose the crop and amount of negative space from the feature. A supported summary can occupy a quiet area beside a map, with a local fade that suppresses background detail behind it. A full-frame map or a focused spatial diagram can be more appropriate for other notes. Do not require a left summary, a right map, a water body, or any particular route shape across this archetype.

Marker shapes carry meaning. Saved waypoints, a current-position arrow, a destination pin, traffic, and a route alternative are different states; include only the ones established by the note. A route follows traversable connections, with a bridge or other supported connection wherever needed. For an actual location, path, or coverage claim, request an approved map capture or verified source instead of inventing geography. A fictional gallery scene must state that its geography is illustrative.

## Worked brief: a saved route preview

Message: the route preview connects two selected saved waypoints. Choose `spatial-view`. For this fictional example, use an original irregular city network with many fine, quiet streets and one continuous blue path. Place a compact abstract summary beside the map when that summary is part of the chosen scene. Use neutral endpoints rather than introducing an unsupported live-navigation state. The map's detail supports recognition; its route supplies the meaning.

Before pairing, check continuity, endpoint attachment, meaningful scale, and route priority at mobile size. Preserve the land boundary, primary street structure, route bends, endpoint positions, summary alignment, crop, and semantic route color between themes. If exact real-world geography matters, switch to supplied media. These are feature-derived checks; they do not prescribe this example's layout for every spatial note.

## Worked brief: a focused object

Message: a new control is available on an existing physical interface.

Choose `object-detail` with `source: provided`. Request a photograph or capture of the actual control if an approved image is not already available. Use a crop that preserves surrounding context and the real geometry. Do not synthesize a product from a written fictional specification or introduce an unrelated appliance, robot, or headset. This note stays pending until an appropriate image is supplied.

## Exceptions with a reason

A supplied content preview can retain its authentic photography, artwork, materials, and colors. A broad spatial view may reach every edge when its relationships require it. Original supplied media can retain its aspect ratio. These are source-preservation choices, not permission to invent a decorative illustration or physical rendering.
