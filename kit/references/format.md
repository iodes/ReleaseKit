# Content contract

Project configuration is `releasekit/config.yaml`. Releases live under `releasekit/releases/<version>/`. Version IDs are filesystem-safe strings, not necessarily semantic versions. A release stores its configured locales and visual policy so future project-default changes do not rewrite past releases. New projects default to English originals (`sourceLocale: en-US`, `locales: [en-US]`). The agent suggests the user's current language as an optional translation and accepts additional languages; selected translations are added after the source in the release's `locales`.

Optional `history.start` in the project config records first-use setup: `ref` is the original commit/tag label, `sha` is its immutable commit, `past` is `summary`, `history`, or `skip`, and `version` is the baseline release ID for summary/history or null for skip. `releasekit start` saves this once before any release exists. It creates no content. Existing configs without this field retain the explicit-range workflow. See [first-use setup](adoption.md).

Within one release:

| File | Purpose |
| --- | --- |
| `release.yaml` | Version, status, explicit previous link, pinned Git range, policy snapshot, ordered note metadata |
| `notes/<id>/<locale>.md` | Title, alt text, source fingerprint, and Markdown body |
| `visuals/<id>.yaml` | Scene, image source choice, and imported variant metadata |
| `prompts/<id>.<theme>.md` | Generation requests for pending generated variants; supplied images have no generation request |
| `assets/` | Selected raster files with content-derived names |

Preparation writes only `release.yaml`: `source` records the immutable Git boundaries, and each note later records its relevant commits or paths. No full patch or separate changed-file index is stored. Draft validation checks note references against the pinned Git range or the baseline snapshot for a summary; finalization fingerprints the metadata, note text, and visual briefs. Ready content can be validated and exported without Git history.

Optional `initialContent` in a baseline release snapshots the selected `summary` or `history` mode. Either mode requires `source.fromRef: null`, `source.fromSha: null`, and `previous: null`. A summary describes the product at `source.toSha`; its evidence may reference only that SHA or tracked paths in that snapshot. History mode analyzes the full history through that SHA with normal range evidence. This distinction is preserved in the content fingerprint but excluded from consumer JSON. An absent field keeps the existing range semantics, including full history when `fromSha` is null; loading old files adds no defaults or changes to their fingerprints.

The next release begins after the baseline SHA and links to its version with `previous`. A skipped past creates no baseline release: the first regular draft uses the saved start, and later drafts use explicit boundaries or previous links. Baseline entries count toward the export limit just like other releases.

Notes are ordered by their entries in `release.yaml`. Note IDs are unique within a version and shared across locales. Their consumer identity is the pair `(version, note.id)`; never deduplicate different releases by note ID or title alone.

Frontmatter fields are `title`, `alt`, and `sourceHash`. The source locale normally uses `sourceHash: null`. Translation marking records a fingerprint of the source title, alt text, and body. An image-free note can use empty alt text. An image-enabled note requires a complete visual brief and its active image assets before finalization. Its scaffold leaves `archetype` and `source` unselected; the authoring agent chooses both from the note and product evidence.

`scene.source` is `generated` or `provided`. Legacy briefs may omit it: `object-detail` and `editorial-scene` use supplied media; other categories default to generated graphics. Those two supplied-only categories reject an explicit `generated` choice. For generated media, `variants` contains the configured dark/light pair or single theme. Supplied media can contain just `shared`, or distinct dark/light entries following project policy. Do not mix shared and themed entries. The shared slot retains native dimensions and bytes, does not depend on presentation palettes, and exports as one asset with `fallbackTheme: shared`. Missing supplied inputs remain pending. See [media sources](media-sources.md).

The `releasekit-finalize` skill reviews the release and runs `releasekit finalize`. This CLI command checks references and content, then records `status: ready` and a content fingerprint. A later edit invalidates that fingerprint. Reopen the draft before changing content; publishing is a separate user-controlled workflow.

The generated JSON schemas shipped with the package are the structural source of truth. `releasekit export` produces `release-notes.json` plus relative image assets. It includes only display fields, configured image variants, the chosen locale, and explicit version groups. Source patches, prompts, internal paths, and Git evidence are not included. Consumers should safely render `bodyMarkdown` and use image `variants[theme]` or `variants[fallbackTheme]` without recoloring the raster.

An export destination must not already exist. This avoids overwriting content or mixing assets from separate builds. Validation completes before the destination is created.
