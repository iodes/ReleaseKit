# ReleaseKit development

ReleaseKit is an independent, brand-neutral release content toolkit. Describe its visual language through composition, contrast, materials, hierarchy, and interaction. External references may inform those traits, but never put reference-company names, attributed style labels, product marks, reference-site URLs, or copied reference artwork into repository files, fixtures, generated instructions, prompts, or assets. Integration tool names and a user's own product identity are separate from visual reference attribution.

Keep the CLI deterministic. The user's coding agent performs editorial work and calls its available image tools. Do not add model API calls, API key setup, a viewer, or a publishing service without a corresponding request.

Project image generation defaults to both dark and light. Respect a project's explicit single-theme choice. A pair shares one scene specification; preserve geometry, feature meaning, and semantic colors between variants. Never manufacture a second variant through color inversion or claim that a pending image is ready.

Generate restrained flat explanatory graphics. Icons use compact neutral monochrome filled glyphs, quiet flat tiles, and broad margins; do not turn them into sculpted objects or decorative 3D illustrations. Establish emphasis through composition and value contrast first. Accent is optional and needs a specific supported state, action, or information meaning; a new capability or focal symbol alone does not justify color. Entirely neutral images are complete outputs. Real physical details and content previews require supplied captures, photographs, or approved artwork. If that input is absent, request it and keep the image pending. One supplied image can be a shared asset across viewer themes without recoloring or duplication.

Store changes per release. Follow explicit previous-release links when assembling recent history, preserving version boundaries and entries with similar names. Resolve Git references to immutable commits before analyzing them.

Use Node.js 22.12 or later; develop with Node.js 24. Run `npm run check`, `npm test`, and `npm run build` for implementation changes. Tests should verify observable behavior, data integrity, and useful failure cases, rather than exact editorial wording. Keep documentation and public JSON schemas aligned with behavior.
