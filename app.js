const panel = document.getElementById("panel");
const actions = document.getElementById("actions");
const progressEl = document.getElementById("progress");
const modeButtons = document.querySelectorAll(".mode-btn");
const huvudFiltersEl = document.getElementById("huvud-filters");
const kapitelFiltersEl = document.getElementById("kapitel-filters");
const sideButtons = document.querySelectorAll(".side-btn");

/**
 * @typedef {{
 *   huvudkategori: string,
 *   psk_kapitel: number|null
 * }} Taxonomy
 * @typedef {{ id: string|number, question: string, answer: string, options: string[], taxonomy: Taxonomy }} Card
 */

/** @type {Card[]} */
let cards = [];
/** @type {Card[]} */
let order = [];
let index = 0;
/** @type {"flashcards" | "mcq"} */
let mode = "flashcards";
let revealed = false;
let answered = false;

/** @type {string|null} null = Alla */
let huvudFilter = null;
/** @type {Set<number>} empty = all chapters */
let kapitelFilter = new Set();

const CONTROLS_KEY = "psk-controls-side";
/** @type {"left"|"right"} */
let controlsSide = "right";

const HUVUD_CHIPS = [
  { value: null, label: "Alla", title: "Alla kategorier" },
  {
    value: "Säkerhetskaraktär",
    label: "Säkerhet",
    title: "Säkerhetskaraktär",
  },
  {
    value: "Skjutlära och utrustning",
    label: "Skjutlära",
    title: "Skjutlära och utrustning",
  },
  { value: "Övrigt", label: "Övrigt", title: "Övrigt" },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function current() {
  return order[index];
}

function setProgress() {
  if (!order.length) {
    progressEl.textContent = "";
    return;
  }
  progressEl.textContent = `${index + 1} / ${order.length}`;
}

function clearActions() {
  actions.innerHTML = "";
  actions.hidden = true;
}

function addButton(label, { primary = false, onClick } = {}) {
  actions.hidden = false;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = primary ? "btn btn-primary" : "btn";
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  // Primary on thumb edge: leftmost for left, rightmost for right
  if (controlsSide === "left") {
    if (primary) actions.prepend(btn);
    else actions.appendChild(btn);
  } else if (primary) {
    actions.appendChild(btn);
  } else {
    actions.prepend(btn);
  }
  return btn;
}

function matchesFilters(card) {
  const tax = card.taxonomy || {};
  if (huvudFilter && tax.huvudkategori !== huvudFilter) return false;
  if (kapitelFilter.size > 0) {
    const kap = tax.psk_kapitel;
    if (kap == null || !kapitelFilter.has(kap)) return false;
  }
  return true;
}

function applyFilters({ reshuffle = true } = {}) {
  const filtered = cards.filter(matchesFilters);
  order = reshuffle ? shuffle(filtered) : filtered;
  index = 0;
  revealed = false;
  answered = false;
  render();
}

function goNext() {
  if (index >= order.length - 1) {
    index = 0;
    order = shuffle(order);
  } else {
    index += 1;
  }
  revealed = false;
  answered = false;
  render();
}

function reshuffle() {
  order = shuffle(order);
  index = 0;
  revealed = false;
  answered = false;
  render();
}

function renderFlashcard() {
  const card = current();
  panel.innerHTML = "";

  const q = document.createElement("p");
  q.className = "question";
  q.textContent = card.question;
  panel.appendChild(q);

  if (revealed) {
    const a = document.createElement("p");
    a.className = "answer";
    a.textContent = card.answer;
    panel.appendChild(a);
  }

  clearActions();
  if (!revealed) {
    addButton("Visa svar", {
      primary: true,
      onClick: () => {
        revealed = true;
        render();
      },
    });
  } else {
    addButton("Nästa", { primary: true, onClick: goNext });
  }
  addButton("Blanda om", { onClick: reshuffle });
}

function renderMcq() {
  const card = current();
  panel.innerHTML = "";

  const q = document.createElement("p");
  q.className = "question";
  q.textContent = card.question;
  panel.appendChild(q);

  const list = document.createElement("div");
  list.className = "options";
  panel.appendChild(list);

  const feedback = document.createElement("p");
  feedback.className = "feedback";
  feedback.hidden = true;
  panel.appendChild(feedback);

  for (const option of card.options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.textContent = option;
    btn.disabled = answered;
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const correct = option === card.answer;
      for (const child of list.children) {
        child.disabled = true;
        if (child.textContent === card.answer) child.classList.add("is-correct");
      }
      if (correct) {
        btn.classList.add("is-correct");
        feedback.hidden = false;
        feedback.className = "feedback is-ok";
        feedback.textContent = "Rätt!";
      } else {
        btn.classList.add("is-wrong");
        feedback.hidden = false;
        feedback.className = "feedback is-bad";
        feedback.textContent = `Fel. Rätt svar: ${card.answer}`;
      }
      clearActions();
      addButton("Nästa", { primary: true, onClick: goNext });
      addButton("Blanda om", { onClick: reshuffle });
    });
    list.appendChild(btn);
  }

  clearActions();
  if (!answered) {
    addButton("Blanda om", { onClick: reshuffle });
  }
}

