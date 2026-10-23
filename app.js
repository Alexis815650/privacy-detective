"use strict";

const $ = (selector) => document.querySelector(selector);

const screens = {
  intro: $("#intro-screen"),
  game: $("#game-screen"),
  review: $("#review-screen"),
  results: $("#results-screen")
};

const chapters = [
  {
    title: "The Password Breach",
    objective: "Solve the five-letter password puzzle before the attacker gets in."
  },
  {
    title: "The Access Request",
    objective: "Choose the safest practical level of access for a contractor."
  },
  {
    title: "The Privacy Incident",
    objective: "Respond when the app shares information it should not have shared."
  },
  {
    title: "Build the Data Pathway",
    objective: "Connect app development to a working app without unnecessary data."
  }
];

const state = {
  chapter: 0,
  trust: 0,
  evidence: [],
  choices: {},
  wordGuesses: [],
  wordSolved: false,
  cordSelection: [],
  cordChecked: false,
  quizIndex: 0,
  quizScore: 0,
  quizAnswers: [],
  quizLocked: false
};

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateScore(points) {
  state.trust = Math.max(0, Math.min(100, state.trust + points));
  $("#trust-score").textContent = state.trust;
}

function setFeedback(message, good = true) {
  const box = $("#mission-feedback");
  box.innerHTML = message;
  box.className = "mission-feedback show" + (good ? "" : " bad");
}

function clearFeedback() {
  $("#mission-feedback").className = "mission-feedback";
  $("#mission-feedback").innerHTML = "";
}

