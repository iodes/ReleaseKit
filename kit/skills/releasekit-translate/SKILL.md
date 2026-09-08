---
name: releasekit-translate
description: Translate or refresh ReleaseKit release-note text and image alt text while preserving feature IDs, product terminology, requirements, and source-version meaning.
---

Read the release's configured locales and current source notes. Use [the writing and translation guide](references/writing.md) and [the content contract](references/format.md). Translate meaning using natural local phrasing, preserving menu paths, conditions, numbers, and product terminology supported by evidence.

Translate the configured non-source locales unless the user requested a subset. If the target release, requested language scope, or product terminology remains ambiguous after reading the context and evidence, use [the shared question guidance](references/workflow.md#ask-with-the-native-question-ui) for the missing decision. Reuse language and terminology choices already established for this release.

Keep the same note ID in each locale. Share raster assets across translations unless the user specifically requires text-bearing localized images. Do not regenerate illustrations merely because another locale is enabled.

Review the translated title, body, and alt text against the current source. Then run `releasekit translation mark <version> <note> --locale <locale>` to record the source fingerprint. Do not mark stale text current as a shortcut. Preserve already reviewed text that still matches its source.

After translating, follow [the next-step workflow](references/workflow.md#continue-to-the-next-step): report what is complete and what remains, then continue already requested work or offer the next useful action. Reassess after each selected step; finish when the requested export is delivered or the user chooses to stop.
