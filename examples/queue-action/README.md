# Paired illustration example

This fictional list interaction demonstrates the shared scene contract and theme-specific prompts. It is not a screenshot or a claim about an existing product.

`scene.yaml` is the author-controlled brief. `dark.prompt.md` and `light.prompt.md` are compiled from that same brief and the default project palette. The selected raster pair is checked for interaction geometry, composition, visual hierarchy, and small-card readability.

The resting rows and the accent-colored action backplate share one fixed left boundary. Only the middle foreground row and its contents move to the right, by the width of the exposed action. This keeps the action inside the original list bounds. The [alignment edit prompt](alignment-edit.prompt.md) records the targeted correction to the earlier illustration.

The current gallery selects `dark-accent.png` and `light-accent.png`. Both use `raised` for foreground rows and `secondary` for thumbnails and incidental bars. The exposed action uses the project accent with a white queue glyph in both themes. This functional color helps readers find the available operation even though the geometry already explains the interaction. The [dark accent request](dark-accent-edit.prompt.md) and [light accent request](light-accent-edit.prompt.md) record these localized edits to the reviewed neutral pair. Earlier files and requests, including the [dark hierarchy revision](dark-refinement.prompt.md), [light counterpart](light-refinement.prompt.md), [output-size correction](dark-size-correction.prompt.md), and [soft light revision](light-palette-edit.prompt.md), remain revision sources; `dark.png` and `light.png` stay part of the public release snapshots.

The generator is intentionally outside the CLI. In a real project, run `image plan`, generate the requested variants with the agent's available tool or an external service, inspect them, and use `image import` to record the selected files.

| Dark | Light |
| --- | --- |
| ![A queue action revealed behind a list row on a charcoal canvas](dark-accent.png) | ![The same queue action and list geometry on a near-white canvas](light-accent.png) |

Both selected PNGs are 1586 × 992 pixels. The generator returned a size close to the requested 8:5 ratio; the files retain their actual dimensions. See [the pair review](pair-review.md) for generation steps and visual checks.
