# Composition recipes

Choose an archetype from the feature's explanatory need. Numeric occupancy ranges below are starting points, not replacements for the scene brief.

The rules below are conditional on the selected subject. Choose a new scene for each release note. A worked brief demonstrates one feature's constraints; its objects, coordinates, gestures, or data relationships must not become defaults for unrelated notes.

| Archetype | Use when | Starting composition | Common failure |
| --- | --- | --- | --- |
| `icon-tile` | A capability or status is recognizable through one symbol | Symbol or tile about 16–24% of canvas width, optically centered | An enormous generic icon or empty decorative symbolism |
| `symbol-pair` | Two capabilities are connected | Two equally weighted symbols, a short subtle divider, broad empty space | Unequal weights or an arrow implying a direction that does not exist |
| `ui-detail` | A specific interaction or setting changed | One enlarged fragment occupying about 55–85% of width | A complete invented dashboard with the useful control too small |
| `device-view` | The device or cross-device context matters | One unobtrusive front-facing display, around 28–48% of width | Decorative device mockups unrelated to the workflow |
| `object-detail` | A real physical part explains the feature | Close crop with one consistent camera and quiet depth | An invented product silhouette or excessive glossy modeling |
| `spatial-view` | Topology, route, location, or layout is the subject | Top-down or elevated scene, often filling the frame | Competing map layers, unreadable lines, impossible spatial relationships |
| `data-view` | A new view of information is the feature | One dominant chart or metric panel plus sparse support | Fake improvement numbers or decorative chart noise |
| `editorial-scene` | The announced content or experience is the subject | One coherent scene with feature-appropriate materials and color | A marketing banner for an ordinary fix |

## Decision sequence

1. Does the reader need to understand where or how to act? Prefer `ui-detail`; use `device-view` only when device context carries meaning.
2. Is spatial topology or a real physical part essential? Choose `spatial-view` or `object-detail`.
3. Is the new information display itself the change? Choose `data-view`.
4. Is this an experience whose content is inherently visual? Choose `editorial-scene`.
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
| `spatial-view` | Positions, connections, direction, and layer meanings form a consistent spatial model |
| `data-view` | Categories, values, proportions, units, legends, and selected filters agree wherever present |
| `editorial-scene` | The depicted experience matches the announced content without added capabilities or unrelated subjects |

Review correctness before visual polish and theme correspondence. If a detail is unsupported, reduce specificity to a justified abstraction or resolve it before rendering. A successful theme pair can still repeat the same incorrect feature depiction.

## Worked brief: list interaction

Message: a saved item can be added to a queue with one swipe.

Choose `ui-detail`. Three broad horizontal list rows extend slightly past the right crop. Define the resting list left boundary as `L` and the exposed action width as `D`. The top and bottom row backgrounds and the middle row's action backplate all start at `L`. For this rightward swipe, only the middle foreground row starts at `L + D`; its thumbnail and label bars move with it and retain their original padding. The action occupies the space revealed inside the original row bounds. Its left edge must not protrude outside the resting list. Do not shift the entire list or compress the active row to make room.

Represent incidental text as two or three neutral bars with consistent padding. Keep the action icon recognizable and the entire interaction inside the safe margin. This is a horizontal reveal gesture, not a vertical reorder drag: the rows keep their order and vertical positions. One interaction, one accent, no floating hand, arrow trail, extra feature, or surrounding app navigation.

Before pairing, check that the resting rows and action backplate share a left boundary, the foreground displacement equals the revealed action width, and its contents moved as one unit. For the theme pair, lock row dimensions, offset, action width, bars, crop, and selected state. Change only canvas and surface roles, neutral label values, and local shadows. A second view that selects another row is a failed pair. Two matching images can still share the same interaction error, so correspondence alone is insufficient.

## Worked brief: a saved-location preference

Message: a setting can be saved for a selected location.

Choose `symbol-pair` if the association itself is sufficient: a simple adjustment glyph and a location pin, balanced around a narrow neutral divider. Choose `ui-detail` if users need to discover the new menu action. Do not add a device just to fill the empty space. A location pin is a metaphor; it must not imply geofencing or automatic behavior absent from the evidence.

## Worked brief: activity information

Message: users can see an activity breakdown in a new panel.

Choose `data-view`. One panel contains a dominant simple chart and two supporting rows. If actual values are not available, omit literal numbers and avoid a rising curve that implies a performance gain. Make the new view, not an invented result, the focus. Use a selected segment or one active filter to establish hierarchy if that interaction is supported.

## Worked brief: a focused object

Message: a new control is available on an existing physical interface.

Choose `object-detail` only with product evidence. Crop closely enough to make the control recognizable, retain surrounding context, and use one soft highlight or local accent. Lock the actual geometry. Do not introduce a generic vehicle, appliance, robot, or headset into an unrelated software product.

## Exceptions with a reason

A genuine content preview can be photographic or colorful. A real icon may include gradients. A broad spatial view may reach every edge. An editorial introduction may use a different aspect ratio chosen in project settings. These exceptions follow the subject; they do not replace the quiet presentation language for other notes.
