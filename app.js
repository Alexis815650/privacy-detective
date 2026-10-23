
const $ = (id) => document.getElementById(id);

const screens = {
  home: $("home-screen"),
  game: $("game-screen")
};

const cases = [
  $("case-wordle"),
  $("case-cords"),
  $("case-access"),
  $("case-promise"),
  $("case-review"),
  $("results-screen")
];

let score = 0;
let currentCase = 0;
const maxScore = 100;

function addScore(points) {
  score = Math.max(0, Math.min(maxScore, score + points));
  $("score-display").textContent = score;
}

function updateProgress() {
  $("chapter-label").textContent =
    currentCase < 4
      ? `CASE 0${currentCase + 1} / 04`
      : currentCase === 4
        ? "FINAL REVIEW"
        : "INVESTIGATION COMPLETE";

  const titles = [
    "Crack the Key",
    "Connect the Cords",
    "Control the Access",
    "The Privacy Promise",
    "Final Review",
    "Case Closed"
  ];

  $("chapter-title").textContent = titles[currentCase] || "Case Closed";
  $("progress-fill").style.width =
    `${Math.min(100, (currentCase / 5) * 100)}%`;
  $("score-display").textContent = score;
}

function showCase(index) {
  currentCase = index;
  cases.forEach((element) => element.classList.add("hidden"));
  cases[index].classList.remove("hidden");
  updateProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("start-button").addEventListener("click", () => {
  screens.home.classList.remove("active");
  screens.game.classList.add("active");
  showCase(0);
});

function restartGame() {
  score = 0;
  currentCase = 0;
  screens.game.classList.remove("active");
  screens.home.classList.add("active");

  resetWordle();
  resetCords();
  resetChoiceCase("access");
  resetChoiceCase("promise");
  $("review-feedback").textContent = "";
  $("review-submit").disabled = false;
  $("review-questions").querySelectorAll("input").forEach((input) => {
    input.checked = false;
  });

  $("access-continue").classList.add("hidden");
  $("promise-continue").classList.add("hidden");
  $("key-explanation").classList.add("hidden");
  $("cord-result").classList.add("hidden");

  updateProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("restart-button").addEventListener("click", restartGame);

/* --------------------------------------------------
   CASE 1: WORDLE-STYLE ENCRYPTION KEY
-------------------------------------------------- */

const secretWord = "TRUST";
const maxGuesses = 6;
const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

let guesses = [];
let currentGuess = "";
let wordSolved = false;
let wordFailed = false;
let wordScoreAwarded = false;
let keyboardStatus = {};

function buildWordleBoard() {
  const board = $("wordle-board");
  board.innerHTML = "";

  for (let row = 0; row < maxGuesses; row++) {
    const rowElement = document.createElement("div");
    rowElement.className = "wordle-row";

    for (let col = 0; col < 5; col++) {
      const tile = document.createElement("div");
      tile.className = "wordle-tile";
      tile.id = `tile-${row}-${col}`;
      rowElement.appendChild(tile);
    }

    board.appendChild(rowElement);
  }
}

function buildKeyboard() {
  const keyboard = $("wordle-keyboard");
  keyboard.innerHTML = "";

  keyboardRows.forEach((letters, rowIndex) => {
    const row = document.createElement("div");
    row.className = "keyboard-row";

    if (rowIndex === 2) {
      const enter = document.createElement("button");
      enter.className = "key-button wide";
      enter.textContent = "ENTER";
      enter.addEventListener("click", submitGuess);
      row.appendChild(enter);
    }

    for (const letter of letters) {
      const key = document.createElement("button");
      key.className = "key-button";
      key.textContent = letter;
      key.dataset.letter = letter;
      key.addEventListener("click", () => addLetter(letter));
      row.appendChild(key);
    }

    if (rowIndex === 2) {
      const backspace = document.createElement("button");
      backspace.className = "key-button wide";
      backspace.textContent = "⌫";
      backspace.setAttribute("aria-label", "Delete last letter");
      backspace.addEventListener("click", deleteLetter);
      row.appendChild(backspace);
    }

    keyboard.appendChild(row);
  });
}

function paintCurrentGuess() {
  for (let col = 0; col < 5; col++) {
    const tile = $(`tile-${guesses.length}-${col}`);
    if (!tile) continue;

    tile.textContent = currentGuess[col] || "";
    tile.classList.toggle("filled", Boolean(currentGuess[col]));
  }
}

function addLetter(letter) {
  if (wordSolved || wordFailed || guesses.length >= maxGuesses) return;
  if (currentGuess.length >= 5) return;

  currentGuess += letter;
  paintCurrentGuess();
  $("wordle-message").textContent = "Keep going. Use the clue and test your logic.";
}

function deleteLetter() {
  if (wordSolved || wordFailed) return;

  currentGuess = currentGuess.slice(0, -1);
  paintCurrentGuess();
}

function evaluateGuess(guess, answer) {
  const result = Array(5).fill("absent");
  const remaining = answer.split("");

  // First pass: mark exact-position matches.
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  // Second pass: mark correct letters in other positions.
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;

    const matchIndex = remaining.indexOf(guess[i]);

    if (matchIndex !== -1) {
      result[i] = "present";
      remaining[matchIndex] = null;
    }
  }

  return result;
}

function updateKeyboard(letter, status) {
  const priority = {
    absent: 1,
    present: 2,
    correct: 3
  };

  const oldStatus = keyboardStatus[letter];

  if (!oldStatus || priority[status] > priority[oldStatus]) {
    keyboardStatus[letter] = status;
  }

  const key = document.querySelector(
    `.key-button[data-letter="${letter}"]`
  );

  if (key) {
    key.classList.remove("correct", "present", "absent");
    key.classList.add(keyboardStatus[letter]);
  }
}

function submitGuess() {
  if (wordSolved || wordFailed) return;

  if (currentGuess.length !== 5) {
    $("wordle-message").textContent =
      "You need exactly five letters before submitting.";
    return;
  }

  const guess = currentGuess;
  const result = evaluateGuess(guess, secretWord);
  const rowIndex = guesses.length;

  guesses.push(guess);

  for (let i = 0; i < 5; i++) {
    const tile = $(`tile-${rowIndex}-${i}`);
    tile.textContent = guess[i];
    tile.classList.remove("filled");
    tile.classList.add(result[i]);
    updateKeyboard(guess[i], result[i]);
  }

  currentGuess = "";

  if (guess === secretWord) {
    wordSolved = true;

    if (!wordScoreAwarded) {
      const points = Math.max(10, 20 - (guesses.length - 1) * 2);
      addScore(points);
      wordScoreAwarded = true;
    }

    $("wordle-message").textContent =
      `Key discovered in ${guesses.length} of ${maxGuesses} guesses!`;

    $("key-explanation").classList.remove("hidden");
    $("wordle-submit").disabled = true;
    $("wordle-message").style.color = "var(--green)";
    return;
  }

  if (guesses.length >= maxGuesses) {
    wordFailed = true;
    $("wordle-message").textContent =
      `The answer was ${secretWord}. Review the feedback and continue learning.`;
    $("key-explanation").classList.remove("hidden");
    $("wordle-submit").disabled = true;
    return;
  }

  $("wordle-message").textContent =
    "Not quite. Green = correct position; yellow = correct letter, wrong position; gray = not used in the answer.";
}

function resetWordle() {
  guesses = [];
  currentGuess = "";
  wordSolved = false;
  wordFailed = false;
  wordScoreAwarded = false;
  keyboardStatus = {};

  buildWordleBoard();
  buildKeyboard();

  $("wordle-message").textContent =
    "Enter a five-letter guess to begin.";
  $("wordle-message").style.color = "";
  $("wordle-submit").disabled = false;
  $("key-explanation").classList.add("hidden");
}

$("wordle-submit").addEventListener("click", submitGuess);
$("wordle-reset").addEventListener("click", resetWordle);

document.addEventListener("keydown", (event) => {
  if (!$("case-wordle").classList.contains("hidden")) {
    if (/^[a-zA-Z]$/.test(event.key)) {
      addLetter(event.key.toUpperCase());
    } else if (event.key === "Backspace") {
      deleteLetter();
    } else if (event.key === "Enter") {
      submitGuess();
    }
  }
});

$("wordle-continue").addEventListener("click", () => {
  showCase(1);
});

/* --------------------------------------------------
   CASE 2: CONNECT THE CORDS
-------------------------------------------------- */

const requiredConnections = [
  { source: "email", target: "recovery" },
  { source: "display", target: "profile" }
];

const sourceNames = {
  email: "Email address",
  display: "Display name",
  contacts: "Phone contacts",
  location: "Location history",
  microphone: "Microphone access"
};

const targetNames = {
  recovery: "Account recovery",
  profile: "Public profile",
  friends: "Friend suggestions",
  nearby: "Nearby recommendations",
  voice: "Voice messages"
};

let selectedSource = null;
let connections = [];
let cordsScored = false;

function connectionKey(source, target) {
  return `${source}->${target}`;
}

function isRequired(source, target) {
  return requiredConnections.some(
    (item) => item.source === source && item.target === target
  );
}

function getNode(selector, value) {
  return document.querySelector(
    `.${selector}[data-${selector === "source-node" ? "source" : "target"}="${value}"]`
  );
}

function resetCordStyles() {
  document.querySelectorAll(".cord-node").forEach((node) => {
    node.classList.remove("selected", "connected", "has-extra");
  });
}

function updateCordNodeStyles() {
  resetCordStyles();

  if (selectedSource) {
    const sourceNode = document.querySelector(
      `.source-node[data-source="${selectedSource}"]`
    );
    if (sourceNode) sourceNode.classList.add("selected");
  }

  connections.forEach((connection) => {
    const sourceNode = document.querySelector(
      `.source-node[data-source="${connection.source}"]`
    );
    const targetNode = document.querySelector(
      `.target-node[data-target="${connection.target}"]`
    );

    if (sourceNode) sourceNode.classList.add("connected");
    if (targetNode) targetNode.classList.add("connected");

    if (!isRequired(connection.source, connection.target)) {
      if (sourceNode) sourceNode.classList.add("has-extra");
      if (targetNode) targetNode.classList.add("has-extra");
    }
  });
}

function drawCords() {
  const workspace = $("cord-workspace");
  const svg = $("cord-svg");
  const bounds = workspace.getBoundingClientRect();

  svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
  svg.innerHTML = "";

  connections.forEach((connection) => {
    const sourceNode = document.querySelector(
      `.source-node[data-source="${connection.source}"]`
    );
    const targetNode = document.querySelector(
      `.target-node[data-target="${connection.target}"]`
    );

    if (!sourceNode || !targetNode) return;

    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();

    const x1 = sourceRect.right - bounds.left;
    const y1 = sourceRect.top + sourceRect.height / 2 - bounds.top;
    const x2 = targetRect.left - bounds.left;
    const y2 = targetRect.top + targetRect.height / 2 - bounds.top;

    const curve = Math.max(25, (x2 - x1) * 0.45);

    const path = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );

    path.setAttribute(
      "d",
      `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`
    );

    path.setAttribute(
      "class",
      `cord-line ${isRequired(connection.source, connection.target) ? "necessary" : "extra"}`
    );

    svg.appendChild(path);
  });

  updateCordNodeStyles();
}

