# Writing product release notes

Write for the person using the product, using its actual terminology and the configured language. Use a concise title naming the capability, action, or changed result, followed by body copy explaining what the user can do or what now happens. A clear description can be complete on its own. Add usage guidance only when readers need it to understand or use this specific change.

Group commits into user-visible changes. Let the final diff and target revision establish what shipped. A merged commit can have been reverted; a feature can have been renamed; internal maintenance can have no useful user-facing announcement. Do not translate each commit subject into a separate card. Decide which changes warrant standalone notes and which belong in [minor-change groups](#group-minor-changes) before scaffolding notes.

For a first-use product introduction (`initialContent: summary`), describe the product and useful capabilities present at the pinned baseline. Read supporting snapshot files without reconstructing the historical commit sequence. Avoid “new,” “now available,” or “initial launch” unless that timing is established by the user or product evidence. Use [the adoption guide](adoption.md) for the selected scope and evidence rules.

Keep source evidence with each note. Do not invent performance percentages, privacy claims, security guarantees, supported platforms, eligibility, enabled-by-default behavior, or menu locations. If evidence is incomplete, explain the uncertainty to the author and keep the affected statement out of finalized copy until resolved.

Avoid hype, congratulations, “we are excited,” vague “various enhancements,” engineering implementation details with no user consequence, and repeated starts that make every note sound the same. Use active statements about the product's behavior. A small fix can be one precise bullet in a grouped note.

## Group minor changes

Choose note size by user impact. Keep major new capabilities, meaningful workflow changes, and fixes with substantial consequences as standalone notes. Group small user-visible corrections and incremental conveniences, including small additions to existing features, instead of giving every change its own title and note. Patch size, commit count, and a `feature` or `fix` label do not determine importance: a short fix that prevents data loss or restores a core workflow can warrant a standalone note. Omit internal maintenance with no useful user-facing consequence, and respect the author's explicit inclusion, exclusion, or emphasis.

Within each release, collect minor changes into these separate notes using the existing categories. Use natural equivalents in other selected locales.

| Kind | Category | Korean title | English title |
| --- | --- | --- | --- |
| Minor bug fixes | `fix` | 사소한 오류 수정 | Minor Fixes |
| Minor improvements and conveniences | `improvement` | 사소한 기능 향상 | Minor Improvements |

Reuse an existing group; otherwise create one note per nonempty kind, normally after the standalone notes. A group may contain only one bullet; do not promote it to a standalone note or invent more items just to fill the group. Omit empty groups. Grouping stays within the release's pinned scope, even when another version has the same group title or note ID. A baseline introduction still follows the snapshot rules above and does not invent a history of minor changes.

Start the body directly with an unordered Markdown list. Write one short, concrete change per `-` bullet, without an introductory paragraph, per-item titles, or nested explanations. Combine commits that produce the same outcome. Different product areas can share a minor group; each bullet retains its own meaning. State what changed instead of a vague assurance that bugs were fixed. Add a usage path or condition only when essential under [the body guidance](#body-copy). Include each change once, either in a standalone note or in a minor group.

Attach the relevant paths or commits for every bullet to the group note's evidence metadata. Preserve the same grouping, bullet coverage, and order across locales. When consolidating an existing draft, move its supported content, manual edits, and evidence before removing superseded notes; follow [Revise draft notes](workflow.md#revise-draft-notes). A group is one note with the normal image policy; its bullets are not separate notes or image requests.

These fictional examples assume that all listed changes are established and minor in their product context:

Title: 사소한 오류 수정

- 긴 항목 이름이 도구 설명에서 잘리던 문제를 수정했습니다.
- 설정 설명의 오탈자를 수정했습니다.

Title: 사소한 기능 향상

- 최근 사용한 정렬 방식을 기억합니다.
- 대기열 목록에 항목 수를 표시합니다.

## Body copy

For a standalone note, lead with the concrete capability or changed behavior. For an action, say what the user can do and how when the gesture or control is central. For automatic behavior, say when it happens and what the product does. For an improvement, identify the aspect that changed; for a fix, name the affected action or condition and the corrected problem. An opening that only says a feature was added, updated, or improved gives the reader too little information.

Usually stop once the changed behavior is clear. Menu paths, setup steps, and usage conditions are optional context, not a checklist for every note. Include them only when their omission would leave a non-obvious feature difficult to find or use, or materially misrepresent its availability or behavior. Automatic improvements, bug fixes, and changes to familiar controls generally need no separate usage instructions. Omit obvious navigation, routine prerequisites, and conditions already clear from the copy. Keep any necessary details concise and grounded in product evidence. Benefits and reassuring statements about unchanged behavior also need evidence and a reason to be included.

Let the content determine length. One sentence can fully explain a small change. Add paragraphs only when there is more useful information to convey; use bullets when several related changes, choices, or necessary steps are easier to scan. Keep standalone notes focused on a coherent user task. Collect remaining minor changes using [the grouping guidance](#group-minor-changes), preserving their specifics in the bullets. Do not pad a short note with a repeated title, a stock closing sentence, unrelated maintenance, or future work presented as shipped functionality.

## Newly supported capabilities

When the pinned before-and-after evidence shows that an action was unsupported before this release and is supported at the target revision, prefer “이제 ~할 수 있습니다.” in Korean or a natural equivalent such as “You can now …” in English when first-time availability is the main news. A direct action or behavior statement can be clearer when the interaction itself is the news. State the newly possible action; include a condition only when it materially limits the claim and is not already clear from the wording. If support was added only for a format, platform, or mode, name that scope instead of implying the whole feature is new. A `feature` category or the current implementation alone does not establish prior lack of support.

Use this construction selectively where the transition matters most. Read the notes together in release order for each locale, and avoid repeating “이제,” “~할 수 있습니다,” or “You can now” in consecutive openings or throughout the release. When several notes qualify, prioritize this opening where it best highlights a newly possible action; vary other openings with the action or automatic result itself, or direct statements such as “~을 지원합니다,” preserving the meaning and scope. Describe what the product does instead of cycling through generic added, supported, and improved formulas. Merely replacing “이제” with “새롭게” or “드디어” does not resolve a repetitive sentence pattern. Use editorial judgment rather than a fixed count or quota.

Describe improvements to existing support, performance changes, and bug fixes directly without implying first-time support. If earlier support is uncertain, describe only the verified behavior without claiming it is newly available. The first-use introduction evidence rule above still applies. These fictional examples assume the change in the left column is established:

| Established change | Suitable Korean body wording |
| --- | --- |
| Batch renaming was unsupported and is now supported | 이제 여러 파일의 이름을 한 번에 변경할 수 있습니다. |
| A new right-swipe gesture adds a saved item to the queue | 저장한 항목을 오른쪽으로 스와이프하면 대기열에 추가됩니다. |
| SVG export was added, and a nearby note already uses the same opening | SVG 형식 내보내기를 지원합니다. |
| Existing batch renaming became faster | 여러 파일의 이름을 변경할 때 처리 속도를 개선했습니다. |
| An existing save action could crash | 저장 중 앱이 종료되던 문제를 수정했습니다. |

## Titles

These rules apply to standalone notes. Grouped minor notes use [the summary headings above](#group-minor-changes), with each specific change stated in a bullet.

Name the capability, action, or changed result the reader should notice. Keep the product's established terminology and the scope that makes the change recognizable, such as a gesture, affected interaction, mode, or condition. The title helps the reader identify the change; the body explains its behavior and use.

A major new capability can use its feature name alone when that name clearly communicates what is being introduced. An addition within an existing feature needs its added scope in the title, but a concrete action such as `스와이프로 대기열 추가` already names that scope. It does not need an extra availability label. A `feature` category alone does not establish that the whole capability is new. For a first-use product introduction, feature names can describe the baseline capabilities without claiming a change or launch.

For improvements, fixes, and other changes to existing functionality, retain the actual change. Use a specific outcome such as `더 빠른 파일 검색`, or an affected area with a meaningful qualifier such as `대화 삭제 동작 개선` or `저장 중 앱 종료 문제 수정`. An outcome can already express the improvement; a bare area such as `대화 삭제` does not explain an interaction improvement. Choose the most specific wording established by the evidence.

Keep titles as compact, natural phrases, including concise action phrases. English action titles such as `Add to Queue with a Swipe` are valid; Korean can use `스와이프로 대기열 추가` without a sentence-like `~하기` ending. When needed, put complete instructions, menu paths, and longer explanations in the body. Established operation names such as `되돌리기` are valid; do not mechanically strip endings or enforce a fixed character limit.

Use words such as `지원`, `추가`, `개선`, `수정`, `업데이트`, and their locale equivalents only when they contribute meaning. Remove a redundant announcement suffix when the action or result is already clear: `스와이프로 대기열 추가 지원` becomes `스와이프로 대기열 추가`. Keep `추가` here because adding to the queue is the user action. Keep compatibility wording when it distinguishes support for an existing tool from introducing that tool, as in `화면 읽기 프로그램 지원`. Neither appending nor deleting the same suffix from every title is an editorial rule.

These fictional examples assume the change in the first column is established:

| Established change | Too vague or padded | Suitable title |
| --- | --- | --- |
| A swipe gesture was added for queueing saved items | 스와이프로 대기열 추가 지원 | 스와이프로 대기열 추가 |
| Existing conversation deletion interaction was improved | 대화 삭제 | 대화 삭제 동작 개선 |
| An existing save action could crash | 저장 | 저장 중 앱 종료 문제 수정 |
| Existing batch renaming became faster | Batch renaming improvements | Faster batch renaming |
| Batch deletion was added to existing conversation deletion | 대화 일괄 삭제 기능 지원 | 대화 일괄 삭제 |
| The default notification time changed | 알림 | 기본 알림 시간 변경 |
| Compatibility with screen readers was added | 화면 읽기 프로그램 | 화면 읽기 프로그램 지원 |
| Autosave was introduced as a major new capability | Save your changes automatically while you work | Autosave |

During drafting and final review, read each standalone title alone to check that the capability or actual change is identifiable. Remove redundant announcement wording, and restore missing change meaning for improvements and fixes. Then read the title and body together: the opening should add concrete behavior, with every claim and qualifier grounded in the pinned evidence.

## Examples from a fictional product

These standalone examples assume the described changes are established by product evidence and warrant individual attention. Similar changes with minor impact belong in the groups above.

Title: Add to Queue with a Swipe

Swipe a saved item to the right to add it to the queue.

Title: 스와이프로 대기열 추가

저장한 항목을 오른쪽으로 스와이프하면 대기열에 추가됩니다.

Title: 대화 삭제 동작 개선

대화를 삭제한 뒤에도 목록의 스크롤 위치가 유지되어, 보던 위치에서 계속 탐색할 수 있습니다.

Title: 저장 중 앱 종료 문제 수정

파일 이름에 특수 문자가 포함된 경우 저장 중 앱이 종료되던 문제를 수정했습니다.

The action example uses a direct instruction or result; a newly available action can also use the opening described above when that transition matters. The improvement example explains the observable behavior, and the fix identifies the triggering condition. Do not infer these fictional details for a real product. Add setup, requirements, or limitations only when established and needed to understand or use that specific change; a complete one-sentence note needs no filler.

## Translation

Selected translations are part of `releasekit-draft`. Use that skill for translation-only additions or refreshes as well; follow [the translation workflow](workflow.md#translate-selected-locales) for language scope and source fingerprints.

Use the same note ID in every configured locale. For grouped minor notes, translate the group title and every bullet while preserving their order and meaning; do not split translated bullets into separate notes. Translate user meaning, not word order. Preserve whether an action is newly supported or an existing capability changed, and apply the new-capability and repetition guidance across each locale rather than copying every opening mechanically. Keep translated titles concise while preserving the source capability, action, or changed result. Apply the title guidance in every locale: retain meaningful improvement, fix, and compatibility distinctions, but do not add `지원` or another announcement suffix simply because the capability is new. Translate a short English action title into a natural local title instead of forcing identical grammar or suffixes. Preserve the body's concrete behavior and any action paths or conditions it includes, without mechanically copying its opening pattern or adding usage guidance to fill a recurring template. Keep product names supplied by the user, supported menu paths, requirements, and numbers consistent. Raster illustrations are shared; localize their alt text separately. Alt text describes the feature-bearing visual rather than the style or color palette.

After reviewing a translation against the current source, use `releasekit translation mark <version> <note> --locale <locale>`. This records a source fingerprint; it does not prove translation quality. If the original title, alt text, or body changes, review and refresh affected translations before marking them current again.
