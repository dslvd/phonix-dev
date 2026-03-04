// ─────────────────────────────────────────────────────────
// scan.ts — Camera scan-to-translate
// ─────────────────────────────────────────────────────────

import type { Language } from './types';
import { byId, showScreen, toast } from './dom';
import { fetchScanTranslation } from './api';
import { goHome } from './home';

let stream: MediaStream | null = null;
let scanLang: Language = "hiligaynon";

const SCAN_LABELS: Record<Language, string> = {
  hiligaynon: "🌺 Hiligaynon",
  tagalog: "🏙️ Tagalog",
  english: "🌎 English",
};

// ── Open / close ──────────────────────────────────────────
export async function openScan(): Promise<void> {
  showScreen("scan");
  byId("scanResult").classList.remove("show");

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    byId<HTMLVideoElement>("videoEl").srcObject = stream;
  } catch {
    toast("📷 Camera permission required");
    closeScan();
  }
}

export function closeScan(): void {
  stopStream();
  goHome();
}

export function stopStream(): void {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;

  const v = document.getElementById("videoEl") as HTMLVideoElement | null;
  if (v) v.srcObject = null;
}

export function retakeScan(): void {
  byId("scanResult").classList.remove("show");
}

// ── Language selector ─────────────────────────────────────
export function setScanLang(el: HTMLElement): void {
  document.querySelectorAll("#scanLangSel .lts").forEach((b) => b.classList.remove("sel"));
  el.classList.add("sel");
  scanLang = (el.dataset["lang"] as Language) ?? "hiligaynon";
}

// ── Capture + analyze ─────────────────────────────────────
export async function takeSnapshot(): Promise<void> {
  const video = byId<HTMLVideoElement>("videoEl");
  const canvas = byId<HTMLCanvasElement>("snapCanvas");

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  canvas.getContext("2d")?.drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = dataUrl.split(",")[1];
  if (!base64) return;

  // Show image + loading
  byId("snapImgWrap").innerHTML = `<img src="${dataUrl}" style="width:100%;border-radius:12px;" alt="Captured"/>`;
  byId("scanDetected").textContent = "🔍 Analyzing with AI…";
  byId("scanTranslations").innerHTML =
    '<div style="color:var(--mi);font-size:.82rem;padding:8px;">Translating…</div>';
  byId("scanResult").classList.add("show");

  try {
    const result = await fetchScanTranslation(base64, scanLang);

    byId("scanDetected").textContent = result.detected || "No text detected";
    byId("scanTranslations").innerHTML = Object.entries(result.translations)
      .map(
        ([lang, val]) =>
          `<div class="trow"><span class="trow-lang">${SCAN_LABELS[lang as Language]}</span><span class="trow-val">${val}</span></div>`
      )
      .join("");
  } catch {
    byId("scanDetected").textContent = "Could not analyze image.";
    byId("scanTranslations").innerHTML =
      '<div style="color:var(--re);font-size:.82rem;padding:8px;">Translation failed. Try again.</div>';
  }
}
