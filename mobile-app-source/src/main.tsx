import React, { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { api, getDeviceId, isAuthError } from './api';

type Screen = 'login'|'home'|'learn'|'topics'|'search'|'practice'|'examSetup'|'exam'|'result'|'wrong'|'marked'|'stats'|'account';
type IconName = 'home'|'learn'|'exam'|'wrong'|'mark'|'stats'|'account'|'topic'|'search'|'back'|'close'|'translate'|'check'|'next'|'prev';
type UiLang = 'de'|'vi';

type UiContextValue = {
  uiLang: UiLang;
  setUiLang: (v:UiLang)=>void;
  tx: (de:string, vi:string)=>string;
};

const UiContext = createContext<UiContextValue>({
  uiLang: 'de',
  setUiLang: () => {},
  tx: (de) => de,
});

function useUi() {
  return useContext(UiContext);
}

const PRIVACY_URL = 'https://nguyenron.com/fuehrerschein-backend/privacy.php';
const SUPPORT_URL = 'https://nguyenron.com/fuehrerschein-backend/support.php';

function openExternal(url:string) {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.href = url;
}

function Icon({ name, className='' }: { name: IconName; className?: string }) {
  return <img className={className} src={`./icons/${name}.svg`} alt="" aria-hidden="true" />;
}

function LangPill({ showVi, setShowVi }: { showVi: boolean; setShowVi: (v:boolean)=>void }) {
  return (
    <button type="button" className="lang-pill" onClick={() => setShowVi(!showVi)}>
      <span className={!showVi ? 'active' : ''}>DE</span>
      <b>↔</b>
      <span className={showVi ? 'active' : ''}>VN</span>
    </button>
  );
}

function Header({ title, onBack, showVi, setShowVi, closeIcon=false }: { title:string; onBack?:()=>void; showVi?:boolean; setShowVi?:(v:boolean)=>void; closeIcon?:boolean }) {
  const { tx } = useUi();
  return (
    <div className="app-header">
      <button type="button" className="icon-btn" onClick={onBack} aria-label={closeIcon ? tx('Schließen', 'Thoát') : tx('Zurück', 'Quay lại')}>
        {onBack ? <Icon name={closeIcon ? "close" : "back"} className="nav-icon"/> : <span className="nav-icon placeholder"></span>}
      </button>
      <b>{title}</b>
      {setShowVi ? <LangPill showVi={!!showVi} setShowVi={setShowVi} /> : <span className="right-placeholder"/>}
    </div>
  );
}

function BottomNav({ current, setScreen }: { current: Screen; setScreen:(s:Screen)=>void }) {
  const { tx } = useUi();
  const activeKey = current === 'topics' || current === 'search' || current === 'practice' || current === 'wrong' || current === 'marked' ? 'learn' : current === 'result' || current === 'exam' ? 'examSetup' : current;
  const items: {key: Screen; label: string; icon: IconName}[] = [
    { key: 'home', label: tx('Start', 'Trang chủ'), icon: 'home' },
    { key: 'learn', label: tx('Lernen', 'Học'), icon: 'learn' },
    { key: 'examSetup', label: tx('Prüfung', 'Thi thử'), icon: 'exam' },
    { key: 'stats', label: tx('Statistik', 'Thống kê'), icon: 'stats' },
    { key: 'account', label: tx('Konto', 'Tài khoản'), icon: 'account' },
  ];
  return (
    <div className="bottom-nav">
      {items.map(item => (
        <button type="button" key={item.key} className={activeKey === item.key ? 'active' : ''} onClick={() => setScreen(item.key)}>
          <Icon name={item.icon} className="bottom-nav-icon" />
          <small>{item.label}</small>
        </button>
      ))}
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">{children}</div>;
}

function App() {
  const [uiLang, setUiLangState] = useState<UiLang>((localStorage.getItem('ui_lang') as UiLang) || 'de');
  const [screen, setScreen] = useState<Screen>(localStorage.getItem('token') ? 'home' : 'login');
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [topics, setTopics] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [showVi, setShowVi] = useState(false);
  const [reveal, setReveal] = useState<any>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<number, number[]>>({});
  const [examNumericInputs, setExamNumericInputs] = useState<Record<number, string>>({});
  const [examStart, setExamStart] = useState<number>(0);
  const [result, setResult] = useState<any>(null);

  const setUiLang = (v:UiLang) => {
    localStorage.setItem('ui_lang', v);
    setUiLangState(v);
  };
  const tx = (de:string, vi:string) => uiLang === 'de' ? de : vi;

  async function refresh() {
    try {
      const d = await api('dashboard.php');
      setStats(d.stats);
      const me = await api('me.php');
      setUser(me.user);
    } catch (e:any) {
      // Chỉ đăng xuất khi token thực sự hết hạn/không hợp lệ.
      // Mất mạng/DNS tạm thời không được đá học viên về màn đăng nhập.
      if (isAuthError(e)) {
        localStorage.removeItem('token');
        setScreen('login');
      }
    }
  }

  useEffect(() => { if (localStorage.getItem('token')) refresh(); }, []);

  async function loadTopics() {
    const d = await api('topics.php');
    setTopics(d.topics);
    setScreen('topics');
  }

  async function loadQuestions(mode='all', filterId?: number) {
    const path = mode === 'topic'
      ? `questions.php?mode=topic&topic_id=${filterId}`
      : mode === 'subtopic'
        ? `questions.php?mode=subtopic&subtopic_id=${filterId}`
        : `questions.php?mode=${mode}`;
    const d = await api(path);
    sessionStorage.setItem('practice_back_screen', (mode === 'topic' || mode === 'subtopic') ? 'topics' : 'learn');
    setQuestions(preparePracticeQuestions(Array.isArray(d.questions) ? d.questions : []));
    setQIndex(0);
    setSelected([]);
    setReveal(null);
    setShowVi(false);
    setScreen('practice');
  }

  async function startExam() {
    const d = await api('start_exam.php');
    const raw = Array.isArray(d.questions) ? d.questions : [];
    const ordered = [
      ...raw.filter((q:any) => q.group_type === 'grundstoff'),
      ...raw.filter((q:any) => q.group_type === 'zusatzstoff'),
      ...raw.filter((q:any) => q.group_type !== 'grundstoff' && q.group_type !== 'zusatzstoff'),
    ];
    setExamQuestions(ordered);
    setExamAnswers({});
    setExamNumericInputs({});
    setQIndex(0);
    setExamStart(Date.now());
    setShowVi(false);
    setScreen('exam');
  }

  return (
    <UiContext.Provider value={{ uiLang, setUiLang, tx }}>
      <div className="native-app">
        <div className="stage">
          <AppShell>
            {screen === 'login' && <Login onOk={() => { refresh(); setScreen('home'); }} />}
            {screen === 'home' && <Home setScreen={setScreen} stats={stats} />}
            {screen === 'learn' && <Learn loadTopics={loadTopics} loadQuestions={loadQuestions} setScreen={setScreen} />}
            {screen === 'topics' && <Topics topics={topics} loadQuestions={loadQuestions} setScreen={setScreen} />}
            {screen === 'search' && (
              <SearchQuestions
                setScreen={setScreen}
                openQuestion={(question:any) => {
                  sessionStorage.setItem('practice_back_screen', 'search');
                  setQuestions(preparePracticeQuestions([question]));
                  setQIndex(0);
                  setSelected([]);
                  setReveal(null);
                  setShowVi(false);
                  setScreen('practice');
                }}
              />
            )}
            {screen === 'practice' && (
              <Practice
                questions={questions} qIndex={qIndex} setQIndex={setQIndex}
                selected={selected} setSelected={setSelected}
                showVi={showVi} setShowVi={setShowVi}
                reveal={reveal} setReveal={setReveal} setScreen={setScreen}
              />
            )}
            {screen === 'examSetup' && <ExamSetup setScreen={setScreen} startExam={startExam} />}
            {screen === 'exam' && (
              <Exam
                questions={examQuestions} qIndex={qIndex} setQIndex={setQIndex}
                answers={examAnswers} setAnswers={setExamAnswers}
                numericInputs={examNumericInputs} setNumericInputs={setExamNumericInputs}
                showVi={showVi} setShowVi={setShowVi}
                examStart={examStart}
                setScreen={setScreen}
                setResult={(r:any) => { setResult(r); setScreen('result'); }}
              />
            )}
            {screen === 'result' && <Result result={result} setScreen={setScreen} />}
            {screen === 'wrong' && <QuestionList mode="wrong" setScreen={setScreen} loadQuestions={loadQuestions} />}
            {screen === 'marked' && <QuestionList mode="marked" setScreen={setScreen} loadQuestions={loadQuestions} />}
            {screen === 'stats' && <Stats setScreen={setScreen} />}
            {screen === 'account' && <Account user={user} setScreen={setScreen} onDeleted={() => { setUser(null); setStats({}); setQuestions([]); setExamQuestions([]); setScreen('login'); }} />}
          </AppShell>
        </div>
      </div>
    </UiContext.Provider>
  );
}

function Login({ onOk }: { onOk: ()=>void }) {
  const { tx } = useUi();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit() {
    try {
      const d = await api('login.php', {
        method: 'POST',
        body: JSON.stringify({ login, password, device_id: getDeviceId(), device_label: navigator.userAgent.slice(0, 80) })
      });
      localStorage.setItem('token', d.token);
      onOk();
    } catch (e:any) {
      setErr(e.message);
    }
  }

  return (
    <main className="login-page page-scroll">
      <img src={`./logo-ron.jpg`} className="login-logo" alt="LTLX RON" />
      <h2>Führerschein Viet-Duc</h2>
      <p>{tx('Theorie lernen für Klasse B', 'Lý thuyết lái xe hạng B')}</p>
      {err && <div className="error">{err}</div>}
      <label>{tx('E-Mail / Telefonnummer', 'Email / Số điện thoại')}</label>
      <input value={login} onChange={e=>setLogin(e.target.value)} />
      <label>{tx('Passwort', 'Mật khẩu')}</label>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button type="button" className="primary" onClick={submit}>{tx('Einloggen', 'Đăng nhập')}</button>
      <div className="hint">{tx('Der Zugang wird von der Verwaltung bereitgestellt. In der App gibt es keine Käufe.', 'Tài khoản do quản trị viên cấp. Ứng dụng không có chức năng mua hàng hoặc thanh toán.')}<br/>{tx('Jedes Konto kann nur auf einem Gerät genutzt werden.', 'Mỗi tài khoản chỉ đăng nhập trên 1 thiết bị.')}</div>
    </main>
  );
}

function Home({ setScreen, stats }: { setScreen:(s:Screen)=>void; stats:any }) {
  const { tx } = useUi();
  const cards = [
    { icon: 'learn' as IconName, title: tx('Lernen', 'Học'), sub: tx('Fragen üben', 'Luyện câu hỏi'), go: 'learn' as Screen },
    { icon: 'exam' as IconName, title: tx('Prüfung', 'Thi thử'), sub: '30 Fragen / 30 Minuten', go: 'examSetup' as Screen },
    { icon: 'wrong' as IconName, title: tx('Fehler', 'Câu sai'), sub: tx('Falsch beantwortete Fragen', 'Ôn lại câu sai'), go: 'wrong' as Screen },
    { icon: 'mark' as IconName, title: tx('Markiert', 'Đánh dấu'), sub: tx('Schwere Fragen', 'Câu khó / hay sai'), go: 'marked' as Screen },
    { icon: 'stats' as IconName, title: tx('Statistik', 'Thống kê'), sub: tx('Lernfortschritt', 'Tiến độ học tập'), go: 'stats' as Screen },
    { icon: 'account' as IconName, title: tx('Konto', 'Tài khoản'), sub: tx('Persönliche Daten', 'Thông tin cá nhân'), go: 'account' as Screen },
  ];
  return (
    <>
      <Header title={tx('Start', 'Trang chủ')} />
      <main className="p page-scroll">
        <h1>Führerschein-App</h1>
        <h2>Klasse B</h2>
        <p>{tx('Lernfortschritt', 'Tiến độ học tập')}: <b>{stats.done || 0}</b> / {stats.total || 0} {tx('Fragen', 'câu')}</p>
        <div className="grid cards-grid">
          {cards.map(card => (
            <button type="button" key={card.title} className="home-card" onClick={() => setScreen(card.go)}>
              <Icon name={card.icon} className="card-icon" />
              <b>{card.title}</b>
              <small>{card.sub}</small>
            </button>
          ))}
        </div>
      </main>
      <BottomNav current="home" setScreen={setScreen} />
    </>
  );
}

function Learn({ loadTopics, loadQuestions, setScreen }: any) {
  const { tx } = useUi();
  const items = [
    { icon: 'exam' as IconName, label: tx('30 Zufallsfragen', '30 câu ngẫu nhiên'), action: () => loadQuestions('all') },
    { icon: 'topic' as IconName, label: tx('Alle Fragen & Themen', 'Tất cả câu hỏi & chủ đề'), action: loadTopics },
    { icon: 'learn' as IconName, label: tx('Schwerpunktübungen', 'Luyện trọng tâm'), action: () => loadQuestions('all') },
    { icon: 'search' as IconName, label: tx('Fragensuche', 'Tìm câu hỏi'), action: () => setScreen('search') },
    { icon: 'mark' as IconName, label: tx('Markierte Fragen', 'Câu đã đánh dấu'), action: () => loadQuestions('marked') },
    { icon: 'wrong' as IconName, label: tx('Letzte Fehler', 'Câu làm sai gần đây'), action: () => loadQuestions('wrong') },
  ];
  return (
    <>
      <Header title={tx('Lernen', 'Học')} onBack={() => setScreen('home')} />
      <main className="p page-scroll">
        <h1>Führerschein-App</h1>
        <h2>Klasse B</h2>
        <div className="list">
          {items.map(item => (
            <button type="button" key={item.label} className="list-btn" onClick={item.action}>
              <span className="list-left"><Icon name={item.icon} className="list-icon" /> {item.label}</span>
              <span className="chev">›</span>
            </button>
          ))}
        </div>
      </main>
      <BottomNav current="learn" setScreen={setScreen} />
    </>
  );
}

function Topics({ topics, loadQuestions, setScreen }: any) {
  const { uiLang, tx } = useUi();
  const groups = ['grundstoff', 'zusatzstoff'];
  const safeTopics = Array.isArray(topics) ? topics : [];
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({ grundstoff: true, zusatzstoff: true });
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const displayName = (item:any) => uiLang === 'de' ? item.name_de : (item.name_vi || item.name_de);
  const toggleTopic = (id:number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const allCollapsed = groups.every(g => !groupOpen[g]);
  const collapseAll = () => {
    const next = allCollapsed;
    setGroupOpen({ grundstoff: next, zusatzstoff: next });
    if (!next) setExpanded({});
  };
  return (
    <>
      <Header title={tx('Themen', 'Chủ đề')} onBack={() => setScreen('learn')} />
      <main className="topics page-scroll topics-collapsible">
        <div className="topics-tools"><button type="button" className="topics-collapse-all" onClick={collapseAll}>{allCollapsed ? tx('Alle öffnen', 'Mở tất cả') : tx('Alle einklappen', 'Thu gọn tất cả')}</button></div>
        {groups.map(group => {
          const groupTopics = safeTopics.filter((topic:any) => topic.group_type === group);
          const totalQuestions = groupTopics.reduce((sum:number, t:any) => sum + Number(t.question_count || 0), 0);
          const isGroupOpen = !!groupOpen[group];
          return (
            <section key={group} className={`topic-group ${isGroupOpen ? 'open' : 'collapsed'}`}>
              <button type="button" className="topic-group-toggle" onClick={() => setGroupOpen(prev => ({ ...prev, [group]: !prev[group] }))}>
                <span><b>{group === 'grundstoff' ? 'Grundstoff' : 'Zusatzstoff - Klasse B'}</b><small>{totalQuestions} {tx('Fragen', 'câu')}</small></span>
                <span className="topic-chevron">{isGroupOpen ? '⌃' : '⌄'}</span>
              </button>
              {isGroupOpen && groupTopics.map((topic:any) => {
                const isOpen = !!expanded[Number(topic.id)];
                const subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : [];
                return (
                  <div className={`topic-block ${isOpen ? 'open' : ''}`} key={topic.id}>
                    <button type="button" className="topic-row" onClick={() => toggleTopic(Number(topic.id))}>
                      <span className="topic-row-copy"><b>{displayName(topic)}</b><small>{topic.code ? `Kapitel ${topic.code} - ` : ''}{topic.question_count} {tx('Fragen', 'câu')}</small></span>
                      <span className="topic-chevron">{isOpen ? '⌃' : '⌄'}</span>
                    </button>
                    {isOpen && <div className="subtopic-list">
                      <button type="button" className="subtopic-row all-topic-row" onClick={() => loadQuestions('topic', Number(topic.id))}><span><b>{tx('Alle Fragen dieses Themas', 'Tất cả câu trong chủ đề')}</b><small>{topic.question_count} {tx('Fragen', 'câu')}</small></span><span className="subtopic-chevron">›</span></button>
                      {subtopics.map((subtopic:any) => <button type="button" className="subtopic-row" key={subtopic.id} onClick={() => loadQuestions('subtopic', Number(subtopic.id))}><span><b>{displayName(subtopic)}</b><small>{subtopic.question_count} {tx('Fragen', 'câu')}</small></span><span className="subtopic-chevron">›</span></button>)}
                    </div>}
                  </div>
                );
              })}
            </section>
          );
        })}
      </main>
      <BottomNav current="learn" setScreen={setScreen} />
    </>
  );
}

function shuffleCopy<T>(items:T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function preparePracticeQuestions(items:any[]) {
  return items.map((q:any) => ({
    ...q,
    // Chỉ xáo đáp án ở phần học. Thi thử giữ nguyên luồng riêng.
    answers: Array.isArray(q.answers) && q.answers.length > 1 ? shuffleCopy(q.answers) : (q.answers || []),
  }));
}


function isChoiceSelectionCorrect(q:any, selectedIds:number[]) {
  const correctIds = Array.isArray(q?.answers)
    ? q.answers.filter((a:any) => Number(a.is_correct) === 1).map((a:any) => Number(a.id)).sort((a:number,b:number)=>a-b)
    : [];
  const chosen = selectedIds.map(Number).sort((a,b)=>a-b);
  return correctIds.length === chosen.length && correctIds.every((id:number, index:number) => id === chosen[index]);
}

function questionSearchText(q:any) {
  const answerText = Array.isArray(q?.answers)
    ? q.answers.flatMap((a:any) => [a?.answer_de, a?.answer_vi]).join(' ')
    : '';
  return [
    q?.question_code,
    q?.question_de,
    q?.question_vi,
    q?.keyword_de,
    q?.keyword_vi,
    answerText,
  ].filter(Boolean).join(' ').toLocaleLowerCase();
}

function SearchQuestions({ setScreen, openQuestion }: { setScreen:(s:Screen)=>void; openQuestion:(q:any)=>void }) {
  const { uiLang, tx } = useUi();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api('questions.php?mode=all')
      .then((d:any) => {
        if (!alive) return;
        setItems(Array.isArray(d.questions) ? d.questions : []);
        setError('');
      })
      .catch((e:any) => {
        if (!alive) return;
        setError(e?.message || tx('Fragen konnten nicht geladen werden.', 'Không tải được danh sách câu hỏi.'));
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const needle = query.trim().toLocaleLowerCase();
  const results = needle
    ? items.filter((q:any) => questionSearchText(q).includes(needle)).slice(0, 100)
    : [];

  return (
    <>
      <Header title={tx('Fragensuche', 'Tìm câu hỏi')} onBack={() => setScreen('learn')} />
      <main className="p page-scroll search-page">
        <div className="question-search-box">
          <Icon name="search" className="question-search-icon" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tx('Code oder Stichwort eingeben', 'Nhập mã câu hoặc từ khóa')}
          />
        </div>
        <small className="search-help">{tx('Suche nach Fragencode, Fragetext, Antwort oder Stichwort.', 'Tìm theo mã câu, nội dung, đáp án hoặc từ khóa/mẹo nhớ.')}</small>
        {loading && <div className="search-state">{tx('Wird geladen…', 'Đang tải…')}</div>}
        {error && <div className="error">{error}</div>}
        {!loading && needle && results.length === 0 && <div className="search-state">{tx('Keine passende Frage gefunden.', 'Không tìm thấy câu phù hợp.')}</div>}
        <div className="search-results">
          {results.map((q:any) => (
            <button type="button" className="search-result" key={q.id} onClick={() => openQuestion(q)}>
              <span className="search-result-head"><b>{q.question_code}</b><small>{q.points} {tx('Punkte', 'điểm')}</small></span>
              <span>{uiLang === 'de' ? q.question_de : (q.question_vi || q.question_de)}</span>
              {(q.keyword_de || q.keyword_vi) && <em>{uiLang === 'de' ? q.keyword_de : (q.keyword_vi || q.keyword_de)}</em>}
            </button>
          ))}
        </div>
      </main>
      <BottomNav current="search" setScreen={setScreen} />
    </>
  );
}

function splitPromptText(text:any) {
  const parts = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map((s:string) => s.trim()).filter(Boolean);
  return {
    main: parts[0] || '',
    intro: parts.slice(1).join('\n')
  };
}

function QuestionPrompt({ q, showVi, hideIntro=false }: { q:any; showVi:boolean; hideIntro?:boolean }) {
  const de = splitPromptText(q.question_de);
  const vi = splitPromptText(q.question_vi);
  return (
    <div className="question-prompt-block">
      <h3>{de.main}</h3>
      {showVi && <p className="vi">{vi.main || q.question_vi}</p>}
      {!hideIntro && de.intro && <div className="answer-intro">{de.intro}</div>}
      {!hideIntro && showVi && vi.intro && <p className="vi answer-intro-vi">{vi.intro}</p>}
    </div>
  );
}

function Media({ q }: { q:any }) {
  const { tx } = useUi();
  const [imageOpen, setImageOpen] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  if (!q?.media_video_url && !q?.media_image_url) return null;

  const openVideoFullscreen = () => {
    const video:any = videoRef.current;
    if (!video) return;
    try {
      if (typeof video.webkitEnterFullscreen === 'function') {
        video.webkitEnterFullscreen();
      } else if (typeof video.requestFullscreen === 'function') {
        video.requestFullscreen();
      }
    } catch {}
  };

  return (
    <div className="media-block">
      {q.media_video_url ? (
        <div className="media-video-wrap">
          <video ref={videoRef} src={q.media_video_url} controls playsInline className="media" />
          <button type="button" className="media-fullscreen-btn" onClick={openVideoFullscreen}>
            ⛶ {tx('Vollbild', 'Toàn màn hình')}
          </button>
        </div>
      ) : (
        <button type="button" className="media-image-button" onClick={() => setImageOpen(true)} aria-label={tx('Bild vergrößern', 'Phóng to ảnh')}>
          <img src={q.media_image_url} className="media" alt="" />
        </button>
      )}

      {imageOpen && (
        <div className="media-lightbox" role="dialog" aria-modal="true" onClick={() => setImageOpen(false)}>
          <button type="button" className="media-lightbox-close" onClick={() => setImageOpen(false)}>×</button>
          <img src={q.media_image_url} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}


function ExplanationModal({ q, showVi, onClose }: { q:any; showVi:boolean; onClose:()=>void }) {
  const { tx } = useUi();
  const de = q?.explanation_de || tx('Für diese Frage ist noch keine Erklärung hinterlegt.', 'Câu này chưa có nội dung giải thích.');
  const vi = q?.explanation_vi || '';
  return (
    <div className="confirm-overlay explanation-overlay" role="dialog" aria-modal="true">
      <div className="explain-box">
        <h2>{tx('Erklärung zur Frage', 'Giải thích câu hỏi')}</h2>
        <div className="explain-line" />
        <p>{de}</p>
        {showVi && vi && <p className="explain-vi">{vi}</p>}
        {q?.stvo && <p className="stvo">StVO: {q.stvo}</p>}
        <button type="button" className="explain-close" onClick={onClose}>{tx('Schliessen', 'Đóng')}</button>
      </div>
    </div>
  );
}

function QuestionTopBar({ q, qIndex, total, showVi, onExplain, timeLabel }: { q:any; qIndex:number; total:number; showVi:boolean; onExplain:()=>void; timeLabel?:string }) {
  const { tx } = useUi();
  return (
    <div className={`question-topbar ${timeLabel ? 'exam-question-topbar' : ''}`}>
      <span>{tx('Frage', 'Câu')} {qIndex + 1}/{total}</span>
      {timeLabel
        ? <div className="exam-time-center">{timeLabel}</div>
        : <div className="fv-ai-explain-tools">
            <button type="button" className="bulb-btn" onClick={onExplain} aria-label={tx('Erklärung anzeigen', 'Xem giải thích')}>💡</button>
            <span className="ai-explanation-slot" data-ai-question-id={q.id} data-ai-question-code={q.question_code} hidden />
          </div>
      }
      <b>{tx('Punkte', 'Điểm')}: {q?.points || 0}</b>
    </div>
  );
}

function QuestionFooter({
  total, current, checked, wrong, isExam, submitted, marked, onMark, onMain, goFirst, goBack10, goPrev, goNext, goNext10, goLast
}: {
  total:number; current:number; checked:boolean; wrong?:boolean; isExam?:boolean; submitted?:boolean; marked?:boolean;
  onMark:()=>void; onMain:()=>void; goFirst:()=>void; goBack10:()=>void; goPrev:()=>void; goNext:()=>void; goNext10:()=>void; goLast:()=>void;
}) {
  const { tx } = useUi();
  const mainLabel = isExam
    ? (current >= total ? (submitted ? tx('Sende...', 'Đang nộp...') : tx('Abgeben', 'Nộp bài')) : tx('Weiter', 'Tiếp'))
    : (checked ? tx('Weiter', 'Tiếp') : tx('Weiter', 'Tiếp'));
  return (
    <div className="classic-footer">
      <div className="classic-footer-top">
        <div className="total-questions">{total} {tx('Fragen', 'câu')}</div>
        {!isExam && <button type="button" className={`star-btn ${marked ? 'active' : ''}`} onClick={onMark} title={marked ? tx('Markierung entfernen', 'Bỏ đánh dấu') : tx('Frage markieren', 'Đánh dấu câu')}>{marked ? '★' : '☆'}</button>}
        <button type="button" className="weiter-btn" onClick={onMain}>{mainLabel}</button>
      </div>
      <div className="classic-footer-bottom">
        <button type="button" onClick={goFirst}>|‹</button>
        <button type="button" onClick={goBack10}>‹‹</button>
        <button type="button" onClick={goPrev}>‹</button>
        <button type="button" className={`current-number ${wrong ? 'wrong' : ''} ${marked ? 'marked' : ''}`}>{current}</button>
        <button type="button" onClick={goNext}>›</button>
        <button type="button" onClick={goNext10}>››</button>
        <button type="button" onClick={goLast}>›|</button>
      </div>
    </div>
  );
}

function Practice(props:any) {
  const { tx } = useUi();
  const { questions, qIndex, setQIndex, selected, setSelected, showVi, setShowVi, reveal, setReveal, setScreen } = props;
  const practiceBack = () => setScreen((sessionStorage.getItem('practice_back_screen') || 'learn') as any);
  const [showExplain, setShowExplain] = useState(false);
  const [numericValue, setNumericValue] = useState('');
  const activeQuestionIdRef = React.useRef<any>(null);
  const submitSequenceRef = React.useRef(0);
  const actionLockUntilRef = React.useRef(0);
  const mountedRef = React.useRef(true);
  const q = questions[qIndex];
  const [practiceMarkedMap, setPracticeMarkedMap] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    (questions || []).forEach((item:any) => { initial[item.id] = Number(item.marked || 0) === 1; });
    return initial;
  });
  const practiceMarked = !!(q && practiceMarkedMap[q.id]);
  const numericMeta = getNumericAnswerMeta(q);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      submitSequenceRef.current += 1;
    };
  }, []);

  useEffect(() => {
    activeQuestionIdRef.current = q?.id ?? null;
    // Mỗi lần đổi câu, vô hiệu mọi response submit của câu trước.
    submitSequenceRef.current += 1;
  }, [q?.id]);

  if (!q) return <><Header title={tx('Frage', 'Câu hỏi')} onBack={practiceBack} /><main className="p">{tx('Keine Fragen vorhanden', 'Không có câu hỏi')}</main></>;

  const resetAnswer = () => { setReveal(null); setSelected([]); setNumericValue(''); };
  const jumpTo = (idx:number) => {
    const next = Math.max(0, Math.min(questions.length - 1, idx));
    submitSequenceRef.current += 1;
    activeQuestionIdRef.current = questions[next]?.id ?? null;
    setQIndex(next);
    resetAnswer();
  };
  const toggle = (id:number) => setSelected(selected.includes(id) ? selected.filter((x:number) => x !== id) : [...selected, id]);

  function submit() {
    const submittedQuestionId = q.id;
    const submitSequence = ++submitSequenceRef.current;
    const numericCorrect = numericMeta ? normalizeExamNumber(numericValue) === numericMeta.expected : false;
    const selectedForSubmit = numericMeta
      ? (numericCorrect ? [numericMeta.answer.id] : [])
      : selected;
    const localCorrect = numericMeta ? numericCorrect : isChoiceSelectionCorrect(q, selectedForSubmit);

    // Hiển thị đúng/sai ngay lập tức, nhưng gắn kết quả với đúng câu hiện tại.
    setSelected(selectedForSubmit);
    setReveal({ is_correct: localCorrect, optimistic: true, question_id: submittedQuestionId });
    if (!localCorrect && 'vibrate' in navigator) {
      try { navigator.vibrate(140); } catch {}
    }

    // Đồng bộ tiến độ ở nền. Response cũ tuyệt đối không được áp sang câu mới.
    void api('submit_practice.php', {
      method: 'POST',
      body: JSON.stringify({ question_id: submittedQuestionId, selected_answer_ids: selectedForSubmit })
    }).then((d:any) => {
      if (!mountedRef.current) return;
      if (activeQuestionIdRef.current !== submittedQuestionId) return;
      if (submitSequenceRef.current !== submitSequence) return;
      setReveal({ ...d, question_id: submittedQuestionId });
    }).catch(() => {
      // Giữ kết quả cục bộ khi mạng chập chờn; lần thao tác tiếp theo API sẽ retry lại.
    });
  }

  async function mark() {
    try {
      const d:any = await api('toggle_mark.php', { method: 'POST', body: JSON.stringify({ question_id: q.id }) });
      const nextMarked = Number(d?.marked || 0) === 1;
      setPracticeMarkedMap(prev => ({ ...prev, [q.id]: nextMarked }));
    } catch (e:any) {
      alert(e?.message || tx('Markierung konnte nicht gespeichert werden', 'Không lưu được đánh dấu'));
    }
  }

  function handleWeiter() {
    const now = Date.now();
    if (now < actionLockUntilRef.current) return;
    actionLockUntilRef.current = now + 450;

    // Nếu vì bất kỳ lý do nào còn sót kết quả của câu khác, xóa nó và đứng nguyên câu hiện tại.
    if (reveal?.question_id != null && reveal.question_id !== q.id) {
      setReveal(null);
      return;
    }
    if (!reveal) {
      submit();
      return;
    }
    jumpTo(qIndex + 1);
  }

  return (
    <>
      <Header title={q.question_code} onBack={practiceBack} showVi={showVi} setShowVi={setShowVi} />
      <main className={`question question-classic page-scroll ${q.media_video_url || q.media_image_url ? 'has-media' : 'no-media'}`}> 
        <QuestionTopBar q={q} qIndex={qIndex} total={questions.length} showVi={showVi} onExplain={() => setShowExplain(true)} />
        <Media q={q} />
        <QuestionPrompt q={q} showVi={showVi} hideIntro={!!numericMeta} />
        <div className="answers answers-classic">
          {numericMeta ? (
            <NumericAnswerPad
              q={q}
              value={numericValue}
              onChange={setNumericValue}
              showVi={showVi}
              disabled={!!reveal}
              reveal={reveal}
            />
          ) : q.answers.map((a:any) => {
            const isCorrect = Number(a.is_correct) === 1;
            const isSelected = selected.includes(a.id);
            const statusClass = reveal
              ? (isCorrect ? (isSelected ? 'selected-correct' : 'missed-correct') : (isSelected ? 'selected-wrong' : ''))
              : '';
            return (
              <label key={a.id} className={statusClass}>
                <span className="answer-result-rail"></span>
                <input type="checkbox" checked={isSelected} disabled={!!reveal} onChange={() => toggle(a.id)} />
                <span className="answer-text"><b>{a.answer_de}</b>{showVi && <em>{a.answer_vi}</em>}</span>
                {reveal && isCorrect && <span className="answer-correct-mark">✓</span>}
              </label>
            );
          })}
        </div>
        {reveal && <div className={reveal.is_correct ? 'result-ok result-inline' : 'result-bad result-inline'}>{reveal.is_correct ? tx('Richtig', 'Đúng') : tx('Falsch', 'Sai')}</div>}
        {reveal && (q.keyword_de || q.keyword_vi) && (
          <div className="question-keyword">
            <b>{tx('Stichwort / Merkhilfe', 'Từ khóa / Mẹo nhớ')}:</b>
            <span>{q.keyword_de || q.keyword_vi}</span>
            {showVi && q.keyword_vi && q.keyword_vi !== q.keyword_de && <em>{q.keyword_vi}</em>}
          </div>
        )}
      </main>

      <QuestionFooter
        total={questions.length}
        current={qIndex + 1}
        checked={!!reveal}
        wrong={!!reveal && !reveal.is_correct}
        marked={practiceMarked}
        onMark={mark}
        onMain={handleWeiter}
        goFirst={() => jumpTo(0)}
        goBack10={() => jumpTo(qIndex - 10)}
        goPrev={() => jumpTo(qIndex - 1)}
        goNext={() => jumpTo(qIndex + 1)}
        goNext10={() => jumpTo(qIndex + 10)}
        goLast={() => jumpTo(questions.length - 1)}
      />

      {showExplain && <ExplanationModal q={q} showVi={showVi} onClose={() => setShowExplain(false)} />}
    </>
  );
}

function ExamSetup({ setScreen, startExam }: any) {
  const { tx } = useUi();
  return (
    <>
      <Header title={tx('Prüfung', 'Thi thử')} onBack={() => setScreen('home')} />
      <main className="p center page-scroll">
        <div className="exam-icon"><Icon name="exam" className="exam-icon-svg" /></div>
        <h2>{tx('Prüfungssimulation - 30 Fragen', 'Thi thử - 30 câu')}</h2>
        <p>30 {tx('Minuten', 'phút')}</p>
        <div className="box">
          <b>{tx('Prüfungsaufbau', 'Cấu trúc đề thi')}</b>
          <ul>
            <li>Grundstoff: 20 {tx('Fragen', 'câu')}</li>
            <li>Zusatzstoff - Klasse B: 10 {tx('Fragen', 'câu')}</li>
          </ul>
          <b>{tx('Bestehensregel', 'Điều kiện đạt')}</b>
          <ul>
            <li>{tx('Bestanden ab 26/30 Fragen (86.7%)', 'Đạt từ 26/30 câu (86.7%)')}</li>
            <li>{tx('Nicht mehr als 10 Fehlerpunkte', 'Không được sai quá 10 điểm')}</li>
            <li>{tx('2 falsche 5-Punkte-Fragen = nicht bestanden', 'Sai 2 câu 5 điểm là trượt')}</li>
          </ul>
        </div>
        <button type="button" className="primary" onClick={startExam}>{tx('Prüfung starten', 'Bắt đầu thi')}</button>
      </main>
      <BottomNav current="examSetup" setScreen={setScreen} />
    </>
  );
}

const NUMERIC_QUESTION_META: Record<string, { expected:string; prefixDe:string; prefixVi:string; unitDe:string; unitVi:string; answerDe:string; answerVi:string }> = {
  "2.1.08-025": {
    "expected": "3",
    "prefixDe": "Antwort: Fahrlinie Nr.",
    "prefixVi": "Trả lời: Đường số",
    "unitDe": "",
    "unitVi": "",
    "answerDe": "3",
    "answerVi": "3"
  },
  "2.2.07-002": {
    "expected": "3.5",
    "prefixDe": "Antwort: Für alle Kraftfahrzeuge bis",
    "prefixVi": "Trả lời: Tất cả xe cơ giới có khối lượng toàn bộ cho phép đến",
    "unitDe": "t zulässiger Gesamtmasse.",
    "unitVi": "tấn.",
    "answerDe": "3,5 t",
    "answerVi": "3,5 tấn"
  },
  "2.2.22-111": {
    "expected": "2.5",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "2,5 m",
    "answerVi": "2,5 mét"
  },
  "1.2.02-111": {
    "expected": "60",
    "prefixDe": "Antwort: Mehr als",
    "prefixVi": "Trả lời: Lớn hơn",
    "unitDe": "km/h",
    "unitVi": "km/h",
    "answerDe": "60 km/h",
    "answerVi": "60 km/h"
  },
  "1.2.03-101": {
    "expected": "50",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "km/h",
    "unitVi": "km/h",
    "answerDe": "50 km/h",
    "answerVi": "50 km/h"
  },
  "1.2.03-102": {
    "expected": "4",
    "prefixDe": "Antwort: Er wird",
    "prefixVi": "Trả lời: Quãng đường phanh dài gấp",
    "unitDe": "mal so lang.",
    "unitVi": "lần.",
    "answerDe": "4",
    "answerVi": "4"
  },
  "1.2.05-003": {
    "expected": "2",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "2 m",
    "answerVi": "2 mét"
  },
  "1.2.05-004": {
    "expected": "1.5",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "1,5 m",
    "answerVi": "1,5 mét"
  },
  "1.2.05-005": {
    "expected": "1.5",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "1,5 m",
    "answerVi": "1,5 mét"
  },
  "1.2.12-108": {
    "expected": "5",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "5 m",
    "answerVi": "5 mét"
  },
  "1.2.12-110": {
    "expected": "50",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "50 m",
    "answerVi": "50 mét"
  },
  "1.2.12-111": {
    "expected": "5",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "5 m",
    "answerVi": "5 mét"
  },
  "1.2.12-112": {
    "expected": "15",
    "prefixDe": "Antwort: Jeweils",
    "prefixVi": "Trả lời: Mỗi phía",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "15 m",
    "answerVi": "15 mét"
  },
  "1.2.12-113": {
    "expected": "3",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "Minuten",
    "unitVi": "phút",
    "answerDe": "3 Minuten",
    "answerVi": "3 phút"
  },
  "1.2.12-131": {
    "expected": "5",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "5 m",
    "answerVi": "5 mét"
  },
  "1.2.12-133": {
    "expected": "8",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "8 m",
    "answerVi": "8 mét"
  },
  "1.2.22-101": {
    "expected": "1",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "1 m",
    "answerVi": "1 mét"
  },
  "1.4.41-171": {
    "expected": "30",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "km/h",
    "unitVi": "km/h",
    "answerDe": "30 km/h",
    "answerVi": "30 km/h"
  },
  "2.2.03-006": {
    "expected": "130",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "130 m",
    "answerVi": "130 mét"
  },
  "2.2.03-007": {
    "expected": "100",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "100 m",
    "answerVi": "100 mét"
  },
  "2.2.03-008": {
    "expected": "30",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "30 m",
    "answerVi": "30 mét"
  },
  "2.2.03-009": {
    "expected": "40",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "40 m",
    "answerVi": "40 mét"
  },
  "2.2.03-010": {
    "expected": "25",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "25 m",
    "answerVi": "25 mét"
  },
  "2.2.03-011": {
    "expected": "15",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "15 m",
    "answerVi": "15 mét"
  },
  "2.2.03-012": {
    "expected": "25",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "25 m",
    "answerVi": "25 mét"
  },
  "2.2.03-018": {
    "expected": "80",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "km/h",
    "unitVi": "km/h",
    "answerDe": "80 km/h",
    "answerVi": "80 km/h"
  },
  "2.2.03-025": {
    "expected": "50",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "km/h",
    "unitVi": "km/h",
    "answerDe": "50 km/h",
    "answerVi": "50 km/h"
  },
  "2.2.03-101": {
    "expected": "50",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "km/h",
    "unitVi": "km/h",
    "answerDe": "50 km/h",
    "answerVi": "50 km/h"
  },
  "2.2.03-104": {
    "expected": "100",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "km/h",
    "unitVi": "km/h",
    "answerDe": "100 km/h",
    "answerVi": "100 km/h"
  },
  "2.2.03-109": {
    "expected": "80",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "km/h",
    "unitVi": "km/h",
    "answerDe": "80 km/h",
    "answerVi": "80 km/h"
  },
  "2.2.04-004": {
    "expected": "50",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "50 m",
    "answerVi": "50 mét"
  },
  "2.2.04-102": {
    "expected": "7",
    "prefixDe": "Antwort: Ab einer Länge von mehr als",
    "prefixVi": "Trả lời: Khi tổ hợp xe dài hơn",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "7 m",
    "answerVi": "7 mét"
  },
  "2.2.12-102": {
    "expected": "2.8",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "t",
    "unitVi": "tấn",
    "answerDe": "2,8 t",
    "answerVi": "2,8 tấn"
  },
  "2.2.12-104": {
    "expected": "10",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "10 m",
    "answerVi": "10 mét"
  },
  "2.2.12-204": {
    "expected": "3",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "3 m",
    "answerVi": "3 mét"
  },
  "2.2.18-003": {
    "expected": "130",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "km/h",
    "unitVi": "km/h",
    "answerDe": "130 km/h",
    "answerVi": "130 km/h"
  },
  "2.2.22-129": {
    "expected": "1.5",
    "prefixDe": "Antwort: Bis zu",
    "prefixVi": "Trả lời: Tối đa",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "1,5 m",
    "answerVi": "1,5 mét"
  },
  "2.4.41-102": {
    "expected": "2",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "",
    "unitVi": "",
    "answerDe": "2",
    "answerVi": "2"
  },
  "2.4.41-103": {
    "expected": "1",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "",
    "unitVi": "",
    "answerDe": "1",
    "answerVi": "1"
  },
  "2.6.01-108": {
    "expected": "24",
    "prefixDe": "Antwort: Die Frist beträgt",
    "prefixVi": "Trả lời: Thời hạn là",
    "unitDe": "Monate",
    "unitVi": "tháng",
    "answerDe": "24 Monate",
    "answerVi": "24 tháng"
  },
  "2.6.03-116": {
    "expected": "1",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "Anhänger",
    "unitVi": "rơ-moóc",
    "answerDe": "1 Anhänger",
    "answerVi": "1 rơ-moóc"
  },
  "2.6.06-103": {
    "expected": "18",
    "prefixDe": "Antwort:",
    "prefixVi": "Trả lời:",
    "unitDe": "m",
    "unitVi": "m",
    "answerDe": "18 m",
    "answerVi": "18 mét"
  },
  "2.7.05-108": {
    "expected": "1.6",
    "prefixDe": "Antwort: Die Mindestprofiltiefe beträgt",
    "prefixVi": "Trả lời: Độ sâu gai lốp tối thiểu là",
    "unitDe": "mm",
    "unitVi": "mm",
    "answerDe": "1,6 mm",
    "answerVi": "1,6 mm"
  }
};

function normalizeExamNumber(value:any) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/[^0-9.+-]/g, '');
}

function getNumericAnswerMeta(q:any) {
  if (!q) return null;
  const fallback = NUMERIC_QUESTION_META[String(q.question_code || '')];
  const isNumber = q.answer_type === 'number' || !!fallback;
  if (!isNumber || !Array.isArray(q.answers) || q.answers.length < 1) return null;

  const answer = q.answers[0];
  const answerDe = String(answer.answer_de || fallback?.answerDe || '').trim();
  const match = answerDe.match(/[-+]?\d+(?:[.,]\d+)?/);
  const expected = fallback ? normalizeExamNumber(fallback.expected) : (match ? normalizeExamNumber(match[0]) : '');
  if (!expected) return null;

  return {
    answer,
    expected,
    prefixDe: String(q.answer_prefix_de || fallback?.prefixDe || 'Antwort:').trim(),
    prefixVi: String(q.answer_prefix_vi || fallback?.prefixVi || 'Trả lời:').trim(),
    unitDe: String(q.answer_unit_de || fallback?.unitDe || (match ? answerDe.replace(match[0], '').trim() : '')).trim(),
    unitVi: String(q.answer_unit_vi || fallback?.unitVi || q.answer_unit_de || '').trim(),
  };
}

function NumericAnswerPad({
  q, value, onChange, showVi, disabled=false, reveal
}: {
  q:any; value:string; onChange:(value:string)=>void; showVi:boolean; disabled?:boolean; reveal?:any;
}) {
  const { tx } = useUi();
  const meta = getNumericAnswerMeta(q);
  if (!meta) return null;

  const setValue = (next:string) => {
    if (disabled) return;
    onChange(next.slice(0, 8));
  };

  const append = (token:string) => {
    if (disabled) return;
    if (token === ',') {
      if (value.includes(',') || value.includes('.')) return;
      setValue(value ? `${value},` : '0,');
      return;
    }
    setValue(`${value}${token}`);
  };

  const backspace = () => setValue(value.slice(0, -1));
  const clear = () => setValue('');
  const prefix = showVi ? meta.prefixVi : meta.prefixDe;
  const unit = showVi ? (meta.unitVi || meta.unitDe) : meta.unitDe;

  return (
    <div className={`numeric-answer-panel ${reveal ? (reveal.is_correct ? 'correct' : 'wrong') : ''}`}>
      <div className="numeric-answer-line">
        <span className="numeric-answer-prefix">{prefix}</span>
        <input
          type="text"
          inputMode="none"
          readOnly
          value={value}
          aria-label={tx('Numerische Antwort', 'Đáp án dạng số')}
        />
        {unit && <span className="numeric-answer-unit">{unit}</span>}
      </div>

      <div className="numeric-keypad" aria-label={tx('Zahlentastatur', 'Bàn phím số')}>
        {['0','1','2','3','4','5','6','7','8','9'].map(key => (
          <button type="button" key={key} disabled={disabled} onClick={() => append(key)}>{key}</button>
        ))}
        <button type="button" disabled={disabled} onClick={() => append(',')}>,</button>
        <button type="button" disabled={disabled} onClick={backspace}>C</button>
        <button type="button" className="numeric-delete" disabled={disabled} onClick={clear}>
          {tx('Löschen', 'Xóa')}
        </button>
      </div>

      {reveal && !reveal.is_correct && (
        <div className="numeric-correct-answer">
          {tx('Richtige Antwort', 'Đáp án đúng')}: {meta.answer.answer_de}
        </div>
      )}
    </div>
  );
}

function ExamNavigator({ questions, currentIndex, answers, numericInputs, submitted, marked, markedReviewActive, markedReviewLast, hasMarkedQuestions, onJump, onContinue, onToggleMark, onEvaluate }: any) {
  const { tx } = useUi();
  const current = questions[currentIndex];
  const activeGroup = current?.group_type === 'zusatzstoff' ? 'zusatzstoff' : 'grundstoff';
  const groupItems = questions.map((q:any, globalIndex:number) => ({ q, globalIndex })).filter((item:any) => item.q.group_type === activeGroup);
  const firstIndex = (group:string) => questions.findIndex((q:any) => q.group_type === group);
  const isAnswered = (item:any) => (answers[item.q.id] || []).length > 0 || String(numericInputs[item.q.id] || '').trim().length > 0;
  const isVideo = (q:any) => String(q.question_type || '').toLowerCase() === 'video';
  const atLast = currentIndex >= questions.length - 1;
  const continueLabel = markedReviewActive
    ? (markedReviewLast ? tx('Auswertung', 'Nộp bài') : tx('Weiter', 'Tiếp'))
    : (atLast ? (hasMarkedQuestions ? tx('Weiter', 'Tiếp') : tx('Auswertung', 'Nộp bài')) : tx('Weiter', 'Tiếp'));
  return <div className="exam-reference-footer">
    <div className="exam-reference-toolbar exam-toolbar-v20">
      <div className="exam-group-tabs"><button type="button" className={activeGroup === 'grundstoff' ? 'active' : ''} onClick={() => onJump(firstIndex('grundstoff'))}>Grundstoff</button><button type="button" className={activeGroup === 'zusatzstoff' ? 'active' : ''} onClick={() => onJump(firstIndex('zusatzstoff'))}>B</button></div>
      <div className="exam-toolbar-actions"><button type="button" className={`exam-mark-button ${marked[current?.id] ? 'active' : ''}`} onClick={onToggleMark} title={tx('Unsicher markieren', 'Đánh dấu chưa chắc')}>★</button><button type="button" className="exam-evaluate-button" disabled={submitted} onClick={onEvaluate}>Auswertung</button><button type="button" className="exam-reference-continue" disabled={submitted} onClick={onContinue}>{continueLabel}</button></div>
    </div>
    <div className={`exam-number-grid ${activeGroup === 'grundstoff' ? 'grundstoff-grid' : 'b-grid'}`}>
      {groupItems.map((item:any, localIndex:number) => <button type="button" key={item.q.id} className={`exam-number-button ${item.globalIndex === currentIndex ? 'current' : ''} ${isAnswered(item) ? 'answered' : ''} ${marked[item.q.id] ? 'marked' : ''} ${isVideo(item.q) ? 'video-question' : ''}`} onClick={() => onJump(item.globalIndex)}>{isVideo(item.q) && <span className="video-corner">▶</span>}{marked[item.q.id] && <span className="mark-corner">★</span>}{localIndex + 1}</button>)}
    </div>
  </div>;
}

function Exam({ questions, qIndex, setQIndex, answers, setAnswers, numericInputs, setNumericInputs, showVi, setShowVi, examStart, setScreen, setResult }: any) {
  const { tx } = useUi();
  const q = questions[qIndex];
  const sel = answers[q?.id] || [];
  const [tick, setTick] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [markedReview, setMarkedReview] = useState<{ indices:number[]; pos:number } | null>(null);
  const numericMeta = getNumericAnswerMeta(q);
  const numericValue = q ? (numericInputs[q.id] || '') : '';
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!q) return null;
  const remain = Math.max(0, 1800 - Math.floor((tick - examStart) / 1000));
  const timeLabel = `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, '0')}`;
  const toggle = (id:number) => { const next = sel.includes(id) ? sel.filter((x:number) => x !== id) : [...sel, id]; setAnswers({ ...answers, [q.id]: next }); };
  const changeNumeric = (value:string) => { setNumericInputs({ ...numericInputs, [q.id]: value }); const correct = numericMeta && normalizeExamNumber(value) === numericMeta.expected; setAnswers({ ...answers, [q.id]: correct ? [numericMeta.answer.id] : [] }); };
  const jumpTo = (idx:number, keepMarkedReview = false) => {
    if (!keepMarkedReview) setMarkedReview(null);
    setQIndex(Math.max(0, Math.min(questions.length - 1, idx)));
  };
  const markedQuestionIndices = questions.map((question:any, index:number) => marked[question.id] ? index : -1).filter((index:number) => index >= 0);
  const markedReviewActive = !!(markedReview && Array.isArray(markedReview.indices) && markedReview.indices.length);
  const markedReviewLast = markedReviewActive && (markedReview as any).pos >= (markedReview as any).indices.length - 1;
  const hasMarkedQuestions = markedQuestionIndices.length > 0;
  const isAnswered = (question:any) => (answers[question.id] || []).length > 0 || String(numericInputs[question.id] || '').trim().length > 0;
  const unansweredCount = questions.filter((question:any) => !isAnswered(question)).length;
  function exitExam() { setMarkedReview(null); setShowExitConfirm(false); setAnswers({}); setNumericInputs({}); setQIndex(0); setShowVi(false); setScreen('examSetup'); }
  async function finish() {
    if (submitted) return;
    setShowSubmitConfirm(false); setSubmitted(true);
    const completeAnswers:Record<number, number[]> = {};
    questions.forEach((question:any) => { completeAnswers[question.id] = answers[question.id] || []; });
    sessionStorage.setItem('last_exam_question_ids', JSON.stringify(questions.map((question:any) => Number(question.id))));
    sessionStorage.setItem('last_exam_answers', JSON.stringify(completeAnswers));
    sessionStorage.setItem('last_exam_numeric_inputs', JSON.stringify(numericInputs || {}));
    sessionStorage.setItem('last_exam_marked', JSON.stringify(marked || {}));
    sessionStorage.removeItem('exam_review_mode');
    try { const d = await api('submit_exam.php', { method: 'POST', body: JSON.stringify({ answers: completeAnswers, duration_seconds: Math.floor((Date.now() - examStart) / 1000) }) }); setResult(d.result); }
    catch (e:any) { setSubmitted(false); alert(e.message || tx('Fehler beim Abgeben', 'Lỗi khi nộp bài')); }
  }
  function requestEvaluation() { if (submitted) return; if (unansweredCount > 0) setShowSubmitConfirm(true); else finish(); }
  function handleWeiterExam() {
    if (submitted) return;

    if (markedReviewActive && markedReview) {
      if (!markedReviewLast) {
        const nextPos = markedReview.pos + 1;
        const nextIndex = markedReview.indices[nextPos];
        setMarkedReview({ indices: markedReview.indices, pos: nextPos });
        setQIndex(Math.max(0, Math.min(questions.length - 1, nextIndex)));
        return;
      }
      // BUILD21: khi đã duyệt tới câu đánh dấu cuối cùng, nút Nộp bài phải nộp thật ngay.
      // Không đi lại qua requestEvaluation() để tránh WKWebView giữ state review/confirm và làm nút tưởng như không phản hồi.
      finish();
      return;
    }

    if (qIndex < questions.length - 1) {
      jumpTo(qIndex + 1);
      return;
    }

    // Ở câu cuối: chụp lại danh sách câu đang được đánh dấu ngay lúc bấm Weiter.
    // Không dựa vào state review cũ để tránh trường hợp iOS/WKWebView render chậm làm mất vòng xem lại.
    const reviewIndices = questions
      .map((question:any, index:number) => marked[question.id] ? index : -1)
      .filter((index:number) => index >= 0);

    if (reviewIndices.length > 0) {
      setMarkedReview({ indices: reviewIndices, pos: 0 });
      setQIndex(reviewIndices[0]);
      return;
    }

    requestEvaluation();
  }
  function toggleMarkCurrent() { setMarked(prev => ({ ...prev, [q.id]: !prev[q.id] })); }
  useEffect(() => { if (remain === 0 && !submitted) finish(); }, [remain, submitted]);
  return <>
    <Header title={q.question_code} onBack={() => setShowExitConfirm(true)} closeIcon showVi={showVi} setShowVi={setShowVi} />
    <main className={`question question-classic exam-reference-main page-scroll ${q.media_video_url || q.media_image_url ? 'has-media' : 'no-media'}`}><QuestionTopBar q={q} qIndex={qIndex} total={questions.length} showVi={showVi} onExplain={() => {}} timeLabel={timeLabel} /><Media q={q} /><QuestionPrompt q={q} showVi={showVi} hideIntro={!!numericMeta} /><div className="answers answers-classic">{numericMeta ? <NumericAnswerPad q={q} value={numericValue} onChange={changeNumeric} showVi={showVi} disabled={submitted} /> : q.answers.map((a:any) => <label key={a.id}><input type="checkbox" checked={sel.includes(a.id)} disabled={submitted} onChange={() => toggle(a.id)} /><span><b>{a.answer_de}</b>{showVi && <em>{a.answer_vi}</em>}</span></label>)}</div></main>
    <ExamNavigator questions={questions} currentIndex={qIndex} answers={answers} numericInputs={numericInputs} submitted={submitted} marked={marked} markedReviewActive={markedReviewActive} markedReviewLast={markedReviewLast} hasMarkedQuestions={hasMarkedQuestions} onJump={jumpTo} onContinue={handleWeiterExam} onToggleMark={toggleMarkCurrent} onEvaluate={requestEvaluation} />
    {showSubmitConfirm && <div className="confirm-overlay" role="dialog" aria-modal="true"><div className="confirm-box"><h3>{tx('Auswertung starten?', 'Chấm bài?')}</h3><p>{tx(`Sie haben noch ${unansweredCount} unbeantwortete Frage(n). Trotzdem auswerten?`, `Bạn còn ${unansweredCount} câu chưa làm. Vẫn chấm bài?`)}</p><div className="confirm-actions"><button type="button" className="secondary" onClick={() => setShowSubmitConfirm(false)}>{tx('Weiter machen', 'Làm tiếp')}</button><button type="button" className="danger-solid" onClick={finish}>Auswertung</button></div></div></div>}
    {showExitConfirm && <div className="confirm-overlay" role="dialog" aria-modal="true"><div className="confirm-box"><h3>{tx('Prüfung verlassen?', 'Thoát bài thi?')}</h3><p>{tx('Möchten Sie die Prüfung wirklich verlassen? Ihr aktueller Fortschritt wird nicht gespeichert.', 'Bạn có chắc muốn thoát bài thi? Kết quả hiện tại sẽ không được lưu.')}</p><div className="confirm-actions"><button type="button" className="secondary" onClick={() => setShowExitConfirm(false)}>{tx('Weiter machen', 'Ở lại làm bài')}</button><button type="button" className="danger-solid" onClick={exitExam}>{tx('Prüfung verlassen', 'Thoát bài thi')}</button></div></div></div>}
  </>;
}

