// app.js
const STORAGE_KEY = 'ai_quiz_bank_v1';
let bank = { questions: [] };
let quizList = [];
let currentIndex = 0;
let results = [];

function saveBank(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(bank)); }
function loadBank(){
  const s = localStorage.getItem(STORAGE_KEY);
  if(s) bank = JSON.parse(s);
}

function createDemoBank(){
  bank = {questions:[]};
  for(let i=1;i<=20;i++){
    bank.questions.push({
      id:"q"+i,
      prompt:`示範題目 ${i}`,
      answer:String(i),
      type:"short_answer"
    });
  }
  saveBank();
  alert("已載入示範題庫！");
}

function importTextToQuestions(text){
  // 等你接 Gemini API
  // 先暫時做成單一題
  const id = "q" + (bank.questions.length+1);
  bank.questions.push({
    id, prompt:text.trim(), answer:"", type:"short_answer"
  });
  saveBank();
}

function importFileHandler(file){
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const txt = e.target.result;
      let parsed;
      try{ parsed = JSON.parse(txt); }
      catch{ parsed = null; }
      if(parsed && parsed.questions){
        bank = parsed;
      } else {
        importTextToQuestions(txt);
      }
      saveBank();
      alert("匯入完成！");
    } catch(err){
      alert("匯入失敗："+err);
    }
  };
  reader.readAsText(file);
}

// ====== UI ======
const importFile = document.getElementById('importFile');
const btnCreateDemo = document.getElementById('btnCreateDemo');
const btnStart = document.getElementById('btnStart');
const selectCount = document.getElementById('selectCount');
const btnExport = document.getElementById('btnExport');
const quizArea = document.getElementById('quizArea');
const promptEl = document.getElementById('prompt');
const answerInput = document.getElementById('answerInput');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnSubmit = document.getElementById('btnSubmit');
const btnSaveEdit = document.getElementById('btnSaveEdit');
const reportArea = document.getElementById('reportArea');
const reportList = document.getElementById('reportList');
const btnRetry = document.getElementById('btnRetry');
const progress = document.getElementById('progress');

importFile.addEventListener('change', e=>{
  if(e.target.files.length) importFileHandler(e.target.files[0]);
});
btnCreateDemo.addEventListener('click', ()=>{
  createDemoBank();
});
btnStart.addEventListener('click', ()=>{
  loadBank();
  if(bank.questions.length===0){ alert("題庫為空"); return; }
  let n = selectCount.value;
  if(n==="all") n = bank.questions.length;
  else n = Math.min(bank.questions.length, Number(n));
  quizList = shuffle([...bank.questions]).slice(0,n);
  results = quizList.map(q=>({id:q.id,userAnswer:""}));
  currentIndex = 0;
  showQuestion();
  quizArea.style.display="block";
  reportArea.style.display="none";
});
btnPrev.addEventListener('click', ()=>{
  saveAnswerForCurrent();
  if(currentIndex>0) currentIndex--;
  showQuestion();
});
btnNext.addEventListener('click', ()=>{
  saveAnswerForCurrent();
  if(currentIndex<quizList.length-1) currentIndex++;
  showQuestion();
});
btnSubmit.addEventListener('click', ()=>{
  saveAnswerForCurrent();
  gradeQuiz();
  showReport();
});
btnSaveEdit.addEventListener('click', ()=>{
  const q = quizList[currentIndex];
  q.prompt = promptEl.innerText;
  const bi = bank.questions.findIndex(x=>x.id===q.id);
  if(bi>=0) bank.questions[bi] = q;
  saveBank();
  alert("已儲存題目修改！");
});
btnExport.addEventListener('click', ()=>{
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bank,null,2));
  const a = document.createElement('a');
  a.href = dataStr; a.download = "question_bank.json"; a.click();
});
btnRetry.addEventListener('click', ()=>{
  quizArea.style.display="block"; reportArea.style.display="none";
});

// ====== functions ======
function showQuestion(){
  const q = quizList[currentIndex];
  progress.innerText = `第 ${currentIndex+1} / ${quizList.length}`;
  promptEl.innerText = q.prompt;
  answerInput.value = results[currentIndex].userAnswer || "";
}

function saveAnswerForCurrent(){
  results[currentIndex].userAnswer = answerInput.value.trim();
}

function gradeQuiz(){
  results.forEach((r,i)=>{
    r.prompt = quizList[i].prompt;
    r.correctAnswer = quizList[i].answer;
    r.correct = (r.userAnswer === quizList[i].answer);
  });
}

function showReport(){
  quizArea.style.display="none";
  reportArea.style.display="block";
  reportList.innerHTML = "";
  results.forEach((r)=>{
    const div = document.createElement('div');
    div.innerHTML = `
      <p><b>${r.prompt}</b></p>
      <p>你的答案：${r.userAnswer}</p>
      <p>正確答案：${r.correctAnswer}</p>
      <p style="color:${r.correct?'green':'red'};">${r.correct?'正確':'錯誤'}</p>
      <hr/>
    `;
    reportList.appendChild(div);
  });
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()* (i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
