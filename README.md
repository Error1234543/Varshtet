# TET-2 ગુજરાતી AI Study App

## Vercel Deploy Steps

### 1. GitHub par upload karo
- Yeh sab files ek GitHub repo mein daalo

### 2. Vercel par import karo
- vercel.com → "Add New Project" → GitHub repo select karo
- Framework: **Other** (Next.js select mat karo)
- Root Directory: `/` (default)

### 3. Environment Variables set karo ⚡
Vercel Dashboard → Project → Settings → Environment Variables

| Variable Name     | Value                    |
|-------------------|--------------------------|
| `GROQ_API_KEY_1`  | `gsk_xxxxxxxxxxxx` (Key 1) |
| `GROQ_API_KEY_2`  | `gsk_xxxxxxxxxxxx` (Key 2) |

### 4. Deploy karo ✅

---

## File Structure
```
tet2-app/
├── api/
│   └── groq.js        ← Vercel serverless function (API keys yahan se load hongi)
├── index.html
├── app.js
├── notes.js
├── quiz.js
├── style.css
└── vercel.json
```

## Features
- 2 Groq API keys automatic rotation (rate limit protection)
- localStorage nahi — keys sirf server-side hain (secure ✅)
- Batch quiz generation (JSON truncation fix)
- Full Gujarati TET-2 topics
