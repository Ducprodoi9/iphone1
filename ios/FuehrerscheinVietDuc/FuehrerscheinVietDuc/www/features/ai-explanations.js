(function () {
  'use strict';
  if (window.__fvAiExplanationsMounted) return;
  window.__fvAiExplanationsMounted = true;
  const API = 'ai_explanation.php';
  const SELECTOR = '.ai-explanation-slot[data-ai-question-id][data-ai-question-code]';
  const state = {owner: '', access: null, until: 0, check: null, dialog: null, scheduled: false};
  function token() { try { return localStorage.getItem('token') || ''; } catch (_) { return ''; } }
  function vi() { try { return localStorage.getItem('ui_lang') === 'vi'; } catch (_) { return true; } }
  const tx = (de, vn) => vi() ? vn : de;
  const key = slot => slot.dataset.aiQuestionId + '|' + slot.dataset.aiQuestionCode;
  function element(tag, className, text) {
    const el = document.createElement(tag); el.className = className || '';
    if (text !== undefined) el.textContent = text;
    return el;
  }
  async function request(params, owner, controller) {
    const query = new URLSearchParams(params).toString();
    try {
      const data = await window.FuehrerscheinFeatures.api(API + '?' + query, {signal: controller.signal}, 12000);
      if (owner !== token()) throw new DOMException('Account changed', 'AbortError');
      if (data.success !== true) throw new Error(tx('Ungültige Serverantwort.', 'Phản hồi chưa hợp lệ. Bạn thử lại nhé.'));
      return data;
    } catch (e) {
      if (e.name === 'TypeError') throw new Error(tx('Verbindung fehlgeschlagen. Bitte erneut versuchen.', 'Lỗi kết nối. Bạn thử lại nhé.'));
      throw e;
    }
  }
  const esc = value => String(value == null ? '' : value).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function normalizeAiText(value){
    return String(value==null?'':value)
      .replace(/\r\n?/g,'\n')
      .replace(/\\n/g,'\n')
      .replace(/\\[ \t]*\n/g,'\n')
      .replace(/\\([*`#>_~-])/g,'$1')
      .replace(/[ \t]+\n/g,'\n')
      .replace(/\n{4,}/g,'\n\n\n')
      .trim();
  }

  function inlineMarkdown(value){
    let s=esc(value);
    const code=[];
    s=s.replace(/`([^`\n]+)`/g,(m,v)=>{
      const key='@@AICODE'+code.length+'@@';
      code.push('<code>'+v+'</code>');
      return key;
    });
    s=s.replace(/\*\*([^*\n][\s\S]*?)\*\*/g,'<strong>$1</strong>');
    s=s.replace(/__([^_\n][\s\S]*?)__/g,'<strong>$1</strong>');
    s=s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g,'$1<em>$2</em>');
    s=s.replace(/(^|[^_])_([^_\n]+)_(?!_)/g,'$1<em>$2</em>');
    code.forEach((v,i)=>{s=s.replace('@@AICODE'+i+'@@',v);});
    return s;
  }

  function renderMarkdown(value){
    const text=normalizeAiText(value);
    if(!text) return '';
    const lines=text.split('\n');
    const out=[];
    let listType='';
    const closeList=()=>{if(listType){out.push('</'+listType+'>');listType='';}};

    for(const rawLine of lines){
      const line=rawLine.trim();
      if(!line){closeList();continue;}
      if(/^[-*_]{3,}$/.test(line)){closeList();out.push('<hr>');continue;}

      const h=line.match(/^(#{1,4})\s+(.+)$/);
      if(h){
        closeList();
        const level=Math.min(4,Math.max(3,h[1].length+2));
        out.push('<h'+level+'>'+inlineMarkdown(h[2])+'</h'+level+'>');
        continue;
      }

      const ol=line.match(/^\d+[.)]\s+(.+)$/);
      if(ol){
        if(listType!=='ol'){closeList();listType='ol';out.push('<ol>');}
        out.push('<li>'+inlineMarkdown(ol[1])+'</li>');
        continue;
      }

      const ul=line.match(/^[-•]\s+(.+)$/);
      if(ul){
        if(listType!=='ul'){closeList();listType='ul';out.push('<ul>');}
        out.push('<li>'+inlineMarkdown(ul[1])+'</li>');
        continue;
      }

      const quote=line.match(/^>\s*(.+)$/);
      if(quote){closeList();out.push('<blockquote>'+inlineMarkdown(quote[1])+'</blockquote>');continue;}

      closeList();
      out.push('<p>'+inlineMarkdown(line)+'</p>');
    }
    closeList();
    return out.join('');
  }

  function closeDialog() {
    const d = state.dialog;
    if (!d) return;
    state.dialog = null;
    if (d.request) d.request.abort();
    d.root.remove();
    document.body.style.overflow = d.oldOverflow;
    if (d.focus && d.focus.isConnected) d.focus.focus({preventScroll: true});
  }
  function resetOwner(owner) {
    closeDialog();
    if (state.check) state.check.controller.abort();
    state.check = null; state.owner = owner; state.access = null; state.until = 0;
  }
  function schedule() {
    if (state.scheduled) return;
    state.scheduled = true;
    requestAnimationFrame(() => { state.scheduled = false; sync(); });
  }
  function checkAccess(force) {
    if (!state.owner || state.check || (!force && Date.now() < state.until)) return;
    const check = {owner: state.owner, controller: new AbortController()};
    state.check = check;
    request({mode: 'state'}, check.owner, check.controller).then(data => {
      if (state.check !== check || token() !== check.owner) return;
      state.access = data; state.until = Date.now() + 60000;
      if (!data.can_view) closeDialog();
    }).catch(() => {
      if (state.check !== check) return;
      state.access = {can_view: false}; state.until = Date.now() + 15000;
      closeDialog(); // Optional feature failure never blocks the existing learning page.
    }).finally(() => { if (state.check === check) { state.check = null; schedule(); } });
  }
  function sync() {
    const owner = token();
    if (owner !== state.owner) resetOwner(owner);
    const slots = Array.from(document.querySelectorAll(SELECTOR));
    const d = state.dialog;
    if (d && (!d.slot.isConnected || d.owner !== owner || key(d.slot) !== d.key)) closeDialog();
    // No metadata is placed in a running exam, so this feature makes no exam-time request.
    if (!slots.length) { closeDialog(); return; }
    if (owner) checkAccess(false);
    slots.forEach(slot => {
      const allowed = !!(owner && state.access && state.access.can_view);
      slot.hidden = !allowed;
      const bar = slot.closest('.question-topbar');
      if (bar) bar.classList.toggle('fv-ai-explain-enabled', allowed);
      if (!allowed) { if (slot.firstChild) slot.replaceChildren(); return; }
      let button = slot.querySelector('.fv-ai-explain-button');
      if (!button) {
        button = element('button', 'fv-ai-explain-button'); button.type = 'button';
        button.append(element('span', 'fv-ai-explain-long'), element('span', 'fv-ai-explain-short', 'AI'));
        button.addEventListener('click', () => openDialog(slot)); slot.appendChild(button);
      }
      const text = tx('KI-Erklärung', 'Giải thích AI');
      const label = button.querySelector('.fv-ai-explain-long');
      if (label.textContent !== text) label.textContent = text;
      button.title = text;
      button.setAttribute('aria-label', text + ' — ' + slot.dataset.aiQuestionCode);
    });
  }
  function openDialog(slot) {
    if (!slot.isConnected || !token()) return;
    if (state.dialog && state.dialog.owner === token() && state.dialog.key === key(slot)) return;
    closeDialog();
    const root = element('div', 'fv-ai-explain-overlay');
    const box = element('section', 'fv-ai-explain-dialog');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'fv-ai-explain-title');
    const header = element('header', 'fv-ai-explain-header');
    const title = element('h2', '', tx('KI-Erklärung', 'Giải thích AI')); title.id = 'fv-ai-explain-title';
    const close = element('button', 'fv-ai-explain-close', '×'); close.type = 'button';
    close.setAttribute('aria-label', tx('Schließen', 'Đóng')); close.addEventListener('click', closeDialog);
    header.append(title, close);
    const subtitle = element('p', 'fv-ai-explain-subtitle', slot.dataset.aiQuestionCode + ' · ' + tx('Erklärung auf Vietnamesisch', 'Lời giải chi tiết tiếng Việt'));
    const body = element('div', 'fv-ai-explain-body'); body.setAttribute('aria-live', 'polite');
    const footer = element('footer', 'fv-ai-explain-footer');
    const retry = element('button', 'fv-ai-explain-retry', tx('Erneut versuchen', 'Thử lại')); retry.type = 'button'; retry.hidden = true;
    const done = element('button', 'fv-ai-explain-done', tx('Zurück zur Frage', 'Quay lại câu hỏi')); done.type = 'button'; done.addEventListener('click', closeDialog);
    footer.append(retry, done); box.append(header, subtitle, body, footer); root.appendChild(box);
    const d = {root, body, retry, slot, key: key(slot), owner: token(), request: null, focus: document.activeElement, oldOverflow: document.body.style.overflow};
    state.dialog = d;
    root.addEventListener('click', e => { if (e.target === root) closeDialog(); });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
      if (e.key === 'Tab') {
        const buttons = Array.from(box.querySelectorAll('button')).filter(b => !b.hidden && !b.disabled);
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    retry.addEventListener('click', () => load(d));
    document.body.appendChild(root); document.body.style.overflow = 'hidden'; close.focus(); load(d);
  }
  async function load(d) {
    if (state.dialog !== d || d.owner !== token() || !d.slot.isConnected || key(d.slot) !== d.key) return;
    if (d.request) return;
    const controller = new AbortController(); d.request = controller;
    const owns = () => state.dialog === d && d.request === controller && d.owner === token() && d.slot.isConnected && key(d.slot) === d.key;
    d.retry.hidden = true;
    d.body.replaceChildren(element('p', 'fv-ai-explain-loading', tx('Erklärung wird geladen…', 'Đang tải giải thích…')));
    d.body.setAttribute('aria-busy', 'true');
    try {
      const data = await request({mode: 'question', question_id: d.slot.dataset.aiQuestionId, question_code: d.slot.dataset.aiQuestionCode}, d.owner, controller);
      if (!owns()) return;
      if (String(data.question_id) !== d.slot.dataset.aiQuestionId || data.question_code !== d.slot.dataset.aiQuestionCode) throw new Error(tx('Die Antwort passt nicht zur Frage.', 'Phản hồi không khớp câu hỏi.'));
      if (data.available === true && typeof data.detailed_explanation_vi !== 'string') throw new Error(tx('Ungültige Antwort.', 'Nội dung trả về không hợp lệ.'));
      const text = data.available === true ? data.detailed_explanation_vi : tx('Für diese Frage ist noch keine KI-Erklärung hinterlegt. Die normale Erklärung bleibt verfügbar.', 'Câu này chưa có giải thích AI. Bạn vẫn xem được giải thích thường như trước.');
      // Preserve the full saved text, including line breaks; never evaluate HTML or markdown as code.
      const rich = element('div', 'fv-ai-explain-text');
      rich.innerHTML = renderMarkdown(text);
      d.body.replaceChildren(rich);
    } catch (e) {
      if (!owns() || e.name === 'AbortError') return;
      d.body.replaceChildren(element('p', 'fv-ai-explain-error', e.message || tx('Verbindung fehlgeschlagen.', 'Lỗi kết nối. Bạn thử lại nhé.')));
      d.retry.hidden = false;
      if (e.status === 401 || e.status === 403) { state.access = {can_view: false}; state.until = Date.now() + 15000; schedule(); }
    } finally { if (owns()) { d.body.setAttribute('aria-busy', 'false'); d.request = null; } }
  }
  function refresh() { state.until = 0; schedule(); }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['data-ai-question-id', 'data-ai-question-code']});
  window.addEventListener('storage', refresh);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('pagehide', closeDialog);
  // Local ownership checks; access metadata is refreshed at most once/minute while a question is visible.
  // Never polls the paid content or modifies the existing API/fetch wrapper.
  setInterval(() => { if (token() !== state.owner || state.dialog || document.querySelector(SELECTOR)) schedule(); }, 1000);
  schedule();
})();