function addEvidence(text) {
  if (!state.evidence.includes(text)) state.evidence.push(text);

  const list = $("#evidence-list");
  list.innerHTML = "";

  state.evidence.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

function updateProgress() {
  $("#chapter-count").textContent =
    `MISSION ${String(state.chapter + 1).padStart(2, "0")} / 04`;
  $("#chapter-heading").textContent = chapters[state.chapter].title;
  $("#objective-text").textContent = chapters[state.chapter].objective;
  $("#story-progress").style.width = `${(state.chapter / 4) * 100}%`;
  $("#status-label").textContent = "MISSION IN PROGRESS";
  $("#trust-score").textContent = state.trust;
}

function startGame() {
  state.chapter = 0;
  state.trust = 0;
  state.evidence = [];
  state.choices = {};
  state.wordGuesses = [];
  state.wordSolved = false;
  state.cordSelection = [];
  state.cordChecked = false;
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswers = [];
  state.quizLocked = false;

  $("#evidence-list").innerHTML =
    '<li class="empty-evidence">No evidence yet.</li>';

  updateScore(0);
  showScreen("game");
  renderChapter();
}

function renderChapter() {
  updateProgress();
  clearFeedback();
  $("#mission-actions").innerHTML = "";

  if (state.chapter === 0) renderPasswordPuzzle();
  if (state.chapter === 1) renderAccessDecision();
  if (state.chapter === 2) renderPrivacyIncident();
  if (state.chapter === 3) renderCordPuzzle();
}

function addAction(label, callback, primary = false) {
  const button = document.createElement("button");
  button.className = primary ? "primary-button" : "secondary-button";
  button.textContent = label;
  button.addEventListener("click", callback);
  $("#mission-actions").appendChild(button);
  return button;
}

function nextChapter() {
  state.chapter++;

  if (state.chapter >= chapters.length) {
    state.quizIndex = 0;
    state.quizScore = 0;
    state.quizAnswers = [];
    state.quizLocked = false;
    showScreen("review");
    renderQuiz();
    return;
  }

  renderChapter();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

/* ==================================================
   MISSION 1: PASSWORD PUZZLE
================================================== */

const passwordAnswer = "TRUST";
const maxGuesses = 6;

function renderPasswordPuzzle() {
  $("#mission-content").innerHTML = `
    <div class="eyebrow">DIGITAL FORENSICS // 01</div>
    <h2>The Password Breach</h2>
    <p>An attacker is trying to access the fictional Connectly app.
    Solve the five-letter password in six attempts.</p>
    <div class="terminal">
      <div class="terminal-top">CONNECTLY AUTHENTICATION TERMINAL // OFFLINE</div>
      <p>ACCESS LOCKED. PASSWORD LENGTH: 5</p>
      <p>GREEN = correct letter and position.</p>
      <p>GOLD = correct letter, wrong position.</p>
      <p>GRAY = letter not used in the password.</p>
      <p><strong>KEY CLUE:</strong> A secret is safer when you don't tell everyone.</p>
    </div>
    <div class="story-email">
      <div class="email-head">ENCRYPTION KEY // HOW TO THINK ABOUT IT</div>
      <p>In this puzzle, the hidden password is like a secret key: you use the clue
      and the computer's letter-by-letter feedback to reason toward the value.</p>
      <p><strong>Real-world distinction:</strong> real encryption keys are generated
      and used by cryptographic algorithms; people don't normally discover them by
      playing Wordle. This puzzle is an analogy for protecting secrets and using
      systematic feedback, not a demonstration of real encryption.</p>
    </div>
    <div id="wordle-grid" class="wordle-grid" aria-label="Password puzzle board"></div>
    <form id="guess-form" class="guess-form">
      <input id="guess-input" type="text" minlength="5" maxlength="5"
        pattern="[A-Za-z]{5}" autocomplete="off"
        aria-label="Enter a five-letter guess" placeholder="GUESS">
      <button class="primary-button" type="submit">CHECK</button>
    </form>
    <p class="inline-note" id="guess-note">Attempt 1 of 6</p>
  `;

  const grid = $("#wordle-grid");

  for (let row = 0; row < maxGuesses; row++) {
    const rowEl = document.createElement("div");
    rowEl.className = "wordle-row";
    rowEl.id = `word-row-${row}`;

    for (let col = 0; col < 5; col++) {
      const cell = document.createElement("div");
      cell.className = "letter-cell";
      cell.id = `word-cell-${row}-${col}`;
      rowEl.appendChild(cell);
    }

    grid.appendChild(rowEl);
  }

  $("#guess-form").addEventListener("submit", (event) => {
    event.preventDefault();
    evaluateGuess();
  });

  $("#guess-input").focus({ preventScroll: true });
}

function evaluateGuess() {
  if (state.wordSolved || state.wordGuesses.length >= maxGuesses) return;

  const input = $("#guess-input");
  const guess = input.value.trim().toUpperCase();

  if (!/^[A-Z]{5}$/.test(guess)) {
    $("#guess-note").textContent = "Enter exactly five letters.";
    return;
  }

  const rowIndex = state.wordGuesses.length;
  state.wordGuesses.push(guess);

  const remaining = passwordAnswer.split("");
  const result = Array(5).fill("absent");

  for (let i = 0; i < 5; i++) {
    if (guess[i] === passwordAnswer[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;

    const found = remaining.indexOf(guess[i]);
    if (found !== -1) {
      result[i] = "present";
      remaining[found] = null;
    }
  }

  for (let i = 0; i < 5; i++) {
    const cell = $(`#word-cell-${rowIndex}-${i}`);
    cell.textContent = guess[i];
    cell.classList.add(result[i]);
  }

  if (guess === passwordAnswer) {
    state.wordSolved = true;
    updateScore(10);
    addEvidence("Solved the password puzzle.");
    setFeedback(
      "<strong>ACCESS RESTORED — +10 POINTS.</strong> You solved the password. " +
      "Real apps should also use secure password storage, rate limiting, and " +
      "appropriate authentication protections."
    );
    $("#guess-form").remove();
    addAction("NEXT: ACCESS CONTROL →", nextChapter, true);
    return;
  }

  if (state.wordGuesses.length >= maxGuesses) {
    setFeedback(
      `Attempts exhausted. The training password was <strong>${passwordAnswer}</strong>. ` +
      "Continue to learn how access permissions and data handling protect an app.",
      false
    );
    $("#guess-form").remove();
    addAction("CONTINUE →", nextChapter, true);
    return;
  }

  $("#guess-note").textContent =
    `Attempt ${state.wordGuesses.length + 1} of ${maxGuesses}`;
  input.value = "";
  input.focus();
}

/* ==================================================
   MISSION 2: ACCESS CONTROL
================================================== */

function renderAccessDecision() {
  $("#mission-content").innerHTML = `
    <div class="eyebrow">PERMISSIONS REVIEW // 02</div>
    <h2>The Access Request</h2>
    <p>A contractor is helping fix a bug in Connectly. They ask for access
    to the production system. Which option gives them enough access to do
    the job without exposing everything?</p>

    <div class="story-email">
      <div class="email-head">INCOMING REQUEST // CONTRACTOR</div>
      “I need to investigate the login issue. Can you give me access today?”
    </div>

    <div class="choice-list">
      <button class="choice-button" data-access="limited">
        <strong>A — Limited, temporary access</strong>
        <span>Grant only the permissions needed for the bug, set an expiry,
        and review activity.</span>
      </button>
      <button class="choice-button" data-access="admin">
        <strong>B — Full administrator access</strong>
        <span>Give access to every account, database, and production setting.</span>
      </button>
      <button class="choice-button" data-access="dump">
        <strong>C — Export the full user database</strong>
        <span>Send a copy of all user information to the contractor's personal email.</span>
      </button>
    </div>
  `;

  document.querySelectorAll("[data-access]").forEach((button) => {
    button.addEventListener("click", () => chooseAccess(button.dataset.access, button));
  });
}

function chooseAccess(choice, button) {
  if (state.choices.access) return;
  state.choices.access = choice;

  document.querySelectorAll("[data-access]").forEach((item) => {
    item.disabled = true;
    if (item === button) item.classList.add("chosen");
  });

  if (choice === "limited") {
    updateScore(25);
    addEvidence("Chose limited, temporary contractor access.");
    button.classList.add("correct-choice");
    setFeedback(
      "<strong>GOOD SECURITY DECISION — +25 POINTS.</strong> This follows " +
      "least privilege: give a person only the access needed for their task. " +
      "Time limits, logging, and review further reduce risk."
    );
  } else if (choice === "admin") {
    addEvidence("Granted overly broad contractor access.");
    button.classList.add("wrong-choice");
    setFeedback(
      "<strong>TOO MUCH ACCESS — +0 POINTS.</strong> Unrestricted access can " +
      "expose systems and user information unnecessarily. Narrow the permissions " +
      "and set an expiry.",
      false
    );
  } else {
    updateScore(5);
    addEvidence("Considered an unsafe full-database export.");
    button.classList.add("wrong-choice");
    setFeedback(
      "<strong>HIGH-RISK SHORTCUT — +5 POINTS.</strong> Sending a full database " +
      "to a personal email exposes information beyond the task. Use an approved " +
      "environment and limit the data used for debugging.",
      false
    );
  }

  addAction("NEXT: PRIVACY INCIDENT →", nextChapter, true);
}

/* ==================================================
   MISSION 3: PRIVACY INCIDENT
================================================== */

function renderPrivacyIncident() {
  $("#mission-content").innerHTML = `
    <div class="eyebrow">INCIDENT RESPONSE // 03</div>
    <h2>The Privacy Incident</h2>
    <p>A developer discovers that Connectly sends precise location history
    to an analytics partner, even though location tracking is not needed
    for the app's advertised features.</p>

    <div class="story-email">
      <div class="email-head">INTERNAL ALERT // DATA FLOW MISMATCH</div>
      <p><strong>Issue:</strong> Location history is being transmitted without
      a clear need for the app's stated purpose.</p>
      <p><strong>Risk:</strong> Users may not understand what is collected or
      who receives it.</p>
    </div>

    <p><strong>What should you do first?</strong></p>

    <div class="choice-list">
      <button class="choice-button" data-incident="stop">
        <strong>A — Stop the unnecessary sharing and investigate</strong>
        <span>Contain the data flow, preserve relevant records, and assess the
        appropriate next steps.</span>
      </button>
      <button class="choice-button" data-incident="hide">
        <strong>B — Hide it from users</strong>
        <span>Leave the feature running and remove references to it from documentation.</span>
      </button>
      <button class="choice-button" data-incident="delete">
        <strong>C — Delete the logs immediately</strong>
        <span>Erase the records so no one can discover what happened.</span>
      </button>
    </div>
  `;

  document.querySelectorAll("[data-incident]").forEach((button) => {
    button.addEventListener("click", () => chooseIncident(button.dataset.incident, button));
  });
}

function chooseIncident(choice, button) {
  if (state.choices.incident) return;
  state.choices.incident = choice;

  document.querySelectorAll("[data-incident]").forEach((item) => {
    item.disabled = true;
    if (item === button) item.classList.add("chosen");
  });

  if (choice === "stop") {
    updateScore(25);
    addEvidence("Selected a responsible privacy incident response.");
    button.classList.add("correct-choice");
    setFeedback(
      "<strong>RESPONSIBLE RESPONSE — +25 POINTS.</strong> Contain the unnecessary " +
      "sharing, investigate the scope, preserve appropriate evidence, and involve " +
      "the responsible privacy and security team. Assess whether notice or other " +
      "action is required under applicable law; reporting obligations depend on the facts."
    );
  } else if (choice === "hide") {
    addEvidence("Chose concealment instead of incident response.");
    button.classList.add("wrong-choice");
    setFeedback(
      "<strong>CONCEALMENT MAKES THINGS WORSE — +0 POINTS.</strong> Hiding the " +
      "practice leaves the risk in place and may mislead users. The FTC Act can " +
      "address deceptive practices in or affecting commerce, depending on the facts.",
      false
    );
  } else {
    addEvidence("Chose to erase incident records.");
    button.classList.add("wrong-choice");
    setFeedback(
      "<strong>DO NOT DESTROY THE EVIDENCE — +0 POINTS.</strong> Follow incident " +
      "response procedures to preserve appropriate records. You need reliable " +
      "evidence to understand what happened and determine the right corrective action.",
      false
    );
  }

  addAction("NEXT: BUILD THE DATA PATHWAY →", nextChapter, true);
}

/* ==================================================
   MISSION 4: CORD-ROUTING PUZZLE
================================================== */

const nodes = {
  start:   { x: 58,  y: 205, label: "APP",        sub: "DEVELOPMENT" },
  account: { x: 225, y: 92,  label: "ACCOUNT",    sub: "SETUP" },
  extra1:  { x: 225, y: 318, label: "CONTACTS",   sub: "IMPORT" },
  profile: { x: 430, y: 92,  label: "PROFILE",    sub: "DISPLAY" },
  extra2:  { x: 430, y: 205, label: "LOCATION",   sub: "TRACKING" },
  extra3:  { x: 430, y: 318, label: "MICROPHONE", sub: "ACCESS" },
  recovery:{ x: 640, y: 92,  label: "PASSWORD",   sub: "RECOVERY" },
  extra4:  { x: 640, y: 318, label: "AD TRACKING",sub: "PROFILE" },
  finish:  { x: 842, y: 205, label: "WORKING",    sub: "APP" }
};

const cords = [
  { id: "email", from: "start", to: "account",
    label: "Email → account", needed: true, lx: 138, ly: 130 },
  { id: "contacts", from: "start", to: "extra1",
    label: "Contacts → signup", needed: false, lx: 140, ly: 286 },
  { id: "display", from: "account", to: "profile",
    label: "Display name → profile", needed: true, lx: 330, ly: 69 },
  { id: "location", from: "account", to: "extra2",
    label: "Location history", needed: false, lx: 328, ly: 143 },
  { id: "contact-sync", from: "extra1", to: "extra2",
    label: "Contact sync", needed: false, lx: 327, ly: 287 },
  { id: "microphone", from: "extra2", to: "extra3",
    label: "Microphone access", needed: false, lx: 430, ly: 263 },
  { id: "reset", from: "profile", to: "recovery",
    label: "Reset token → recovery", needed: true, lx: 535, ly: 69 },
  { id: "ad-id", from: "extra3", to: "extra4",
    label: "Advertising ID", needed: false, lx: 535, ly: 287 },
  { id: "secure-session", from: "recovery", to: "finish",
    label: "Secure login session", needed: true, lx: 745, ly: 130 },
  { id: "analytics", from: "extra4", to: "finish",
    label: "Full analytics bundle", needed: false, lx: 745, ly: 286 }
];

function renderCordPuzzle() {
  state.cordSelection = [];
  state.cordChecked = false;

  $("#mission-content").innerHTML = `
    <div class="eyebrow">SYSTEM DESIGN // 04</div>
    <h2>Build the Data Pathway</h2>
    <p>Your app needs account creation, a display name, and password recovery.
    Connect the start to the working app with the fewest necessary data connections.</p>

    <div class="cord-instructions">
      <strong>YOUR OBJECTIVE:</strong> Click cords to select or deselect them.
      Build a continuous route from <em>App Development</em> to <em>Working App</em>.
      Extra cords mean unnecessary data collection. Too few cords may leave the app broken.
    </div>

    <div class="cord-legend">
      <span class="legend-item"><span class="legend-line"></span> Available cord</span>
      <span class="legend-item"><span class="legend-line extra"></span> Selected cord</span>
    </div>

    <div class="cord-board-wrap">
      <svg id="cord-board" class="cord-board" viewBox="0 0 900 410"
        role="group" aria-label="Interactive data pathway puzzle"></svg>
      <div class="cord-board-caption">
        <span>START: APP DEVELOPMENT</span>
        <span id="cord-count">0 CORDS CONNECTED</span>
        <span>FINISH: WORKING APP</span>
      </div>
    </div>

    <div id="cord-key" class="cord-key"></div>
    <p id="cord-status" class="cord-status" aria-live="polite">
      Select a cord to build your route.
    </p>
  `;

  drawCordBoard();
  updateCordSelectionDisplay();
  addAction("CLEAR ALL CORDS", clearCords);
  addAction("TEST MY PATHWAY →", checkCordPath, true);
}

function drawCordBoard() {
  const svg = $("#cord-board");
  svg.innerHTML = "";

  cords.forEach((cord) => {
    const from = nodes[cord.from];
    const to = nodes[cord.to];
    const bendX = (from.x + to.x) / 2;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d",
      `M ${from.x} ${from.y} L ${bendX} ${from.y} L ${to.x} ${to.y}`);
    path.setAttribute("class", "cord-line");
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    path.setAttribute("aria-label", `${cord.label}. Select cord.`);
    path.dataset.cord = cord.id;
    path.addEventListener("click", () => toggleCord(cord.id));
    path.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleCord(cord.id);
      }
    });
    svg.appendChild(path);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", cord.lx);
    label.setAttribute("y", cord.ly);
    label.setAttribute("class", "cord-label");
    label.textContent = cord.label;
    svg.appendChild(label);
  });

  Object.entries(nodes).forEach(([id, node]) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", id === "start" || id === "finish" ? 32 : 27);
    circle.setAttribute("class",
      "cord-node" + (id === "start" || id === "finish" ? ` ${id}` : ""));
    group.appendChild(circle);

    const main = document.createElementNS("http://www.w3.org/2000/svg", "text");
    main.setAttribute("x", node.x);
    main.setAttribute("y", node.y - 3);
    main.setAttribute("class", "cord-node-text");
    main.textContent = node.label;
    group.appendChild(main);

    const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
    sub.setAttribute("x", node.x);
    sub.setAttribute("y", node.y + 10);
    sub.setAttribute("class", "cord-node-text");
    sub.setAttribute("font-size", "8");
    sub.textContent = node.sub;
    group.appendChild(sub);

    svg.appendChild(group);
  });
}

