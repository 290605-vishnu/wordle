const fs = require("fs");

const game = `// AI Wordle - Game Logic

const KEYBOARD_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","BACK"]
];

const MAX_GUESSES = 6;
let wordLength = 6;
let targetWord = "", targetHint = "", targetDef = "";
let currentRow = 0, currentCol = 0, currentGuess = [];
let gameOver = false, hintUsed = false, shareRows = [];

let stats = JSON.parse(localStorage.getItem("aiwordle-stats") || JSON.stringify({
  played:0, wins:0, streak:0, maxStreak:0, dist:{1:0,2:0,3:0,4:0,5:0,6:0}
}));

const boardEl = document.getElementById("board");
const toastEl = document.getElementById("toast");
const hintText = document.getElementById("hint-text");
const hintBtn = document.getElementById("btn-hint");
const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas.getContext("2d");

function init() {
  const words = WORD_BANK[wordLength];
  const entry = words[Math.floor(Math.random() * words.length)];
  targetWord = entry.word.toUpperCase();
  targetHint = entry.hint;
  targetDef = entry.def;
  currentRow = 0; currentCol = 0; currentGuess = [];
  gameOver = false; hintUsed = false; shareRows = [];
  hintText.classList.add("hidden");
  hintBtn.disabled = false;
  hintBtn.innerHTML = "&#x1F4A1; Reveal Hint";
  hintBtn.style.opacity = "1";
  renderBoard();
  renderKeyboard();
  updateActiveTiles();
}

function renderBoard() {
  boardEl.style.gridTemplateColumns = "repeat(" + wordLength + ", var(--tile-size))";
  boardEl.style.gridTemplateRows = "repeat(" + MAX_GUESSES + ", var(--tile-size))";
  boardEl.innerHTML = "";
  for (let r = 0; r < MAX_GUESSES; r++) {
    for (let c = 0; c < wordLength; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.id = "tile-" + r + "-" + c;
      boardEl.appendChild(tile);
    }
  }
}

function renderKeyboard() {
  KEYBOARD_ROWS.forEach(function(row, i) {
    const rowEl = document.getElementById("row-" + (i+1));
    rowEl.innerHTML = "";
    row.forEach(function(key) {
      const btn = document.createElement("button");
      const isWide = (key === "ENTER" || key === "BACK");
      btn.className = "key" + (isWide ? " wide" : "");
      btn.textContent = key === "BACK" ? "\u232B" : key;
      btn.dataset.key = key;
      btn.addEventListener("click", function() { handleKey(key); });
      rowEl.appendChild(btn);
    });
  });
}

function updateActiveTiles() {
  for (let r = 0; r < MAX_GUESSES; r++) {
    for (let c = 0; c < wordLength; c++) {
      const tile = document.getElementById("tile-" + r + "-" + c);
      if (!tile) continue;
      if (r === currentRow && !gameOver) tile.classList.add("active-row");
      else tile.classList.remove("active-row");
    }
  }
}

function handleKey(key) {
  if (gameOver) return;
  if (key === "ENTER") submitGuess();
  else if (key === "BACK" || key === "Backspace") deleteLetter();
  else if (/^[A-Za-z]$/.test(key)) addLetter(key.toUpperCase());
}

function addLetter(letter) {
  if (currentCol >= wordLength) return;
  currentGuess[currentCol] = letter;
  const tile = document.getElementById("tile-" + currentRow + "-" + currentCol);
  tile.textContent = letter;
  tile.classList.add("filled");
  tile.classList.remove("pop");
  void tile.offsetWidth;
  tile.classList.add("pop");
  currentCol++;
}

function deleteLetter() {
  if (currentCol <= 0) return;
  currentCol--;
  currentGuess[currentCol] = null;
  const tile = document.getElementById("tile-" + currentRow + "-" + currentCol);
  tile.textContent = "";
  tile.classList.remove("filled");
}

function submitGuess() {
  if (currentCol < wordLength) {
    showToast("Word must be " + wordLength + " letters");
    shakeRow(currentRow);
    return;
  }
  const guess = currentGuess.join("");
  const result = evaluateGuess(guess);
  revealRow(currentRow, guess, result);
  buildShareRow(result);
  const won = result.every(function(r) { return r === "correct"; });
  setTimeout(function() {
    if (won) {
      gameOver = true;
      updateStats(true, currentRow + 1);
      showGameOver(true, currentRow + 1);
      launchConfetti();
    } else if (currentRow >= MAX_GUESSES - 1) {
      gameOver = true;
      updateStats(false, 0);
      showGameOver(false, 0);
    } else {
      currentRow++;
      currentCol = 0;
      currentGuess = [];
      updateActiveTiles();
    }
  }, wordLength * 160 + 300);
}

function evaluateGuess(guess) {
  const result = Array(wordLength).fill("absent");
  const targetArr = targetWord.split("");
  const guessArr = guess.split("");
  const used = Array(wordLength).fill(false);
  for (let i = 0; i < wordLength; i++) {
    if (guessArr[i] === targetArr[i]) { result[i] = "correct"; used[i] = true; }
  }
  for (let i = 0; i < wordLength; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < wordLength; j++) {
      if (!used[j] && guessArr[i] === targetArr[j]) { result[i] = "present"; used[j] = true; break; }
    }
  }
  return result;
}

function revealRow(row, guess, result) {
  const keyStates = {};
  result.forEach(function(state, i) {
    const tile = document.getElementById("tile-" + row + "-" + i);
    const delay = i * 160;
    setTimeout(function() {
      tile.classList.add("flip");
      setTimeout(function() { tile.setAttribute("data-state", state); }, 80);
    }, delay);
    const key = guess[i];
    const cur = keyStates[key] || getKeyState(key);
    if (state === "correct") keyStates[key] = "correct";
    else if (state === "present" && cur !== "correct") keyStates[key] = "present";
    else if (state === "absent" && !cur) keyStates[key] = "absent";
  });
  setTimeout(function() {
    Object.keys(keyStates).forEach(function(k) {
      document.querySelectorAll(".key[data-key='" + k + "']").forEach(function(btn) {
        btn.setAttribute("data-state", keyStates[k]);
      });
    });
  }, wordLength * 160);
}

function getKeyState(key) {
  const btn = document.querySelector(".key[data-key='" + key + "']");
  return btn ? btn.getAttribute("data-state") : null;
}

function shakeRow(row) {
  for (let c = 0; c < wordLength; c++) {
    const tile = document.getElementById("tile-" + row + "-" + c);
    tile.classList.remove("shake"); void tile.offsetWidth; tile.classList.add("shake");
  }
}

function bounceRow(row) {
  for (let c = 0; c < wordLength; c++) {
    const tile = document.getElementById("tile-" + row + "-" + c);
    setTimeout(function() { tile.classList.remove("bounce"); void tile.offsetWidth; tile.classList.add("bounce"); }, c * 80);
  }
}

const shareEmojis = { correct: "\uD83D\uDFE9", present: "\uD83D\uDFE8", absent: "\u2B1B" };

function buildShareRow(result) {
  shareRows.push(result.map(function(r) { return shareEmojis[r]; }).join(""));
}

function getShareString() {
  return "\uD83E\uDD16 AI Wordle \u2014 " + targetWord + " (" + wordLength + " letters)\n" + shareRows.length + "/6\n\n" + shareRows.join("\n");
}

function updateStats(won, guesses) {
  stats.played++;
  if (won) {
    stats.wins++;
    stats.streak++;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
    stats.dist[guesses] = (stats.dist[guesses] || 0) + 1;
  } else { stats.streak = 0; }
  localStorage.setItem("aiwordle-stats", JSON.stringify(stats));
}

function renderStats(highlight) {
  document.getElementById("stat-played").textContent = stats.played;
  const pct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  document.getElementById("stat-win-pct").textContent = pct + "%";
  document.getElementById("stat-streak").textContent = stats.streak;
  document.getElementById("stat-max-streak").textContent = stats.maxStreak;
  const chart = document.getElementById("distribution-chart");
  chart.innerHTML = "";
  const vals = Object.values(stats.dist).map(Number);
  const maxVal = Math.max.apply(null, vals.concat([1]));
  for (let g = 1; g <= MAX_GUESSES; g++) {
    const val = stats.dist[g] || 0;
    const p = Math.max((val / maxVal) * 100, 8);
    const row2 = document.createElement("div");
    row2.className = "dist-row";
    const lbl = document.createElement("div");
    lbl.className = "dist-label";
    lbl.textContent = g;
    const wrap = document.createElement("div");
    wrap.className = "dist-bar-wrap";
    const bar = document.createElement("div");
    bar.className = "dist-bar" + (highlight === g ? " highlight" : "");
    bar.style.width = p + "%";
    bar.textContent = val;
    wrap.appendChild(bar);
    row2.appendChild(lbl);
    row2.appendChild(wrap);
    chart.appendChild(row2);
  }
}

function showGameOver(won, guesses) {
  const overlay = document.getElementById("modal-gameover");
  const titleEl = document.getElementById("gameover-title");
  const revealEl = document.getElementById("answer-reveal");
  const defEl = document.getElementById("word-definition");
  const titles = won
    ? ["\uD83E\uDDE0 Brilliant!", "\uD83C\uDF89 Outstanding!", "\u2728 Excellent!", "\uD83D\uDC4F Great job!", "\uD83C\uDF1F Impressive!", "\uD83D\uDE05 Phew!"]
    : ["\uD83E\uDD16 Better luck next time!"];
  titleEl.textContent = won ? titles[Math.min(guesses - 1, 5)] : titles[0];
  revealEl.innerHTML = "<div style='font-size:0.8rem;color:var(--text-dim);margin-bottom:6px;'>The word was</div><div class='answer-word'>" + targetWord + "</div>";
  defEl.innerHTML = "<strong>" + targetWord + "</strong>: " + targetDef;
  if (won) bounceRow(currentRow);
  setTimeout(function() {
    overlay.classList.add("open");
    renderStats(won ? guesses : null);
  }, won ? 800 : 400);
}

hintBtn.addEventListener("click", function() {
  if (hintUsed) return;
  hintUsed = true;
  hintText.textContent = "\uD83D\uDCA1 " + targetHint;
  hintText.classList.remove("hidden");
  hintBtn.textContent = "Hint used";
  hintBtn.disabled = true;
  hintBtn.style.opacity = "0.5";
});

let toastTimer;
function showToast(msg, dur) {
  dur = dur || 1800;
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastTimer = setTimeout(function() { toastEl.classList.remove("show"); }, dur);
}

function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

document.querySelectorAll(".modal-close").forEach(function(btn) {
  btn.addEventListener("click", function() { closeModal(btn.dataset.modal); });
});
document.querySelectorAll(".modal-overlay").forEach(function(overlay) {
  overlay.addEventListener("click", function(e) { if (e.target === overlay) closeModal(overlay.id); });
});

document.getElementById("btn-how-to-play").addEventListener("click", function() { openModal("modal-how"); });
document.getElementById("btn-stats").addEventListener("click", function() { renderStats(null); openModal("modal-stats"); });
document.getElementById("btn-new-game").addEventListener("click", function() { shareRows = []; closeModal("modal-gameover"); init(); showToast("New game started!"); });
document.getElementById("btn-play-again").addEventListener("click", function() { shareRows = []; closeModal("modal-gameover"); init(); });
document.getElementById("btn-share").addEventListener("click", function() {
  const text = getShareString();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() { showToast("Copied! \uD83D\uDCCB"); }).catch(function() { fallbackCopy(text); });
  } else { fallbackCopy(text); }
});

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  showToast("Copied! \uD83D\uDCCB");
}

document.querySelectorAll(".length-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    document.querySelector(".length-btn.active").classList.remove("active");
    btn.classList.add("active");
    wordLength = parseInt(btn.dataset.length);
    shareRows = [];
    init();
  });
});

document.addEventListener("keydown", function(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector(".modal-overlay.open")) return;
  if (e.key === "Backspace") handleKey("BACK");
  else handleKey(e.key);
});

let confettiParticles = [];
function launchConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiParticles = Array.from({ length: 120 }, function() {
    return {
      x: Math.random() * confettiCanvas.width, y: -20,
      w: Math.random() * 10 + 6, h: Math.random() * 6 + 3,
      color: ["#7c6af7","#a78bfa","#22d3ee","#f59e0b","#4ade80","#f472b6"][Math.floor(Math.random()*6)],
      vx: (Math.random() - 0.5) * 4, vy: Math.random() * 4 + 2,
      angle: Math.random() * 360, spin: (Math.random() - 0.5) * 8, opacity: 1
    };
  });
  animateConfetti();
}
function animateConfetti() {
  if (!confettiParticles.length) return;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach(function(p) {
    p.x += p.vx; p.y += p.vy; p.angle += p.spin; p.vy += 0.08;
    if (p.y > confettiCanvas.height + 20) p.opacity -= 0.05;
    confettiCtx.save();
    confettiCtx.globalAlpha = Math.max(0, p.opacity);
    confettiCtx.fillStyle = p.color;
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.angle * Math.PI) / 180);
    confettiCtx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
    confettiCtx.restore();
  });
  confettiParticles = confettiParticles.filter(function(p) { return p.opacity > 0; });
  if (confettiParticles.length) requestAnimationFrame(animateConfetti);
  else confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}
window.addEventListener("resize", function() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
});

init();
openModal("modal-how");
`;

fs.writeFileSync("game.js", game, "utf8");
console.log("Written game.js, length:", game.length);