function selectSource(source) {
  selectedSource = source;

  $("cord-selection").textContent =
    `Selected: ${sourceNames[source]}. Now choose the feature that needs it.`;

  updateCordNodeStyles();
}

function selectTarget(target) {
  if (!selectedSource) {
    $("cord-selection").textContent =
      "Choose an information source on the left first.";
    return;
  }

  const source = selectedSource;
  const key = connectionKey(source, target);
  const exists = connections.some(
    (connection) => connectionKey(connection.source, connection.target) === key
  );

  if (exists) {
    $("cord-selection").textContent =
      "That connection already exists. Click the connection's feature again to remove it.";
    selectedSource = null;
    updateCordNodeStyles();
    return;
  }

  connections.push({ source, target });
  selectedSource = null;

  const required = isRequired(source, target);

  $("cord-selection").textContent = required
    ? `Connected ${sourceNames[source]} to ${targetNames[target]}. This is a necessary pathway.`
    : `Connected ${sourceNames[source]} to ${targetNames[target]}. Check whether the feature truly needs this information.`;

  drawCords();
}

document.querySelectorAll(".source-node").forEach((node) => {
  node.addEventListener("click", () => {
    selectSource(node.dataset.source);
  });
});

document.querySelectorAll(".target-node").forEach((node) => {
  node.addEventListener("click", () => {
    const target = node.dataset.target;

    // Clicking a target with an existing connection removes that connection.
    const existingIndex = connections.findIndex(
      (connection) => connection.target === target
    );

    if (existingIndex !== -1 && !selectedSource) {
      const removed = connections.splice(existingIndex, 1)[0];

      $("cord-selection").textContent =
        `Removed ${sourceNames[removed.source]} → ${targetNames[removed.target]}.`;

      drawCords();
      return;
    }

    selectTarget(target);
  });
});

