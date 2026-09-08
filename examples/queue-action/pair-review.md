# Pair review

This is an original fictional interface illustration generated with the coding agent's available image tool. No external reference artwork is included. The shared brief and compiled per-theme prompts are stored alongside the selected files.

## Generation record

1. Generate the dark scene from its feature brief.
2. Make one targeted correction: replace photographic thumbnail contents with flat neutral squares, preserving their positions and all surrounding geometry. The initial interpretation prompted a clearer rule in the shared guide: the element inventory is complete, and neutral thumbnails must not acquire decorative content.
3. Create the light variant as a constrained edit of the accepted dark image, using the compiled light prompt. Preserve the canvas, row count, row geometry, middle-row offset, action glyph, neutral thumbnails, and bar lengths. Adapt only presentation surfaces, neutral values, and shadows while preserving the blue interaction accent.
4. Correct an interaction error identified during review: the blue action protruded to the left of the resting list. Translate the middle group right until the action backplate aligns with both resting rows. This leaves only the foreground row displaced relative to the list. The [alignment edit prompt](alignment-edit.prompt.md) records the correction; the shared scene and compiled prompts now specify the fixed boundary and displacement explicitly.
5. Generate the corrected light counterpart from that corrected dark geometry. Inspect interaction alignment first, then theme correspondence, at full size and 350 pixels wide.

The initial review checked theme correspondence but missed the incorrect list boundary. Two visually similar variants can share the same interaction mistake. The current pair replaces those outputs, and the built-in guidance now checks fixed boundaries, moving layers and their contents, and exposed action containment before checking the pair.

This example has used five image-tool requests in total, including its two revision rounds. Two required assets do not guarantee only two billable generations. The CLI itself made no image-service requests.

## Selected output

| Check | Result |
| --- | --- |
| Actual dimensions | Both 1586 × 992 pixels, approximately 8:5 |
| Encoding | Two distinct, fully decoded PNG files |
| Subject | Three list rows with one action revealed behind the middle row |
| Fixed alignment | The first row, blue action backplate, and third row share a left boundary at approximately 17% of canvas width |
| Foreground displacement | Only the middle foreground and its contents start farther right, around 30% of canvas width; the exposed action fills the intervening space |
| Containment | The action stays inside the original list bounds, with no leftward protrusion; resting rows retain their positions |
| Pair correspondence | Row count, overall positions, swipe state, crop, thumbnail layout, and bar lengths remain visually consistent |
| Focal hierarchy | The blue action tile is the strongest accent in both themes |
| Neutral content | No photographic thumbnails, readable labels, logos, or extra controls |
| Full-size inspection | The deliberate right-edge row crop preserves the fully visible action tile |
| 350-pixel-wide inspection | The aligned list edge, revealed action, rightward foreground offset, and three-row structure remain clear |

The pair is visually consistent, not guaranteed to have pixel-identical edges. The light variant uses subtle shadows and surface separation; the dark variant keeps subdued layered surfaces. Review an actual product's imagery in its intended viewer before acceptance.
