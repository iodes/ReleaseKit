# Common images for minor changes

Grouped minor changes reuse project-level originals across releases. Use this guide during `releasekit-image`, before generating a new illustration. Standalone features keep their own visual meaning, and explicit custom-image or text-only choices take precedence.

| Common kind | Use for |
| --- | --- |
| `minor-fixes` | The grouped minor bug-fix note |
| `minor-improvements` | The grouped minor improvement and convenience note |

Select the kind from the note's editorial role under [Group minor changes](writing.md#group-minor-changes). A translated title, note ID, or `fix`/`improvement` category alone does not identify a minor group. Keep existing note IDs; do not add unsupported fields to release or visual metadata.

## Store reviewed originals

Store originals in `releasekit/common-images/<kind>/`, outside individual releases. Create a kind's directory when its first reviewed original is available. Each directory contains:

- `visual.yaml`: the existing visual format (`schemaVersion`, `scene`, `variants`). Copy asset hashes, dimensions, and scene fingerprints from successful CLI imports. Here, each asset's `file` is relative to this common directory.
- `policy.yaml`: the captured `release.yaml` `visuals` value used for the originals.
- The selected raster files, named by variant and content, such as `dark.<hash>.png`. Use the actual format and hash suffix returned by import.

These files are agent-maintained source records. The CLI does not discover or select common images automatically. Publish only reviewed files with matching metadata; an absent theme remains missing. A directory, prompt, or unfinished image is not a reusable original.

Use a stable, generic scene for the kind, normally a compact neutral monochrome filled glyph on a quiet flat tile with broad margins. Generic fixes and improvements use no accent by default. Do not color the glyph or add a colored badge simply to announce maintenance; the note category is not a selected, active, or successful state. Keep release versions, titles, languages, bullet counts, individual fixes, and release-specific evidence out of the scene. The common scene must not depend on files belonging to its originating release. Do not imply a particular feature, a security guarantee, or that every possible bug is fixed. The note's text and evidence still describe that release's actual changes.

## Reuse before generation

1. Preserve the note's existing valid selections, including custom images and copies of an earlier common design. A newer common original does not replace them on a repeat run. Complete a partial illustration under its existing scene; a common counterpart is suitable only when it matches that scene and the selected image.
2. For a new, unillustrated, or partially illustrated minor group, inspect its common `visual.yaml`, `policy.yaml`, and requested files. Verify the kind, published review status, file hashes, and actual dimensions against the record. Reuse prior visual review when the originals and their intended role are unchanged.
3. For a new or unillustrated group without an explicit custom brief, adopt the common `scene`, keeping it independent of the current bullet list. Check compatibility with the release's captured policy. For generated originals, the common scene must match the target brief, and the requested canvas dimensions, preset, accent, and requested theme's palette must match the source policy. Enabling another theme or changing only the other palette does not invalidate a compatible original. Preserve `source: generated` for generated artwork; do not relabel it as supplied to bypass these checks. A genuine approved supplied image keeps `source: provided` and may use `shared` under the normal supplied-image rules.
4. Import each compatible requested original with `releasekit image import`, using the file named by the common record. Do not copy the common `variants` paths into a release, use links to another release's assets, or point selected assets outside the release directory.
5. Run `releasekit image plan <version>` after imports. Compatible imports are now ready; continue only with missing or unresolved assets. A generated source does not mean that an existing reviewed file must be generated again. Do not run image generation from an older plan after satisfying its request by import.

The import command uses the current note's actual ID, which may differ from the common kind:

```sh
releasekit image import <version> <note> --theme <theme> --file releasekit/common-images/<kind>/<file>
```

Use only the release's configured themes. Reuse both members of an existing pair when both are required, or only the configured member for a single-theme release. A supplied `shared` original serves either theme without manufacturing a pair. Cross-release reuse and the `shared` theme slot are separate concepts.

## Create only missing originals

If no reviewed original exists for a needed kind or theme, first check already approved project images, including earlier minor-group illustrations. Promote a suitable generic image and its scene and policy to the common store when its meaning and appearance match. Do not use an unrelated earlier feature image solely because its category matches.

If no suitable generated original is available, establish the generic scene once and follow the normal [generation sequence](theme-pairing.md#generation-sequence) for the missing configured themes. Keep an existing scene stable while completing its pair. Import a reviewed first variant into the current note so the planner can offer it as the composition reference for the counterpart. For a supplied scene, find or request the missing genuine input under [the supplied-image rules](media-sources.md#missing-input); do not generate its replacement.

To publish an original, first import it successfully under the same scene and policy that will be saved in the common record. Copy the selected bytes unchanged into the common directory and record the matching metadata and captured policy. Preserve already reviewed compatible variants. A continuation of a custom or earlier design must not overwrite a different common design. If only one theme is complete, publish only that entry and keep the other pending. A later run reuses the completed theme and creates only the missing counterpart. Do not invert, duplicate, or freshly redraw an existing variant to satisfy a new release.

When generation is unavailable or an original fails integrity or compatibility checks, keep the affected work pending. Do not silently regenerate an existing design, claim that it is ready, or substitute a placeholder. An appearance change already requested by the user follows the replacement procedure below without another confirmation.

## Preserve release snapshots

Import copies the original into the current release's managed assets and records its own hashes. Keep that scene and those selected files in the release. A bullet addition, wording change, or translation update alone is not a reason to rewrite the common scene, reimport current images, or generate another picture. Update text and localized alt text only where their meaning requires it. A change that no longer belongs to the minor group needs its own appropriate note and illustration.

For an explicitly requested common-design change, prepare and review the replacement before updating the common source records. Keep the prior published originals until the replacement set is ready, and do not mix incompatible scenes or policies in one record. New or unillustrated notes then use the new original. Existing releases and already accepted draft images retain their saved copies unless their replacement was also requested; use the normal [replacement workflow](theme-pairing.md#replace-or-regenerate-an-image) for those notes.

Common files are originals outside release asset cleanup. Removing a note must not remove them. Export continues to copy each release's selected snapshots into that release's asset directory in the bundle. This avoids repeated generation while keeping older releases independent of later changes to the common store; it does not deduplicate physical files across releases.
