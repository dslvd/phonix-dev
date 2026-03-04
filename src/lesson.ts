// ─────────────────────────────────────────────────────────
// lesson.ts — Quiz engine (works with both static & AI lessons)
// ─────────────────────────────────────────────────────────

import type { AILesson, Question } from './types';
import { S, LS, saveState, resetLesson } from './state';
import { byId, showScreen, shuffle, praise, esc, confetti } from './dom';
import { fetchHint } from './api';

// ── Start a lesson from AI-generated data ─────────────────
export function startAILesson(lesson: AILesson, idx: number): void {
  if (!lesson.questions.length) {
    toast("No questions generated!");
    return;
  }
  resetLesson({ idx, qs: shuffle(lesson.questions) });
  updateHearts();
  showScreen("lesson");
  loadQ();
}

// ── Internal quiz engine ──────────────────────────────────
function loadQ(): void {
  const q = LS.qs[LS.qi];
  if (!q) return;

  const total = LS.qs.length;
  const pct = (LS.qi / total) * 100;

  byId("pFill").style.width = `${pct}%`;
  byId("qCtr").textContent = `${LS.qi + 1}/${total}`;
  byId("qChip").textContent = q.t === "mc" ? "🌐 Multiple Choice" : "✏️ Fill in the Blank";
  byId("qImg").textContent = q.img;
  byId("qTxt").textContent = q.p;
  byId("qSub").textContent = "";

  // Reset feedback UI
  byId("fbBar").style.display = "none";
  byId("nBtn").style.display = "none";
  byId("fbAI").style.display = "none";

  const hb = byId<HTMLButtonElement>("hintBtn");
  hb.disabled = false;
  hb.textContent = "✨ Get AI Hint";

  LS.answered = false;
  renderBody(q);
}

function renderBody(q: Question): void {
  const body = byId("qBody");

  if (q.t === "mc") {
    const opts = shuffle(q.c!);
    body.innerHTML = `<div class="choices">${opts
      .map((o) => `<button class="cbtn" data-val="${esc(o)}" data-ans="${esc(q.a)}">${o}</button>`)
      .join("")}</div>`;

    body.querySelectorAll(".cbtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosen = (btn as HTMLElement).dataset["val"] ?? "";
        const correct = (btn as HTMLElement).dataset["ans"] ?? "";
        answerMC(btn as HTMLButtonElement, chosen, correct);
      });
    });
  } else {
    body.innerHTML = `
      <div class="fib-wrap">
        <input class="fib-in" id="fIn" placeholder="Type your answer…" autocomplete="off"/>
        <button class="fib-btn" id="fBtn">Check Answer ✓</button>
      </div>`;

    const fBtn = byId("fBtn");
    const fIn = byId<HTMLInputElement>("fIn");

    fBtn.addEventListener("click", checkFIB);
    fIn.addEventListener("keydown", (e) => {
      if (e.key === "Enter") checkFIB();
    });

    setTimeout(() => fIn.focus(), 80);
  }
}

function answerMC(clicked: HTMLButtonElement, chosen: string, correct: string): void {
  if (LS.answered) return;
  LS.answered = true;

  document.querySelectorAll(".cbtn").forEach((b) => {
    (b as HTMLButtonElement).disabled = true;
    const val = (b as HTMLElement).dataset["val"] ?? "";
    if (val === correct) b.classList.add("cor");
    else if (val === chosen && val !== correct) b.classList.add("wrg");
  });

  void clicked; // used via dataset above
  showFeedback(chosen === correct, correct);
}

function checkFIB(): void {
  if (LS.answered) return;

  const q = LS.qs[LS.qi];
  if (!q) return;

  const inp = byId<HTMLInputElement>("fIn");
  const ok = inp.value.trim().toLowerCase() === q.a.toLowerCase();

  inp.disabled = true;
  inp.classList.add(ok ? "cor" : "wrg");
  byId<HTMLButtonElement>("fBtn").disabled = true;

  LS.answered = true;
  showFeedback(ok, q.a);
}

function showFeedback(ok: boolean, right: string): void {
  if (ok) {
    LS.correct++;
  } else {
    LS.hearts = Math.max(0, LS.hearts - 1);
    updateHearts();
  }

  const fb = byId("fbBar");
  fb.style.display = "flex";
  fb.className = `fb ${ok ? "cor" : "wrg"}`;

  byId("fbIco").textContent = ok ? "🎉" : "❌";
  byId("fbT").textContent = ok ? praise() : "Oops!";
  byId("fbD").textContent = ok ? "" : `Correct answer: ${right}`;

  byId("nBtn").style.display = "block";
}

export function nextQuestion(): void {
  LS.qi++;
  if (LS.qi >= LS.qs.length || LS.hearts === 0) {
    finishLesson();
  } else {
    loadQ();
  }
}

function finishLesson(): void {
  const acc = Math.round((LS.correct / Math.max(LS.qs.length, 1)) * 100);
  const earned = Math.max(5, Math.round((acc / 100) * 30));

  S.xp += earned;
  S.streak = Math.min(S.streak + 1, 99);
  saveState();

  byId("cSub").textContent =
    acc === 100 ? "Perfect score! 🌟" : acc >= 80 ? "Great job!" : "Keep practicing!";
  byId("xpE").textContent = `+${earned} XP`;
  byId("sAc").textContent = `${acc}%`;
  byId("sCo").textContent = `${LS.correct}/${LS.qs.length}`;
  byId("sSt").textContent = `🔥${S.streak}`;

  showScreen("complete");
  confetti();
}

// ── AI Hint ───────────────────────────────────────────────
export async function getHint(): Promise<void> {
  if (LS.answered) return;

  const q = LS.qs[LS.qi];
  if (!q) return;

  const btn = byId<HTMLButtonElement>("hintBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Thinking…';

  try {
    const hint = await fetchHint(q.p, q.a, S.lang);
    const ai = byId("fbAI");
    ai.style.display = "block";
    ai.innerHTML = `<b>✨ AI Hint:</b> ${hint}`;
  } catch {
    const ai = byId("fbAI");
    if (q.h) {
      ai.style.display = "block";
      ai.innerHTML = `<b>💡 Hint:</b> ${q.h}`;
    } else {
      toast("Hint unavailable right now");
    }
  } finally {
    btn.textContent = "💡 Hint shown";
  }
}

function updateHearts(): void {
  byId("hRow").innerHTML = Array.from(
    { length: 3 },
    (_, i) => `<span class="h">${i < LS.hearts ? "❤️" : "🖤"}</span>`
  ).join("");
}

function toast(msg: string): void {
  import('./dom').then(({ toast: toastFn }) => toastFn(msg));
}
