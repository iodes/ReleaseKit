# Content contract

Project configuration is `releasekit/config.yaml`. Releases live under `releasekit/releases/<version>/`. Version IDs are filesystem-safe strings, not necessarily semantic versions. A release stores its configured locales and visual policy so future project-default changes do not rewrite past releases.

Within one release:

| File | Purpose |
| --- | --- |
| `release.yaml` | Version, status, explicit previous link, pinned Git range, policy snapshot, ordered note metadata |
| `evidence.json` and `changes.patch` | Commit/path evidence and the net change at the requested end revision |
| `notes/<id>/<locale>.md` | Title, alt text, source fingerprint, and Markdown body |
| `visuals/<id>.yaml` | Shared scene specification and imported variant metadata |
| `prompts/<id>.<theme>.md` | Reproducible generation requests for pending variants |
| `assets/` | Selected raster files with content-derived names |

Notes are ordered by their entries in `release.yaml`. Note IDs are unique within a version and shared across locales. Their consumer identity is the pair `(version, note.id)`; never deduplicate different releases by note ID or title alone.

Frontmatter fields are `title`, `alt`, and `sourceHash`. The source locale normally uses `sourceHash: null`. Translation marking records a fingerprint of the source title, alt text, and body. An image-free note can use empty alt text. An image-enabled note requires a complete visual brief and every configured theme before finalization.

`releasekit finalize` checks references and content, then records `status: ready` and a content fingerprint. A later edit invalidates that fingerprint. Reopen the draft before changing content; publishing is a separate user-controlled workflow.

The generated JSON schemas shipped with the package are the structural source of truth. `releasekit export` produces `release-notes.json` plus relative image assets. It includes only display fields, configured image variants, the chosen locale, and explicit version groups. Source patches, prompts, internal paths, and Git evidence are not included. Consumers should safely render `bodyMarkdown` and use image `variants[theme]` or `variants[fallbackTheme]` without recoloring the raster.

An export destination must not already exist. This avoids overwriting content or mixing assets from separate builds. Validation completes before the destination is created.