function Result({ result, setScreen }: any) {
  const { tx } = useUi();
  if (!result) return null;
  const openReview = () => { sessionStorage.setItem('exam_review_mode', '1'); setScreen('wrong'); };
  return <><Header title={tx('Ergebnis', 'Kết quả')} onBack={() => setScreen('home')} /><main className="p center page-scroll"><h1 className={result.passed ? 'green' : 'red'}>{result.passed ? tx('BESTANDEN', 'ĐẠT') : tx('NICHT BESTANDEN', 'TRƯỢT')}</h1><div className="score"><b>{result.correct}</b><span>/ {result.total}</span></div><div className="grid small stats-mini-grid"><div>{tx('Richtig', 'Đúng')}<b>{result.correct}</b></div><div>{tx('Falsch', 'Sai')}<b className="red">{result.wrong}</b></div><div>{tx('Fehlerpunkte', 'Điểm lỗi')}<b>{result.wrong_points}</b></div><div>{tx('5-Punkte-Fehler', 'Câu 5đ sai')}<b>{result.wrong_five_count}</b></div></div><button type="button" className="primary" onClick={openReview}>{tx('Falsche Fragen prüfen', 'Kiểm tra & xem lại câu sai')}</button><button type="button" className="secondary" onClick={() => setScreen('examSetup')}>{tx('Erneut prüfen', 'Làm lại')}</button></main></>;
}

