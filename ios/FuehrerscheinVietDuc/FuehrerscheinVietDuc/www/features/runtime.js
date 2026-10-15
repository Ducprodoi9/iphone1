(function () {
  'use strict';
  const API_BASE = 'https://nguyenron.com/fuehrerschein-backend/api/';
  const token = () => localStorage.getItem('token') || '';
  const vi = () => localStorage.getItem('ui_lang') === 'vi';
  let configEntry = null;
  let configPending = null;

  async function api(path, options = {}, timeoutMs = 15000) {
    const owner = token();
    if (!owner) throw Object.assign(new Error('Bitte erneut anmelden. / Vui lòng đăng nhập lại.'), { status: 401 });
    const url = new URL(path, API_BASE);
    if (!url.href.startsWith(API_BASE)) throw new Error('Invalid feature endpoint');
    const controller = new AbortController();
    const external = options.signal;
    let timeout;
    let cancel;
    const canceled = new Promise((_, reject) => {
      cancel = () => { controller.abort(); reject(new DOMException('Aborted', 'AbortError')); };
      timeout = window.setTimeout(() => {
        controller.abort();
        reject(Object.assign(new Error(vi() ? 'Kết nối quá thời gian. Vui lòng thử lại.' : 'Zeitüberschreitung. Bitte erneut versuchen.'), { code: 'CLIENT_TIMEOUT' }));
      }, Math.max(1, Math.min(35000, Number(timeoutMs) || 15000)));
    });
    if (external) {
      external.addEventListener('abort', cancel, { once: true });
      if (external.aborted) cancel();
    }
    try {
      const work = (async () => {
        const response = await fetch(url.toString(), {
          ...options, cache: 'no-store', credentials: 'omit', signal: controller.signal,
          headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers, Authorization: 'Bearer ' + owner }
        });
        let data;
        try { data = await response.json(); }
        catch (_) { throw new Error(vi() ? 'Máy chủ trả về dữ liệu không hợp lệ.' : 'Ungültige Serverantwort.'); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid server response');
        if (!response.ok || data.success === false) {
          throw Object.assign(new Error(data.message || 'HTTP ' + response.status), { status: response.status, code: data.code || '', data });
        }
        return data;
      })();
      const data = await Promise.race([work, canceled]);
      if (owner !== token()) throw new DOMException('Account changed', 'AbortError');
      return data;
    } finally {
      window.clearTimeout(timeout);
      if (external) external.removeEventListener('abort', cancel);
    }
  }

  async function config(force) {
    const owner = token();
    if (!owner) return null;
    if (configPending && configPending.owner === owner) return configPending.promise;
    if (!force && configEntry && configEntry.owner === owner && Date.now() - configEntry.at < 15000) return configEntry.value;
    const pending = { owner, promise: null };
    pending.promise = api('system_config.php').then(data => {
      if (owner !== token()) return null;
      const value = data.config || {};
      configEntry = { owner, at: Date.now(), value };
      return value;
    }).finally(() => { if (configPending === pending) configPending = null; });
    configPending = pending;
    return pending.promise;
  }

  window.FuehrerscheinFeatures = Object.freeze({ api, config });
})();
