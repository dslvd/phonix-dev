// ─────────────────────────────────────────────────────────
// voice.ts — Voice-to-translate (Web Speech API)
// ─────────────────────────────────────────────────────────

import type { Language } from './types';
import { byId, showScreen, toast } from './dom';
import { fetchVoiceTranslation } from './api';
import { goHome } from './home';

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

// ── State ─────────────────────────────────────────────────
let recog: any = null;
let recording = false;
let voiceLang: Language = "hiligaynon";

const VOICE_LABELS: Record<Language, string> = {
  hiligaynon: "🌺 Hiligaynon",
  tagalog: "🏙️ Tagalog",
  english: "🌎 English",
};

// ── Open / close ──────────────────────────────────────────
export function openVoice(): void {
  showScreen("voice");
  clearVoice();
}

export function closeVoice(): void {
  stopMic();
  goHome();
}

// ── Language picker ───────────────────────────────────────
export function setVoiceLang(el: HTMLElement): void {
  document.querySelectorAll("#voiceLangRow .vlang").forEach((b) => b.classList.remove("sel"));
  el.classList.add("sel");
  voiceLang = (el.dataset["lang"] as Language) ?? "hiligaynon";
}

// ── Mic toggle ────────────────────────────────────────────
export function toggleMic(): void {
  recording ? stopMic() : startMic();
}

function startMic(): void {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Ctor) {
    toast("Demo mode — no Speech API");
    simulateVoice();
    return;
  }

  recog = new Ctor();
  recog.continuous = false;
  recog.interimResults = true;
  recog.lang = "en-US";

  recog.onstart = () => {
    recording = true;
    byId("micBtn").className = "mic-btn recording";
    byId("micLabel").textContent = "🔴 Recording… Speak now";
    byId("voiceTranscript").textContent = "Listening…";
    byId("voiceResultArea").classList.remove("show");
  };

  recog.onresult = (e: any) => {
    let txt = "";
    for (let i = 0; i < e.results.length; i++) txt += e.results[i]?.[0]?.transcript ?? "";

    byId("voiceTranscript").textContent = txt;

    if (e.results[e.results.length - 1]?.isFinal) void doTranslate(txt);
  };

  recog.onerror = (e: any) => {
    stopMic();
    toast(e.error === "not-allowed" ? "🎙️ Microphone permission required" : `Error: ${e.error}`);
  };

  recog.onend = () => stopMicUI();
  recog.start();
}

export function stopMic(): void {
  try {
    recog?.stop();
  } catch {
    /* already stopped */
  }
  recog = null;
  stopMicUI();
}

function stopMicUI(): void {
  recording = false;
  byId("micBtn").className = "mic-btn idle";
  byId("micLabel").textContent = "Tap to start speaking";
}

// ── Translate ─────────────────────────────────────────────
async function doTranslate(text: string): Promise<void> {
  if (!text.trim()) return;

  byId("voiceTranslations").innerHTML =
    '<div style="color:rgba(255,255,255,.55);font-size:.82rem;padding:8px;text-align:center;">⏳ Translating…</div>';
  byId("voiceResultArea").classList.add("show");

  // voiceLang is stored for future per-language filtering if needed
  void voiceLang;

  try {
    const result = await fetchVoiceTranslation(text);

    byId("voiceTranslations").innerHTML = Object.entries(result)
      .map(
        ([lang, val]) =>
          `<div class="vrow"><span class="vrow-lang">${VOICE_LABELS[lang as Language]}</span><span class="vrow-txt">${val}</span></div>`
      )
      .join("");
  } catch {
    byId("voiceTranslations").innerHTML =
      '<div style="color:rgba(255,75,75,.9);padding:8px;font-size:.82rem;">Translation failed. Try again.</div>';
  }
}

function simulateVoice(): void {
  const samples = ["Hello, how are you?", "Kamusta ka na?", "Maayong buntag!"];
  const txt = samples[Math.floor(Math.random() * samples.length)] ?? samples[0];
  byId("voiceTranscript").textContent = txt;
  void doTranslate(txt);
}

export function clearVoice(): void {
  stopMic();
  byId("voiceTranscript").textContent = "Your speech will appear here…";
  byId("voiceResultArea").classList.remove("show");
  byId("voiceTranslations").innerHTML = "";
  byId("micLabel").textContent = "Tap to start speaking";
}
