// ─────────────────────────────────────────────────────────
// home.ts — Home screen, leaderboard, profile
// ─────────────────────────────────────────────────────────

import type { Language } from './types';
import { S, saveState } from './state';
import { byId, showScreen } from './dom';
import { renderSearch } from './search';

const GREETINGS: Record<Language, string> = {
  hiligaynon: "Maayong adlaw! 👋",
  tagalog: "Magandang araw! 👋",
  english: "Good day! 👋",
};

const LANG_LABELS: Record<Language, string> = {
  hiligaynon: "🌺 Hiligaynon",
  tagalog: "🏙️ Tagalog",
  english: "🌎 English",
};

// ── Enter home ────────────────────────────────────────────
export function enterHome(): void {
  updateTopBar();
  renderSearch(); // replaces lesson list with AI search
  showScreen("home");
}

export function goHome(): void {
  updateTopBar();
  showScreen("home");
}

// ── Top bar ───────────────────────────────────────────────
function updateTopBar(): void {
  const av = byId("hAv");
  if (S.user?.picture) {
    av.innerHTML = `<img src="${S.user.picture}" alt="${S.user.name}">`;
  } else {
    av.textContent = S.user?.initials ?? "G";
  }

  byId("sNum").textContent = String(S.streak);
  byId("xNum").textContent = String(S.xp);
  byId("hGreet").textContent = GREETINGS[S.lang];
}

// ── Language picker ───────────────────────────────────────
export function pickLanguage(lang: string, el: HTMLElement): void {
  document.querySelectorAll(".lc").forEach((c) => c.classList.remove("sel"));
  el.classList.add("sel");

  S.lang = lang as Language;
  saveState();

  byId("hGreet").textContent = GREETINGS[lang as Language];
  renderSearch(); // refresh chips for new language
}

// ── Nav ───────────────────────────────────────────────────
export function navigateTo(screen: string): void {
  // Sync all bottom navbars
  document.querySelectorAll(".bnav .ni").forEach((n) => {
    const lbl = n.querySelector(".ni-lbl")?.textContent?.toLowerCase() ?? "";
    n.classList.toggle("act", lbl === screen || (screen === "leaderboard" && lbl === "leaders"));
  });

  if (screen === "leaderboard") renderLeaderboard();
  if (screen === "profile") renderProfile();

  showScreen(screen);
}

// ── Leaderboard ───────────────────────────────────────────
interface Player {
  n: string;
  xp: number;
  me?: boolean;
}

const MOCK: Player[] = [
  { n: "Maria Santos", xp: 1240 },
  { n: "Jose Reyes", xp: 980 },
  { n: "Ana Garcia", xp: 875 },
  { n: "Carlos Bautista", xp: 720 },
  { n: "Lisa Cruz", xp: 610 },
  { n: "Marco Torres", xp: 530 },
  { n: "Diana Lim", xp: 420 },
  { n: "Kevin Ong", xp: 380 },
];

function renderLeaderboard(): void {
  byId("lbXp").textContent = String(S.xp);

  const players = [
    ...MOCK,
    { n: S.user?.name ?? "You", xp: S.xp, me: true },
  ].sort((a, b) => b.xp - a.xp);

  byId("lbList").innerHTML = players
    .map((p, i) => {
      const rankCls = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
      return `
        <div class="lb-row${p.me ? " lb-me" : ""}">
          <div class="lb-rank ${rankCls}">${i + 1}</div>
          <div class="lb-name">${p.me ? "⭐ " + p.n : p.n}</div>
          <div class="lb-xp">⚡ ${p.xp} XP</div>
        </div>`;
    })
    .join("");
}

// ── Profile ───────────────────────────────────────────────
function renderProfile(): void {
  const pa = byId("profAv");
  if (S.user?.picture) {
    pa.innerHTML = `<img src="${S.user.picture}" alt="${S.user.name}">`;
  } else {
    pa.textContent = S.user?.initials ?? "G";
  }

  byId("profNm").textContent = S.user?.name ?? "Guest";
  byId("profEm").textContent = S.user?.email ?? "";

  byId("pXP").textContent = String(S.xp);
  byId("pSt").textContent = String(S.streak);
  byId("pLs").textContent = String(S.done.length);

  const langs: Language[] = ["hiligaynon", "tagalog", "english"];
  byId("langProg").innerHTML = langs
    .map((lang) => {
      const done = S.done.filter((id) => id.startsWith(lang[0] ?? "")).length;
      return `
        <div class="lpr">
          <div class="lprt">
            <span class="lprn">${LANG_LABELS[lang]}</span>
            <span class="lprp">${done} lessons done</span>
          </div>
          <div class="lprb">
            <div class="lprf" style="width:${Math.min(done * 15, 100)}%"></div>
          </div>
        </div>`;
    })
    .join("");
}
