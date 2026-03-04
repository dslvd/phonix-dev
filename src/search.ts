// ─────────────────────────────────────────────────────────
// search.ts — AI-powered lesson search & generation
// ─────────────────────────────────────────────────────────

import type { Language, AILesson } from './types';
import { S } from './state';
import { byId, toast } from './dom';
import { fetchAILesson } from './api';
import { startAILesson } from './lesson';

// Cache generated lessons so repeats are instant
const lessonCache = new Map<string, AILesson>();

// Suggested topic chips per language
const SUGGESTIONS: Record<Language, string[]> = {
  hiligaynon: [
    "Animals", "Weather", "Market Shopping", "At the Farm",
    "School Supplies", "Feelings & Emotions", "Transport", "Days of the Week",
  ],
  tagalog: [
    "Jeepney Phrases", "Filipino Food", "Family Roles", "Time & Days",
    "At the Hospital", "Weather", "Emotions", "School Subjects",
  ],
  english: [
    "Job Interview", "At the Airport", "Shopping Phrases", "Email Writing",
    "Past Tense Verbs", "Prepositions", "Phrasal Verbs", "Small Talk",
  ],
};

// ── Render the search UI into #searchSection ──────────────
export function renderSearch(): void {
  const section = byId("searchSection");
  const chips = SUGGESTIONS[S.lang];

  section.innerHTML = `
    <div class="ai-search-wrap">
      <div class="ai-search-label">
        <span class="ai-badge">✨ AI</span>
        What do you want to learn today?
      </div>
      <div class="search-input-row">
        <input
          class="ai-search-input"
          id="lessonSearchInput"
          placeholder="e.g. Food, Greetings, Numbers, Travel…"
          autocomplete="off"
          maxlength="80"
        />
        <button class="search-go-btn" id="searchGoBtn">
          <span id="searchBtnContent">Go →</span>
        </button>
      </div>
      <div class="chip-row" id="chipRow">
        ${chips.map((c) => `<button class="topic-chip" data-topic="${c}">${c}</button>`).join("")}
      </div>
    </div>
    <div class="ai-lesson-result" id="aiLessonResult" style="display:none;"></div>
  `;

  // Wire up input & button
  const input = byId<HTMLInputElement>("lessonSearchInput");
  const goBtn = byId("searchGoBtn");

  goBtn.addEventListener("click", () => void handleSearch());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void handleSearch();
  });

  // Wire chip buttons
  byId("chipRow").querySelectorAll(".topic-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const topic = (chip as HTMLElement).dataset["topic"] ?? "";
      input.value = topic;
      void handleSearch();
    });
  });
}

// ── Handle search / lesson generation ────────────────────
async function handleSearch(): Promise<void> {
  const input = byId<HTMLInputElement>("lessonSearchInput");
  const topic = input.value.trim();

  if (!topic) {
    toast("Type a topic first!");
    return;
  }

  const cacheKey = `${S.lang}::${topic.toLowerCase()}`;

  // Check cache
  const cached = lessonCache.get(cacheKey);
  if (cached) {
    renderLessonCard(cached, cacheKey);
    return;
  }

  setSearchLoading(true);

  try {
    const lesson = await fetchAILesson(topic, S.lang);
    lessonCache.set(cacheKey, lesson);
    renderLessonCard(lesson, cacheKey);
  } catch (err) {
    console.error(err);
    toast("Couldn't generate lesson. Check your connection.");
    byId("aiLessonResult").style.display = "none";
  } finally {
    setSearchLoading(false);
  }
}

// ── Render the result card ────────────────────────────────
function renderLessonCard(lesson: AILesson, cacheKey: string): void {
  const result = byId("aiLessonResult");
  result.style.display = "block";

  const langLabel: Record<Language, string> = {
    hiligaynon: "🌺 Hiligaynon",
    tagalog: "🏙️ Tagalog",
    english: "🌎 English",
  };

  result.innerHTML = `
    <div class="lesson-card-ai">
      <div class="lca-top">
        <div class="lca-icon">${lesson.emoji}</div>
        <div class="lca-info">
          <div class="lca-title">${lesson.title}</div>
          <div class="lca-desc">${lesson.description}</div>
          <div class="lca-meta">
            <span class="lca-badge">${langLabel[S.lang]}</span>
            <span class="lca-badge">${lesson.questions.length} questions</span>
          </div>
        </div>
      </div>
      <div class="lca-preview">
        ${lesson.questions
          .slice(0, 3)
          .map(
            (q) => `
          <div class="lca-q-prev">
            <span class="lca-q-img">${q.img}</span>
            <span class="lca-q-txt">${q.p}</span>
            <span class="lca-q-type">${q.t === "mc" ? "MC" : "Fill"}</span>
          </div>`
          )
          .join("")}
        ${
          lesson.questions.length > 3
            ? `<div class="lca-more">+${lesson.questions.length - 3} more questions…</div>`
            : ""
        }
      </div>
      <button class="lca-start-btn" id="startAILessonBtn" data-key="${cacheKey}">
        ▶ Start This Lesson
      </button>
    </div>`;

  const startBtn = byId("startAILessonBtn");
  startBtn.addEventListener("click", () => {
    const key = (startBtn as HTMLElement).dataset["key"] ?? "";
    const l = lessonCache.get(key);
    if (l) startAILesson(l, 0);
  });

  // Smooth scroll into view
  setTimeout(() => result.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
}

// ── Loading state helpers ─────────────────────────────────
function setSearchLoading(loading: boolean): void {
  const btn = byId<HTMLButtonElement>("searchGoBtn");
  const content = byId("searchBtnContent");
  const input = byId<HTMLInputElement>("lessonSearchInput");

  btn.disabled = loading;
  input.disabled = loading;

  if (loading) {
    content.innerHTML = '<span class="spin"></span>';
    byId("aiLessonResult").style.display = "none";
  } else {
    content.textContent = "Go →";
  }
}