function toggleCord(id) {
  if (state.cordChecked) return;

  const index = state.cordSelection.indexOf(id);
  if (index >= 0) state.cordSelection.splice(index, 1);
  else state.cordSelection.push(id);

  updateCordSelectionDisplay();
}

function updateCordSelectionDisplay() {
  const key = $("#cord-key");
  if (!key) return;

  key.innerHTML = "";

  cords.forEach((cord) => {
    const selected = state.cordSelection.includes(cord.id);
    const tag = document.createElement("span");
    tag.className = "cord-tag" + (selected ? " selected" : "");
    tag.textContent = (selected ? "✓ " : "") + cord.label;
    key.appendChild(tag);
  });

  $("#cord-count").textContent =
    `${state.cordSelection.length} CORD${state.cordSelection.length === 1 ? "" : "S"} CONNECTED`;

  $("#cord-board").querySelectorAll(".cord-line").forEach((line) => {
    const selected = state.cordSelection.includes(line.dataset.cord);
    const cord = cords.find((item) => item.id === line.dataset.cord);
    line.classList.toggle("selected", selected);
    line.classList.toggle("needed", Boolean(cord?.needed));
    line.setAttribute("aria-pressed", String(selected));
  });

  $("#cord-status").textContent = state.cordChecked
    ? "Pathway tested. Review the feedback below."
    : state.cordSelection.length
      ? `${state.cordSelection.length} cord(s) selected. Keep connecting to the working app.`
      : "Select a cord to build your route.";
}

