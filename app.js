/* ===================================================================
   APP LOGIC — quiz flow, scoring, rendering
   =================================================================== */

const LIKERT_LEVELS = [
  { label:"موافق بشدة", value:2 },
  { label:"موافق", value:1 },
  { label:"محايد", value:0 },
  { label:"غير موافق", value:-1 },
  { label:"غير موافق بشدة", value:-2 }
];

const DIM_LABELS = { energy:"مصدر الطاقة", process:"معالجة المعلومات", decision:"أساس القرار" };

let currentStep = 0;
let responses = []; // raw likert values per statement, indexed same as STATEMENTS

const screens = {
  landing: document.getElementById('landing'),
  quiz: document.getElementById('quiz'),
  result: document.getElementById('result')
};

function showScreen(name){
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ---------- LANDING: render type gallery ---------- */
function renderTypeGallery(){
  const grid = document.getElementById('typeGrid');
  grid.innerHTML = '';
  TYPE_KEYS.forEach(key => {
    const t = TYPES[key];
    const tile = document.createElement('div');
    tile.className = 'type-tile';
    tile.innerHTML = `<div class="code">${t.code}</div><div class="name">${t.name}</div>`;
    grid.appendChild(tile);
  });
}
renderTypeGallery();

/* ---------- QUIZ ---------- */
function renderStatement(){
  const total = STATEMENTS.length;
  const stmt = STATEMENTS[currentStep];
  const pct = Math.round((currentStep / total) * 100);

  document.getElementById('qLabel').textContent = `العبارة ${toArabicDigits(currentStep+1)} من ${toArabicDigits(total)}`;
  document.getElementById('qPct').textContent = toArabicDigits(pct) + '٪';
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('qDim').textContent = DIM_LABELS[stmt.dim];
  document.getElementById('qText').textContent = stmt.text;

  const wrap = document.getElementById('likertOptions');
  wrap.innerHTML = '';
  LIKERT_LEVELS.forEach(level => {
    const btn = document.createElement('button');
    btn.className = 'likert-opt';
    btn.innerHTML = `<span>${level.label}</span><span class="dot"></span>`;
    btn.addEventListener('click', () => handleAnswer(level.value));
    wrap.appendChild(btn);
  });

  document.getElementById('backBtn').style.visibility = currentStep === 0 ? 'hidden' : 'visible';
}

function toArabicDigits(n){
  // keep as standard digits for clarity/compat; Arabic-Indic optional
  return String(n);
}

function handleAnswer(value){
  responses[currentStep] = value;
  if(currentStep + 1 >= STATEMENTS.length){
    computeAndShowResult();
  } else {
    currentStep++;
    renderStatement();
  }
}

document.getElementById('backBtn').addEventListener('click', () => {
  if(currentStep > 0){ currentStep--; renderStatement(); }
});

document.getElementById('startBtn').addEventListener('click', () => {
  currentStep = 0; responses = [];
  showScreen('quiz');
  renderStatement();
});

/* ---------- SCORING ---------- */
function computeAndShowResult(){
  const dimScores = { energy:0, process:0, decision:0 };

  STATEMENTS.forEach((stmt, i) => {
    const raw = responses[i] || 0;
    const effective = stmt.invert ? -raw : raw;
    dimScores[stmt.dim] += effective;
  });

  // letter selection: positive => first letter, negative/zero => second letter
  const energyLetter = dimScores.energy >= 0 ? "S" : "I";
  const processLetter = dimScores.process >= 0 ? "P" : "C";
  const decisionLetter = dimScores.decision >= 0 ? "L" : "E";
  const code = energyLetter + processLetter + decisionLetter;

  // compute "closeness" percentage to all 8 types for the match table
  // based on normalized distance across the 3 dimensions
  const maxPerDim = 20; // 10 statements * 2 max
  const norm = {
    energy: dimScores.energy / maxPerDim,   // -1..1, positive leans S
    process: dimScores.process / maxPerDim, // positive leans P
    decision: dimScores.decision / maxPerDim // positive leans L
  };

  const matches = TYPE_KEYS.map(key => {
    const letters = key.split('');
    // target vector for this type: +1 if letter matches first option, -1 otherwise
    const targetEnergy = letters[0] === 'S' ? 1 : -1;
    const targetProcess = letters[1] === 'P' ? 1 : -1;
    const targetDecision = letters[2] === 'L' ? 1 : -1;

    // similarity: 1 - average absolute difference, mapped to 0-100%
    const diff = (Math.abs(norm.energy - targetEnergy) + Math.abs(norm.process - targetProcess) + Math.abs(norm.decision - targetDecision)) / 3;
    const similarity = Math.max(0, Math.min(100, Math.round((1 - diff/2) * 100)));
    return { key, similarity };
  }).sort((a,b) => b.similarity - a.similarity);

  renderResult(code, matches);
}

/* ---------- RENDER RESULT ---------- */
function renderParagraphs(elId, paragraphs){
  const el = document.getElementById(elId);
  el.innerHTML = '';
  paragraphs.forEach(p => {
    const para = document.createElement('p');
    para.textContent = p;
    el.appendChild(para);
  });
}

function renderList(elId, items){
  const el = document.getElementById(elId);
  el.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  });
}