function resetCords() {
  selectedSource = null;
  connections = [];
  cordsScored = false;

  $("cord-selection").textContent =
    "Choose an information source to start a connection.";
  $("cord-result").classList.add("hidden");
  $("cord-submit").disabled = false;
  $("cord-svg").innerHTML = "";

  resetCordStyles();
  drawCords();
}

$("cord-reset").addEventListener("click", resetCords);

$("cord-submit").addEventListener("click", () => {
  if (cordsScored) return;

  const requiredFound = requiredConnections.filter((required) =>
    connections.some(
      (connection) =>
        connection.source === required.source &&
        connection.target === required.target
    )
  ).length;

  const unnecessary = connections.filter(
    (connection) => !isRequired(connection.source, connection.target)
  ).length;

  const missing = requiredConnections.length - requiredFound;
  const points = Math.max(0, 30 - missing * 10 - unnecessary * 7);

  addScore(points);
  cordsScored = true;

  $("cord-result-title").textContent =
    unnecessary === 0 && missing === 0
      ? "Excellent data design!"
      : "Your design needs work.";

  $("cord-result-text").textContent =
    `You found ${requiredFound} of ${requiredConnections.length} necessary pathways and created ${unnecessary} unnecessary connection(s). ` +
    (missing > 0
      ? "A feature may not work properly when it lacks information it genuinely needs. "
      : "") +
    (unnecessary > 0
      ? "Extra pathways expose more information than the app needs. "
      : "") +
    "The safest design uses the minimum data necessary for each feature.";

  $("cord-result-score").textContent =
    `You earned ${points} out of 30 points for this case.`;

  $("cord-result").classList.remove("hidden");
  $("cord-submit").disabled = true;
  $("cord-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

$("cord-continue").addEventListener("click", () => {
  showCase(2);
});

window.addEventListener("resize", () => {
  if (!$("case-cords").classList.contains("hidden")) {
    drawCords();
  }
});

/* --------------------------------------------------
   CASES 3 AND 4: PERMISSION AND ETHICS DECISIONS
-------------------------------------------------- */

const choiceCases = {
  access: {
    options: $("access-options"),
    feedback: $("access-feedback"),
    continueButton: $("access-continue"),
    correct: "limited",
    points: 15,
    success:
      "Correct. A homework planner has no obvious need for continuous location tracking. Denying unnecessary access—or using a limited permission only when a real feature requires it—follows the principle of data minimization.",
    other:
      "Think about whether the app's stated purpose requires this permission. A permission request alone does not prove that the app needs the information."
  },
  promise: {
    options: $("promise-options"),
    feedback: $("promise-feedback"),
    continueButton: $("promise-continue"),
    correct: "disclose",
    points: 15,
    success:
      "Correct. Privacy promises should match actual behavior. The responsible response is to be transparent, stop unjustified sharing, and give users meaningful choices.",
    other:
      "A hidden policy update does not solve the underlying trust problem. Users need clear, honest information about how their data is used."
  }
};

const answeredCases = {
  access: false,
  promise: false
};

function resetChoiceCase(name) {
  answeredCases[name] = false;
  const config = choiceCases[name];

  config.feedback.textContent = "";
  config.continueButton.classList.add("hidden");

  config.options.querySelectorAll(".choice-button").forEach((button) => {
    button.disabled = false;
    button.classList.remove(
      "selected",
      "correct-choice",
      "incorrect-choice"
    );
  });
}

function setupChoiceCase(name) {
  const config = choiceCases[name];

  config.options.querySelectorAll(".choice-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (answeredCases[name]) return;

      const chosen = button.dataset.choice;
      const correct = chosen === config.correct;

      answeredCases[name] = true;

      config.options.querySelectorAll(".choice-button").forEach((option) => {
        option.disabled = true;

        if (option.dataset.choice === config.correct) {
          option.classList.add("correct-choice");
        }
      });

      button.classList.add("selected");

      if (!correct) {
        button.classList.add("incorrect-choice");
      }

      if (correct) {
        addScore(config.points);
        config.feedback.textContent = config.success;
        config.feedback.style.color = "var(--green)";
      } else {
        config.feedback.textContent = config.other;
        config.feedback.style.color = "var(--yellow)";
      }

      config.continueButton.classList.remove("hidden");
    });
  });
}

