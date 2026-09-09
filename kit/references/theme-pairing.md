# Theme pairs and generation cost

## Project policy

`visuals.themes` in `releasekit/config.yaml` accepts `both`, `dark`, or `light`. The recommended default is `both`. Single-theme projects request only that variant. Image count depends on image-enabled notes and missing or stale variants; it does not multiply by the number of translations.

This generation policy does not require inventing a second appearance for supplied media. A capture or approved content image can use one `shared` asset in either viewer theme. See [media sources](media-sources.md) for supplied-image requests and importing one source or distinct genuine theme captures.

`releasekit image plan <version>` writes pending prompt files and reports requested, ready, and pending asset counts. It never calls an image service. These counts are work units, not currency estimates or a guarantee about provider billing. Editing a provider's existing image can still cost money. Do not advertise automatic theme conversion as a free second generation.

Policy is captured in each release when it is prepared. Editing the project default affects new releases. To apply the current project policy to an existing draft, run `releasekit image plan <version> --sync-config`. Previously selected files are retained; themes disabled by the new policy are not exported. Ready releases must be reopened before their policy changes.

## Coverage and repeat runs

The default image scope is every note in the saved release, including grouped minor fixes and improvements. A grouped note has one visual brief and the configured image variants; its bullets do not become separate notes or image requests. Review the current `release.yaml` each time so newly added notes are included. A plain `releasekit-image` invocation uses this full scope without asking the user to pick important notes. Honor an explicitly limited request and the user's explicit text-only choices. If earlier agent prioritization disabled a note's image without such a choice, restore `image: true` and create or complete its visual brief in place, preserving its text, translations, and existing assets. Do not recreate the note. Missing supplied media stays pending instead of making the note text-only.

Before planning, complete missing or unfinished briefs for the image-enabled notes. Preserve existing scene specifications and the release's captured theme policy when they have not been changed by the user's request. Run `releasekit image plan <version>` from the current saved state, then handle the missing requests across all notes. Respect `action: generate` versus `action: provide` and the configured dark/light or shared variants.

On repeat runs, generate or import only missing images and missing required variants. Reuse existing valid imports and their completed reviews; do not regenerate an accepted image merely because the skill was invoked again. This includes a run after the user adds notes: complete those notes' missing images while retaining earlier ones. If everything is already current, generate nothing and provide the image-review and finalization guidance.

An existing image reported as stale or invalid is unresolved, even though its file exists. Name the affected note and the reason, preserve the current selection, and offer a targeted correction; a missing-images request alone does not authorize replacing it. An explicit request to edit, regenerate, or replace an image applies to that target even when the plan considers it current; follow [replacement handling](#replace-or-regenerate-an-image). Keep other accepted images intact and check affected theme counterparts when the scene changes. Do not claim complete coverage or recommend finalization while required assets remain unresolved.

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
2. Read the image plan and the project's requested themes. Reuse existing current assets. The following rendering steps apply to `action: generate`; handle `action: provide` through the supplied-image workflow.
3. Generate one requested variant using its prompt. Select and inspect the result.
4. Import it. Re-run the image plan; a valid approved counterpart is now offered as a composition reference for the other theme.
5. When the available tool supports image references or edits, use the counterpart for a constrained theme edit. Otherwise repeat the exact scene contract and inspect for layout drift. Never claim pixel-identical geometry from independent stochastic generations.
6. Compare the pair. Both files should have the same pixel dimensions. Verify pose, crop, UI state, values, and semantic colors by sight, then import the selected counterpart.

Use one file per theme, not a split canvas or a two-panel comparison image. Keep the current selection until a reviewed replacement is imported into the same slot. Do not restart the entire release when one small defect can be corrected locally.

## Replace or regenerate an image

Treat replacement and regeneration as an edit to the existing release, note ID, and affected theme. Reopen a ready release as a draft before editing it. Reuse its scene brief and current assets as needed for the requested correction. A request to regenerate an image still needs work even if the unchanged asset is reported as current by the plan; report the requested replacement as pending until it has been generated, reviewed, and imported.

Keep the existing variant metadata while preparing the candidate, then run `releasekit image import <version> <note> --theme <theme> --file <selected-file>` for the same slot. Import validates the candidate and saves the new selection before removing unused managed images for this note, including older imports and obsolete shared/themed files. Reimporting identical bytes reuses the same file. Other selected variants, notes, releases, declared image references, and original source files outside the note's managed assets are preserved. If decoding or saving fails, the previous source and selection remain intact; report the replacement as pending.

Keep temporary generation candidates outside the release's `assets/` directory and remove task-created discarded candidates when the replacement is complete. Do not add a new note or clear the old variant entry to make a replacement request. A replacement that remains one shared supplied image stays in the `shared` slot. Use [the transition flow](#switch-between-shared-and-themed-images) when the requested replacement changes between shared and themed usage.

### Switch between shared and themed images

Keep the current variant entries while preparing and reviewing the replacement. Import with the requested target `--theme`; the CLI replaces incompatible shared or themed entries automatically and cleans unused managed images after saving. When the requested media source also changes, pass `--source provided` or `--source generated` so that source and selection are saved together. Do not pre-clear variants or separately change `scene.source` merely to perform this transition.

For example, replace generated dark/light illustrations with one approved capture:

```sh
releasekit image import 1.4.0 queue-action --theme shared --source provided --file ./approved-capture.png
```

To replace that shared image with distinct approved theme captures:

```sh
releasekit image import 1.4.0 queue-action --theme dark --file ./approved-dark.png
releasekit image import 1.4.0 queue-action --theme light --file ./approved-light.png
```

The source remains supplied when `--source` is omitted. For a requested generated explanation instead, use `--source generated` on the first themed import; supplied-only subjects still require real media. Use only the release's configured themes. The first themed import replaces the shared selection, while any required counterpart remains pending until imported. Never synthesize or duplicate a supplied counterpart or describe a partial pair as complete. A source or scene change can also make an existing themed counterpart stale; review and refresh that affected image before finalization.

## External generation handoff

If the agent has no image generator, preserve the prompt files and list the pending assets. The user can generate them with another tool and return the files. Import each with:

```sh
releasekit image import 1.4.0 queue-action --theme dark --file ./selected-dark.png
releasekit image import 1.4.0 queue-action --theme light --file ./selected-light.png
```

For generated illustrations, only configured themes are required. A missing theme in a two-theme project remains pending and blocks finalization. Supplied media can instead use one genuine shared source. Do not create placeholders, automatic inversion, or duplicate files to satisfy validation.

## Consumer behavior

Exported image data includes `variants` and `fallbackTheme`. A consumer selects the requested theme if present, otherwise the explicitly exported fallback. The fallback can be `dark`, `light`, or `shared`. A supplied shared asset therefore appears once as `variants.shared`, with `fallbackTheme: shared`; the bundle does not pretend a second asset exists. Consumers should not invert or recolor raster assets.

The file validator checks format, actual decoding, dimensions, content digest, scene freshness, and configured themes. It rejects identical files masquerading as a pair. The image review checks composition and meaning; a hash cannot establish either.
