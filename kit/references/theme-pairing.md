# Theme pairs and generation cost

## Project policy

`visuals.themes` in `releasekit/config.yaml` accepts `both`, `dark`, or `light`. The recommended default is `both`. Single-theme projects request only that variant. Image count depends on image-enabled notes and missing or stale variants; it does not multiply by the number of translations.

`releasekit image plan <version>` writes pending prompt files and reports requested, ready, and pending asset counts. It never calls an image service. These counts are work units, not currency estimates or a guarantee about provider billing. Editing a provider's existing image can still cost money. Do not advertise automatic theme conversion as a free second generation.

Policy is captured in each release when it is prepared. Editing the project default affects new releases. To apply the current project policy to an existing draft, run `releasekit image plan <version> --sync-config`. Previously selected files are retained; themes disabled by the new policy are not exported. Ready releases must be reopened before their policy changes.

## One scene, two presentation treatments

Both outputs share the same scene brief. Lock subject identity, geometry, object count, positions, scale, crop, camera, UI topology, action state, chart values, and any allowed literal labels. Change presentation surfaces, neutral values, lighting, shadows, and necessary edge separation. Preserve meaningful status colors and natural photographic or material colors.

| Role | Dark treatment | Light treatment |
| --- | --- | --- |
| Canvas | Quiet charcoal | Quiet near-white |
| Interface surface | Separate adjacent dark values | Separate white and pale-gray values |
| Primary neutral symbol | Legible mid-light neutral | Legible mid-dark neutral |
| Secondary detail | Subdued, still distinguishable | Subdued, still distinguishable |
| Contact shadow | Soft, with enough local separation | Light, restrained, never muddy |
| Interaction or status color | Preserve semantic hue | Preserve semantic hue |
| Photo or product material | Preserve authentic appearance | Preserve authentic appearance |

Do not invert pixels or shift brightness globally. A black lens remains a black lens on a light canvas. A warning remains the same warning color. If the underlying application has only one authentic UI theme, retain that UI and adapt the surrounding presentation rather than claiming an unsupported application theme.

## Generation sequence

1. Complete the shared brief and inspect its product references.
2. Read the image plan and the project's requested themes. Reuse existing current assets.
3. Generate one requested variant using its prompt. Select and inspect the result.
4. Import it. Re-run the image plan; a valid approved counterpart is now offered as a composition reference for the other theme.
5. When the available tool supports image references or edits, use the counterpart for a constrained theme edit. Otherwise repeat the exact scene contract and inspect for layout drift. Never claim pixel-identical geometry from independent stochastic generations.
6. Compare the pair. Both files should have the same pixel dimensions. Verify pose, crop, UI state, values, and semantic colors by sight, then import the selected counterpart.

Use one file per theme, not a split canvas or a two-panel comparison image. Keep previously accepted files while iterating. Do not restart the entire release when one small defect can be corrected locally.

## External generation handoff

If the agent has no image generator, preserve the prompt files and list the pending assets. The user can generate them with another tool and return the files. Import each with:

```sh
releasekit image import 1.4.0 queue-action --theme dark --file ./selected-dark.png
releasekit image import 1.4.0 queue-action --theme light --file ./selected-light.png
```

Only configured themes are required. A missing theme in a two-theme project remains pending and blocks finalization. Do not create SVG stand-ins, placeholders, automatic inversion, or a duplicate of the existing file to satisfy validation.

## Consumer behavior

Exported image data includes `variants` and `fallbackTheme`. A consumer selects the requested theme if present, otherwise the explicitly exported fallback. A single-theme project therefore uses one file in both viewer themes by choice; the bundle does not pretend a second asset exists. Consumers should not invert or recolor raster assets.

The file validator checks format, actual decoding, dimensions, content digest, scene freshness, and configured themes. It rejects identical files masquerading as a pair. The image review checks composition and meaning; a hash cannot establish either.