setupChoiceCase("access");
setupChoiceCase("promise");

$("access-continue").addEventListener("click", () => {
  showCase(3);
});

$("promise-continue").addEventListener("click", () => {
  showCase(4);
});

/* --------------------------------------------------
   FINAL REVIEW
-------------------------------------------------- */

const reviewQuestions = [
  {
    question: "1. What does data minimization mean?",
    answers: [
      "Collect every available detail in case it becomes useful.",
      "Collect only the information needed for a clear purpose.",
      "Keep collecting information but delete it once a year."
    ],
    correct: 1,
    explanation:
      "Data minimization means limiting collection to what is necessary for the stated purpose."
  },
  {
    question: "2. What does green feedback mean in the key puzzle?",
    answers: [
      "The letter is correct and in the correct position.",
      "The letter is in the answer but in the wrong position.",
      "The letter is not in the answer."
    ],
    correct: 0,
    explanation:
      "Green marks an exact letter-and-position match. Yellow marks a letter in a different position."
  },
  {
    question: "3. What should you do when an app requests an unrelated permission?",
    answers: [
      "Always allow it because the app asked.",
      "Review the purpose and deny or limit unnecessary access.",
      "Share the permission with other apps too."
    ],
    correct: 1,
    explanation:
      "Permissions should match actual needs. If a feature genuinely needs access, choose the narrowest reasonable permission."
  },
  {
    question: "4. What is the best response when an app breaks its privacy promise?",
    answers: [
      "Hide the practice in a longer privacy policy.",
      "Ignore it unless users notice.",
      "Be transparent, address unjustified sharing, and give users meaningful control."
    ],
    correct: 2,
    explanation:
      "Privacy depends on honest communication and practices that match what users have been told."
  }
];