function render() {
  setProgress();
  if (!order.length) {
    panel.innerHTML = `<p class="status">Inga frågor i urvalet.</p>`;
    clearActions();
    return;
  }
  if (mode === "flashcards") renderFlashcard();
  else renderMcq();
}

function setMode(next) {
  mode = next;
  for (const btn of modeButtons) {
    btn.classList.toggle("is-active", btn.dataset.mode === mode);
  }
  revealed = false;
  answered = false;
  render();
}

function setControlsSide(side) {
  controlsSide = side === "left" ? "left" : "right";
  document.body.dataset.controls = controlsSide;
  try {
    localStorage.setItem(CONTROLS_KEY, controlsSide);
  } catch {
    /* ignore */
  }
  for (const btn of sideButtons) {
    btn.classList.toggle("is-active", btn.dataset.side === controlsSide);
  }
  // Re-render so primary button DOM order matches side
  if (order.length) render();
}

function loadControlsSide() {
  try {
    const stored = localStorage.getItem(CONTROLS_KEY);
    if (stored === "left" || stored === "right") return stored;
  } catch {
    /* ignore */
  }
  return "right";
}

function buildHuvudFilters() {
  huvudFiltersEl.innerHTML = "";

  const label = document.createElement("span");
  label.className = "filter-label";
  label.textContent = "Kategori";
  huvudFiltersEl.appendChild(label);

  const chips = document.createElement("div");
  chips.className = "filter-chips";
  huvudFiltersEl.appendChild(chips);

  for (const chip of HUVUD_CHIPS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-chip";
    btn.textContent = chip.label;
    btn.title = chip.title;
    btn.setAttribute("aria-label", chip.title);
    btn.classList.toggle("is-active", huvudFilter === chip.value);
    btn.addEventListener("click", () => {
      huvudFilter = chip.value;
      buildHuvudFilters();
      applyFilters();
    });
    chips.appendChild(btn);
  }
}

function availableChapters() {
  const set = new Set();
  for (const c of cards) {
    const kap = c.taxonomy?.psk_kapitel;
    if (typeof kap === "number") set.add(kap);
  }
  return [...set].sort((a, b) => a - b);
}

function buildKapitelFilters() {
  kapitelFiltersEl.innerHTML = "";
  const chapters = availableChapters();
  if (!chapters.length) return;

  const label = document.createElement("span");
  label.className = "filter-label";
  label.textContent = "Kapitel";
  kapitelFiltersEl.appendChild(label);

  const chips = document.createElement("div");
  chips.className = "filter-chips";
  kapitelFiltersEl.appendChild(chips);

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "filter-chip";
  allBtn.textContent = "Alla";
  allBtn.title = "Alla kapitel";
  allBtn.setAttribute("aria-label", "Alla kapitel");
  allBtn.classList.toggle("is-active", kapitelFilter.size === 0);
  allBtn.addEventListener("click", () => {
    kapitelFilter.clear();
    buildKapitelFilters();
    applyFilters();
  });
  chips.appendChild(allBtn);

  for (const kap of chapters) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-chip filter-chip-num";
    btn.textContent = String(kap);
    btn.title = `PSK kapitel ${kap}`;
    btn.setAttribute("aria-label", `PSK kapitel ${kap}`);
    btn.classList.toggle("is-active", kapitelFilter.has(kap));
    btn.addEventListener("click", () => {
      if (kapitelFilter.has(kap)) kapitelFilter.delete(kap);
      else kapitelFilter.add(kap);
      buildKapitelFilters();
      applyFilters();
    });
    chips.appendChild(btn);
  }
}

for (const btn of modeButtons) {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
}

for (const btn of sideButtons) {
  btn.addEventListener("click", () => setControlsSide(btn.dataset.side));
}

async function init() {
  setControlsSide(loadControlsSide());
  try {
    const res = await fetch("./quiz.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cards = Array.isArray(data.questions) ? data.questions : [];
    if (!cards.length) throw new Error("Tom frågebank");
    buildHuvudFilters();
    buildKapitelFilters();
    applyFilters();
  } catch (err) {
    panel.innerHTML = `<p class="status">Kunde inte ladda quizdata.</p>`;
    clearActions();
  }
}

init();