function clearCords() {
  if (state.cordChecked) return;
  state.cordSelection = [];
  updateCordSelectionDisplay();
  clearFeedback();
}

function hasCompletePath(selectedIds) {
  const selectedCords = cords.filter((cord) => selectedIds.includes(cord.id));
  const visited = new Set();

  function visit(nodeId) {
    if (nodeId === "finish") return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);

    const adjacent = selectedCords
      .filter((cord) => cord.from === nodeId || cord.to === nodeId)
      .map((cord) => cord.from === nodeId ? cord.to : cord.from);

    return adjacent.some(visit);
  }

  return visit("start");
}

function checkCordPath() {
  if (state.cordChecked) return;

  const selected = state.cordSelection;
  const selectedCords = cords.filter((cord) => selected.includes(cord.id));
  const hasPath = hasCompletePath(selected);
  const unnecessary = selectedCords.filter((cord) => !cord.needed);
  const missing = cords.filter(
    (cord) => cord.needed && !selected.includes(cord.id)
  );

  state.cordChecked = true;
  $("#mission-actions").innerHTML = "";

  $("#cord-board").querySelectorAll(".cord-line").forEach((line) => {
    line.style.cursor = "default";
  });

  if (hasPath && unnecessary.length === 0 && missing.length === 0) {
    updateScore(40);
    addEvidence("Built the minimum working data pathway.");
    setFeedback(
      "<strong>PERFECT ROUTE — +40 POINTS.</strong> You connected the app from " +
      "start to finish using only the necessary cords. Email supports account setup, " +
      "a display name supports the profile, a reset token supports recovery, and a " +
      "secure session supports sign-in. This demonstrates data minimization."
    );
  } else if (hasPath && unnecessary.length === 0) {
    updateScore(25);
    addEvidence("Built a working pathway without extra data connections.");
    setFeedback(
      "<strong>THE APP CONNECTS — +25 POINTS.</strong> Your route reaches the app " +
      "without unnecessary data connections, but an intended connection is missing. " +
      `Review these needed cords: <strong>${escapeHTML(missing.map(c => c.label).join("; "))}</strong>.`
    );
  } else if (hasPath) {
    updateScore(15);
    addEvidence("Built a working route but included extra data connections.");
    setFeedback(
      "<strong>THE APP WORKS, BUT COLLECTS TOO MUCH — +15 POINTS.</strong> " +
      `Unnecessary cords: <strong>${escapeHTML(unnecessary.map(c => c.label).join("; "))}</strong>. ` +
      "Extra data can increase privacy and security risks. Remove connections that " +
      "do not serve the stated purpose.",
      false
    );
  } else {
    addEvidence("The first data pathway did not reach the working app.");
    setFeedback(
      "<strong>THE PATHWAY IS BROKEN — +0 POINTS.</strong> Your selected cords do " +
      "not create a continuous route from start to finish. The goal is not to remove " +
      "all data; it is to use the minimum information needed for the app's features.",
      false
    );
  }

  const key = $("#cord-key");
  key.innerHTML = "";

  cords.forEach((cord) => {
    const tag = document.createElement("span");
    const selectedNow = selected.includes(cord.id);
    tag.className = "cord-tag" +
      (cord.needed ? " needed" : "") +
      (selectedNow ? " selected" : "");
    tag.textContent =
      (cord.needed ? "NEEDED: " : "EXTRA: ") + cord.label;
    key.appendChild(tag);
  });

  addAction("CONTINUE TO FINAL QUIZ →", nextChapter, true);
}

