# Choosing the image source

Choose a truthful source for each note's image before composition and rendering: a supported generated explanation or approved supplied media. When a real capture or approved artwork is required but unavailable, request it and keep the image pending. Follow [image coverage](theme-pairing.md#coverage-and-repeat-runs); omit images only for the user's explicit text-only choices.

| Source | Appropriate use | Agent action |
| --- | --- | --- |
| `generated` | Flat functional glyphs, simplified interface fragments, schematic relationships, maps, or data graphics supported by the brief | Build the scene and use the configured image generator |
| `provided` | Actual product appearance, physical details, content artwork, photos, exact interfaces, or a user's selected image | Find an approved existing asset or request the relevant capture/image, inspect it, and import it |

Set `scene.source` in the note's visual YAML. `object-detail` and `editorial-scene` require `provided`; explicitly choosing `generated` for either is rejected. For older briefs without this field, those two categories default to supplied media and the others to generated graphics. The categories describe presentation, not eight styles that must all be invented.

Use `provided` for another category whenever a real capture explains it better. Do not invent a device's appearance, fabricate actual product content, or turn a capability icon into a sculpted object. Decorative illustration and 3D still-life generation are outside this kit's release-note language.

For a map, distinguish an illustrative spatial explanation from an actual place, computed route, or coverage claim. Exact geography and routing need an approved map capture or verified source. Request a supplied image when that evidence is missing. Generated fictional geography is suitable only when explicitly identified as illustrative; visual plausibility does not establish geographic accuracy.

## Missing input

`releasekit image plan <version>` returns `action: provide` with `promptFile: null` when supplied media is needed. The instruction identifies the subject and import slot. Reuse available approved project files first. Otherwise ask the user for the specific capture, photograph, or content image. Continue independent copy and translation work while the asset is pending. Do not treat a missing capture as permission to synthesize its content.

The plan reports `generationRequests` and `providedRequests` separately. Always use the current plan; old prompt files are historical artifacts, not authorization to generate a newly supplied-only scene. Finalization remains blocked until the selected source is imported and validated.

## One image shared by both viewer themes

A native photo, content image, or screenshot often has one authentic appearance. Import it once:

```sh
releasekit image import 1.4.0 product-detail --theme shared --file ./approved-capture.png
```

This requires `source: provided`; pass `--source provided` with the import to change the source and selected image together. The CLI copies the selected bytes unchanged. `variants.shared` stores one asset; the public bundle exports one file with `fallbackTheme: shared`. The normal consumer lookup, `variants[theme] ?? variants[fallbackTheme]`, displays that file in either viewer theme. A shared slot is not a fabricated pair and does not require a second generation or duplicate file. Its original dimensions and colors are retained.

If the product actually supplies distinct dark/light captures, import those with `--theme dark` and `--theme light`. Once one themed capture is imported, the plan requests the remaining configured capture. The CLI switches between shared and themed selections during import; keep the previous entries until it succeeds. See [image transitions](theme-pairing.md#switch-between-shared-and-themed-images). A missing theme is never generated as a substitute for an authentic capture.

Inspect the content and crop before import. Keep the original source while preparing any user-authorized crop or presentation adjustment. Theme changes must not alter product content. File validation checks bytes and metadata; the agent's review establishes whether the selected media is the appropriate approved source.
