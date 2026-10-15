// Ported from supplied production ai-assistant-v1.js (3.1.0).
(function(){
  'use strict';

  const ROOT_ID='ai-assistant-root';
  const CARD_ID='ai-assistant-home-card';
  const SPEED_CARD_ID='speed-room-home-card';
  const MAX_REQUEST_MS=35000;
  const QUESTION_LOOKUP_MS=12000;

  const state={
    config:null,configAt:0,opened:false,opening:false,ownerToken:'',
    activeRequest:null,clearRequest:null,clearing:false,data:null,sending:false,
    disabledForToken:'',cardCheckPromise:null,
    questionIndex:null,questionIndexPromise:null,questionIndexOwner:'',
    lastQuestionContext:null
  };

  const token=()=>localStorage.getItem('token')||'';
  const lang=()=>localStorage.getItem('ui_lang')==='vi'?'vi':'de';
  const tx=(de,vi)=>lang()==='vi'?vi:de;
  const esc=(v)=>String(v==null?'':v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function timeoutError(){
    return Object.assign(new Error(tx(
      'Die KI antwortet zu langsam. Bitte versuche es erneut.',
      'AI phản hồi quá lâu. Bạn thử gửi lại nhé.'
    )),{code:'AI_CLIENT_TIMEOUT'});
  }
  function invalidResponseError(){
    return Object.assign(new Error(tx(
      'Die KI-Antwort ist ungültig. Bitte versuche es erneut.',
      'Máy chủ AI trả về dữ liệu không hợp lệ. Bạn thử lại nhé.'
    )),{code:'AI_INVALID_RESPONSE'});
  }

  const api=(path,options,timeoutMs=MAX_REQUEST_MS)=>window.FuehrerscheinFeatures.api(path,options,timeoutMs);
  async function config(force){
    try {
      const value=await window.FuehrerscheinFeatures.config(force);
      state.config=value;state.configAt=Date.now();return value;
    } catch (_) {return null;}
  }

  function grid(){
    const g=document.querySelector('.cards-grid');
    return g&&g.closest('.app-shell')?g:null;
  }

  function ensureCard(){
    if(state.cardCheckPromise) return state.cardCheckPromise;
    state.cardCheckPromise=(async()=>{
      const g=grid();const existing=document.getElementById(CARD_ID);const t=token();
      if(state.opened&&state.ownerToken!==t) closeAssistant();
      if(!g||!t){
        if(existing) existing.remove();
        state.disabledForToken='';state.config=null;
        return;
      }
      if(existing){placeBesideSpeed(existing);return;}

      const cfg=await config(false);
      if(!cfg||t!==token()||!g.isConnected) return;
      if(!cfg.ai_enabled)return;
      const existingAfter=document.getElementById(CARD_ID);
      if(existingAfter){placeBesideSpeed(existingAfter);return;}
      const b=document.createElement('button');
      b.type='button';b.id=CARD_ID;b.className='home-card ai-assistant-home-card';
      b.innerHTML='<span class="ai-home-icon">🤖</span><b>'+esc(tx('KI-Lernassistent','Trợ lý AI'))+'</b><small>'+esc(tx('Persönliche Lernanalyse','Phân tích học tập cá nhân'))+'</small>';
      b.addEventListener('click',openAssistant);
      g.appendChild(b);placeBesideSpeed(b);
    })().finally(()=>{state.cardCheckPromise=null;});
    return state.cardCheckPromise;
  }

  function placeBesideSpeed(card){
    const speed=document.getElementById(SPEED_CARD_ID);
    if(speed&&speed.parentElement===card.parentElement&&speed.nextSibling!==card){
      speed.parentElement.insertBefore(card,speed.nextSibling);
    }
  }

  function host(){return document.querySelector('.app-shell')||document.body;}

  // -------------------- Safe rich-text renderer --------------------
  // Gemini sometimes returns escaped markdown (\*\*, \#, ...). Normalize only
  // known markdown escapes, escape HTML first, then render a small safe subset.
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

  function sourceBadge(source){
    if(source==='local-fast') return '<div class="ai-source-badge">⚡ '+esc(tx('Schnellantwort · kein KI-Kontingent','Phản hồi nhanh · không tính lượt AI'))+'</div>';
    if(source==='question-db') return '<div class="ai-source-badge">✓ '+esc(tx('Aus gespeicherten Fragedaten · kein KI-Kontingent','Từ dữ liệu câu hỏi đã lưu · không tính lượt AI'))+'</div>';
    if(source==='profile-fast') return '<div class="ai-source-badge">⚡ '+esc(tx('Schnellanalyse aus deinen Lerndaten','Phân tích nhanh từ dữ liệu học tập'))+'</div>';
    return '';
  }

  function renderMessage(m){
    const who=m.role==='assistant'?tx('AI','AI'):tx('Du','Bạn');
    const cls=m.role==='assistant'?'assistant':'user';
    const body=m.role==='assistant'?renderMarkdown(m.content):esc(m.content).replace(/\n/g,'<br>');
    return '<div class="ai-msg '+cls+'"><div class="ai-msg-who">'+esc(who)+'</div><div class="ai-msg-bubble">'+body+'</div>'+sourceBadge(m.source)+'</div>';
  }

  function quotaText(d){
    const u=d.usage||{};
    return `${u.used||0}/${u.limit||0} ${tx('Fragen heute','câu hôm nay')}`;
  }
  function planText(d){return d.plan==='premium'?tx('AI Premium','AI nâng cao'):tx('AI Free','AI miễn phí');}

  function quickPrompts(){
    const items=lang()==='vi'?
      [
        '3 chủ đề tôi yếu nhất là gì?',
        '5 câu 5 điểm tôi hay sai nhất?',
        'Phân tích 5 bài thi thử gần nhất của tôi',
        'Tôi chỉ có 10 phút, hôm nay nên ôn gì?'
      ]:
      [
        'Welche 3 Themen sind aktuell meine schwächsten?',
        'Welche 5-Punkte-Fragen mache ich am häufigsten falsch?',
        'Analysiere meine letzten 5 Probeprüfungen',
        'Ich habe nur 10 Minuten – was soll ich heute lernen?'
      ];
    return items.map(x=>'<button type="button" class="ai-quick" data-prompt="'+esc(x)+'">'+esc(x)+'</button>').join('');
  }

  function template(d){
    return `<div class="ai-shell">
      <header class="ai-header"><button type="button" class="ai-back">‹</button><div><b>${esc(tx('KI-Lernassistent','Trợ lý AI'))}</b><small>${esc(planText(d))} • ${esc(quotaText(d))}</small></div><span class="ai-status">AI</span></header>
      <main class="ai-main">
        <section class="ai-summary">
          <div><b>${esc(planText(d))}</b><small>${esc(d.plan==='premium'&&d.premium_until?tx('bis ','đến ')+d.premium_until:tx('Tageslimit','hạn mức ngày'))}</small></div>
          <div><b>${esc(String((d.usage||{}).remaining||0))}</b><small>${esc(tx('verbleibend','còn lại hôm nay'))}</small></div>
          <div><b>${esc(String(d.context_messages||0))}</b><small>${esc(tx('Kontext-Nachrichten','tin nhớ gần nhất'))}</small></div>
        </section>
        <section class="ai-note">${esc(tx(
          'Die KI nutzt deine echten Lerndaten. Bei konkreten Fragecodes wird zuerst die gespeicherte Erklärung verwendet.',
          'AI dùng dữ liệu học thật của bạn. Khi hỏi một mã câu cụ thể, hệ thống ưu tiên lời giải đã lưu để tránh trả lời sai.'
        ))}</section>
        <div class="ai-quick-list">${quickPrompts()}</div>
        <section class="ai-chat"><div class="ai-messages">${(d.messages||[]).map(renderMessage).join('')||'<div class="ai-empty">'+esc(tx('Frag mich z. B. wo du aktuell schwach bist.','Bạn có thể hỏi: “Tôi đang yếu phần nào?”'))+'</div>'}</div>
          <div class="ai-error" role="alert"></div>
          <form class="ai-form"><textarea class="ai-input" rows="2" maxlength="${Number(d.max_input_chars||1000)}" placeholder="${esc(tx('Frage an den Lernassistenten...','Hỏi Trợ lý AI...'))}"></textarea><button class="ai-send" type="submit" aria-label="${esc(tx('Senden','Gửi'))}">➤</button></form>
          <div class="ai-bottom"><span class="ai-quota">${esc(quotaText(d))}</span><button type="button" class="ai-clear">${esc(tx('Chat löschen','Xóa lịch sử chat'))}</button></div>
        </section>
      </main>
    </div>`;
  }

  async function openAssistant(){
    if(state.opening||document.getElementById(ROOT_ID)) return;
    state.opening=true;
    const owner=token();
    try{
      const cfg=await config(true);
      if(owner!==token()) return;
      if(!cfg){alert(tx('Verbindung fehlgeschlagen. Bitte versuche es erneut.','Chưa kết nối được máy chủ. Bạn thử lại nhé.'));return;}
      if(!cfg.ai_enabled){alert(tx('Der KI-Assistent ist deaktiviert.','Trợ lý AI hiện đang tắt.'));return;}
      const d=await api('ai_state.php');
      if(owner!==token()||document.getElementById(ROOT_ID)) return;
      if(!d.enabled){alert(tx('Der KI-Assistent ist deaktiviert.','Trợ lý AI hiện đang tắt.'));return;}
      state.data=d;state.ownerToken=owner;state.lastQuestionContext=null;
      if(state.questionIndexOwner&&state.questionIndexOwner!==owner){
        state.questionIndex=null;state.questionIndexPromise=null;state.questionIndexOwner='';
      }
      const root=document.createElement('div');
      root.id=ROOT_ID;root.className='ai-assistant-root';root.innerHTML=template(d);
      host().appendChild(root);state.opened=true;bind(root);scrollBottom(root);
    }catch(e){if(e.name!=='AbortError')alert(e.message);}
    finally{state.opening=false;}
  }

  function bind(root){
    root.querySelector('.ai-back')?.addEventListener('click',closeAssistant);
    root.querySelectorAll('.ai-quick').forEach(b=>b.addEventListener('click',()=>{
      const i=root.querySelector('.ai-input');
      i.value=b.dataset.prompt||'';i.focus();
    }));
    root.querySelector('.ai-form')?.addEventListener('submit',async e=>{e.preventDefault();await send(root);});
    root.querySelector('.ai-input')?.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();root.querySelector('.ai-form')?.requestSubmit();}
    });
    root.querySelector('.ai-clear')?.addEventListener('click',async()=>{
      if(state.sending||state.clearing) return;
      if(!confirm(tx('Chatverlauf wirklich löschen?','Xóa toàn bộ lịch sử Chat AI của bạn?'))) return;
      const request={controller:new AbortController(),owner:token()};
      state.clearRequest=request;state.clearing=true;
      const sendBtn=root.querySelector('.ai-send'),clearBtn=root.querySelector('.ai-clear');
      sendBtn.disabled=true;clearBtn.disabled=true;
      const ownsView=()=>state.clearRequest===request&&root.isConnected&&request.owner===token();
      try{
        await api('ai_clear_chat.php',{method:'POST',body:'{}',signal:request.controller.signal});
        if(!ownsView()) return;
        state.data.messages=[];state.lastQuestionContext=null;
        root.querySelector('.ai-messages').innerHTML='<div class="ai-empty">'+esc(tx('Chat gelöscht.','Đã xóa lịch sử chat.'))+'</div>';
      }catch(e){if(ownsView())showError(root,e.message);}
      finally{
        if(state.clearRequest===request){
          state.clearRequest=null;state.clearing=false;sendBtn.disabled=false;clearBtn.disabled=false;
        }
      }
    });
  }

  // -------------------- Fast local intents --------------------
  function foldText(value){
    return String(value||'').toLocaleLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d')
      .replace(/[^a-z0-9äöüß]+/g,' ')
      .trim().replace(/\s+/g,' ');
  }

  function localFastReply(value){
    const v=foldText(value);
    const greetings=new Set(['hello','hi','hey','hallo','xin chao','chao','chao ban','alo','guten tag','guten morgen','guten abend']);
    const thanks=new Set(['cam on','cam on ban','thanks','thank you','danke','danke dir','danke schon']);
    const okays=new Set(['ok','okay','oki','okie','duoc','duoc roi','ro roi','vang','dong y','hieu roi']);
    const byes=new Set(['bye','goodbye','tam biet','hen gap lai','tschuss','tschues','auf wiedersehen']);

    if(greetings.has(v)||/^chao buoi (sang|chieu|toi)$/.test(v)){
      let vi='Chào bạn 👋 Mình là Trợ lý AI của Führerschein Viet-Duc. Bạn có thể hỏi về câu lý thuyết, chủ đề đang yếu, đề thi thử hoặc Phòng luyện tốc.';
      if(v==='chao buoi sang') vi='Chào buổi sáng 👋 Bạn muốn xem câu sai, chủ đề yếu hay ôn câu nào trước hôm nay?';
      if(v==='chao buoi chieu') vi='Chào buổi chiều 👋 Bạn muốn xem câu sai, chủ đề yếu hay ôn câu nào trước hôm nay?';
      if(v==='chao buoi toi') vi='Chào buổi tối 👋 Bạn muốn xem câu sai, chủ đề yếu hay ôn câu nào trước hôm nay?';
      return tx('Hallo 👋 Ich bin dein Lernassistent. Frag mich zu Theoriefragen, deinen Schwachstellen, Probeprüfungen oder dem Speed-Raum.',vi);
    }
    if(thanks.has(v)) return tx('Gern 😊 Was möchtest du als Nächstes üben?','Không có gì 😊 Bạn muốn ôn phần nào tiếp theo?');
    if(okays.has(v)) return tx('Alles klar. Stell einfach die nächste Frage.','Được nhé. Bạn cứ hỏi câu tiếp theo.');
    if(byes.has(v)) return tx('Bis bald 👋 Viel Erfolg beim Lernen!','Hẹn gặp lại 👋 Chúc bạn ôn tập hiệu quả!');
    return '';
  }

  function extractQuestionCode(value){
    const m=String(value||'').match(/\b\d+\.\d+\.\d+-\d+(?:-M)?\b/i);
    return m?m[0].toUpperCase():'';
  }

  function isQuestionFollowup(value){
    if(!state.lastQuestionContext||extractQuestionCode(value)) return false;
    const v=foldText(value);
    if(!v||v.length>260) return false;
    const patterns=[
      'tai sao','vi sao','dap an con lai','2 dap an','hai dap an','dap an sai','dap an dung',
      'he thong bi sai','he thong sai','co phai dap an','giai thich them','con lai sai',
      'warum','andere antwort','falsch','richtig','stimmt die antwort'
    ];
    return patterns.some(x=>v.includes(x));
  }

  async function loadQuestionIndex(signal,timeoutMs=QUESTION_LOOKUP_MS){
    const owner=token();
    if(state.questionIndex&&state.questionIndexOwner===owner) return state.questionIndex;
    if(state.questionIndexPromise&&state.questionIndexOwner===owner) return state.questionIndexPromise;
    state.questionIndexOwner=owner;
    state.questionIndexPromise=(async()=>{
      const d=await api('questions.php?mode=all',{signal},timeoutMs);
      const rows=Array.isArray(d.questions)?d.questions:[];
      const map=new Map();
      rows.forEach(q=>{
        const code=String(q?.question_code||'').toUpperCase();
        if(code) map.set(code,q);
      });
      if(owner===token()) state.questionIndex=map;
      return map;
    })().finally(()=>{state.questionIndexPromise=null;});
    return state.questionIndexPromise;
  }

  async function loadSavedExplanation(q,signal){
    if(!q||q.id==null||!q.question_code) return null;
    const path='ai_explanation.php?mode=question&question_id='+encodeURIComponent(q.id)+'&question_code='+encodeURIComponent(q.question_code);
    const d=await api(path,{signal},QUESTION_LOOKUP_MS);
    if(!d||d.available!==true||typeof d.detailed_explanation_vi!=='string'||!d.detailed_explanation_vi.trim()) return null;
    return d.detailed_explanation_vi.trim();
  }

  function answerIsCorrect(a){
    const v=a?.is_correct??a?.answer_is_correct??a?.correct;
    return v===true||v===1||v==='1'||String(v).toLowerCase()==='true';
  }

  function questionFacts(q){
    const answers=Array.isArray(q?.answers)?q.answers:[];
    return {
      code:String(q?.question_code||''),
      points:Number(q?.points||0),
      type:String(q?.question_type||''),
      topicCode:String(q?.topic_code||''),
      topicDe:String(q?.topic_name_de||''),
      topicVi:String(q?.topic_name_vi||''),
      questionDe:String(q?.question_de||''),
      questionVi:String(q?.question_vi||''),
      answers:answers.map(a=>({
        de:String(a?.answer_de||''),vi:String(a?.answer_vi||''),correct:answerIsCorrect(a)
      }))
    };
  }

  function buildQuestionReply(q,explanation){
    const f=questionFacts(q);
    const question=lang()==='vi'?(f.questionVi||f.questionDe):(f.questionDe||f.questionVi);
    const meta=[];
    if(f.points) meta.push(f.points+' '+tx('Punkte','điểm'));
    if(f.type) meta.push(f.type);
    if(f.topicCode) meta.push((f.topicVi||f.topicDe)?f.topicCode+' · '+(lang()==='vi'?(f.topicVi||f.topicDe):(f.topicDe||f.topicVi)):f.topicCode);
    const head='### '+tx('Frage ','Câu ')+f.code;
    const qLine=question?'**'+tx('Frage','Nội dung')+':** '+question:'';
    const metaLine=meta.length?'`'+meta.join(' · ')+'`':'';
    return [head,metaLine,qLine,explanation].filter(Boolean).join('\n\n');
  }

  function extractWrongSections(explanation){
    const text=normalizeAiText(explanation);
    const lines=text.split('\n');
    const chunks=[];
    let current=[];let inWrong=false;
    const flush=()=>{if(current.length){chunks.push(current.join('\n').trim());current=[];}};
    for(const line of lines){
      if(/^KHÔNG CHỌN\s*[—-]/i.test(line)){
        flush();inWrong=true;current=[line];continue;
      }
      if(/^(CHỌN|HIỂU ĐÚNG|ĐỌC HÌNH|DIỄN BIẾN|PHÂN TÍCH|ĐIỂM DỄ NHẦM|GHI NHỚ)\b/i.test(line)){
        if(inWrong) flush();
        inWrong=false;continue;
      }
      if(inWrong) current.push(line);
    }
    if(inWrong) flush();
    return chunks.filter(Boolean);
  }

  function buildQuestionFollowup(value,ctx){
    const v=foldText(value);
    const f=questionFacts(ctx.question);
    const correct=f.answers.filter(a=>a.correct);
    const wrong=f.answers.filter(a=>!a.correct);
    const wrongSections=extractWrongSections(ctx.explanation);

    if(v.includes('he thong')&&v.includes('sai')||v.includes('co phai dap an')||v.includes('stimmt die antwort')){
      const correctText=correct.map(a=>a.de+(a.vi?' — '+a.vi:'')).join('; ');
      const intro=tx(
        'Nach den aktuell in der App gespeicherten Antwortmarkierungen ist die Standardlösung:',
        'Theo cờ đáp án chuẩn đang lưu trong ứng dụng, đáp án đúng hiện tại là:'
      );
      const caution=tx(
        'Ich behaupte dabei nicht, dass TÜV/DEKRA die Antwort hier direkt bestätigt hat. Falls das tatsächlich abgespielte Bild/Video nicht zur gespeicherten Erklärung passt, sollte die Frage als Daten-/Medienfehler geprüft werden, statt die Lösung zu erraten.',
        'Mình không khẳng định đây là xác nhận trực tiếp từ TÜV/DEKRA. Nếu hình/video thực tế bạn đang xem không khớp lời giải đã lưu, nên coi đó là lỗi dữ liệu/media cần kiểm tra thay vì tự suy đoán đáp án.'
      );
      return [intro,'**'+correctText+'**',wrongSections.join('\n\n'),caution].filter(Boolean).join('\n\n');
    }

    if((v.includes('dap an con lai')||v.includes('2 dap an')||v.includes('hai dap an')||v.includes('con lai sai')||v.includes('andere antwort'))&&wrongSections.length){
      return [tx(
        'Hai đáp án còn lại sai vì:',
        'Hai đáp án còn lại sai vì:'
      ),wrongSections.join('\n\n')].join('\n\n');
    }

    // If the user names a specific option, prefer the matching saved section.
    const named=[...wrong,...correct].find(a=>{
      const de=foldText(a.de),vi=foldText(a.vi);
      return (de&&v.includes(de))||(vi&&v.includes(vi));
    });
    if(named){
      const section=wrongSections.find(s=>foldText(s).includes(foldText(named.de))||foldText(s).includes(foldText(named.vi)));
      if(section) return section;
      return (named.correct?tx('Đây là đáp án đúng theo dữ liệu chuẩn của câu.','Đây là đáp án đúng theo dữ liệu chuẩn của câu.'):
        tx('Đây là đáp án không được chọn theo dữ liệu chuẩn của câu.','Đây là đáp án không được chọn theo dữ liệu chuẩn của câu.'))+'\n\n'+ctx.explanation;
    }

    if(v.includes('tai sao')||v.includes('vi sao')||v.includes('warum')||v.includes('giai thich them')){
      return ctx.explanation;
    }
    return '';
  }

  async function tryGroundedQuestionReply(value,signal){
    const code=extractQuestionCode(value);
    if(code){
      try{
        const map=await loadQuestionIndex(signal);
        const q=map.get(code);
        if(!q) return null;
        const explanation=await loadSavedExplanation(q,signal);
        if(!explanation) return null;
        state.lastQuestionContext={question:q,explanation};
        return {content:buildQuestionReply(q,explanation),source:'question-db'};
      }catch(e){
        if(e.name==='AbortError') throw e;
        // Optional local grounding failure must not block normal AI chat.
        return null;
      }
    }
    if(isQuestionFollowup(value)){
      const content=buildQuestionFollowup(value,state.lastQuestionContext);
      if(content) return {content,source:'question-db'};
    }
    return null;
  }

  function isFivePointPrompt(value){
    const v=foldText(value);
    return /(^| )5( |-)diem( |$)/.test(v)||v.includes('5 punkte')||v.includes('funf punkte');
  }

  async function validateFivePointMentions(prompt,answer,signal){
    if(!isFivePointPrompt(prompt)) return {answer,warnings:[]};
    const codes=Array.from(new Set((String(answer).match(/\b\d+\.\d+\.\d+-\d+(?:-M)?\b/gi)||[]).map(x=>x.toUpperCase())));
    if(!codes.length) return {answer,warnings:[]};
    try{
      const map=await loadQuestionIndex(signal,2000);
      const invalid=codes.map(code=>({code,q:map.get(code)})).filter(x=>x.q&&Number(x.q.points||0)!==5);
      if(!invalid.length) return {answer,warnings:[]};
      let fixed=normalizeAiText(answer);
      const invalidCodes=invalid.map(x=>x.code);
      fixed=fixed.split('\n').filter(line=>!invalidCodes.some(code=>line.toUpperCase().includes(code))).join('\n')
        .replace(/\n{3,}/g,'\n\n').trim();
      const details=invalid.map(x=>x.code+' = '+Number(x.q.points||0)+' '+tx('Punkte','điểm')).join(', ');
      const warning=tx(
        'Datenprüfung: '+details+'. Diese Codes wurden aus der 5-Punkte-Liste entfernt. Die Punktzahl wird aus dem Feld `points` gelesen, nicht aus „-M“ oder dem Fragetyp abgeleitet.',
        'Kiểm tra dữ liệu: '+details+'. Các mã này đã được loại khỏi danh sách 5 điểm. Điểm phải lấy trực tiếp từ trường `points`, không suy từ hậu tố `-M` hay dạng video.'
      );
      return {answer:fixed,warnings:[warning]};
    }catch(e){
      if(e.name==='AbortError') throw e;
      const safe=normalizeAiText(answer).split('\n').filter(line=>!codes.some(code=>line.toUpperCase().includes(code))).join('\n').trim();
      return {answer:safe,warnings:[tx(
        'Die Antwort wurde empfangen. Die Fragecodes konnten noch nicht anhand von points geprüft werden und werden deshalb nicht als 5-Punkte-Fragen angezeigt. Es wurde keine weitere KI-Anfrage gesendet.',
        'Đã nhận phản hồi. Chưa đủ dữ liệu đối chiếu trường points, nên các mã chưa xác minh được ẩn khỏi danh sách 5 điểm. Ứng dụng không gửi thêm lượt hỏi AI.'
      )]};
    }
  }

  function createTyping(root,label){
    const typing=document.createElement('div');
    typing.className='ai-msg assistant ai-typing';
    typing.innerHTML='<div class="ai-msg-who">AI</div><div class="ai-msg-bubble" role="status" aria-live="polite"><div class="ai-typing-dots" aria-hidden="true"><span>●</span><span>●</span><span>●</span></div><div class="ai-typing-label">'+esc(label||tx('Wird analysiert...','Đang phân tích...'))+'</div></div>';
    root.querySelector('.ai-messages').appendChild(typing);scrollBottom(root);
    return typing;
  }

  async function send(root){
    if(state.sending||state.clearing||!root.isConnected) return;
    const input=root.querySelector('.ai-input');
    const value=(input.value||'').trim();
    if(!value) return;

    const fast=localFastReply(value);
    if(fast){
      showError(root,'');
      appendMessage(root,{role:'user',content:value});input.value='';
      appendMessage(root,{role:'assistant',content:fast,source:'local-fast'});
      return;
    }

    const request={controller:new AbortController(),owner:token(),root,timedOut:false};
    const deadline=setTimeout(()=>{request.timedOut=true;request.controller.abort();},MAX_REQUEST_MS);
    const ownsView=()=>state.activeRequest===request&&root.isConnected&&request.owner===token();
    state.activeRequest=request;state.sending=true;
    const sendBtn=root.querySelector('.ai-send');const clearBtn=root.querySelector('.ai-clear');
    sendBtn.disabled=true;if(clearBtn)clearBtn.disabled=true;showError(root,'');
    const outgoing=appendMessage(root,{role:'user',content:value});input.value='';

    let typing=createTyping(root,extractQuestionCode(value)||isQuestionFollowup(value)?
      tx('Gespeicherte Fragendaten werden geprüft...','Đang lấy dữ liệu câu hỏi đã lưu...'):
      tx('Wird analysiert...','Đang phân tích...'));

    let delayed=null,slow=null;
    try{
      const grounded=await tryGroundedQuestionReply(value,request.controller.signal);
      if(!ownsView()) return;
      if(grounded){
        typing.remove();typing=null;
        appendMessage(root,{role:'assistant',content:grounded.content,source:grounded.source});
        return;
      }

      if(typing?.isConnected){
        const label=typing.querySelector('.ai-typing-label');
        if(label) label.textContent=tx('Wird analysiert...','Đang phân tích dữ liệu học...');
      }
      delayed=setTimeout(()=>{
        if(ownsView()&&typing?.isConnected){
          const label=typing.querySelector('.ai-typing-label');
          if(label) label.textContent=tx('KI-Verbindung wird hergestellt, bitte warten...','Đang kết nối AI, vui lòng chờ...');
        }
      },6500);
      slow=setTimeout(()=>{
        if(ownsView()&&typing?.isConnected){
          const label=typing.querySelector('.ai-typing-label');
          if(label) label.textContent=tx('Die Antwort dauert etwas länger. Die Anfrage läuft weiter...','Phản hồi hơi chậm, hệ thống vẫn đang xử lý...');
        }
      },15000);

      const configured=Number(state.data?.client_timeout_seconds);
      const timeoutMs=Number.isFinite(configured)?Math.max(30,Math.min(35,configured))*1000:MAX_REQUEST_MS;
      const d=await api('ai_chat.php',{method:'POST',body:JSON.stringify({message:value}),signal:request.controller.signal},timeoutMs);
      if(!ownsView()) return;
      if(typeof d.answer!=='string'||!d.answer.trim()) throw invalidResponseError();

      // The server has accepted and saved this exchange. Optional GET validation must never offer a second charged POST.
      clearTimeout(deadline);
      if(d.usage){state.data.usage=d.usage;refreshQuota(root);}
      let finalAnswer=d.answer;
      if(!d.fast_path){
        const checked=await validateFivePointMentions(value,d.answer,request.controller.signal);
        if(!ownsView()) return;
        finalAnswer=checked.answer;
        if(checked.warnings.length){
          finalAnswer='> '+checked.warnings.join('\n\n> ')+'\n\n'+finalAnswer;
        }
      }
      let source='';
      if(d.fast_path){
        source=d.fast_path_kind==='social'?'local-fast':(d.fast_path_kind==='question_explanation'?'question-db':'profile-fast');
      }
      appendMessage(root,{role:'assistant',content:finalAnswer,source});
      if(d.usage){state.data.usage=d.usage;refreshQuota(root);}
    }catch(e){
      if(!ownsView()) return;
      if(e.name==='AbortError'&&!request.timedOut) return;
      showError(root,request.timedOut?timeoutError().message:e.message||tx('KI ist beschäftigt. Bitte später erneut versuchen.','AI đang bận, vui lòng thử lại sau.'),value);
      if(!input.value) input.value=value;
      if(outgoing){
        const note=document.createElement('small');note.className='ai-delivery-note';
        note.textContent=tx('Keine Antwort empfangen','Chưa nhận được phản hồi');outgoing.appendChild(note);
      }
    }finally{
      clearTimeout(deadline);
      if(delayed)clearTimeout(delayed);if(slow)clearTimeout(slow);
      if(typing)typing.remove();
      if(state.activeRequest===request){
        state.activeRequest=null;state.sending=false;
        sendBtn.disabled=false;if(clearBtn)clearBtn.disabled=false;
        if(root.isConnected)scrollBottom(root);
      }
    }
  }

  function appendMessage(root,m){
    const list=root.querySelector('.ai-messages');
    list.querySelector('.ai-empty')?.remove();
    const wrap=document.createElement('div');wrap.innerHTML=renderMessage(m);
    const node=wrap.firstElementChild;list.appendChild(node);scrollBottom(root);return node;
  }

  function refreshQuota(root){
    const q=root.querySelector('.ai-quota');if(q)q.textContent=quotaText(state.data);
    const small=root.querySelector('.ai-header small');if(small)small.textContent=planText(state.data)+' • '+quotaText(state.data);
    const remain=root.querySelector('.ai-summary>div:nth-child(2)>b');if(remain)remain.textContent=String((state.data.usage||{}).remaining||0);
  }

  function showError(root,msg,retryValue){
    const e=root.querySelector('.ai-error');if(!e)return;
    e.replaceChildren();
    if(!msg)return;
    const span=document.createElement('span');span.textContent=msg;e.appendChild(span);
    if(retryValue){
      const b=document.createElement('button');b.type='button';b.className='ai-retry';b.textContent=tx('Erneut versuchen','Thử lại');
      b.addEventListener('click',()=>{
        if(state.sending||state.clearing)return;
        const input=root.querySelector('.ai-input');input.value=retryValue;showError(root,'');root.querySelector('.ai-form')?.requestSubmit();
      });
      e.appendChild(b);
    }
  }

  function scrollBottom(root){
    const list=root.querySelector('.ai-messages');
    if(list)requestAnimationFrame(()=>{list.scrollTop=list.scrollHeight;});
  }

  function closeAssistant(){
    state.activeRequest?.controller.abort();state.clearRequest?.controller.abort();
    state.clearRequest=null;state.clearing=false;state.activeRequest=null;state.sending=false;
    state.opened=false;state.ownerToken='';state.data=null;state.lastQuestionContext=null;
    document.getElementById(ROOT_ID)?.remove();
  }

  document.addEventListener('fuehrerschein:open-ai',openAssistant);
  const observer=new MutationObserver(()=>{
    ensureCard();const card=document.getElementById(CARD_ID);if(card)placeBesideSpeed(card);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(ensureCard,2000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)ensureCard();});
  ensureCard();
})();
