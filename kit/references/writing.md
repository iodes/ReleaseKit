# Writing product release notes

Write for the person using the product, using its actual terminology and the configured language. Prefer a concrete capability title and a short paragraph about what changed. Add a second paragraph for the action path, requirements, or a material limitation when supported by evidence. More detail is appropriate for a genuinely complex change; concision is not a reason to remove necessary operating instructions.

Group commits into user-visible changes. Let the final diff and target revision establish what shipped. A merged commit can have been reverted; a feature can have been renamed; internal maintenance can have no useful user-facing announcement. Do not translate each commit subject into a separate card.

Keep source evidence with each note. Do not invent performance percentages, privacy claims, security guarantees, supported platforms, eligibility, enabled-by-default behavior, or menu locations. If evidence is incomplete, explain the uncertainty to the author and keep the affected statement out of finalized copy until resolved.

Avoid hype, congratulations, “we are excited,” vague “various enhancements,” engineering implementation details with no user consequence, and repeated starts that make every note sound the same. Use active statements about the product's behavior. A small fix can be one precise sentence.

## Examples from a fictional product

Title: Add items to the queue

You can now add a saved item to the queue by swiping its row to the right. The item keeps its existing position in your saved list.

Title: 대기열에 항목 추가

이제 저장한 항목을 오른쪽으로 스와이프해 대기열에 추가할 수 있습니다. 저장 목록에서 항목의 위치는 그대로 유지됩니다.

Only use that second sentence if the behavior is established by the product evidence. An example is not permission to add a similar claim to another product.

## Translation

Use the same note ID in every configured locale. Translate user meaning, not word order. Keep product names supplied by the user, supported menu paths, requirements, and numbers consistent. Raster illustrations are shared; localize their alt text separately. Alt text describes the feature-bearing visual rather than the style or color palette.

After reviewing a translation against the current source, use `releasekit translation mark <version> <note> --locale <locale>`. This records a source fingerprint; it does not prove translation quality. If the original title, alt text, or body changes, review and refresh affected translations before marking them current again.
