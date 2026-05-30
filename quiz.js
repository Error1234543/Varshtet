// ══════════════════════════════════════════════
// quiz.js  —  MCQ Generation + Rendering
// JSON truncation fix: generate in small batches
// ══════════════════════════════════════════════

let quizData    = [];
let currentQ    = 0;
let score       = { correct: 0, wrong: 0 };
let currentTopic = "";

// ── Generate quiz in BATCHES of 5 to avoid JSON truncation
async function startQuiz() {
  const custom = document.getElementById("customQuizTopic").value.trim();
  const topic  = custom || App.getSelectedQuizTopic();
  if (!topic) { alert("⚠️ Quiz topic પસંદ કરો"); return; }

  const totalCount = parseInt(document.getElementById("qCount").value);
  const level      = document.getElementById("qLevel").value;

  currentTopic = topic;
  const btn = document.getElementById("genQuizBtn");
  btn.disabled = true; btn.textContent = "⏳ Loading...";

  const out = document.getElementById("quizOutput");
  out.innerHTML = `
    <div class="loading-card">
      <div class="spinner"></div>
      <div class="loading-text">🧩 "${topic}" Quiz Generate<span class="loading-dots"></span></div>
    </div>`;

  try {
    // Generate in batches of 5 to prevent JSON truncation
    const batchSize = 5;
    const batches   = Math.ceil(totalCount / batchSize);
    let allQuestions = [];

    for (let b = 0; b < batches; b++) {
      const need = Math.min(batchSize, totalCount - allQuestions.length);
      out.innerHTML = `
        <div class="loading-card">
          <div class="spinner"></div>
          <div class="loading-text">🧩 Batch ${b+1}/${batches} — ${allQuestions.length}/${totalCount} questions<span class="loading-dots"></span></div>
        </div>`;

      const batch = await generateBatch(topic, level, need, b + 1);
      allQuestions = allQuestions.concat(batch);
      if (allQuestions.length >= totalCount) break;
    }

    quizData = allQuestions.slice(0, totalCount);
    currentQ = 0;
    score    = { correct: 0, wrong: 0 };
    renderQuestion(out);

  } catch (e) {
    out.innerHTML = `<div class="error-card">⚠️ ${e.message}</div>`;
  }

  btn.disabled = false; btn.textContent = "🚀 Quiz Start";
}

// ── Generate exactly `count` questions in one API call
async function generateBatch(topic, level, count, batchNum) {
  const systemPrompt =
`You are a TET-2 Gujarat exam MCQ expert.
Output ONLY a valid JSON array. No markdown. No backticks. No explanation. No text before or after the array.
All question text and option text MUST be in Gujarati language only.
The JSON array must be complete and properly closed with ].`;

  const userPrompt =
`Generate exactly ${count} MCQ questions on "${topic}" at "${level}" difficulty for TET-2 Gujarat exam.

Return ONLY this JSON (no other text, no backticks):
[{"q":"ગુજરાતી પ્રશ્ન","opts":["A","B","C","D"],"ans":0,"exp":"ગુજરાતી સ્પષ્ટીકરણ"}]

Rules:
- Exactly ${count} objects in the array
- "ans" = index of correct option (0-3)
- All text in Gujarati only
- "exp" = 1-2 sentence explanation in Gujarati
- Keep each question concise (under 150 chars)
- Keep each option concise (under 80 chars)
- Keep explanation under 100 chars
- Close the JSON array properly with ]`;

  // Use lower token limit so response is always complete
  const raw = await App.callGroq(systemPrompt, userPrompt, 2048);
  return parseJSON(raw, count);
}

// ── Robust JSON parser with multiple fallbacks
function parseJSON(raw, expectedCount) {
  // Strip markdown fences if any
  let text = raw.replace(/```json|```/gi, "").trim();

  // Try direct parse
  try {
    const arr = JSON.parse(text);
    if (Array.isArray(arr) && arr.length > 0) return arr;
  } catch(_) {}

  // Try extracting array portion
  const start = text.indexOf("[");
  const end   = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const arr = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch(_) {}
  }

  // Try healing truncated JSON: add missing closing brackets
  if (start !== -1) {
    let fragment = text.slice(start);
    // count open/close braces to find last complete object
    let depth = 0; let lastCompleteEnd = -1;
    for (let i = 0; i < fragment.length; i++) {
      if (fragment[i] === "{") depth++;
      if (fragment[i] === "}") { depth--; if (depth === 0) lastCompleteEnd = i; }
    }
    if (lastCompleteEnd > 0) {
      const healed = fragment.slice(0, lastCompleteEnd + 1) + "]";
      try {
        const arr = JSON.parse(healed);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      } catch(_) {}
    }
  }

  throw new Error("Quiz JSON parse failed. ફરી try કરો.");
}

