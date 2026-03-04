// ─────────────────────────────────────────────────────────
// api.ts — Google Gemini API wrapper (FREE tier)
// ─────────────────────────────────────────────────────────

import type { Language, AILesson, ScanTranslationResult, VoiceTranslationResult } from './types';

const MODEL = "gemini-1.5-flash";

// Get API key from environment or localStorage
function getApiKey(): string | null {
  // Check for environment variable (Vercel deployment)
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) {
    return envKey;
  }
  // Check localStorage (user-provided key)
  const stored = localStorage.getItem('gemini_api_key');
  return stored;
}

async function callGemini(prompt: string, imageData?: string): Promise<string> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("Please configure your Gemini API key in settings");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  
  const parts: any[] = [{ text: prompt }];
  if (imageData) {
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: imageData
      }
    });
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ parts }]
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJSON<T = any>(raw: string): T {
  return JSON.parse(raw.replace(/```json\s*|```/g, "").trim());
}

// ── AI Hint ───────────────────────────────────────────────
export async function fetchHint(question: string, answer: string, lang: Language): Promise<string> {
  const prompt = `You are a warm, encouraging language tutor for a Duolingo-style app teaching ${lang}.
Question: "${question}"
Correct answer: "${answer}"
Write a SHORT hint (2-3 sentences) that nudges the student toward the answer WITHOUT revealing it.
Use etymology, cultural context, or memory tricks. Be playful and friendly!`;

  return callGemini(prompt);
}

// ── Scan / OCR + Translate ────────────────────────────────
export async function fetchScanTranslation(base64: string, targetLang: Language): Promise<ScanTranslationResult> {
  const others = ["hiligaynon", "tagalog", "english"]
    .filter((l) => l !== targetLang)
    .join(" and ");

  const prompt = `Extract ALL visible text from this image (signs, labels, menus, anything written).
If no text is visible, say "No text detected".
Translate it into ${targetLang}, and also provide ${others} translations.

Reply ONLY with this JSON (no markdown, no preamble):
{
  "detected": "<original text>",
  "translations": {
    "hiligaynon": "<translation>",
    "tagalog": "<translation>",
    "english": "<translation>"
  }
}`;

  const raw = await callGemini(prompt, base64);
  return parseJSON<ScanTranslationResult>(raw);
}

// ── Voice Translate ───────────────────────────────────────
export async function fetchVoiceTranslation(text: string): Promise<VoiceTranslationResult> {
  const prompt = `Detect the language of the following text, then translate it into Hiligaynon, Tagalog, and English.
Text: "${text}"

Reply ONLY with this JSON (no markdown):
{
  "hiligaynon": "<translation>",
  "tagalog": "<translation>",
  "english": "<translation>"
}`;

  const raw = await callGemini(prompt);
  return parseJSON<VoiceTranslationResult>(raw);
}

// ── AI Lesson Generator ───────────────────────────────────
export async function fetchAILesson(topic: string, lang: Language): Promise<AILesson> {
  const prompt = `You are a language education expert creating a mini-lesson for a Duolingo-style app.
Topic: "${topic}"
Target language: ${lang}
Teaching language: English

Create exactly 6 quiz questions about the topic.
Mix multiple-choice ("mc") and fill-in-the-blank ("fib") questions.

Rules:
- "mc" questions need exactly 4 choices (string array "c"), one being the answer "a"
- "fib" questions ask to complete a blank; "a" is the single correct word/phrase
- "img" should be a single relevant emoji
- "h" is a short helpful hint (1 sentence)
- All questions must teach real ${lang} vocabulary or phrases related to the topic

Reply ONLY with this JSON (no markdown):
{
  "title": "<short lesson title>",
  "emoji": "<single emoji>",
  "description": "<one sentence description>",
  "questions": [
    {
      "t": "mc",
      "img": "🌟",
      "p": "<question prompt>",
      "a": "<correct answer>",
      "c": ["<opt1>", "<opt2>", "<opt3>", "<opt4>"],
      "h": "<hint>"
    },
    {
      "t": "fib",
      "img": "✏️",
      "p": "<sentence with blank _____>",
      "a": "<word that fills blank>",
      "h": "<hint>"
    }
  ]
}`;

  const raw = await callGemini(prompt);
  const parsed = parseJSON<AILesson>(raw);

  // Validate & sanitize questions
  const valid = parsed.questions
    .filter((q) => {
      if (q.t === "mc") return Array.isArray(q.c) && q.c.length >= 2 && Boolean(q.a);
      if (q.t === "fib") return Boolean(q.a);
      return false;
    })
    .slice(0, 6);

  return { ...parsed, questions: valid };
}