function QuestionList({ mode, setScreen, loadQuestions }: any) {
  const { uiLang, tx } = useUi();
  const [items, setItems] = useState<any[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const examReview = mode === 'wrong' && sessionStorage.getItem('exam_review_mode') === '1';
  useEffect(() => {
    if (mode !== 'wrong') sessionStorage.removeItem('exam_review_mode');
    api(`questions.php?mode=${mode}`).then(d => {
      let rows = Array.isArray(d.questions) ? d.questions : [];
      if (examReview) {
        try { const ids:number[] = JSON.parse(sessionStorage.getItem('last_exam_question_ids') || '[]').map(Number); const pos = new Map(ids.map((id:number, index:number) => [id, index])); rows = rows.filter((q:any) => pos.has(Number(q.id))).sort((a:any,b:any) => Number(pos.get(Number(a.id))) - Number(pos.get(Number(b.id)))); } catch {}
      }
      setItems(rows); setReviewIndex(0);
    });
  }, [mode, examReview]);
  if (examReview) {
    let selectedMap:Record<number, number[]> = {}; let numericMap:Record<number, string> = {};
    try { selectedMap = JSON.parse(sessionStorage.getItem('last_exam_answers') || '{}'); } catch {}
    try { numericMap = JSON.parse(sessionStorage.getItem('last_exam_numeric_inputs') || '{}'); } catch {}
    const q = items[reviewIndex];
    const leaveReview = () => { sessionStorage.removeItem('exam_review_mode'); setScreen('result'); };
    if (!q) return <><Header title={tx('Fehlerprüfung', 'Xem lại câu sai')} onBack={leaveReview} /><main className="p center page-scroll"><h2>{tx('Keine falschen Fragen', 'Không có câu sai')}</h2><button className="primary" onClick={leaveReview}>{tx('Zurück zum Ergebnis', 'Quay lại kết quả')}</button></main></>;
    const selected = (selectedMap[Number(q.id)] || selectedMap[q.id] || []).map(Number);
    const numericMeta = getNumericAnswerMeta(q); const numericValue = String(numericMap[Number(q.id)] || numericMap[q.id] || '');
    return <><Header title={q.question_code} onBack={leaveReview} /><main className={`question question-classic exam-review-main page-scroll ${q.media_video_url || q.media_image_url ? 'has-media' : 'no-media'}`}><QuestionTopBar q={q} qIndex={reviewIndex} total={items.length} showVi={uiLang === 'vi'} onExplain={() => {}} /><Media q={q} /><QuestionPrompt q={q} showVi={uiLang === 'vi'} hideIntro={!!numericMeta} />{numericMeta ? <div className="exam-review-numeric"><div><span>{tx('Ihre Antwort', 'Bạn đã trả lời')}</span><b>{numericValue || '—'} {numericMeta.unitDe || ''}</b></div><div className="correct"><span>{tx('Richtige Antwort', 'Đáp án đúng')}</span><b>{numericMeta.expected} {numericMeta.unitDe || ''}</b></div></div> : <div className="answers answers-classic exam-review-answers">{(q.answers || []).map((a:any) => { const isSelected = selected.includes(Number(a.id)); const isCorrect = Number(a.is_correct) === 1; const cls = isSelected && !isCorrect ? 'selected-wrong' : (!isSelected && isCorrect ? 'missed-correct' : (isSelected && isCorrect ? 'selected-correct' : '')); return <label key={a.id} className={cls}><span className="answer-result-rail"></span><input type="checkbox" checked={isSelected} readOnly disabled /><span className="answer-text"><b>{a.answer_de}</b>{uiLang === 'vi' && <em>{a.answer_vi}</em>}</span>{isCorrect && <span className="answer-correct-mark">✓</span>}</label>; })}</div>}<div className="result-bad result-inline">{tx('Falsch beantwortet', 'Câu trả lời sai')}</div>{(q.explanation_de || q.explanation_vi) && <div className="exam-review-explanation"><b>{tx('Erklärung', 'Giải thích')}</b><p>{uiLang === 'vi' ? (q.explanation_vi || q.explanation_de) : q.explanation_de}</p></div>}</main><div className="exam-review-footer"><button disabled={reviewIndex <= 0} onClick={() => setReviewIndex(i => Math.max(0, i - 1))}>‹ {tx('Zurück', 'Trước')}</button><b>{reviewIndex + 1}/{items.length}</b><button disabled={reviewIndex >= items.length - 1} onClick={() => setReviewIndex(i => Math.min(items.length - 1, i + 1))}>{tx('Weiter', 'Tiếp')} ›</button></div></>;
  }
  const title = mode === 'wrong' ? tx('Fehler', 'Câu sai') : tx('Markierte Fragen', 'Câu đánh dấu');
  return <><Header title={title} onBack={() => setScreen('home')} /><main className="p list-cards page-scroll">{items.map(q => <div className="qcard" key={q.id}><b>{q.question_code}</b><span>{q.points} {tx('Punkte', 'điểm')}</span><p>{uiLang === 'de' ? q.question_de : q.question_vi}</p></div>)}<button type="button" className="primary" onClick={() => loadQuestions(mode)}>{tx('Alle wiederholen', 'Ôn lại tất cả')}</button></main><BottomNav current={mode === 'wrong' ? 'wrong' : 'marked'} setScreen={setScreen} /></>;
}

function Stats({ setScreen }: any) {
  const { tx } = useUi();
  const [d, setD] = useState<any>({ stats: {}, exams: [] });
  useEffect(() => { api('stats.php').then(setD); }, []);
  const s = d.stats || {};
  return (
    <>
      <Header title={tx('Statistik', 'Thống kê')} onBack={() => setScreen('home')} />
      <main className="p page-scroll">
        <div className="grid small stats-mini-grid">
          <div>{tx('Gesamt', 'Tổng câu')}<b>{s.total || 0}</b></div>
          <div>{tx('Gelernt', 'Đã học')}<b>{s.done || 0}</b></div>
          <div>{tx('Richtig', 'Đúng')}<b>{s.correct || 0}</b></div>
          <div>{tx('Falsch', 'Sai')}<b className="red">{s.wrong || 0}</b></div>
        </div>
        <h3>{tx('Prüfungsverlauf', 'Lịch sử thi thử')}</h3>
        {(d.exams || []).map((e:any) => (
          <div className="qcard" key={e.id}><b>{e.passed ? tx('Bestanden', 'Đạt') : tx('Nicht bestanden', 'Trượt')} - {e.correct_count}/{e.total_questions}</b><p>{tx('Fehlerpunkte', 'Điểm lỗi')}: {e.wrong_points} · {e.created_at}</p></div>
        ))}
      </main>
      <BottomNav current="stats" setScreen={setScreen} />
    </>
  );
}

function Account({ user, setScreen, onDeleted }: any) {
  const { uiLang, setUiLang, tx } = useUi();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function deleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api('delete_account.php', {
        method: 'POST',
        body: JSON.stringify({ confirm: 'DELETE' })
      });
      localStorage.removeItem('token');
      localStorage.removeItem('device_id');
      sessionStorage.clear();
      setShowDeleteConfirm(false);
      onDeleted?.();
    } catch (e:any) {
      setDeleteError(e?.message || tx('Das Konto konnte nicht gelöscht werden.', 'Không thể xóa tài khoản.'));
    } finally {
      setDeleting(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    setScreen('login');
  }

  return (
    <>
      <Header title={tx('Konto', 'Tài khoản')} onBack={() => setScreen('home')} />
      <main className="p account page-scroll">
        <div className="avatar">VD</div>
        <h2>{user?.name || tx('Schüler', 'Học viên')}</h2>
        <p>{[user?.phone, user?.email].filter(Boolean).join(' · ')}</p>

        <div className="setting-card">
          <b>{tx('App-Sprache', 'Ngôn ngữ ứng dụng')}</b>
          <div className="segmented">
            <button type="button" className={uiLang === 'de' ? 'active' : ''} onClick={() => setUiLang('de')}>Deutsch</button>
            <button type="button" className={uiLang === 'vi' ? 'active' : ''} onClick={() => setUiLang('vi')}>Tiếng Việt</button>
          </div>
          <small>{tx('Die Fragen bleiben Deutsch. Im Fragenbildschirm kann die vietnamesische Übersetzung zusätzlich angezeigt werden.', 'Bộ câu hỏi vẫn giữ tiếng Đức. Trong màn làm câu hỏi có thể bấm DE/VN để hiện thêm bản dịch tiếng Việt.')}</small>
        </div>

        <div className="list">
          <button type="button" className="list-btn"><span>{tx('Kurs & Laufzeit', 'Gói học & thời hạn')}</span><span>{user?.expires_at || '—'}</span></button>
          <button type="button" className="list-btn"><span>{tx('Verwendetes Gerät', 'Thiết bị đang sử dụng')}</span><span>{user?.device_label || '—'}</span></button>
          <button type="button" className="list-btn" onClick={() => setScreen('stats')}><span>{tx('Prüfungsverlauf', 'Lịch sử thi thử')}</span><span>›</span></button>
          <button type="button" className="list-btn" onClick={() => setScreen('marked')}><span>{tx('Gelernt & markiert', 'Câu đã học & đánh dấu')}</span><span>›</span></button>
        </div>

        <section className="account-legal-card" aria-label={tx('Rechtliches und Support', 'Pháp lý và hỗ trợ')}>
          <h3>{tx('Datenschutz & Support', 'Quyền riêng tư & hỗ trợ')}</h3>
          <button type="button" onClick={() => openExternal(PRIVACY_URL)}>
            <span>{tx('Datenschutzerklärung', 'Chính sách quyền riêng tư')}</span><span>↗</span>
          </button>
          <button type="button" onClick={() => openExternal(SUPPORT_URL)}>
            <span>{tx('Support kontaktieren', 'Liên hệ hỗ trợ')}</span><span>↗</span>
          </button>
          <small>{tx('Die App enthält keine Werbung und verwendet keine Daten für Tracking.', 'Ứng dụng không có quảng cáo và không sử dụng dữ liệu để theo dõi người dùng.')}</small>
        </section>

        <button type="button" className="danger account-logout" onClick={logout}>{tx('Abmelden', 'Đăng xuất')}</button>
        <button type="button" className="delete-account-button" onClick={() => { setDeleteError(''); setShowDeleteConfirm(true); }}>
          {tx('Konto dauerhaft löschen', 'Xóa tài khoản vĩnh viễn')}
        </button>
      </main>
      <BottomNav current="account" setScreen={setScreen} />

      {showDeleteConfirm && (
        <div className="account-delete-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="account-delete-dialog">
            <h2 id="delete-account-title">{tx('Konto löschen?', 'Xóa tài khoản?')}</h2>
            <p>{tx(
              'Das Konto, der Lernfortschritt, markierte Fragen und Prüfungsverläufe werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
              'Tài khoản, tiến độ học, câu đã đánh dấu và lịch sử thi sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.'
            )}</p>
            {deleteError && <div className="error">{deleteError}</div>}
            <div className="account-delete-actions">
              <button type="button" className="secondary" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>
                {tx('Abbrechen', 'Hủy')}
              </button>
              <button type="button" className="confirm-delete" disabled={deleting} onClick={deleteAccount}>
                {deleting ? tx('Wird gelöscht…', 'Đang xóa…') : tx('Endgültig löschen', 'Xóa vĩnh viễn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