/* ==================================================
   FINAL REVIEW QUIZ
   Selecting an answer immediately checks it.
================================================== */

const quizQuestions = [
  {
    question: "What does data minimization mean when designing an app?",
    options: [
      "Collect every type of data in case it becomes useful.",
      "Collect and use only the information needed for a clear purpose.",
      "Never collect any information, even when a feature needs it.",
      "Keep all collected data forever."
    ],
    answer: 1,
    explanation: "Data minimization means limiting collection and use to what is needed for the stated purpose."
  },
  {
    question: "What is the principle of least privilege?",
    options: [
      "Everyone on the team should be an administrator.",
      "Users should share one account to simplify access.",
      "Give each person only the access needed for their task.",
      "Give contractors permanent access to avoid delays."
    ],
    answer: 2,
    explanation: "Least privilege limits access to the minimum needed for assigned work."
  },
  {
    question: "Which is the most responsible first response to unnecessary data sharing?",
    options: [
      "Hide the feature from the public.",
      "Stop or contain the unnecessary flow and investigate.",
      "Delete every record immediately.",
      "Ignore it if the app still works."
    ],
    answer: 1,
    explanation: "Contain the problem, preserve appropriate evidence, investigate, and assess what steps are required."
  },
  {
    question: "What does Section 5 of the FTC Act address?",
    options: [
      "Every app must collect no personal information whatsoever.",
      "It guarantees every data incident leads to a fine.",
      "It prohibits unfair or deceptive acts or practices in or affecting commerce.",
      "It applies only to government websites."
    ],
    answer: 2,
    explanation: "Section 5 addresses unfair or deceptive acts or practices in or affecting commerce. Whether it applies depends on the facts and law."
  }
];

