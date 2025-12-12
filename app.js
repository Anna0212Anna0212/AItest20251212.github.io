// app.js
const STORAGE_KEY = 'ai_quiz_bank_v1';
let bank = { questions: [] };
let quizList = [];
let currentIndex = 0;
let results = [];

// DOM
const importFile = document.getElementById('importFile');
const btnCreateDemo = document.getElementById('btnCreateDemo');
const btnStart = document.getElementById('btnStart');
const selectCount = document.getElementById('selectCount');
const quizArea = document.getElementById('quizArea');
const promptEl = document.getElementById('prompt');
const answerInput = document.getElementById('answerInput');
const btnNext = document.getElementById('btnNext');
const btnPrev = document.getElementById('btnPrev');
const btnSubmit = document.getElementById('btnSubmit');
const reportArea = document.getElementById('reportArea');
const reportList = document.getElementById('reportList');
const btnExport = document.getElementById('btnExport');
const btnSaveEdit = document.getElementById('btnSaveEdit');
const btnAIAnswer = document.getElementById('btnAIAnswer');
const btnRetry = document.getElementById('btnRetry');
const progress = document.getElementById('progress');

function saveBank() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
}
function loadBank() {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s) bank = JSON.parse(s);
}
function createDemoBank() {
  bank = { meta:{title:'demo'}, questions: [] };
  for(let i=1;i<=50;i++){
    bank.questions.push({
      id: 'q'+i,
      type: 'short_answer',
      prompt: `示範題目 ${i}：請回答數字 ${i}`,
      answer: String(i),
      ai_answer: null
    });
  }
  saveBank();
  alert('已載入示範題庫 50 題');
}
function importFileHandler(file) {
  const reader = new FileReader();
  reader.onload = e=>{
    try {
      const txt = e.target.result;
      // 嘗試解析 JSON，若失敗就把整個檔案當成一題文字
      let parsed;
      try { parsed = JSON.parse(txt); }
      catch(e) { parsed = null; }
      if(parsed && parsed.questions) {
        bank = parsed;
      } else {
        // 當作單題
        const id = 'q' + (bank.questions.length+1);
        bank.questions.push({
          id, type:'short_answer', prompt: txt.slice(0,500), answer:'', ai_answer:null
        });
      }
      saveBank();
      alert('匯入完成');
    } catch(err) { alert('匯入失敗: '+err); }
  };
  reader.readAsText(file);
}

// UI 事件綁定
importFile.addEventListener('change', e=>{
  if(e.target.files.length) importFileHandler(e.target.files[0]);
});
btnCreateDemo.addEventListener('click', ()=>{
  createDemoBank();
  loadBank();
});
btnStart.addEventListener('click', ()=>{
  loadBank();
  if(!bank.questions || bank.questions.length===0){ alert('題庫為空'); return; }
  let n = selectCount.value;
  if(n === 'all') n = bank.questions.length;
  else n = Math.min(bank.questions.length, Number(n));
  // 隨機抽題（簡單）
  quizList = shuffle([...bank.questions]).slice(0,n);
  results = quizList.map(q=>({id:q.id, userAnswer:'', correct:null}));
  currentIndex = 0;
  showQuestion();
  quizArea.style.display = 'block';
  reportArea.style.display = 'none';
});
btnNext.addEventListener('click', ()=>{
  saveAnswerForCurrent();
  if(currentIndex < quizList.length-1) currentIndex++;
  showQuestion();
});
btnPrev.addEventListener('click', ()=>{
  saveAnswerForCurrent();
  if(currentIndex > 0) currentIndex--;
  showQuestion();
});
btnSubmit.addEventListener('click', ()=>{
  saveAnswerForCurrent();
  gradeQuiz();
  showReport();
});
btnExport.addEventListener('click', ()=>{
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bank, null, 2));
  const a = document.createElement('a');
  a.href = dataStr; a.download = 'question_bank.json'; document.body.appendChild(a); a.click(); a.remove();
});
btnSaveEdit.addEventListener('click', ()=>{
  // 儲存當前題目修改到 bank
  const q = quizList[currentIndex];
  q.prompt = promptEl.innerText || promptEl.textContent;
  const bqIndex = bank.questions.findIndex(x=>x.id===q.id);
  if(bqIndex>=0) bank.questions[bqIndex] = q;
  saveBank();
  alert('已儲存修改');
});
btnAIAnswer.addEventListener('click', async ()=>{
  // 詢問後端 AI 接口（示意）
  const q = quizList[currentIndex];
  if(!q) return;
  // 這裡呼叫你的 serverless endpoint
  try {
    const res = await fetch('/.netlify/functions/ai-answer', { // 改成你的 endpoint
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({prompt:q.prompt})
    });
    const json = await res.json();
    q.ai_answer = json.answer;
    answerInput.value = q.ai_answer;
    // 同步回 bank
    const bi = bank.questions.findIndex(x=>x.id===q.id);
    if(bi>=0) bank.questions[bi].ai_answer = q.ai_answer;
    saveBank();
  } catch(err) {
    alert('AI 呼叫失敗: '+err);
  }
});
btnRetry.addEventListener('click', ()=>{
  quizArea.style.display = 'block'; reportArea.style.display = 'none'; results = []; quizList = []; currentIndex=0;
});

// 函數
function showQuestion(){
  const q = quizList[currentIndex];
  if(!q) return;
  progress.innerText = `第 ${currentIndex+1} / ${quizList.length}`;
  promptEl.innerText = q.prompt;
  answerInput.value = results[currentIndex]?.userAnswer || '';
}
function saveAnswerForCurrent(){
  const a = answerInput.value.trim();
  results[currentIndex].userAnswer = a;
}
function gradeQuiz(){
  // 簡單比對：完全相同視為正確（可改成相似度）
  results.forEach((r,i)=>{
    const q = quizList[i];
    const correct = (q.answer || '').trim();
    const ua = (r.userAnswer || '').trim();
    r.correct = (correct !== '' && ua !== '' && ua === correct);
    r.correctAnswer = correct;
    r.prompt = q.prompt;
  });
  // 儲存練習結果到 localStorage（歷史）
  const hist = JSON.parse(localStorage.getItem('ai_quiz_history_v1')||'[]');
  hist.push({time:Date.now(), total:results.length, results});
  localStorage.setItem('ai_quiz_history_v1', JSON.stringify(hist));
}
function showReport(){
  quizArea.style.display = 'none'; reportArea.style.display = 'block';
  reportList.innerHTML = '';
  results.forEach((r, i)=>{
    const div = document.createElement('div');
    const cls = r.correct ? 'result-correct' : 'result-wrong';
    div.innerHTML = `<div><strong>Q${i+1}</strong> ${escapeHtml(r.prompt)}</div>
                     <div>你的答案: ${escapeHtml(r.userAnswer||'（未作答）')}</div>
                     <div>答案: ${escapeHtml(r.correctAnswer||'（無標準答案）')}</div>
                     <div class="${cls}">${r.correct ? '正確' : '錯誤'}</div><hr/>`;
    reportList.appendChild(div);
  });
}

// 小工具
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// 初始讀取
loadBank();
