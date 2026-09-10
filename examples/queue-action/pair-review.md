# Pair review

This is an original fictional interface illustration generated with the coding agent's available image tool. No external reference artwork is included. The shared brief and compiled per-theme prompts are stored alongside the selected files.

## Generation record

1. Generate the dark scene from its feature brief.
2. Make one targeted correction: replace photographic thumbnail contents with flat neutral squares, preserving their positions and all surrounding geometry. The initial interpretation prompted a clearer rule in the shared guide: the element inventory is complete, and neutral thumbnails must not acquire decorative content.
3. Create the light variant as a constrained edit of the accepted dark image, using the compiled light prompt. Preserve the canvas, row count, row geometry, middle-row offset, action glyph, neutral thumbnails, and bar lengths. Adapt only presentation surfaces, neutral values, and shadows while preserving the blue interaction accent.
4. Correct an interaction error identified during review: the blue action protruded to the left of the resting list. Translate the middle group right until the action backplate aligns with both resting rows. This leaves only the foreground row displaced relative to the list. The [alignment edit prompt](alignment-edit.prompt.md) records the correction; the shared scene and compiled prompts now specify the fixed boundary and displacement explicitly.
5. Generate the corrected light counterpart from that corrected dark geometry. Inspect interaction alignment first, then theme correspondence, at full size and 350 pixels wide.
6. Revise the light palette with [this constrained edit](light-palette-edit.prompt.md). Assign every incidental bar to `secondary: #B8B8B8`, thumbnails to `raised: #ECECEC`, rows to `surface: #FFFFFF`, and the background to `canvas: #F8F8F8`. Keep the blue action and the existing interaction geometry. Select `light-soft.png` after full-size and 350-pixel review alongside the earlier version; spot-check its fills against the intended roles.
7. Apply the [dark hierarchy revision](dark-refinement.prompt.md). Keep the interaction geometry and original dark palette, but map foreground rows to `raised`, incidental bars and thumbnails to `secondary`, the action to `primary`, and its glyph to `surface`. Remove the accent because the revealed area and glyph already distinguish this action. Select the neutral treatment after full-size and 350-pixel comparison with the earlier dark image.
8. Generate the [light counterpart](light-refinement.prompt.md) from that reviewed dark candidate, retaining the geometry and role assignments with the independent light values.
9. Correct a one-pixel output-width difference with the image tool using [this size request](dark-size-correction.prompt.md). Keep the decoded outputs at 1586 × 992 and inspect the pair again.
10. Revise the shared scene after review found the neutral-only guidance suppressed useful functional color. Apply the [dark accent edit](dark-accent-edit.prompt.md) to the reviewed dark image: use the project blue on the exposed action and white on its queue glyph, preserving the neutral supporting hierarchy and interaction geometry.
11. Apply the [same localized accent edit](light-accent-edit.prompt.md) to the reviewed light image. Inspect both full-size outputs and a 350-pixel-wide pair; select `dark-accent.png` and `light-accent.png`.

The initial review checked theme correspondence but missed the incorrect list boundary. Two visually similar variants can share the same interaction mistake. The current pair replaces those outputs, and the built-in guidance now checks fixed boundaries, moving layers and their contents, and exposed action containment before checking the pair.

This example has used eleven image-tool requests in total, including three for the independent theme treatment revision and two for the functional accent revision. Two required assets do not guarantee only two billable generations. The CLI itself made no image-service requests.

## Selected output

| Check | Result |
| --- | --- |
| Actual dimensions | Both 1586 × 992 pixels, approximately 8:5 |
| Encoding | Two distinct, fully decoded PNG files: `dark-accent.png` and `light-accent.png` |
| Subject | Three list rows with one action revealed behind the middle row |
| Fixed alignment | The first row, blue action backplate, and third row share a left boundary at approximately 17% of canvas width |
| Foreground displacement | Only the middle foreground and its contents start farther right, around 30% of canvas width; the exposed action fills the intervening space |
| Containment | The action stays inside the original list bounds, with no leftward protrusion; resting rows retain their positions |
| Pair correspondence | Row count, overall positions, swipe state, crop, thumbnail layout, and bar lengths remain visually consistent |
| Focal hierarchy | The blue action and white queue glyph provide the functional focus; supporting thumbnails and bars stay neutral in both themes |
| Accent containment | Blue remains confined to the exposed action, with no blue in the supporting rows, thumbnails, or bars |
| Neutral content | No photographic thumbnails, readable labels, logos, or extra controls |
| Full-size inspection | The deliberate right-edge row crop preserves the fully visible action tile |
| 350-pixel-wide inspection | The blue action and white glyph remain easy to locate; the aligned list edge, foreground offset, and three-row structure remain clear |

The pair preserves the same interaction and neutral supporting hierarchy while using separate dark and light values. The blue action and white queue glyph retain the same functional meaning in both themes. Dark rows remain distinct from the charcoal canvas without bright incidental bars; the light variant uses soft pale rows and supporting gray content. The pair is visually consistent, not guaranteed to have pixel-identical edges. Raster fills remain approximate rather than exact palette swatches. Review an actual product's imagery in its intended viewer before acceptance.
