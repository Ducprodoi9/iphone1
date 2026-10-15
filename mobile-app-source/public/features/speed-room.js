// Ported from supplied production speed-room-v1.js (2.0.0).
(function () {
  'use strict';

  const ROOT_ID = 'speed-room-root';
  const HOME_CARD_ID = 'speed-room-home-card';
  const state = {
    config: null,
    configAt: 0,
    root: null,
    pollTimer: null,
    clockTimer: null,
    serverOffsetMs: 0,
    latest: null,
    questionRoundId: null,
    submittedRounds: new Set(),
    pendingRounds: new Set(),
    resultRoundId: null,
    resultHideTimer: null,
    chatCooldownUntil: 0,
    boardPeriod: 'day',
    awards: null,
    awardsAt: 0,
    closed: true, opening: false, owner: '', controller: null, polling: null, awardsPending: null, chatSending: false, cardPending: null,
  };

  const token = () => localStorage.getItem('token') || '';
  const lang = () => localStorage.getItem('ui_lang') === 'vi' ? 'vi' : 'de';
  const tx = (de, vi) => lang() === 'vi' ? vi : de;
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const pointText = (value) => {
    const n = Number(value || 0);
    return n > 0 ? `+${n}` : String(n);
  };

  function periodLabel(period) {
    return ({
      day: tx('Heute', 'Hôm nay'),
      week: tx('Diese Woche', 'Tuần này'),
      month: tx('Dieser Monat', 'Tháng này'),
      all: tx('Gesamt', 'Tổng'),
    })[period] || tx('Heute', 'Hôm nay');
  }

  const api = (path, options = {}) => window.FuehrerscheinFeatures.api(path, {
    ...options, signal: options.signal || (path.startsWith('speed_room_') ? state.controller?.signal : undefined)
  });
  async function loadConfig(force) {
    try {
      const cfg = await window.FuehrerscheinFeatures.config(force);
      state.config = cfg; state.configAt = Date.now(); return cfg;
    } catch (_) { return null; }
  }

  function homeGrid() {
    const grid = document.querySelector('.cards-grid');
    if (!grid) return null;
    if (!grid.closest('.app-shell')) return null;
    return grid;
  }

  async function ensureHomeCard() {
    const grid = homeGrid();
    if (!grid || !token()) return;
    const existing = document.getElementById(HOME_CARD_ID);
    if (existing || state.cardPending) return;
    const owner = token();
    state.cardPending = true;
    try {
    const cfg = await loadConfig(false);
    if (owner !== token() || !grid.isConnected) return;
    if (owner !== token()) return;
    if (!cfg || !cfg.speed_room_enabled) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = HOME_CARD_ID;
    button.className = 'home-card speed-room-home-card';
    button.innerHTML = [
      '<span class="speed-room-card-icon">⚡</span>',
      '<b>' + esc(tx('Speed-Raum', 'Phòng tốc độ')) + '</b>',
      '<small>' + esc(tx('Gemeinsam schnell üben', 'Thi luyện cùng mọi người')) + '</small>'
    ].join('');
    button.addEventListener('click', openRoom);
    grid.appendChild(button);
    } finally { state.cardPending = false; }
  }

  function roomTemplate() {
    return `
      <div class="sr-shell">
        <header class="sr-header">
          <button type="button" class="sr-back" aria-label="${esc(tx('Zurück', 'Quay lại'))}">‹</button>
          <div><b>${esc(tx('Speed-Training', 'Phòng luyện tốc độ'))}</b><small>${esc(tx('Gemeinsamer Raum', '1 phòng chung'))}</small></div>
          <span class="sr-live">LIVE</span>
        </header>
        <main class="sr-room-main">
          <section class="sr-room-status">
            <div><b class="sr-participants">0/50</b><small>${esc(tx('online', 'đang online'))}</small></div>
            <div class="sr-next-wrap"><small>${esc(tx('Nächste Frage', 'Câu tiếp theo'))}</small><b class="sr-countdown">--</b></div>
            <div><b class="sr-my-score">0</b><small class="sr-my-score-label">${esc(tx('Punkte heute', 'điểm hôm nay'))}</small></div>
          </section>
          <div class="sr-notice">${esc(tx('Alle bekommen dieselbe Frage. Wer zuerst bestätigt, beendet die Frage für alle. Richtig = +Punkte, falsch = -Punkte.', 'Mọi người nhận cùng câu. Người xác nhận đầu tiên chốt câu cho cả phòng. Đúng cộng điểm, sai trừ đúng số điểm của câu.'))}</div>
          <div class="sr-room-grid">
            <div class="sr-left-column">
              <section class="sr-review-card" hidden></section>
            </div>
            <aside class="sr-right-column">
              <section class="sr-leaderboard-card">
                <div class="sr-section-title"><span>🏆 ${esc(tx('Rangliste', 'Bảng xếp hạng'))}</span><small class="sr-phase-label"></small></div>
                <div class="sr-board-tabs" role="tablist">
                  <button type="button" data-period="day" class="active">${esc(tx('Heute', 'Hôm nay'))}</button>
                  <button type="button" data-period="week">${esc(tx('Woche', 'Tuần'))}</button>
                  <button type="button" data-period="month">${esc(tx('Monat', 'Tháng'))}</button>
                  <button type="button" data-period="all">${esc(tx('Gesamt', 'Tổng'))}</button>
                </div>
                <div class="sr-board-current"></div>
                <div class="sr-leaderboard"></div>
              </section>
              <section class="sr-awards-card">
                <div class="sr-section-title"><span>🏅 ${esc(tx('Ehrentafel', 'Vinh danh'))}</span><small>${esc(tx('Deutschland-Zeit', 'giờ Đức'))}</small></div>
                <div class="sr-awards-content"></div>
              </section>
              <section class="sr-chat-card">
                <div class="sr-section-title"><span>💬 ${esc(tx('Raum-Chat', 'Chat chung'))}</span><small class="sr-chat-rule"></small></div>
                <div class="sr-messages"></div>
                <form class="sr-chat-form">
                  <input class="sr-chat-input" autocomplete="off" maxlength="180" placeholder="${esc(tx('Nachricht eingeben...', 'Nhập tin nhắn...'))}">
                  <button type="submit">➤</button>
                </form>
                <div class="sr-chat-error"></div>
              </section>
            </aside>
          </div>
        </main>
        <div class="sr-toast" aria-live="polite"></div>
      </div>`;
  }

  async function openRoom() {
    if (state.opening || document.getElementById(ROOT_ID)) return;
    const owner = token();
    state.opening = true;
    try {
    const cfg = await loadConfig(true);
    if (cfg && ['day','week','month','all'].includes(cfg.speed_room_default_board_period)) state.boardPeriod = cfg.speed_room_default_board_period;
    if (owner !== token()) return;
    if (!cfg || !cfg.speed_room_enabled) {
      alert(tx('Der Speed-Raum ist derzeit deaktiviert.', 'Phòng luyện tốc độ hiện đang tắt.'));
      return;
    }

    const phone = document.querySelector('.app-shell') || document.body;
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'speed-room-root';
    root.innerHTML = roomTemplate();
    phone.appendChild(root);
    state.root = root;
    state.owner = owner; state.controller = new AbortController();
    state.closed = false;
    state.latest = null;
    state.questionRoundId = null;
    state.resultRoundId = null;
    state.boardPeriod = ['day','week','month','all'].includes(cfg.speed_room_default_board_period) ? cfg.speed_room_default_board_period : 'day';
    state.submittedRounds = new Set();
    state.pendingRounds = new Set();
    state.awards = null;
    state.awardsAt = 0;

    root.querySelector('.sr-back').addEventListener('click', closeRoom);
    root.querySelector('.sr-chat-form').addEventListener('submit', sendChat);
    pollAwards(true);
    root.querySelector('.sr-chat-input').maxLength = Number(cfg.speed_room_chat_max_length || 180);
    root.querySelector('.sr-chat-rule').textContent = `${cfg.speed_room_chat_max_length || 180} ${tx('Zeichen', 'ký tự')} • ${cfg.speed_room_chat_cooldown_seconds || 5}s/${tx('Nachricht', 'tin')}`;
    root.querySelectorAll('.sr-board-tabs button').forEach(btn => {
      btn.addEventListener('click', async () => {
        const next = btn.dataset.period || 'day';
        if (next === state.boardPeriod) return;
        state.boardPeriod = next;
        root.querySelectorAll('.sr-board-tabs button').forEach(x => x.classList.toggle('active', x.dataset.period === next));
        root.querySelector('.sr-board-current').textContent = periodLabel(next);
        await pollState();
      });
    });

    await pollState();
    schedulePoll();
    if (!state.closed) startClock();
    } finally { state.opening = false; }
  }

  function closeRoom() {
    state.closed = true;
    state.controller?.abort(); state.controller = null;
    state.owner = ''; state.polling = null; state.awardsPending = null; state.chatSending = false;
    clearTimeout(state.pollTimer);
    clearInterval(state.clockTimer);
    clearTimeout(state.resultHideTimer);
    state.pollTimer = null;
    state.clockTimer = null;
    state.resultHideTimer = null;
    if (state.root) state.root.remove();
    state.root = null;
  }

  function schedulePoll() {
    clearTimeout(state.pollTimer);
    if (state.closed || document.hidden) return;
    const ms = Number((state.config && state.config.speed_room_poll_ms) || 1000);
    state.pollTimer = setTimeout(async () => {
      await pollState();
      schedulePoll();
    }, Math.max(500, ms));
  }

  function startClock() {
    clearInterval(state.clockTimer);
    state.clockTimer = setInterval(updateLocalClock, 200);
  }

  function updateLocalClock() {
    if (!state.root || !state.latest || !state.latest.round) return;
    const now = Date.now() + state.serverOffsetMs;
    const round = state.latest.round;
    const count = state.root.querySelector('.sr-countdown');
    if (!count) return;
    let ms = 0;
    if (round.phase === 'wait') ms = Number(round.starts_at_ms || 0) - now;
    else if (round.phase === 'answer' && state.latest.my_answer) ms = Number(round.result_ends_at_ms || 0) - now;
    else if (round.phase === 'answer') ms = Number(round.answer_ends_at_ms || 0) - now;
    else ms = Number(round.result_ends_at_ms || 0) - now;
    const sec = Math.max(0, Math.ceil(ms / 1000));
    count.textContent = sec + 's';

    const qLayer = state.root.querySelector('.sr-question-layer');
    if (qLayer) {
      const timer = qLayer.querySelector('.sr-question-timer');
      if (timer) timer.textContent = Math.max(0, Math.ceil((Number(round.answer_ends_at_ms || 0) - now) / 1000)) + 's';
      if (now >= Number(round.answer_ends_at_ms || 0)) removeQuestionLayer();
    }
  }

  async function pollState() {
    if (state.closed || !state.root || document.hidden || state.polling) return;
    const root = state.root, owner = token(), requestedPeriod = state.boardPeriod;
    const pending = {}; state.polling = pending;
    try {
      const period = encodeURIComponent(state.boardPeriod || 'day');
      const d = await api('speed_room_state.php?leaderboard_period=' + period);
      if (state.closed || document.hidden || state.root !== root || owner !== token() || state.boardPeriod !== requestedPeriod) return;
      state.latest = d;
      state.config = d.config || state.config || {};
      state.configAt = Date.now();
      state.serverOffsetMs = Number(d.server_now_ms || Date.now()) - Date.now();
      if (d.leaderboard_period) state.boardPeriod = d.leaderboard_period;
      renderRoom(d);
      handlePhase(d);
    } catch (e) {
      if (e.name === 'AbortError' || state.root !== root || owner !== token()) return;
      if (e.code === 'FEATURE_DISABLED') {
        closeRoom();
        ensureHomeCard();
        alert(tx('Der Speed-Raum wurde deaktiviert.', 'Phòng luyện tốc độ đã được tắt.'));
        return;
      }
      if (e.code === 'ROOM_FULL') {
        closeRoom();
        alert(e.message);
        return;
      }
      showToast(e.message || tx('Verbindung unterbrochen', 'Mất kết nối tạm thời'), true);
      showConnectionError(e.message);
    } finally { if (state.polling === pending) state.polling = null; }
  }

  function showConnectionError(message) {
    if (!state.root) return;
    let box = state.root.querySelector('.sr-connection-error');
    if (!box) {
      box = document.createElement('div'); box.className = 'sr-connection-error'; box.setAttribute('role','alert');
      const text = document.createElement('span'); box.appendChild(text);
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = tx('Erneut versuchen','Thử lại');
      retry.addEventListener('click', () => pollState()); box.appendChild(retry);
      state.root.querySelector('.sr-room-main').prepend(box);
    }
    box.querySelector('span').textContent = message || tx('Verbindung unterbrochen','Mất kết nối');
  }

  function renderRoom(d) {
    if (!state.root) return;
    state.root.querySelector('.sr-connection-error')?.remove();
    const room = d.room || {};
    const cfg = d.config || {};
    const round = d.round || {};
    const board = Array.isArray(d.leaderboard) ? d.leaderboard : [];
    const messages = Array.isArray(d.messages) ? d.messages : [];
    const currentPeriod = d.leaderboard_period || state.boardPeriod || 'day';

    state.root.querySelector('.sr-participants').textContent = `${room.participant_count || 0}/${room.max_players || cfg.speed_room_max_players || 50}`;
    const me = board.find(x => x.is_me);
    state.root.querySelector('.sr-my-score').textContent = String(me ? me.total_points : 0);
    state.root.querySelector('.sr-my-score-label').textContent = tx('Punkte: ', 'điểm: ') + periodLabel(currentPeriod).toLowerCase();
    state.root.querySelector('.sr-board-current').textContent = periodLabel(currentPeriod);
    state.root.querySelectorAll('.sr-board-tabs button').forEach(x => x.classList.toggle('active', x.dataset.period === currentPeriod));
    state.root.querySelector('.sr-phase-label').textContent = round.phase === 'answer'
      ? tx('Frage läuft', 'Đang trả lời')
      : round.phase === 'result'
        ? tx('Ergebnis', 'Đang hiện kết quả')
        : tx('Warten', 'Đang chờ');

    const lb = state.root.querySelector('.sr-leaderboard');
    if (board.length === 0) {
      lb.innerHTML = `<div class="sr-empty">${esc(tx('Noch keine Punkte.', 'Chưa có điểm ở mốc này.'))}</div>`;
    } else {
      const boardLimit = Math.max(3, Math.min(50, Number(cfg.speed_room_board_limit || 20)));
      const top = board.slice(0, boardLimit);
      const rows = top.slice();
      if (me && !top.some(x => Number(x.user_id) === Number(me.user_id))) rows.push({ separator: true }, me);
      lb.innerHTML = rows.map(row => {
        if (row.separator) return '<div class="sr-rank-separator">•••</div>';
        const medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : String(row.rank);
        return `<div class="sr-rank-row ${row.is_me ? 'is-me' : ''}"><span class="sr-rank">${medal}</span><b>${esc(row.name)}</b><span>${Number(row.total_points || 0)} ${esc(tx('Pkt.', 'đ'))}</span></div>`;
      }).join('');
    }

    renderRoomReview(d.review || null);
    renderAwards(state.awards || {});
    if (!state.awardsAt || Date.now() - state.awardsAt > 30000) pollAwards(false);

    const chatCard = state.root.querySelector('.sr-chat-card');
    if (chatCard) chatCard.hidden = cfg.speed_room_show_chat === false;
    const msgBox = state.root.querySelector('.sr-messages');
    const nearBottom = msgBox.scrollHeight - msgBox.scrollTop - msgBox.clientHeight < 60;
    msgBox.innerHTML = messages.length ? messages.map(m => `<div class="sr-message"><b>${esc(m.name)}</b><span>${esc(m.message)}</span></div>`).join('') : `<div class="sr-empty">${esc(tx('Noch keine Nachrichten.', 'Chưa có tin nhắn.'))}</div>`;
    if (nearBottom) msgBox.scrollTop = msgBox.scrollHeight;
  }

  async function pollAwards(force) {
    if (!state.root || state.awardsPending || document.hidden) return;
    if (!force && state.awardsAt && Date.now() - state.awardsAt < 30000) return;
    const root = state.root, pending = {}; state.awardsPending = pending;
    try {
      const d = await api('speed_room_awards_state.php');
      if (state.root !== root) return;
      state.awards = d.awards || {};
      state.awardsAt = Date.now();
      renderAwards(state.awards);
    } catch (e) {
      // Giải thưởng không được phép làm gián đoạn vòng thi chính.
      if (e.name !== 'AbortError') console.warn('[speed-room] awards load failed', e.message);
    } finally { if (state.awardsPending === pending) state.awardsPending = null; }
  }

  function renderAwards(awards) {
    if (!state.root) return;
    const box = state.root.querySelector('.sr-awards-content');
    if (!box) return;
    const weekly = awards && awards.weekly;
    const monthly = awards && awards.monthly;
    const one = (title, period) => {
      if (!period || !Array.isArray(period.winners) || !period.winners.length) return '';
      return `<div class="sr-award-group"><b>${esc(title)}</b>${period.winners.map(w => {
        const medal = Number(w.rank) === 1 ? '🥇' : Number(w.rank) === 2 ? '🥈' : '🥉';
        return `<div><span>${medal} ${esc(w.name)}</span><strong>${Number(w.amount_eur || 0)}€</strong></div>`;
      }).join('')}</div>`;
    };
    const html = one(tx('Letzte Woche', 'Tuần gần nhất'), weekly) + one(tx('Letzter Monat', 'Tháng gần nhất'), monthly);
    box.innerHTML = html || `<div class="sr-empty">${esc(tx('Noch keine Preise abgeschlossen.', 'Chưa có kỳ giải nào được chốt.'))}</div>`;
  }

  function renderRoomReview(review) {
    if (!state.root) return;
    const card = state.root.querySelector('.sr-review-card');
    if (!card) return;
    if (!review || !review.question) {
      card.hidden = true;
      card.innerHTML = '';
      delete card.dataset.roundId;
      return;
    }

    const q = review.question || {};
    const answer = review.my_answer || null;
    const result = review.result || {};
    const selected = answer && Array.isArray(answer.selected_answer_ids) ? answer.selected_answer_ids.map(Number) : [];
    const correct = Array.isArray(review.correct_answer_ids) ? review.correct_answer_ids.map(Number) : [];
    const answers = Array.isArray(q.answers) ? q.answers : [];
    const rows = Array.isArray(result.round_board) ? result.round_board : [];
    const answered = Number(result.answered_count || rows.length || 0);
    const correctCount = Number(result.correct_count || 0);
    const roundId = Number(review.round_id || 0);

    const statusHtml = answer
      ? (answer.is_correct
          ? `<span class="sr-review-status ok">✅ ${esc(tx('Richtig', 'Đúng'))} ${pointText(answer.points_awarded)} ${esc(tx('Punkte', 'điểm'))} • ${(Number(answer.response_ms || 0) / 1000).toFixed(1)}s</span>`
          : `<span class="sr-review-status bad">❌ ${esc(tx('Falsch', 'Sai'))} ${pointText(answer.points_awarded)} ${esc(tx('Punkte', 'điểm'))} • ${(Number(answer.response_ms || 0) / 1000).toFixed(1)}s</span>`)
      : `<span class="sr-review-status missed">⏱ ${esc(tx('Nicht beantwortet', 'Không trả lời'))} • +0 ${esc(tx('Punkte', 'điểm'))}</span>`;

    const boardHtml = rows.length
      ? rows.slice(0, 50).map(row => {
          const rank = row.is_correct && row.fast_rank ? (row.fast_rank === 1 ? '🥇' : row.fast_rank === 2 ? '🥈' : row.fast_rank === 3 ? '🥉' : '#' + row.fast_rank) : '—';
          const status = row.is_correct ? `✅ ${esc(tx('Richtig', 'Đúng'))}` : `❌ ${esc(tx('Falsch', 'Sai'))}`;
          return `<div class="sr-live-board-row ${row.is_me ? 'is-me' : ''} ${row.is_correct ? 'is-correct' : 'is-wrong'}"><span>${rank}</span><b>${esc(row.name)}</b><em>${status}</em><strong>${(Number(row.response_ms || 0) / 1000).toFixed(1)}s</strong><i>${pointText(row.points_awarded)}</i></div>`;
        }).join('')
      : `<div class="sr-empty">${esc(tx('Noch keine Antworten.', 'Chưa có lượt trả lời.'))}</div>`;

    // Chỉ dựng lại nội dung câu khi sang round mới. Poll 1 giây chỉ cập nhật
    // trạng thái/BXH để ảnh hoặc video câu vừa rồi không bị reload liên tục.
    if (Number(card.dataset.roundId || 0) !== roundId) {
      const answerHtml = answers.map(a => {
        const id = Number(a.id || 0);
        const isCorrect = correct.includes(id);
        const isSelected = selected.includes(id);
        const cls = isCorrect ? 'is-correct-answer' : (isSelected ? 'is-wrong-selected' : '');
        const marker = isCorrect ? '✓' : (isSelected ? '✕' : '');
        return `<div class="sr-review-answer ${cls}">
          <span class="sr-review-check">${marker}</span>
          <div><b>${esc(a.answer_de || '')}</b></div>
          ${isCorrect ? `<i class="correct">${esc(tx('Richtig', 'Đúng'))}</i>` : (isSelected ? `<i class="wrong">${esc(tx('Falsch', 'Sai'))}</i>` : '')}
        </div>`;
      }).join('');

      const keywordDe = String(q.keyword_de || '').trim();
      const keywordVi = String(q.keyword_vi || '').trim();
      const tipText = keywordVi || keywordDe;
      const showTip = !(state.latest && state.latest.config && state.latest.config.speed_room_show_tip === false);
      const tipHtml = showTip && tipText
        ? `<div class="sr-review-tip"><b>💡 ${esc(tx('Merkhilfe', 'Mẹo nhớ'))}</b><span>${esc(tipText)}</span></div>`
        : '';

      card.dataset.roundId = String(roundId);
      card.innerHTML = `
        <div class="sr-section-title sr-review-title"><span>⚡ ${esc(tx('Letzte Frage', 'Câu vừa rồi'))}</span><div class="sr-review-status-slot">${statusHtml}</div></div>
        <div class="sr-review-body">
          <div class="sr-review-question">
            <div class="sr-review-code"><b>${esc(q.question_code || tx('Frage', 'Câu hỏi'))}</b><span>${Number(q.points || 0)} ${esc(tx('Punkte', 'điểm'))}</span></div>
            ${q.media_video_url ? `<video class="sr-review-media" src="${esc(q.media_video_url)}" controls></video>` : q.media_image_url ? `<img class="sr-review-media" src="${esc(q.media_image_url)}" alt="">` : ''}
            <h3>${esc(q.question_de || '')}</h3>
            <div class="sr-review-answers">${answerHtml}</div>
            ${tipHtml}
          </div>
          <div class="sr-review-round-board">
            <div class="sr-live-board-title"><b>⚡ ${esc(tx('Rangliste dieser Frage', 'BXH câu này'))}</b><span class="sr-review-board-count">${correctCount}/${answered} ${esc(tx('richtig', 'đúng'))}</span></div>
            <div class="sr-live-board-list sr-review-board-list">${boardHtml}</div>
          </div>
        </div>`;
    } else {
      const statusSlot = card.querySelector('.sr-review-status-slot');
      if (statusSlot) statusSlot.innerHTML = statusHtml;
      const count = card.querySelector('.sr-review-board-count');
      if (count) count.textContent = `${correctCount}/${answered} ${tx('richtig', 'đúng')}`;
      const list = card.querySelector('.sr-review-board-list');
      if (list) list.innerHTML = boardHtml;
    }

    card.hidden = false;
  }

  function handlePhase(d) {
    const round = d.round || {};
    const roundId = Number(round.id || 0);
    if (!roundId) return;

    // Sau khi đã xác nhận: đóng ngay màn câu hỏi và quay về phòng.
    // Kết quả + BXH câu vừa trả lời được render bên ngoài cùng Chat/BXH phòng.
    if (round.phase === 'answer') {
      const layer = state.root && state.root.querySelector('.sr-question-layer');
      const layerRound = layer ? Number(layer.dataset.roundId || 0) : 0;
      if (d.my_answer) {
        state.submittedRounds.add(roundId);
        removeQuestionLayer();
      } else if (!state.submittedRounds.has(roundId) && d.question && layerRound !== roundId) {
        showQuestion(d, false);
      }
      hideResultIfOld(roundId);
      return;
    }

    removeQuestionLayer();
    const oldOverlay = state.root && state.root.querySelector('.sr-result-overlay');
    if (oldOverlay) oldOverlay.remove();
  }

  function showQuestion(d, alreadySubmitted) {
    if (!state.root) return;
    const q = d.question;
    const round = d.round;
    if (!q || !round) return;
    state.questionRoundId = Number(round.id);

    removeQuestionLayer();
    const layer = document.createElement('div');
    layer.className = 'sr-question-layer sr-exam-style';
    layer.dataset.roundId = String(round.id);
    const answers = Array.isArray(q.answers) ? q.answers : [];
    layer.innerHTML = `
      <header class="sr-exam-topbar">
        <span class="sr-exam-info">ⓘ</span>
        <b class="sr-exam-code">${esc(q.question_code || 'Frage')}</b>
        <b class="sr-question-timer">--</b>
        <span class="sr-exam-points">Punkte: <strong>${Number(q.points || 0)}</strong></span>
      </header>
      <main class="sr-question-body sr-exam-body">
        ${q.media_video_url ? `<video class="sr-media" src="${esc(q.media_video_url)}" controls></video>` : q.media_image_url ? `<img class="sr-media" src="${esc(q.media_image_url)}" alt="">` : ''}
        <h3 class="sr-q-de">${esc(q.question_de || '')}</h3>
        <div class="sr-answers sr-exam-answers">${answers.map(a => `<label data-answer-id="${Number(a.id)}"><input type="checkbox" value="${Number(a.id)}"><span><b>${esc(a.answer_de || '')}</b></span></label>`).join('')}</div>
      </main>
      <footer class="sr-question-footer sr-exam-footer">
        <small>${esc(tx('Antwort auswählen und bestätigen.', 'Chọn đáp án rồi xác nhận.'))}</small>
        <button type="button" class="sr-submit-answer">${esc(tx('Bestätigen', 'Xác nhận'))}</button>
      </footer>`;

    state.root.appendChild(layer);
    const submit = layer.querySelector('.sr-submit-answer');
    if (state.pendingRounds.has(Number(round.id))) {
      submit.disabled = true; submit.textContent = tx('Senden...', 'Đang gửi...');
    }
    submit.addEventListener('click', () => submitAnswer(Number(round.id), layer));

    if (alreadySubmitted && d.my_answer) {
      const selected = Array.isArray(d.my_answer.selected_answer_ids) ? d.my_answer.selected_answer_ids.map(Number) : [];
      layer.querySelectorAll('.sr-answers input').forEach(input => { input.checked = selected.includes(Number(input.value)); });
      applyQuestionFeedback(layer, d.my_answer, d.correct_answer_ids || [], d.live_result || null);
    }
    updateLocalClock();
  }

  function renderLiveRoundBoard(container, result) {
    if (!container) return;
    const rows = result && Array.isArray(result.round_board) ? result.round_board : [];
    const answered = Number((result && result.answered_count) || rows.length || 0);
    const correct = Number((result && result.correct_count) || 0);
    container.hidden = false;
    container.innerHTML = `
      <div class="sr-live-board-title">
        <b>⚡ ${esc(tx('Rangliste dieser Frage', 'BXH câu này'))}</b>
        <span>${correct}/${answered} ${esc(tx('richtig', 'đúng'))}</span>
      </div>
      <div class="sr-live-board-list">
        ${rows.length ? rows.slice(0, 50).map(row => {
          const rank = row.is_correct && row.fast_rank ? (row.fast_rank === 1 ? '🥇' : row.fast_rank === 2 ? '🥈' : row.fast_rank === 3 ? '🥉' : '#' + row.fast_rank) : '—';
          const status = row.is_correct ? `✅ ${esc(tx('Richtig', 'Đúng'))}` : `❌ ${esc(tx('Falsch', 'Sai'))}`;
          return `<div class="sr-live-board-row ${row.is_me ? 'is-me' : ''} ${row.is_correct ? 'is-correct' : 'is-wrong'}"><span>${rank}</span><b>${esc(row.name)}</b><em>${status}</em><strong>${(Number(row.response_ms || 0) / 1000).toFixed(1)}s</strong><i>${pointText(row.points_awarded)}</i></div>`;
        }).join('') : `<div class="sr-empty">${esc(tx('Noch keine Antworten.', 'Chưa có lượt trả lời.'))}</div>`}
      </div>`;
  }

  function applyQuestionFeedback(layer, answer, correctAnswerIds, liveResult) {
    if (!layer || !answer) return;
    const correct = Array.isArray(correctAnswerIds) ? correctAnswerIds.map(Number) : [];
    const selected = Array.isArray(answer.selected_answer_ids) ? answer.selected_answer_ids.map(Number) : [];

    layer.classList.add('is-submitted');
    layer.querySelectorAll('.sr-answers label').forEach(label => {
      const id = Number(label.dataset.answerId || 0);
      const input = label.querySelector('input');
      if (input) input.disabled = true;
      label.classList.remove('is-correct-answer', 'is-wrong-selected');
      const old = label.querySelector('.sr-answer-state');
      if (old) old.remove();
      if (correct.includes(id)) {
        label.classList.add('is-correct-answer');
        const badge = document.createElement('i');
        badge.className = 'sr-answer-state correct';
        badge.textContent = '✓ ' + tx('Richtig', 'Đúng');
        label.appendChild(badge);
      } else if (selected.includes(id)) {
        label.classList.add('is-wrong-selected');
        const badge = document.createElement('i');
        badge.className = 'sr-answer-state wrong';
        badge.textContent = '✕ ' + tx('Falsch', 'Sai');
        label.appendChild(badge);
      }
    });

    const btn = layer.querySelector('.sr-submit-answer');
    if (btn) {
      btn.disabled = true;
      btn.textContent = answer.is_correct ? tx('Richtig', 'Đúng') : tx('Falsch', 'Sai');
      btn.classList.toggle('is-wrong', !answer.is_correct);
    }
    const footer = layer.querySelector('.sr-footer-message');
    if (footer) {
      footer.innerHTML = answer.is_correct
        ? `<b class="sr-feedback-ok">✅ ${esc(tx('Richtig', 'Đúng'))} ${pointText(answer.points_awarded)} ${esc(tx('Punkte', 'điểm'))}</b><small>${(Number(answer.response_ms || 0) / 1000).toFixed(1)}s • ${esc(tx('Antwort gespeichert', 'Đã chốt đáp án'))}</small>`
        : `<b class="sr-feedback-bad">❌ ${esc(tx('Falsch', 'Sai'))} ${pointText(answer.points_awarded)} ${esc(tx('Punkte', 'điểm'))}</b><small>${(Number(answer.response_ms || 0) / 1000).toFixed(1)}s • ${esc(tx('Antwort gespeichert', 'Đã chốt đáp án'))}</small>`;
    }
    renderLiveRoundBoard(layer.querySelector('.sr-live-round-result'), liveResult || { round_board: [], answered_count: 0, correct_count: 0 });
  }

  async function submitAnswer(roundId, layer) {
    const root = state.root;
    if (!root || !layer.isConnected || state.pendingRounds.has(roundId)) return;
    const btn = layer.querySelector('.sr-submit-answer');
    if (btn.disabled) return;
    const ids = Array.from(layer.querySelectorAll('.sr-answers input:checked')).map(el => Number(el.value)).filter(Boolean);
    if (!ids.length) {
      showToast(tx('Bitte mindestens eine Antwort wählen.', 'Hãy chọn ít nhất một đáp án.'), true);
      return;
    }
    const pendingRounds = state.pendingRounds; pendingRounds.add(roundId);
    btn.disabled = true;
    btn.textContent = tx('Senden...', 'Đang gửi...');
    try {
      const d = await api('speed_room_answer.php', {
        method: 'POST',
        body: JSON.stringify({ round_id: roundId, selected_answer_ids: ids }),
      });
      if (state.root !== root) return;
      state.submittedRounds.add(roundId);
      const a = d.answer || {};
      const currentLayer = root.querySelector('.sr-question-layer');
      if (Number(currentLayer?.dataset.roundId) === roundId) removeQuestionLayer();
      showToast(a.is_correct
        ? `✅ ${tx('Richtig', 'Đúng')} • ${pointText(a.points_awarded)} ${tx('Punkte', 'điểm')}`
        : `❌ ${tx('Falsch', 'Sai')} • ${pointText(a.points_awarded)} ${tx('Punkte', 'điểm')}`,
        !a.is_correct);
      await pollState();
    } catch (e) {
      if (e.name === 'AbortError' || state.root !== root) return;
      btn.disabled = false;
      btn.textContent = tx('Bestätigen', 'Xác nhận');
      if (e.code === 'ROUND_CLOSED' || e.code === 'ROUND_TAKEN') {
        state.submittedRounds.add(roundId);
        const currentLayer = root.querySelector('.sr-question-layer');
        if (Number(currentLayer?.dataset.roundId) === roundId) removeQuestionLayer();
        showToast(e.code === 'ROUND_TAKEN'
          ? tx('Jemand war schneller. 7 Sekunden Warteraum.', 'Đã có người chốt câu này trước. Vào phòng chờ 7 giây.')
          : tx('Zeit abgelaufen.', 'Đã hết thời gian.'), true);
        await pollState();
      } else {
        showToast(e.message || tx('Senden fehlgeschlagen', 'Gửi đáp án thất bại'), true);
      }
    } finally {
      pendingRounds.delete(roundId);
      if (state.root === root && !state.submittedRounds.has(roundId)) {
        const active = root.querySelector('.sr-question-layer');
        if (Number(active?.dataset.roundId) === roundId) {
          const retry = active.querySelector('.sr-submit-answer');
          retry.disabled = false; retry.textContent = tx('Bestätigen','Xác nhận');
        }
      }
    }
  }

  function removeQuestionLayer() {
    if (!state.root) return;
    const layer = state.root.querySelector('.sr-question-layer');
    if (layer) layer.remove();
  }

  function showRoundResult(d) {
    if (!state.root || !d.round) return;
    const roundId = Number(d.round.id);
    state.resultRoundId = roundId;
    const result = d.result || {};
    const top = Array.isArray(result.top_fast) ? result.top_fast : [];
    const me = result.my_result;
    const overlay = document.createElement('div');
    overlay.className = 'sr-result-overlay';
    const myLine = me
      ? (me.is_correct
          ? `✅ ${esc(tx('Richtig', 'Đúng'))} ${pointText(me.points_awarded)} ${esc(tx('Punkte', 'điểm'))} • ${(Number(me.response_ms || 0) / 1000).toFixed(1)}s${me.fast_rank ? ` • #${Number(me.fast_rank)}` : ''}`
          : `❌ ${esc(tx('Falsch', 'Sai'))} ${pointText(me.points_awarded)} ${esc(tx('Punkte', 'điểm'))}`)
      : `⏱ ${esc(tx('Keine Antwort rechtzeitig', 'Không trả lời kịp'))} • +0 ${esc(tx('Punkte', 'điểm'))}`;
    overlay.innerHTML = `
      <div class="sr-result-box">
        <div class="sr-result-kicker">⚡ ${esc(tx('Schnellste richtige Antworten', 'Top trả lời đúng nhanh nhất'))}</div>
        <div class="sr-fast-list">${top.length ? top.map(row => `<div><span>${row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : '🥉'}</span><b>${esc(row.name)}</b><strong>${(Number(row.response_ms || 0) / 1000).toFixed(1)}s</strong></div>`).join('') : `<p>${esc(tx('Noch keine richtige Antwort.', 'Chưa có ai trả lời đúng.'))}</p>`}</div>
        <div class="sr-my-result">${myLine}</div>
        <small>${Number(result.correct_count || 0)}/${Number(result.answered_count || 0)} ${esc(tx('Antworten richtig', 'người trả lời đúng'))}</small>
      </div>`;
    state.root.appendChild(overlay);

    clearTimeout(state.resultHideTimer);
    const serverNow = Date.now() + state.serverOffsetMs;
    const remain = Math.max(500, Number(d.round.result_ends_at_ms || 0) - serverNow);
    state.resultHideTimer = setTimeout(() => {
      if (overlay.isConnected) overlay.remove();
    }, remain + 100);
  }

  function hideResultIfOld(roundId) {
    if (!state.root) return;
    const overlay = state.root.querySelector('.sr-result-overlay');
    if (overlay && state.resultRoundId !== roundId) overlay.remove();
  }

  async function sendChat(event) {
    event.preventDefault();
    if (!state.root || state.chatSending) return;
    const root = state.root;
    const input = root.querySelector('.sr-chat-input');
    const error = state.root.querySelector('.sr-chat-error');
    const value = String(input.value || '').trim();
    if (!value) return;
    if (Date.now() < state.chatCooldownUntil) {
      error.textContent = tx('Bitte kurz warten.', 'Vui lòng chờ 5 giây trước khi gửi tiếp.');
      return;
    }
    const button = state.root.querySelector('.sr-chat-form button');
    state.chatSending = true; button.disabled = true;
    error.textContent = '';
    try {
      await api('speed_room_chat.php', { method: 'POST', body: JSON.stringify({ message: value }) });
      if (state.root !== root) return;
      input.value = '';
      const cooldown = Number((state.config && state.config.speed_room_chat_cooldown_seconds) || 5);
      state.chatCooldownUntil = Date.now() + cooldown * 1000;
      await pollState();
    } catch (e) {
      if (e.name === 'AbortError' || state.root !== root) return;
      if (e.code === 'CHAT_COOLDOWN' && e.data) state.chatCooldownUntil = Date.now() + Number(e.data.retry_after_ms || 1000);
      error.textContent = e.message || tx('Nachricht konnte nicht gesendet werden.', 'Không gửi được tin nhắn.');
    } finally {
      if (state.root === root) { state.chatSending = false; button.disabled = false; }
    }
  }

  function showToast(message, isError) {
    if (!state.root) return;
    const toast = state.root.querySelector('.sr-toast');
    toast.textContent = message;
    toast.classList.toggle('error', !!isError);
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  document.addEventListener('fuehrerschein:open-speed', openRoom);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(state.pollTimer); clearInterval(state.clockTimer); removeQuestionLayer();
    } else if (state.root) { pollState().finally(schedulePoll); startClock(); }
  });
  const observer = new MutationObserver(() => {
    if (state.root && (!state.root.isConnected || state.owner !== token())) closeRoom();
    ensureHomeCard();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(() => { if (!state.root) ensureHomeCard(); }, 10000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureHomeCard);
  else ensureHomeCard();
})();
