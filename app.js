// ══════════════════════════════════════════════
// app.js  —  Core: Topics, Tabs, API, Markdown
// API Key is stored ONLY in Vercel Environment Variables.
// Frontend never touches localStorage or any key directly.
// All Groq calls go through /api/groq (serverless function).
// ══════════════════════════════════════════════

const App = (() => {

  // ── Internal API endpoint (Vercel serverless function)
  const API_ENDPOINT = "/api/groq";
  const GROQ_MODEL   = "llama-3.3-70b-versatile";

  const TOPICS = [
    { emoji: "🧠", name: "બાળ વિકાસ અને મનોવિજ્ઞાન" },
    { emoji: "📖", name: "શિક્ષણ શાસ્ત્ર (Pedagogy)" },
    { emoji: "🔢", name: "ગણિત — સંખ્યા, બીજગણિત, જ્યોમેટ્રી" },
    { emoji: "📐", name: "ત્રિકોણમિતિ અને સ્ટેટિસ્ટિક્સ" },
    { emoji: "⚗️", name: "ભૌતિક અને રસાયણ વિજ્ઞાન" },
    { emoji: "🌿", name: "જીવ વિજ્ઞાન અને પર્યાવરણ" },
    { emoji: "📝", name: "ગુજરાતી વ્યાકરણ અને સાહિત્ય" },
    { emoji: "🇬🇧", name: "English Grammar & Literature" },
    { emoji: "🕌", name: "ભારતનો ઇતિહાસ" },
    { emoji: "🗺️", name: "ભૂગોળ (Geography)" },
    { emoji: "⚖️", name: "નાગરિકશાસ્ત્ર અને અર્થશાસ્ત્ર" },
    { emoji: "📰", name: "સામાન્ય જ્ઞાન અને કરંટ અફેર્સ" },
    { emoji: "🏫", name: "શિક્ષણ અધિકાર — RTE Act" },
    { emoji: "🧮", name: "સામાજિક ગણિત (Ratio, %, Interest)" },
    { emoji: "🌐", name: "વિશ્વ ભૂગોળ અને ઇતિહાસ" },
    { emoji: "🌱", name: "પ્રાથમિક પર્યાવરણ (EVS)" },
  ];

  let selectedNotesTopic = "";
  let selectedQuizTopic  = "";

  function renderTopics(gridId, type) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = TOPICS.map((t, i) => `
      <div class="topic-card" id="${type}-topic-${i}" onclick="App.selectTopic('${type}',${i})">
        <span class="topic-emoji">${t.emoji}</span>
        <div class="topic-name">${t.name}</div>
      </div>`).join("");
  }

  function selectTopic(type, idx) {
    document.querySelectorAll(`#${type}TopicsGrid .topic-card`)
      .forEach(c => c.classList.remove("selected"));
    document.getElementById(`${type}-topic-${idx}`).classList.add("selected");
    if (type === "notes") {
      selectedNotesTopic = TOPICS[idx].name;
      document.getElementById("customNotesTopic").value = "";
    } else {
      selectedQuizTopic = TOPICS[idx].name;
      document.getElementById("customQuizTopic").value = "";
    }
  }

  function switchTab(tab) {
    ["notes","quiz"].forEach(t => {
      document.getElementById(t + "Panel").classList.toggle("active", t === tab);
      document.getElementById(t + "TabBtn").classList.toggle("active", t === tab);
    });
  }

  // ── Groq API call via serverless /api/groq
  async function callGroq(systemPrompt, userPrompt, maxTokens = 4096) {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        temperature: 0.65,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   }
        ]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      // Show friendly Gujarati error messages
      if (res.status === 429) {
        throw new Error("⏳ Rate limit — બંને API keys busy છે. 30 સેકન્ડ wait કરીને ફરી try કરો.");
      }
      if (res.status === 500 && data.error && data.error.includes("not set")) {
        throw new Error("🔑 Vercel Environment Variables set નથી. GROQ_API_KEY_1 અને GROQ_API_KEY_2 Vercel dashboard માં add કરો.");
      }
      throw new Error(data?.error?.message || data?.error || `HTTP ${res.status}`);
    }

    return data.choices[0].message.content;
  }

  // ── Markdown → HTML
  function mdToHTML(md) {
    let h = md
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/^#### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^### (.+)$/gm,  "<h3>$1</h3>")
      .replace(/^## (.+)$/gm,   "<h2>$1</h2>")
      .replace(/^# (.+)$/gm,    "<h1>$1</h1>")
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g,     "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g,         "<em>$1</em>")
      .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^---+$/gm, "<hr>")
      .replace(/^[\*\-] (.+)$/gm, "<li>$1</li>")
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

    h = h.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, m => `<ul>${m}</ul>`);

    h = h.replace(/((?:^\|.+\|\n?)+)/gm, tableBlock => {
      const rows = tableBlock.trim().split("\n").filter(r => !/^\|[-:| ]+\|$/.test(r));
      if (rows.length === 0) return "";
      const header = rows[0];
      const body   = rows.slice(1);
      const cells  = row => row.split("|").filter((_,i,a) => i>0 && i<a.length-1).map(c => c.trim());
      const th     = cells(header).map(c => `<th>${c}</th>`).join("");
      const tbody  = body.map(r => `<tr>${cells(r).map(c=>`<td>${c}</td>`).join("")}</tr>`).join("");
      return `<table><thead><tr>${th}</tr></thead><tbody>${tbody}</tbody></table>`;
    });

    h = h.split(/\n{2,}/).map(chunk => {
      chunk = chunk.trim();
      if (!chunk) return "";
      if (/^<[hut]/.test(chunk) || /^<block/.test(chunk) || /^<hr/.test(chunk)) return chunk;
      return `<p>${chunk.replace(/\n/g," ")}</p>`;
    }).join("\n");

    return h;
  }

  function getSelectedNotesTopic() { return selectedNotesTopic; }
  function getSelectedQuizTopic()  { return selectedQuizTopic;  }

  function init() {
    renderTopics("notesTopicsGrid", "notes");
    renderTopics("quizTopicsGrid",  "quiz");
  }

  return { init, selectTopic, switchTab, callGroq, mdToHTML, getSelectedNotesTopic, getSelectedQuizTopic };

})();
