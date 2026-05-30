// ══════════════════════════════════════════════
// notes.js  —  Deep Notes Generation
// ══════════════════════════════════════════════

async function generateNotes() {
  const custom = document.getElementById("customNotesTopic").value.trim();
  const topic  = custom || App.getSelectedNotesTopic();
  if (!topic) { alert("⚠️ કૃપા કરીને વિષય પસંદ કરો"); return; }

  const btn = document.getElementById("genNotesBtn");
  btn.disabled = true; btn.textContent = "⏳ Generate થઈ રહ્યું છે...";

  const out = document.getElementById("notesOutput");
  out.innerHTML = `
    <div class="loading-card">
      <div class="spinner"></div>
      <div class="loading-text">✨ "<strong>${topic}</strong>" ના Deep Notes<span class="loading-dots"></span></div>
    </div>`;

  const systemPrompt = `તમે TET-2 ગુજરાત ના Senior Expert Teacher છો.
તમે ઊંડા, comprehensive, exam-focused notes ગુજરાતી ભાષામાં આપો છો.
Markdown formatting વાપરો: # ## ### **bold** *italic* - lists | tables |
Notes ઓછામાં ઓછા 1200-1500 words ના હોવા જોઈએ.
દરેક section deep explanation સાથે, real examples, memory tips સહિત.
ફક્ત ગુજરાતી ભાષામાં જ output આપો.`;

  const userPrompt = `"${topic}" વિષય પર TET-2 ગુજરાત પરીક્ષા માટે **ઊંડા અને વ્યાપક Notes** ગુજરાતીમાં બનાવો.

નીચેના structure ને follow કરો:

# ${topic}

## ૧. પ્રારંભ અને ઇતિહાસ (Introduction & History)
- ઉત્પત્તિ, વ્યાખ્યા, ઐતિહાસિક પૃષ્ઠભૂમિ

## ૨. મૂળ ખ્યાલો અને સિદ્ધાંતો (Core Concepts & Theories)
- દરેક ખ્યાલ ઊંડાણથી, sub-points સહિત

## ૩. વિગતવાર સ્પષ્ટીકરણ (Detailed Explanation)
- Types/Kinds, Classifications
- Real-world examples
- ગુજરાત/ભારત specific examples

## ૪. મહત્વના તથ્યો અને આંકડા (Key Facts & Data)
- TET-2 exam perspective থেকে important facts
- Dates, numbers, names

## ૫. Important Definitions (Table format)
| શબ્દ | વ્યાખ્યા |

## ૬. TET-2 Exam Perspective
- Most asked question types
- Common mistakes students make
- What to focus on

## ૭. Memory Tips (Mnemonics)
- Easy tricks to remember

## ૮. Practice Questions (ગુજરાતીમાં 5 sample questions)

**ઓછામાં ઓછા 1200 words — deep, detailed, comprehensive.**`;

  try {
    const content = await App.callGroq(systemPrompt, userPrompt, 4096);
    const html    = App.mdToHTML(content);

    out.innerHTML = `
      <div class="notes-container">
        <div class="notes-header">
          <div class="notes-title">📝 ${topic}</div>
          <div class="notes-actions">
            <button class="btn-icon" onclick="window.print()">🖨️ Print</button>
            <button class="btn-icon" onclick="copyNotes()">📋 Copy</button>
          </div>
        </div>
        <div class="notes-body" id="notesContent">${html}</div>
      </div>`;
  } catch(e) {
    out.innerHTML = `<div class="error-card">⚠️ ${e.message}</div>`;
  }

  btn.disabled = false; btn.textContent = "✨ Deep Notes Generate કરો";
}

function clearNotes() {
  document.getElementById("notesOutput").innerHTML = "";
  document.querySelectorAll("#notesTopicsGrid .topic-card").forEach(c => c.classList.remove("selected"));
  document.getElementById("customNotesTopic").value = "";
}

function copyNotes() {
  const el = document.getElementById("notesContent");
  if (el) navigator.clipboard.writeText(el.innerText).then(() => alert("✅ Copied!"));
}