// ── Render current question
function renderQuestion(out) {
  if (currentQ >= quizData.length) { renderResult(out); return; }

  const q    = quizData[currentQ];
  const pct  = Math.round((currentQ / quizData.length) * 100);
  const lbls = ["A","B","C","D"];

  out.innerHTML = `
    <div class="quiz-header">
      <div>
        <div style="font-size:0.8rem;color:var(--muted);margin-bottom:4px;">📚 ${currentTopic}</div>
        <div class="quiz-progress">
          <span style="font-size:0.85rem;color:var(--muted)">${currentQ+1} / ${quizData.length}</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
      </div>
      <div class="quiz-score-display">
        <div class="score-pill">✅ ${score.correct}</div>
        <div class="score-pill wrong">❌ ${score.wrong}</div>
      </div>
    </div>

    <div class="question-card">
      <div class="q-number">પ્રશ્ન ${currentQ+1}</div>
      <div class="q-text">${q.q}</div>
      <div class="options-grid">
        ${(q.opts || []).map((opt, i) => `
          <button class="option-btn" id="opt-${i}" onclick="pickAnswer(${i},${q.ans})">
            <span class="opt-label">${lbls[i]}</span>
            <span>${opt}</span>
          </button>`).join("")}
      </div>
      <div class="explanation-box" id="expBox">
        <div class="explanation-label">💡 સ્પષ્ટીકરણ</div>
        ${q.exp || ""}
      </div>
    </div>

    <div class="quiz-nav">
      <button class="btn-outline" onclick="startQuiz()">🔄 નવો Quiz</button>
      <button class="btn-primary hidden" id="nextBtn" onclick="nextQ()">
        ${currentQ+1 === quizData.length ? "🏆 Results" : "આગળ ➡️"}
      </button>
    </div>`;
}

function pickAnswer(sel, correct) {
  document.querySelectorAll(".option-btn").forEach(b => b.disabled = true);
  if (sel === correct) {
    document.getElementById(`opt-${sel}`).classList.add("correct");
    score.correct++;
  } else {
    document.getElementById(`opt-${sel}`).classList.add("wrong");
    document.getElementById(`opt-${correct}`).classList.add("reveal");
    score.wrong++;
  }
  document.getElementById("expBox").classList.add("show");
  document.getElementById("nextBtn").classList.remove("hidden");
}

function nextQ() {
  currentQ++;
  renderQuestion(document.getElementById("quizOutput"));
}

function renderResult(out) {
  const total = quizData.length;
  const pct   = Math.round((score.correct / total) * 100);
  const emoji = pct >= 80 ? "🏆" : pct >= 60 ? "👍" : pct >= 40 ? "📚" : "💪";
  const msg   = pct >= 80 ? "ઉત્તમ! TET-2 Ready!"
              : pct >= 60 ? "સારું! વધુ Practice કરો!"
              : pct >= 40 ? "Notes ફરી વાંચો!"
              :             "ચિંતા ન કરો, Practice કરો!";

  out.innerHTML = `
    <div class="result-card">
      <span class="result-emoji">${emoji}</span>
      <div class="result-score">${pct}%</div>
      <div class="result-text">${msg}</div>
      <div class="result-breakdown">
        <div class="breakdown-item"><div class="breakdown-num green">${score.correct}</div><div class="breakdown-label">✅ સાચા</div></div>
        <div class="breakdown-item"><div class="breakdown-num red">${score.wrong}</div><div class="breakdown-label">❌ ખોટા</div></div>
        <div class="breakdown-item"><div class="breakdown-num" style="color:var(--gold)">${total}</div><div class="breakdown-label">📊 કુલ</div></div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn-primary" onclick="startQuiz()">🔄 ફરી Quiz</button>
        <button class="btn-outline" onclick="App.switchTab('notes')">📝 Notes જુઓ</button>
      </div>
    </div>`;
}
