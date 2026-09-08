---
name: releasekit-finalize
description: Finalize a ReleaseKit release by reviewing facts, copy, translations, and images, validating content, and marking the local release ready. Export a release bundle when requested.
---

Read the target release, [the workflow](references/workflow.md), and [the content contract](references/format.md). Reuse the version and choices established in the request and conversation. Use [the shared question guidance](references/workflow.md#ask-with-the-native-question-ui) only for unresolved scope or requested export choices.

Invoking this skill to finalize a release includes review, corrections within the requested scope, validation, and local finalization. Complete those actions without a separate confirmation step. If the user explicitly asks only for an assessment, report the findings and leave the release status unchanged.

Compare claims against the pinned final diff and target-revision files. For `initialContent: summary`, use the baseline snapshot and [the adoption guide](references/adoption.md); do not require a reconstruction of old commits or assume an initial launch. Use [the writing guide](references/writing.md) to check changed behavior, action paths, requirements, and limitations. Refresh affected translations after source edits using [Translate selected locales](references/workflow.md#translate-selected-locales). Preserve current translations and manual edits.

Inspect selected images for correct subject, readable framing, absent invented details, and consistent geometry across configured themes using [the pairing guide](references/theme-pairing.md). Reuse a completed visual review when the note, brief, and assets are unchanged. The CLI verifies files and metadata; it cannot judge whether the image depicts the feature accurately. Keep missing or unsuitable assets pending and use `releasekit-image` for the needed correction.

Run `releasekit validate <version>`, resolve errors, and assess warnings. Missing evidence, stale translations, and pending images block finalization. If a linked predecessor is still a draft, complete it first when it is included in the user's scope; otherwise report that prerequisite. Do not mark an unresolved release ready or stop at a review report when finalization was requested and the release can be completed.

For a draft that passes review and validation, run `releasekit finalize <version>` and verify that `release.yaml` contains `status: ready` and a nonempty `contentHash`. The command validates again and records the fingerprint; do not set ready status manually. For an already ready release, validate and reuse it without calling finalize again. If requested corrections require changes, reopen it with `status: draft` and `contentHash: null`, apply the corrections, and finalize again.

If export was requested, run `releasekit export --current <version> --locale <locale> --limit <count> --out <directory>` with the requested or established choices, using [the workflow](references/workflow.md) for defaults. Preserve individual release boundaries and configured fallback themes. A successful finalization is a complete local result even when no export was requested. Finalization does not commit, tag, push, deploy, or publish.

When finalized, report the version and link to its release file, adding bundle links only for a completed requested export. If blocked, state the remaining work and the actual saved status. Follow [the next-step workflow](references/workflow.md#continue-to-the-next-step) without introducing a separate review stage.