function buildReview() {
  const container = $("review-questions");
  container.innerHTML = "";

  reviewQuestions.forEach((question, questionIndex) => {
    const block = document.createElement("div");
    block.className = "review-question";

    const heading = document.createElement("h3");
    heading.textContent = question.question;
    block.appendChild(heading);

    question.answers.forEach((answer, answerIndex) => {
      const label = document.createElement("label");
      label.className = "review-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `review-${questionIndex}`;
      input.value = answerIndex;

      const text = document.createElement("span");
      text.textContent = answer;

      label.appendChild(input);
      label.appendChild(text);
      block.appendChild(label);
    });

    container.appendChild(block);
  });
}

$("review-submit").addEventListener("click", () => {
  const answers = [];

  for (let i = 0; i < reviewQuestions.length; i++) {
    const selected = document.querySelector(
      `input[name="review-${i}"]:checked`
    );

    if (!selected) {
      $("review-feedback").textContent =
        "Answer all four questions before submitting your final review.";
      $("review-feedback").style.color = "var(--yellow)";
      return;
    }

    answers.push(Number(selected.value));
  }

  let correctCount = 0;
  const explanations = [];

  reviewQuestions.forEach((question, index) => {
    if (answers[index] === question.correct) {
      correctCount++;
    }

    explanations.push(
      `${index + 1}. ${question.explanation}`
    );
  });

  const reviewPoints = correctCount * 5;
  addScore(reviewPoints);

  $("review-feedback").textContent =
    `You answered ${correctCount} out of ${reviewQuestions.length} correctly. ` +
    `You earned ${reviewPoints} out of 20 review points. ` +
    explanations.join(" ");

  $("review-feedback").style.color = "var(--text)";
  $("review-submit").disabled = true;

  showResults();
});

function showResults() {
  showCase(5);

  $("final-score").textContent = score;
  $("progress-fill").style.width = "100%";

  let rank;
  let message;

  if (score >= 85) {
    rank = "PRIVACY PROTECTOR";
    message =
      "Excellent work. You made thoughtful choices about data collection, access, and transparency. Keep questioning whether information is truly necessary.";
  } else if (score >= 65) {
    rank = "DIGITAL DETECTIVE";
    message =
      "Good investigation. You spotted several privacy risks. Review the cases where you lost points to strengthen your data-protection decisions.";
  } else if (score >= 40) {
    rank = "PRIVACY TRAINEE";
    message =
      "You have the beginnings of a good investigation. Remember to limit data collection, question permissions, and make privacy promises meaningful.";
  } else {
    rank = "CASE STILL OPEN";
    message =
      "Every investigation is a chance to learn. Play again, follow the clues, and look for the smallest amount of information each feature needs.";
  }

  $("result-heading").textContent = "Investigation complete.";
  $("result-rank").textContent = rank;
  $("result-message").textContent =
    `${message} Your final score is ${score} out of ${maxScore}.`;
}

buildWordleBoard();
buildKeyboard();
buildReview();
updateProgress();
