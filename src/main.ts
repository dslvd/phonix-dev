// ─────────────────────────────────────────────────────────
// main.ts — Entry point. Exposes every function to window
//           so inline HTML onclick="xxx()" handlers work.
// ─────────────────────────────────────────────────────────

import { S } from './state';
import {
  onGoogleToken,
  guestLogin,
  signOut,
  openCidModal as openModal,
  closeCidModal as closeModal,
  saveCidModal as saveCid,
  initGoogleAuth,
  onLoginCallback,
} from './auth';
import { enterHome, goHome, pickLanguage, navigateTo } from './home';
import { nextQuestion, getHint } from './lesson';
import { openScan, closeScan, retakeScan, setScanLang, takeSnapshot, stopStream } from './scan';
import { openVoice, closeVoice, setVoiceLang, toggleMic, clearVoice, stopMic } from './voice';

// Wire auth → home
onLoginCallback(enterHome);

// ── Expose to window (fixes inline onclick="xxx()" calls) ─
//    Every function used in HTML must appear here.
const W = window as any;

// Auth
W["onGoogleToken"] = onGoogleToken; // called by Google SDK
W["guestLogin"] = guestLogin;
W["signOut"] = signOut;
W["openModal"] = openModal;
W["closeModal"] = closeModal;
W["saveCid"] = saveCid;

// Navigation
W["goHome"] = goHome;
W["navTo"] = (screen: string) => navigateTo(screen);
W["pickLang"] = (lang: string, el: HTMLElement) => pickLanguage(lang, el);

// Lesson
W["nextQ"] = nextQuestion;
W["getHint"] = () => void getHint();

// Scan
W["openScan"] = () => void openScan();
W["closeScan"] = closeScan;
W["retakeScan"] = retakeScan;
W["setScanLang"] = setScanLang;
W["takeSnapshot"] = () => void takeSnapshot();

// Voice
W["openVoice"] = openVoice;
W["closeVoice"] = closeVoice;
W["setVoiceLang"] = setVoiceLang;
W["toggleMic"] = toggleMic;
W["clearVoice"] = clearVoice;

// ── Boot ──────────────────────────────────────────────────
window.addEventListener("load", () => {
  // Restore language card highlight
  document.querySelectorAll(".lc").forEach((c) => c.classList.remove("sel"));
  document.getElementById(`lc-${S.lang}`)?.classList.add("sel");

  if (S.user) {
    enterHome();
  } else {
    initGoogleAuth();
  }
});

// Cleanup on unload
window.addEventListener("beforeunload", () => {
  stopStream();
  stopMic();
});