function renderQuiz() {
  state.quizLocked = false;
  const question = quizQuestions[state.quizIndex];

  $("#quiz-counter").textContent =
    `QUESTION ${state.quizIndex + 1} / ${quizQuestions.length}`;
  $("#quiz-progress").style.width =
    `${(state.quizIndex / quizQuestions.length) * 100}%`;

  $("#quiz-content").innerHTML = `
    <h2 class="quiz-question">${escapeHTML(question.question)}</h2>
    <div id="quiz-options">
      ${question.options.map((option, index) => `
        <label class="quiz-option" data-option="${index}">
          <input type="radio" name="quiz-answer" value="${index}">
          <span>${escapeHTML(option)}</span>
        </label>
      `).join("")}
    </div>
    <p class="small-note">Select an answer to check it immediately.</p>
  `;

  $("#quiz-feedback").className = "mission-feedback";
  $("#quiz-feedback").innerHTML = "";
  $("#quiz-actions").innerHTML = "";

  // Listen for the answer selection itself.
  document.querySelectorAll('input[name="quiz-answer"]').forEach((input) => {
    input.addEventListener("change", () => checkQuizAnswer(Number(input.value)));
  });
}

function checkQuizAnswer(selectedIndex) {
  if (state.quizLocked) return;
  state.quizLocked = true;

  const question = quizQuestions[state.quizIndex];
  const correct = selectedIndex === question.answer;

  state.quizAnswers.push({ selected: selectedIndex, correct });
  if (correct) state.quizScore++;

  document.querySelectorAll(".quiz-option").forEach((option) => {
    const input = option.querySelector("input");
    const optionIndex = Number(option.dataset.option);

    input.disabled = true;
    option.classList.add("locked");

    if (optionIndex === question.answer) {
      option.classList.add("correct-answer");
      const mark = document.createElement("span");
      mark.className = "answer-mark";
      mark.textContent = "✓ CORRECT";
      option.appendChild(mark);
    } else if (optionIndex === selectedIndex) {
      option.classList.add("wrong-answer");
      const mark = document.createElement("span");
      mark.className = "answer-mark";
      mark.textContent = "✕ INCORRECT";
      option.appendChild(mark);
    }
  });

  const feedback = $("#quiz-feedback");
  feedback.innerHTML =
    `<strong>${correct ? "CORRECT!" : "NOT QUITE."}</strong> ` +
    escapeHTML(question.explanation);
  feedback.className = "mission-feedback show" + (correct ? "" : " bad");

  $("#quiz-actions").innerHTML = "";

  // FIX: Add the navigation button to the quiz's visible action area.
  // addAction() targets #mission-actions, which is not shown on the review screen.
  const nextButton = document.createElement("button");
  nextButton.className = "primary-button";
  nextButton.textContent =
    state.quizIndex === quizQuestions.length - 1
      ? "VIEW CASE REPORT →"
      : "NEXT QUESTION →";

  nextButton.addEventListener("click", () => {
    state.quizIndex++;

    if (state.quizIndex >= quizQuestions.length) {
      showResults();
    } else {
      renderQuiz();
    }
  });

  $("#quiz-actions").appendChild(nextButton);
}