function renderResult(code, matches){
  const type = TYPES[code] || TYPES[matches[0].key]; // fallback safety
  const finalCode = TYPES[code] ? code : matches[0].key;

  document.documentElement.style.setProperty('--result-color', type.color);

  document.getElementById('rCode').textContent = finalCode;
  document.getElementById('rName').textContent = type.name;
  document.getElementById('rTagline').textContent = type.tagline;

  renderParagraphs('rOverview', type.overview);
  renderList('rStrengths', type.strengths);
  renderList('rChallenges', type.challenges);
  renderParagraphs('rRelationships', type.relationships);
  renderParagraphs('rCareerText', type.career);
  renderList('rGrowth', type.growth);

  const careerTagsWrap = document.getElementById('rCareerTags');
  careerTagsWrap.innerHTML = '';
  type.careerTags.forEach(c => {
    const span = document.createElement('span');
    span.className = 'career-tag';
    span.textContent = c;
    careerTagsWrap.appendChild(span);
  });

  const matchTableWrap = document.getElementById('matchTable');
  matchTableWrap.innerHTML = '';
  matches.forEach(m => {
    const t = TYPES[m.key];
    const row = document.createElement('div');
    row.className = 'match-row';
    row.innerHTML = `
      <span class="mname">${t.code} — ${t.name}</span>
      <span class="mtrack"><span class="mfill"></span></span>
      <span class="mpct">${m.similarity}٪</span>
    `;
    matchTableWrap.appendChild(row);
    setTimeout(() => { row.querySelector('.mfill').style.width = m.similarity + '%'; }, 100);
  });

  showScreen('result');
  setupTocScrollSpy();
}

/* ---------- TOC scroll-spy ---------- */
function setupTocScrollSpy(){
  const links = document.querySelectorAll('.toc a');
  const sections = Array.from(links).map(a => document.querySelector(a.getAttribute('href')));

  function onScroll(){
    let activeIdx = 0;
    sections.forEach((sec, i) => {
      if(sec && sec.getBoundingClientRect().top < 140) activeIdx = i;
    });
    links.forEach((l, i) => l.classList.toggle('active', i === activeIdx));
  }

  window.removeEventListener('scroll', window.__tocScrollHandler || (()=>{}));
  window.__tocScrollHandler = onScroll;
  window.addEventListener('scroll', onScroll);
  onScroll();

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if(target) window.scrollTo({ top: target.offsetTop - 90, behavior:'smooth' });
    });
  });
}

document.getElementById('restartBtn').addEventListener('click', () => {
  currentStep = 0; responses = [];
  showScreen('landing');
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const code = document.getElementById('rCode').textContent;
  const type = TYPES[code];
  if(!type) return;
  const text = `نتيجتي بتحليل "اكتشف نمطك": ${type.code} — ${type.name}\n\n${type.tagline}\n\nأقوى نقاط قوتي: ${type.strengths[0]}\n\nجرّب التحليل وشوف نمطك انت كمان 🚀`;
  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(showToast);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast();
  }
});

function showToast(){
  const toast = document.getElementById('toast');
  toast.textContent = '✅ تم نسخ ملخص التقرير';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}
