(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const words = {
    en: {
      preview: 'Preview', outline: 'IN THIS RELEASE', release: 'RELEASE NOTES', language: 'Language', darkMode: 'Dark mode',
      draft: 'Draft', ready: 'Ready', source: 'Original', notes: 'notes',
      footer: 'A reading preview. Request changes in your agent conversation.', skip: 'Skip to release notes',
      retry: 'Retry now', connectionError: 'Cannot connect to the preview. Keep the preview process running; reconnecting automatically.',
      readError: 'Cannot read the saved release right now. Showing the last loaded content and retrying automatically.',
      fallback: 'Showing the original because the preferred translation is unavailable or needs updating.',
      incomplete: 'Incomplete', stale: 'Needs updating', missing: 'Not written yet', invalid: 'Cannot read this text',
      translationStale: 'This translation needs review against the current original.',
      translationIncomplete: 'This language has unfinished or unreadable notes.',
      noTitle: 'Untitled note', empty: 'No release notes yet.', noImage: 'No generated image yet.',
      invalidImage: 'This image could not be read. Ask your agent to check the saved image.',
      staleImage: 'This image needs review against the current scene or theme settings.',
      feature: 'Feature', improvement: 'Improvement', fix: 'Fix', security: 'Security',
    },
    ko: {
      preview: '미리보기', outline: '이번 릴리스', release: '릴리스 노트', language: '언어', darkMode: '다크 모드',
      draft: '초안', ready: '확정', source: '원문', notes: '개 항목',
      footer: '내용을 확인하는 미리보기입니다. 수정은 기존 에이전트 대화에서 요청하세요.', skip: '릴리스 노트로 이동',
      retry: '다시 연결', connectionError: '미리보기에 연결할 수 없습니다. 미리보기 프로세스가 실행 중인지 확인하세요. 자동으로 다시 연결합니다.',
      readError: '저장된 릴리스를 읽을 수 없습니다. 마지막으로 읽은 내용을 표시하며 자동으로 다시 확인합니다.',
      fallback: '선호하는 언어의 번역이 없거나 갱신이 필요하여 원문을 표시합니다.',
      incomplete: '작성 중', stale: '갱신 필요', missing: '아직 작성되지 않았습니다', invalid: '이 문구를 읽을 수 없습니다',
      translationStale: '원문이 변경되어 번역 검토가 필요합니다.', translationIncomplete: '이 언어에 작성 중이거나 읽을 수 없는 항목이 있습니다.',
      noTitle: '제목 없음', empty: '아직 작성된 릴리스 노트가 없습니다.', noImage: '아직 생성된 이미지가 없습니다',
      invalidImage: '이미지를 읽을 수 없습니다. 에이전트에 저장된 이미지 확인을 요청하세요.',
      staleImage: '현재 장면 또는 테마 설정에 맞는지 이미지 검토가 필요합니다.',
      feature: '새로운 기능', improvement: '개선', fix: '수정', security: '보안',
    },
  };
  let ui = words.en;
  let data = null;
  let language = null;
  let theme = null;
  let manualLanguage = false;
  let preferenceKey = '';
  let busy = false;
  let retryImages = false;
  let timer;
  let activeLanguage = null;
  let searchText = '';
  let searchTime = 0;

  function text(id, value) { if (byId(id).textContent !== value) byId(id).textContent = value; }
  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function languageName(code) {
    try { return new Intl.DisplayNames([code], { type: 'language' }).of(code); }
    catch { return code; }
  }
  function highlightLanguage(code, scroll = false) {
    activeLanguage = code;
    for (const option of byId('language-options').children) option.dataset.active = String(option.dataset.locale === code);
    const option = byId(`language-option-${code}`);
    if (!byId('language-options').hidden && option) {
      byId('language').setAttribute('aria-activedescendant', option.id);
      if (scroll) option.scrollIntoView({ block: 'nearest' });
    }
  }
  function openLanguages(open) {
    byId('language-options').hidden = !open;
    byId('language').setAttribute('aria-expanded', String(open));
    if (open) highlightLanguage(language, true);
    else {
      byId('language').removeAttribute('aria-activedescendant');
      searchText = '';
    }
  }
  function chooseLanguage(code) {
    language = code;
    manualLanguage = true;
    openLanguages(false);
    render();
    byId('language').focus({ preventScroll: true });
  }
  function savePreferences() {
    try { sessionStorage.setItem(preferenceKey, JSON.stringify({ language, theme, manualLanguage })); } catch { /* Storage may be disabled. */ }
  }
  function initialize(snapshot) {
    const uiLocale = snapshot.requestedLocale || navigator.language;
    ui = uiLocale.toLowerCase().startsWith('ko') ? words.ko : words.en;
    document.documentElement.lang = ui === words.ko ? 'ko' : 'en';
    preferenceKey = `releasekit-preview:${snapshot.product}:${JSON.stringify(snapshot.release)}`;
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(preferenceKey)); } catch { /* Use saved release defaults. */ }
    language = snapshot.locales.some(item => item.code === saved?.language && (saved.manualLanguage || item.state === 'current')) ? saved.language : snapshot.initialLocale;
    theme = ['light', 'dark'].includes(saved?.theme) ? saved.theme : snapshot.themes === 'both' ?
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : snapshot.themes;
    manualLanguage = saved?.manualLanguage === true;
    for (const [id, key] of Object.entries({ 'outline-label': 'outline', 'release-label': 'release',
      'language-label': 'language', footer: 'footer', skip: 'skip', retry: 'retry' })) text(id, ui[key]);
    byId('theme').setAttribute('aria-label', ui.darkMode);
    byId('theme').title = ui.darkMode;
    byId('theme').disabled = false;
    byId('language').disabled = false;
    byId('notes').replaceChildren();
  }
  function renderNote(note, index) {
    const saved = note.texts[language];
    const article = element('article', 'note');
    article.id = `note-${note.id}`;
    article.lang = language;
    article.dir = 'auto';
    article.append(element('div', 'note-meta', `${String(index + 1).padStart(2, '0')} / ${ui[note.category] || note.category}`));
    article.append(element('h2', '', saved.title.trim() ? saved.title : ui.noTitle));
    if (saved.state !== 'current') article.append(element('p', 'issue', saved.state === 'stale' ? ui.translationStale : ui[saved.state]));
    const copy = element('div', 'copy');
    // Only server-rendered Markdown enters this HTML sink. Raw HTML and image URLs are disabled there.
    copy.innerHTML = saved.bodyHtml;
    article.append(copy);
    if (note.image) {
      const variant = note.image.variants.shared || note.image.variants[data.themes === 'both' ? theme : data.themes];
      if (variant?.src) {
        const figure = element('figure', 'visual');
        const image = document.createElement('img');
        image.src = variant.src;
        image.alt = saved.alt;
        image.width = variant.width;
        image.height = variant.height;
        image.addEventListener('error', () => {
          figure.replaceChildren(element('p', 'image-message', ui.invalidImage));
          article.dataset.content = '';
          retryImages = true;
        }, { once: true });
        figure.append(image);
        if (variant.state === 'stale') figure.append(element('figcaption', 'issue', ui.staleImage));
        article.append(figure);
      } else article.append(element('p', 'image-message', note.image.state === 'invalid' || variant?.state === 'invalid' ? ui.invalidImage : ui.noImage));
    }
    return article;
  }
  function render() {
    const position = window.scrollY;
    const readingTop = document.querySelector('.preview-controls').getBoundingClientRect().bottom;
    const anchor = [...byId('notes').children].find(node => node.classList.contains('note') && node.getBoundingClientRect().bottom > readingTop);
    const anchorId = anchor?.id;
    const anchorTop = anchor?.getBoundingClientRect().top;
    if (!data.locales.some(item => item.code === language)) language = data.sourceLocale;
    document.documentElement.dataset.theme = theme;
    text('version', data.release.version);
    text('status', ui[data.status]);
    byId('status').dataset.status = data.status;
    byId('status').hidden = false;
    document.title = `${data.product} ${data.release.version} · ${ui.preview}`;
    text('release-meta', [data.release.channel, data.releasedAt.replace('T', ' ').replace(/Z$/, ' UTC'), `${data.notes.length} ${ui.notes}`].filter(Boolean).join(' · '));
    const optionsKey = JSON.stringify(data.locales);
    if (byId('language').dataset.options !== optionsKey) {
      byId('language-options').replaceChildren(...data.locales.map(item => {
        const suffix = [item.code === data.sourceLocale ? ui.source : '', item.state !== 'current' ? ui[item.state] : ''].filter(Boolean).join(', ');
        const option = element('div', 'language-option');
        option.id = `language-option-${item.code}`;
        option.dataset.locale = item.code;
        option.setAttribute('role', 'option');
        const label = element('span', 'language-option-label');
        label.append(element('span', 'language-name', languageName(item.code)), element('span', 'language-detail', item.code + (suffix ? ` · ${suffix}` : '')));
        const check = element('span', 'language-check', '✓');
        check.setAttribute('aria-hidden', 'true');
        option.append(label, check);
        option.addEventListener('pointermove', () => highlightLanguage(item.code));
        option.addEventListener('mousedown', event => event.preventDefault());
        option.addEventListener('click', () => chooseLanguage(item.code));
        return option;
      }));
      byId('language').dataset.options = optionsKey;
    }
    text('language-value', languageName(language));
    for (const option of byId('language-options').children) option.setAttribute('aria-selected', String(option.dataset.locale === language));
    highlightLanguage(data.locales.some(item => item.code === activeLanguage) ? activeLanguage : language);
    byId('theme').setAttribute('aria-checked', String(theme === 'dark'));
    const state = data.locales.find(item => item.code === language).state;
    const notice = state === 'stale' ? ui.translationStale : state === 'incomplete' ? ui.translationIncomplete :
      !manualLanguage && data.localeFallback && language === data.sourceLocale ? ui.fallback : '';
    text('locale-notice', notice);
    byId('locale-notice').hidden = !notice;

    const notes = byId('notes');
    const retained = new Set();
    const outlineKey = JSON.stringify(data.notes.map(note => [note.id, note.texts[language].title]));
    if (byId('outline').dataset.content !== outlineKey) {
      byId('outline').replaceChildren(...data.notes.map((note, index) => {
        const link = element('a');
        link.href = `#note-${note.id}`;
        const title = note.texts[language].title;
        link.append(element('span', 'number', String(index + 1).padStart(2, '0')), element('span', '', title.trim() ? title : ui.noTitle));
        return link;
      }));
      byId('outline').dataset.content = outlineKey;
    }
    data.notes.forEach((note, index) => {
      const id = `note-${note.id}`;
      retained.add(id);
      let article = byId(id);
      const signature = JSON.stringify([index, language, theme, data.themes, note.category, note.texts[language], note.image]);
      if (!article || article.dataset.content !== signature) {
        const replacement = renderNote(note, index);
        replacement.dataset.content = signature;
        if (article) article.replaceWith(replacement);
        article = replacement;
      }
      if (notes.children[index] !== article) notes.insertBefore(article, notes.children[index] || null);
    });
    for (const child of [...notes.children]) if (!retained.has(child.id)) child.remove();
    if (!data.notes.length) notes.append(element('p', 'empty', data.emptyReason || ui.empty));
    const updatedAnchor = anchorId && byId(anchorId);
    if (position > 0 && updatedAnchor && anchorTop !== undefined) window.scrollBy(0, updatedAnchor.getBoundingClientRect().top - anchorTop);
    else window.scrollTo(0, position);
    savePreferences();
  }
  async function poll() {
    if (busy) return;
    busy = true;
    clearTimeout(timer);
    let response;
    try {
      response = await fetch('/api/preview', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Read failed');
      const snapshot = await response.json();
      if (!data) initialize(snapshot);
      if (snapshot.revision !== data?.revision || retryImages) { retryImages = false; data = snapshot; render(); }
      byId('error').hidden = true;
    } catch {
      byId('error').hidden = false;
      text('error-message', response ? ui.readError : ui.connectionError);
      if (!data) byId('loading').hidden = true;
    } finally {
      busy = false;
      timer = setTimeout(poll, 1000);
    }
  }
  byId('language').addEventListener('click', () => openLanguages(byId('language-options').hidden));
  byId('language').addEventListener('keydown', event => {
    if (!data || event.isComposing) return;
    const open = !byId('language-options').hidden;
    const codes = data.locales.map(item => item.code);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!open) openLanguages(true);
      const index = codes.indexOf(activeLanguage);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? codes.length - 1 :
        !open ? codes.indexOf(language) : (index + (event.key === 'ArrowDown' ? 1 : -1) + codes.length) % codes.length;
      highlightLanguage(codes[next], true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) chooseLanguage(activeLanguage); else openLanguages(true);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape' && open) event.preventDefault();
      openLanguages(false);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (Date.now() - searchTime > 700) searchText = '';
      searchTime = Date.now();
      searchText += event.key.toLocaleLowerCase();
      if (!open) openLanguages(true);
      const match = codes.find(code => code.toLowerCase().startsWith(searchText) || languageName(code).toLocaleLowerCase().startsWith(searchText));
      if (match) highlightLanguage(match, true);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!byId('language-picker').contains(event.target)) openLanguages(false);
  });
  byId('language-picker').addEventListener('focusout', event => {
    if (!byId('language-picker').contains(event.relatedTarget)) openLanguages(false);
  });
  byId('theme').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; render(); });
  byId('retry').addEventListener('click', poll);
  window.addEventListener('online', poll);
  void poll();
})();