/* ==================================================
   RESULTS AND REPLAY
================================================== */

function showResults() {
  showScreen("results");
  $("#final-score").textContent = state.trust;
  $("#story-progress").style.width = "100%";

  let rank;
  let summary;

  if (state.trust >= 80) {
    rank = "TRUST BUILDER";
    summary = "You made strong privacy-conscious decisions.";
  } else if (state.trust >= 55) {
    rank = "CAREFUL BUILDER";
    summary = "Your app has a solid start, but some decisions deserve another look.";
  } else {
    rank = "BUILD REVIEW";
    summary = "This case shows why privacy and security need to be part of design from the beginning.";
  }

  $("#rank-stamp").textContent = rank;
  $("#final-summary").textContent = summary;

  const strengths = $("#strength-list");
  strengths.innerHTML = "";

  if (!state.evidence.length) {
    strengths.innerHTML = "<li>No evidence was recorded.</li>";
  } else {
    state.evidence.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      strengths.appendChild(li);
    });
  }

  const reviewItems = [];

  if (!state.wordSolved) {
    reviewItems.push("Authentication needs strong, secure protections.");
  }

  if (state.choices.access !== "limited") {
    reviewItems.push("Use least privilege and time-limited access for contractors.");
  }

  if (state.choices.incident !== "stop") {
    reviewItems.push("Contain unnecessary sharing, investigate, and follow appropriate incident procedures.");
  }

  if (
    !state.cordSelection.length ||
    state.cordSelection.some((id) => !cords.find((cord) => cord.id === id)?.needed) ||
    !hasCompletePath(state.cordSelection)
  ) {
    reviewItems.push("Review the difference between necessary data flows and unnecessary collection.");
  }

  if (state.quizScore < 3) {
    reviewItems.push("Review data minimization, least privilege, incident response, and the FTC Act.");
  }

  if (!reviewItems.length) {
    reviewItems.push("Keep documenting data flows, reviewing permissions, and testing your privacy decisions.");
  }

  const reviewList = $("#review-list");
  reviewList.innerHTML = "";

  reviewItems.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    reviewList.appendChild(li);
  });

  $("#quiz-result").textContent = `${state.quizScore}/${quizQuestions.length} correct`;
  $("#quiz-summary").textContent =
    state.quizScore === quizQuestions.length
      ? "Excellent — you understood all four review questions."
      : "Review the explanations from the quiz to strengthen your understanding.";
}

$("#start-button").addEventListener("click", startGame);
$("#replay-button").addEventListener("click", startGame);

$("#home-link").addEventListener("click", (event) => {
  event.preventDefault();
  showScreen("intro");
});
