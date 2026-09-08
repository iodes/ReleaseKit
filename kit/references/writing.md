# Writing product release notes

Write for the person using the product, using its actual terminology and the configured language. Use a short feature name as the title and a short paragraph about what changed. Add a second paragraph for the action path, requirements, or a material limitation when supported by evidence. More detail is appropriate for a genuinely complex change; concision is not a reason to remove necessary operating instructions.

Group commits into user-visible changes. Let the final diff and target revision establish what shipped. A merged commit can have been reverted; a feature can have been renamed; internal maintenance can have no useful user-facing announcement. Do not translate each commit subject into a separate card.

For a first-use product introduction (`initialContent: summary`), describe the product and useful capabilities present at the pinned baseline. Read supporting snapshot files without reconstructing the historical commit sequence. Avoid “new,” “now available,” or “initial launch” unless that timing is established by the user or product evidence. Use [the adoption guide](adoption.md) for the selected scope and evidence rules.

Keep source evidence with each note. Do not invent performance percentages, privacy claims, security guarantees, supported platforms, eligibility, enabled-by-default behavior, or menu locations. If evidence is incomplete, explain the uncertainty to the author and keep the affected statement out of finalized copy until resolved.

Avoid hype, congratulations, “we are excited,” vague “various enhancements,” engineering implementation details with no user consequence, and repeated starts that make every note sound the same. Use active statements about the product's behavior. A small fix can be one precise sentence.

## Titles

Name the feature, setting, or product area with a compact noun phrase, preferably using the product's established label. Keep only the qualifiers needed to identify the change or distinguish it from another note. Put usage instructions, benefits, requirements, and longer explanations in the body.

Avoid turning titles into instructions, full sentences, or a restatement of the opening paragraph. In Korean, prefer feature names over sentence-like `~하기` constructions; in English, prefer names over imperative or how-to phrases. Use the shortest natural wording that preserves the feature's identity. Established operation names such as `되돌리기` are valid; do not mechanically strip endings or enforce a fixed character limit.

| Longer instructional title | Preferred feature title |
| --- | --- |
| Save your changes automatically while you work | Autosave |
| 원하는 시간에 알림을 받도록 예약하기 | 알림 예약 |
| 여러 파일의 이름을 한 번에 변경하기 | 일괄 이름 변경 |

## Examples from a fictional product

Title: Queue

You can now add a saved item to the queue by swiping its row to the right. The item keeps its existing position in your saved list.

Title: 대기열

이제 저장한 항목을 오른쪽으로 스와이프해 대기열에 추가할 수 있습니다. 저장 목록에서 항목의 위치는 그대로 유지됩니다.

Only use that second sentence if the behavior is established by the product evidence. An example is not permission to add a similar claim to another product.

## Translation

Selected translations are part of `releasekit-draft`. Use that skill for translation-only additions or refreshes as well; follow [the translation workflow](workflow.md#translate-selected-locales) for language scope and source fingerprints.

Use the same note ID in every configured locale. Translate user meaning, not word order. Keep translated titles as concise feature names, preserving the source subject and necessary qualifiers without expanding them into usage instructions. Keep product names supplied by the user, supported menu paths, requirements, and numbers consistent. Raster illustrations are shared; localize their alt text separately. Alt text describes the feature-bearing visual rather than the style or color palette.

After reviewing a translation against the current source, use `releasekit translation mark <version> <note> --locale <locale>`. This records a source fingerprint; it does not prove translation quality. If the original title, alt text, or body changes, review and refresh affected translations before marking them current again.
