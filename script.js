/* ==========================================================================
   Gambit — chess
   A small chess app built on chess.js (rules) with a minimax computer player.
   ========================================================================== */

(function () {
  "use strict";

  var FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  var PROMO_ORDER = ["q", "r", "b", "n"];
  var PROMO_LABEL = { q: "Queen", r: "Rook", b: "Bishop", n: "Knight" };
  var PIECE_NAME = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  var PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  /* Standard pawn-unit values used only for the "+3" material counter. */
  var PIECE_UNITS = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  var ANIM_MS = 170;
  var AI_MIN_DELAY = 180;
  /* Score used for mate. Must be declared: the search adds/subtracts it. */
  var MATE = 100000;

  /* Computer strength presets.
     depth   - how many plies the main search looks ahead
     time    - soft budget in ms (iterative deepening stops here)
     spread  - how far below the best score a move may be and still be picked
     blunder - chance of playing a completely random move
     quiesce - keep searching captures instead of stopping mid-trade */
  var DIFFICULTY = {
    easy:    { label: "Easy",           short: "Easy",    depth: 1, time: 150,  spread: 170, blunder: 0.35, quiesce: false },
    medium:  { label: "Medium",         short: "Medium",  depth: 2, time: 500,  spread: 50,  blunder: 0.05, quiesce: true },
    hard:    { label: "Hard",           short: "Hard",    depth: 4, time: 1200, spread: 0,   blunder: 0,    quiesce: true },
    extreme: { label: "Extremely hard", short: "Extreme", depth: 6, time: 2500, spread: 0,   blunder: 0,    quiesce: true }
  };

  var REPEAT_REASON = {
    checkmate: "by checkmate",
    stalemate: "by stalemate",
    insufficient: "by insufficient material",
    repetition: "by threefold repetition",
    fifty: "by the fifty-move rule",
    time: "on time",
    resign: "by resignation"
  };

  var state = {
    game: null,
    mode: "computer",
    timeControl: 600,
    difficulty: "medium",
    orientation: "w",
    humanColor: "w",
    aiColor: "b",
    selected: null,
    targets: new Set(),
    captures: new Set(),
    lastMove: null,
    captured: { w: [], b: [] },
    clock: { w: 0, b: 0 },
    clockRunning: false,
    clockLast: 0,
    thinking: false,
    over: false,
    started: false,
    result: null,
    generation: 0
  };

  var drag = null;
  var tickTimer = null;
  var confirmAction = null;

  var $ = function (id) { return document.getElementById(id); };

  var boardEl = $("board");
  var topBarEl = $("playerTop");
  var bottomBarEl = $("playerBottom");
  var moveListEl = $("moveList");
  var turnChipEl = $("turnChip");
  var liveEl = $("liveRegion");

  var startScreen = $("startScreen");
  var startCloseBtn = $("startClose");
  var promoModal = $("promoModal");
  var promoGrid = $("promoGrid");
  var resultModal = $("resultModal");
  var resultBadge = $("resultBadge");
  var resultTitle = $("resultTitle");
  var resultReason = $("resultReason");
  var confirmModal = $("confirmModal");
  var confirmTitle = $("confirmTitle");
  var confirmText = $("confirmText");

  var modeGroup = $("startModeList");
  var difficultyGroup = $("startDifficultyGroup");
  var startTimeGroup = $("startTimeGroup");
  var difficultyField = $("difficultyField");
  var metaOpponent = $("metaOpponent");
  var metaDifficulty = $("metaDifficulty");
  var metaDifficultyRow = $("metaDifficultyRow");
  var metaTime = $("metaTime");

  function isLightSquare(square) {
    var file = FILES.indexOf(square[0]);
    var rank = parseInt(square[1], 10);
    return (file + rank) % 2 === 0;
  }

  function otherColor(color) { return color === "w" ? "b" : "w"; }
  function colorName(color) { return color === "w" ? "White" : "Black"; }
  function pieceLabel(color, type) { return (color === "w" ? "White" : "Black") + " " + PIECE_NAME[type]; }
  function pieceSrc(color, type) { return "assets/pieces/" + color + type + ".svg"; }

  function formatClock(ms) {
    var total = Math.max(0, ms);
    var seconds = Math.floor(total / 1000);
    var minutes = Math.floor(seconds / 60);
    var rest = seconds % 60;
    if (total < 20000) {
      var tenths = Math.floor((total % 1000) / 100);
      return minutes + ":" + String(rest).padStart(2, "0") + "." + tenths;
    }
    return minutes + ":" + String(rest).padStart(2, "0");
  }

  function findKing(color) {
    var rows = state.game.board();
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var cell = rows[r][c];
        if (cell && cell.type === "k" && cell.color === color) {
          return FILES[c] + (8 - r);
        }
      }
    }
    return null;
  }

  function squareFromEvent(event) {
    var node = document.elementFromPoint(event.clientX, event.clientY);
    var squareEl = node && node.closest ? node.closest(".sq") : null;
    return squareEl ? squareEl.dataset.square : null;
  }

  function renderBoard() {
    var flipped = state.orientation === "b";
    var rows = state.game.board();
    var last = state.lastMove;
    var checkedKing = state.game.in_check() ? findKing(state.game.turn()) : null;
    var html = "";

    for (var row = 0; row < 8; row++) {
      for (var col = 0; col < 8; col++) {
        var file = flipped ? 7 - col : col;
        var rank = flipped ? row + 1 : 8 - row;
        var square = FILES[file] + rank;
        var classes = ["sq", isLightSquare(square) ? "sq--light" : "sq--dark"];
        if (last && (square === last.from || square === last.to)) classes.push("sq--last");
        if (square === checkedKing) classes.push("sq--check");

        var inner = "";
        if (col === 0) inner += '<span class="coord coord--rank">' + rank + "</span>";
        if (row === 7) inner += '<span class="coord coord--file">' + FILES[file] + "</span>";
        var cell = rows[8 - rank][file];
        if (cell) {
          inner += '<img class="piece" src="' + pieceSrc(cell.color, cell.type) +
            '" alt="' + pieceLabel(cell.color, cell.type) + '" draggable="false" />';
        }
        html += '<div class="' + classes.join(" ") + '" data-square="' + square + '">' + inner + "</div>";
      }
    }
    boardEl.innerHTML = html;
    paintSquares();
  }

  function paintSquares() {
    var squares = boardEl.children;
    for (var i = 0; i < squares.length; i++) {
      var el = squares[i];
      var square = el.dataset.square;
      var isTarget = state.targets.has(square);
      el.classList.toggle("sq--sel", state.selected === square);
      el.classList.toggle("sq--target", isTarget && !state.captures.has(square));
      el.classList.toggle("sq--capture", isTarget && state.captures.has(square));
    }
  }

  function animatePiece(fromRect, toSquare) {
    var el = boardEl.querySelector('.sq[data-square="' + toSquare + '"] .piece');
    if (!el || !el.animate) return;
    var now = el.getBoundingClientRect();
    var dx = fromRect.left - now.left;
    var dy = fromRect.top - now.top;
    if (!dx && !dy) return;
    el.animate([
      { transform: "translate(" + dx + "px," + dy + "px)" },
      { transform: "translate(0,0)" }
    ], { duration: ANIM_MS, easing: "cubic-bezier(.2,.7,.3,1)" });
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function renderBars() {
    var bottom = state.orientation;
    var top = otherColor(bottom);
    bottomBarEl.dataset.color = bottom;
    topBarEl.dataset.color = top;
    bottomBarEl.innerHTML = barHTML(bottom);
    topBarEl.innerHTML = barHTML(top);
    renderClocks();
    markActiveBar();
  }

  function renderClocks() {
    var clocks = document.querySelectorAll(".pb-clock");
    for (var i = 0; i < clocks.length; i++) {
      var el = clocks[i];
      var color = el.dataset.color;
      if (state.timeControl <= 0) {
        el.textContent = "\u221e";
        el.classList.remove("pb-clock--low");
        continue;
      }
      el.textContent = formatClock(state.clock[color]);
      el.classList.toggle("pb-clock--low", state.clock[color] <= 20000);
    }
  }

  function markActiveBar() {
    var turn = state.over ? null : state.game.turn();
    [topBarEl, bottomBarEl].forEach(function (bar) {
      bar.classList.toggle("is-active", bar.dataset.color === turn);
    });
    var clocks = document.querySelectorAll(".pb-clock");
    for (var i = 0; i < clocks.length; i++) {
      clocks[i].classList.toggle("pb-clock--run", clocks[i].dataset.color === turn);
    }
  }

  function renderMoves() {
    var history = state.game.history();
    if (!history.length) {
      moveListEl.innerHTML = '<p class="moves__empty">No moves yet</p>';
      return;
    }
    var html = "";
    for (var i = 0; i < history.length; i += 2) {
      var white = history[i];
      var black = history[i + 1];
      html += '<div class="move-row"><span class="move-no">' + (i / 2 + 1) + ".</span>";
      html += '<span class="move' + (i === history.length - 1 ? " move--last" : "") + '">' + escapeHTML(white) + "</span>";
      if (black) {
        html += '<span class="move' + (i + 1 === history.length - 1 ? " move--last" : "") + '">' + escapeHTML(black) + "</span>";
      } else {
        html += '<span class="move move--empty"></span>';
      }
      html += "</div>";
    }
    moveListEl.innerHTML = html;
    moveListEl.scrollTop = moveListEl.scrollHeight;
  }

  function updateStatus() {
    if (state.over && state.result) {
      turnChipEl.textContent = outcomeLabel(state.result);
      turnChipEl.className = "chip chip--over";
      return;
    }
    var turn = state.game.turn();
    var inCheck = state.game.in_check();
    turnChipEl.textContent = colorName(turn) + (inCheck ? " in check" : " to move");
    turnChipEl.className = "chip" + (inCheck ? " chip--check" : "");
  }

  function renderAll() {
    renderBoard();
    renderBars();
    renderMoves();
    updateStatus();
    updateControls();
    renderGameMeta();
  }

  function barHTML(color) {
    var captured = state.captured[color].slice().sort(function (a, b) { return PIECE_VALUE[b] - PIECE_VALUE[a]; });
    var opponent = otherColor(color);
    var html = '<div class="pb-avatar">' + avatarSVG(color) + "</div>";
    html += '<div class="pb-main">';
    html += '<div class="pb-name"><span class="pb-side pb-side--' + color + '"></span>' + escapeHTML(playerName(color));
    if (state.thinking && state.mode === "computer" && color === state.aiColor) {
      html += '<span class="pb-state">thinking</span>';
    }
    html += "</div>";
    var diff = materialDiff();
    var showAdv = (color === "w" && diff > 0) || (color === "b" && diff < 0);
    html += '<div class="pb-captured">';
    captured.forEach(function (type) {
      html += '<img src="' + pieceSrc(opponent, type) + '" alt="' + PIECE_NAME[type] + '" />';
    });
    if (showAdv && captured.length) {
      html += '<span class="pb-adv">+' + Math.abs(diff) + "</span>";
    }
    html += "</div></div>";
    html += '<div class="pb-clock" data-color="' + color + '">' +
      (state.timeControl > 0 ? formatClock(state.clock[color]) : "\u221e") + "</div>";
    return html;
  }

  function playerName(color) {
    if (state.mode === "friend") return colorName(color);
    if (color === state.humanColor) return "You";
    return "Computer (" + difficultyShort() + ")";
  }

  function difficultyConfig() {
    return DIFFICULTY[state.difficulty] || DIFFICULTY.medium;
  }

  function difficultyLabel() {
    return difficultyConfig().label;
  }

  function difficultyShort() {
    var cfg = difficultyConfig();
    return cfg.short || cfg.label;
  }

  function renderGameMeta() {
    if (!metaOpponent) return;
    var friend = state.mode === "friend";
    metaOpponent.textContent = friend ? "A friend" : "Computer";
    if (metaDifficultyRow) metaDifficultyRow.hidden = friend;
    if (metaDifficulty) metaDifficulty.textContent = difficultyLabel();
    if (metaTime) {
      metaTime.textContent = state.timeControl > 0
        ? (state.timeControl / 60) + " minutes"
        : "Unlimited";
    }
  }

  function avatarSVG(color) {
    if (state.mode === "friend" || color === state.humanColor) {
      return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>';
  }

  function materialDiff() {
    var w = 0, b = 0;
    state.captured.w.forEach(function (t) { w += PIECE_UNITS[t]; });
    state.captured.b.forEach(function (t) { b += PIECE_UNITS[t]; });
    return w - b;
  }

  function getOutcome() {
    var game = state.game;
    if (game.in_checkmate()) return { over: true, winner: otherColor(game.turn()), reason: "checkmate" };
    if (game.in_stalemate()) return { over: true, winner: null, reason: "stalemate" };
    if (game.insufficient_material()) return { over: true, winner: null, reason: "insufficient" };
    if (game.in_threefold_repetition()) return { over: true, winner: null, reason: "repetition" };
    if (game.in_draw()) return { over: true, winner: null, reason: "fifty" };
    return { over: false };
  }

  function outcomeLabel(result) {
    if (!result.winner) return "Draw";
    return colorName(result.winner) + " wins";
  }

  function updateCaptured() {
    var captured = { w: [], b: [] };
    state.game.history({ verbose: true }).forEach(function (move) {
      if (move.captured) captured[move.color].push(move.captured);
    });
    state.captured = captured;
  }

  function updateControls() {
    var btnResign = $("btnResign");
    if (btnResign) btnResign.disabled = state.over;
  }

  function canHumanMove(color) {
    if (state.over || state.thinking) return false;
    if (state.mode === "computer" && color !== state.humanColor) return false;
    return true;
  }

  function selectSquare(square) {
    state.selected = square;
    state.targets = new Set();
    state.captures = new Set();
    state.game.moves({ square: square, verbose: true }).forEach(function (move) {
      state.targets.add(move.to);
      if (move.captured) state.captures.add(move.to);
    });
    paintSquares();
  }

  function clearSelection() {
    state.selected = null;
    state.targets = new Set();
    state.captures = new Set();
    paintSquares();
  }

  function commitMove(from, to) {
    var options = state.game.moves({ square: from, verbose: true }).filter(function (move) { return move.to === to; });
    if (!options.length) return;
    if (options[0].promotion) {
      state.thinking = true;
      openPromotion(options[0].color, function (piece) {
        state.thinking = false;
        makeMove({ from: from, to: to, promotion: piece });
      });
      return;
    }
    makeMove({ from: from, to: to });
  }

  function makeMove(move) {
    var pending = [];
    var moved = state.game.move(move);
    if (!moved) return null;
    function queueSlide(from, to) {
      var el = boardEl.querySelector('.sq[data-square="' + from + '"] .piece');
      if (el) pending.push({ rect: el.getBoundingClientRect(), to: to });
    }
    queueSlide(moved.from, moved.to);
    if (moved.flags.indexOf("k") !== -1) queueSlide(moved.color === "w" ? "h1" : "h8", moved.color === "w" ? "f1" : "f8");
    if (moved.flags.indexOf("q") !== -1) queueSlide(moved.color === "w" ? "a1" : "a8", moved.color === "w" ? "d1" : "d8");
    state.lastMove = moved;
    state.selected = null;
    state.targets = new Set();
    state.captures = new Set();
    renderBoard();
    pending.forEach(function (item) { animatePiece(item.rect, item.to); });
    afterMove(moved);
    return moved;
  }

  function afterMove(moved) {
    updateCaptured();
    syncClockTurn();
    renderAll();
    announce(moved);

    var outcome = getOutcome();
    if (outcome.over) {
      endGame(outcome);
      return;
    }
    scheduleComputerMove();
  }

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (state.over || state.thinking) return;
    var square = squareFromEvent(event);
    if (!square) return;
    if (state.selected === square) {
      clearSelection();
      return;
    }
    if (state.selected && state.targets.has(square)) {
      var from = state.selected;
      clearSelection();
      commitMove(from, square);
      return;
    }
    var piece = state.game.get(square);
    if (piece && canHumanMove(piece.color) && piece.color === state.game.turn()) {
      selectSquare(square);
      beginDrag(event, square);
      return;
    }
    clearSelection();
  }

  function beginDrag(event, square) {
    var rect = boardEl.getBoundingClientRect();
    drag = {
      from: square,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      ghost: null,
      hover: square,
      size: rect.width / 8
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function createGhost() {
    var source = boardEl.querySelector('.sq[data-square="' + drag.from + '"] .piece');
    if (!source) return;
    var ghost = document.createElement("img");
    ghost.className = "drag-ghost";
    ghost.src = source.src;
    ghost.alt = "";
    ghost.style.width = drag.size + "px";
    ghost.style.height = drag.size + "px";
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    boardEl.classList.add("is-dragging");
    var fromSquare = boardEl.querySelector('.sq[data-square="' + drag.from + '"]');
    if (fromSquare) fromSquare.classList.add("sq--dragfrom");
  }

  function moveGhost(event) {
    if (!drag.ghost) return;
    drag.ghost.style.left = event.clientX + "px";
    drag.ghost.style.top = event.clientY + "px";
    var square = squareFromEvent(event);
    if (square === drag.hover) return;
    var previous = boardEl.querySelector(".sq--hover");
    if (previous) previous.classList.remove("sq--hover");
    drag.hover = square;
    if (square) {
      var el = boardEl.querySelector('.sq[data-square="' + square + '"]');
      if (el) el.classList.add("sq--hover");
    }
  }

  function onPointerMove(event) {
    if (!drag) return;
    if (!drag.active) {
      var dx = event.clientX - drag.startX;
      var dy = event.clientY - drag.startY;
      if (dx * dx + dy * dy < 25) return;
      drag.active = true;
      createGhost();
    }
    moveGhost(event);
  }

  function endDrag() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  }

  function onPointerUp(event) {
    if (!drag) return;
    var current = drag;
    drag = null;
    endDrag();
    boardEl.classList.remove("is-dragging");
    var dragging = boardEl.querySelector(".sq--dragfrom");
    if (dragging) dragging.classList.remove("sq--dragfrom");
    var hovered = boardEl.querySelector(".sq--hover");
    if (hovered) hovered.classList.remove("sq--hover");
    if (current.ghost) current.ghost.remove();
    if (!current.active) return;
    var square = squareFromEvent(event);
    if (square && state.targets.has(square)) {
      clearSelection();
      commitMove(current.from, square);
    } else if (!square) {
      clearSelection();
    }
  }

  function openPromotion(color, callback) {
    var html = "";
    PROMO_ORDER.forEach(function (type) {
      html += '<button class="promo" type="button" data-piece="' + type + '">' +
        '<img src="' + pieceSrc(color, type) + '" alt="' + PROMO_LABEL[type] + '" />' +
        "<span>" + PROMO_LABEL[type] + "</span></button>";
    });
    promoGrid.innerHTML = html;
    function choose(event) {
      var button = event.target.closest(".promo");
      if (!button) return;
      promoGrid.removeEventListener("click", choose);
      closeOverlay(promoModal);
      callback(button.dataset.piece);
    }
    promoGrid.addEventListener("click", choose);
    openOverlay(promoModal);
  }

  function openOverlay(el) { if (el) el.classList.add("overlay--show"); }
  function closeOverlay(el) { if (el) el.classList.remove("overlay--show"); }
  function closeAllOverlays() {
    [startScreen, promoModal, resultModal, confirmModal].forEach(closeOverlay);
  }

  function showStart() {
    closeAllOverlays();
    openOverlay(startScreen);
    syncStartScreen();
  }

  /* Keep the start screen in step with the pending selections. */
  function syncStartScreen() {
    if (startCloseBtn) startCloseBtn.hidden = !state.started;
    if (modeGroup) {
      modeGroup.querySelectorAll(".mode").forEach(function (b) {
        var on = b.dataset.mode === state.mode;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    setActiveSeg(difficultyGroup, state.difficulty, "difficulty");
    setActiveSeg(startTimeGroup, String(state.timeControl), "time");
    /* Strength only applies when playing the computer. */
    if (difficultyField) difficultyField.hidden = state.mode !== "computer";
  }

  function setActiveSeg(group, value, key) {
    if (!group) return;
    group.querySelectorAll(".seg").forEach(function (s) {
      s.classList.toggle("is-active", s.dataset[key] === value);
    });
  }

  function resetGame(mode, timeSec, difficulty) {
    state.mode = mode;
    state.timeControl = timeSec;
    state.difficulty = difficulty || state.difficulty;
    state.humanColor = "w";
    state.aiColor = "b";
    state.game = new Chess();
    state.orientation = "w";
    state.selected = null;
    state.targets = new Set();
    state.captures = new Set();
    state.lastMove = null;
    state.captured = { w: [], b: [] };
    state.clock = { w: timeSec * 1000, b: timeSec * 1000 };
    state.clockRunning = false;
    state.clockLast = 0;
    state.thinking = false;
    state.over = false;
    state.started = false;
    state.result = null;
    state.generation++;
    clearInterval(tickTimer);
  }

  function startGame(mode, timeSec, difficulty) {
    if (!window.Chess) {
      var err = $("loadError");
      if (err) err.hidden = false;
      return;
    }
    resetGame(mode, timeSec, difficulty);
    state.started = true;
    closeAllOverlays();
    renderAll();
    scheduleComputerMove();
  }

  function endGame(result) {
    state.over = true;
    state.result = result;
    state.thinking = false;
    state.clockRunning = false;
    clearInterval(tickTimer);
    renderAll();
    showResult(result);
  }

  function showResult(result) {
    resultTitle.textContent = outcomeLabel(result);
    resultReason.textContent = REPEAT_REASON[result.reason] || (result.winner ? "by checkmate" : "by draw");
    var badge = $("resultBadge");
    badge.innerHTML = "";
    if (result.winner) {
      var img = document.createElement("img");
      img.src = pieceSrc(result.winner, "k");
      img.alt = "";
      badge.appendChild(img);
    } else {
      var svg = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
      badge.innerHTML = svg;
    }
    openOverlay(resultModal);
  }

  function scheduleComputerMove() {
    if (state.over || state.thinking) return;
    if (state.mode !== "computer") return;
    if (state.game.turn() !== state.aiColor) return;
    state.thinking = true;
    renderBars();
    updateStatus();
    var gen = state.generation;
    setTimeout(function () {
      if (gen !== state.generation || state.over) {
        state.thinking = false;
        renderAll();
        return;
      }
      var move = null;
      try {
        move = chooseComputerMove();
      } catch (error) {
        /* Never let an engine fault freeze the board. */
        move = null;
      }
      state.thinking = false;
      if (move && makeMove(move)) return;
      var fallback = randomMove();
      if (fallback && makeMove(fallback)) return;
      var outcome = getOutcome();
      if (outcome.over) { endGame(outcome); return; }
      renderAll();
    }, AI_MIN_DELAY);
  }

  /* ---------------------------------------------------------------------
     Computer opponent: minimax with alpha-beta pruning
     --------------------------------------------------------------------- */

  /* Piece-square tables (white's view, index 0 = a8). */
  var PST = {
    p: [
        0,  0,  0,  0,  0,  0,  0,  0,
       50, 50, 50, 50, 50, 50, 50, 50,
       10, 10, 20, 30, 30, 20, 10, 10,
        5,  5, 10, 25, 25, 10,  5,  5,
        0,  0,  0, 20, 20,  0,  0,  0,
        5, -5,-10,  0,  0,-10, -5,  5,
        5, 10, 10,-20,-20, 10, 10,  5,
        0,  0,  0,  0,  0,  0,  0,  0
    ],
    n: [
      -50,-40,-30,-30,-30,-30,-40,-50,
      -40,-20,  0,  0,  0,  0,-20,-40,
      -30,  0, 10, 15, 15, 10,  0,-30,
      -30,  5, 15, 20, 20, 15,  5,-30,
      -30,  0, 15, 20, 20, 15,  0,-30,
      -30,  5, 10, 15, 15, 10,  5,-30,
      -40,-20,  0,  5,  5,  0,-20,-40,
      -50,-40,-30,-30,-30,-30,-40,-50
    ],
    b: [
      -20,-10,-10,-10,-10,-10,-10,-20,
      -10,  0,  0,  0,  0,  0,  0,-10,
      -10,  0,  5, 10, 10,  5,  0,-10,
      -10,  5,  5, 10, 10,  5,  5,-10,
      -10,  0, 10, 10, 10, 10,  0,-10,
      -10, 10, 10, 10, 10, 10, 10,-10,
      -10,  5,  0,  0,  0,  0,  5,-10,
      -20,-10,-10,-10,-10,-10,-10,-20
    ],
    r: [
        0,  0,  0,  0,  0,  0,  0,  0,
        5, 10, 10, 10, 10, 10, 10,  5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
        0,  0,  0,  5,  5,  0,  0,  0
    ],
    q: [
      -20,-10,-10, -5, -5,-10,-10,-20,
      -10,  0,  0,  0,  0,  0,  0,-10,
      -10,  0,  5,  5,  5,  5,  0,-10,
       -5,  0,  5,  5,  5,  5,  0, -5,
        0,  0,  5,  5,  5,  5,  0, -5,
      -10,  5,  5,  5,  5,  5,  0,-10,
      -10,  0,  5,  0,  0,  0,  0,-10,
      -20,-10,-10, -5, -5,-10,-10,-20
    ],
    k: [
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20,
      -10,-20,-20,-20,-20,-20,-20,-10,
       20, 20,  0,  0,  0,  0, 20, 20,
       20, 30, 10,  0,  0, 10, 30, 20
    ]
  };

  var TIMEOUT = { timeout: true };
  var nodeCount = 0;

  /* ---- Search tables (rebuilt for every move) ---- */
  var TT_EXACT = 0, TT_LOWER = 1, TT_UPPER = 2;
  var TT_MAX = 150000;
  var tt = new Map();      /* position -> { depth, score, flag, key }       */
  var killers = [];        /* killers[ply] = two quiet moves worth retrying */
  var history = {};        /* quiet-move ordering heuristic                 */

  function moveKey(move) {
    return move.from + move.to + (move.promotion || "");
  }

  function resetSearchTables() {
    tt.clear();
    killers = [];
    history = {};
  }

  /* Position identity: board, side to move, castling, en-passant. The move
     counters are dropped so transpositions actually match. */
  function positionKey() {
    var parts = state.game.fen().split(" ");
    return parts[0] + " " + parts[1] + " " + parts[2] + " " + parts[3];
  }

  function rememberKiller(move, ply) {
    var list = killers[ply] || (killers[ply] = []);
    var key = moveKey(move);
    if (list[0] === key) return;
    list[1] = list[0];
    list[0] = key;
  }

  function randomMove() {
    var moves = state.game.moves({ verbose: true });
    if (!moves.length) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }

  /* Material + piece-square tables, plus a few structural terms. */
  function evaluate() {
    var rows = state.game.board();
    var score = 0;
    var pawnFiles = { w: [0, 0, 0, 0, 0, 0, 0, 0], b: [0, 0, 0, 0, 0, 0, 0, 0] };
    var bishops = { w: 0, b: 0 };
    var r, c;

    for (r = 0; r < 8; r++) {
      for (c = 0; c < 8; c++) {
        var cell = rows[r][c];
        if (!cell) continue;
        var index = cell.color === "w" ? r * 8 + c : (7 - r) * 8 + c;
        var value = PIECE_VALUE[cell.type] + PST[cell.type][index];
        score += cell.color === "w" ? value : -value;
        if (cell.type === "p") pawnFiles[cell.color][c]++;
        else if (cell.type === "b") bishops[cell.color]++;
      }
    }

    for (var file = 0; file < 8; file++) {
      var wp = pawnFiles.w[file];
      var bp = pawnFiles.b[file];
      if (wp > 1) score -= 14 * (wp - 1);          /* doubled white pawns */
      if (bp > 1) score += 14 * (bp - 1);          /* doubled black pawns */
      if (wp && !(file > 0 && pawnFiles.w[file - 1]) && !(file < 7 && pawnFiles.w[file + 1])) score -= 16;
      if (bp && !(file > 0 && pawnFiles.b[file - 1]) && !(file < 7 && pawnFiles.b[file + 1])) score += 16;
    }
    if (bishops.w >= 2) score += 34;               /* bishop pair */
    if (bishops.b >= 2) score -= 34;

    return score;
  }

  /* Best-first ordering: PV move, then winning captures, then killers, then
     quiet moves by how often they have caused a cutoff. */
  function orderMoves(moves, pvKey, ply) {
    var list = killers[ply] || [];
    var scored = moves.map(function (move) {
      var key = moveKey(move);
      var score;
      if (pvKey && key === pvKey) score = 1000000;
      else if (move.captured) score = 100000 + PIECE_VALUE[move.captured] * 8 - PIECE_VALUE[move.piece];
      else if (move.promotion) score = 90000 + PIECE_VALUE[move.promotion];
      else if (list[0] === key) score = 80000;
      else if (list[1] === key) score = 79000;
      else score = history[key] || 0;
      return { move: move, score: score };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (item) { return item.move; });
  }

  /* Static score from the point of view of the side to move. */
  function evalSide() {
    if (state.game.insufficient_material()) return 0;
    var value = evaluate();
    return state.game.turn() === "w" ? value : -value;
  }

  /* Quiescence search: only captures and promotions, so the engine does not
     stop counting in the middle of a trade. This is what stops it hanging
     pieces at low depth. */
  function quiesce(alpha, beta, ply, deadline) {
    var game = state.game;
    nodeCount++;
    if ((nodeCount & 31) === 0 && performance.now() > deadline) throw TIMEOUT;

    var inCheck = game.in_check();
    var all = game.moves({ verbose: true });
    if (!all.length) return inCheck ? -MATE + ply : 0;

    var moves = inCheck ? all : all.filter(function (m) { return m.captured || m.promotion; });

    if (inCheck) {
      /* In check we must consider every evasion, so there is no stand-pat. */
      alpha = -Infinity;
    } else {
      var standPat = evalSide();
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
      if (!moves.length) return standPat;
    }

    moves = orderMoves(moves, null, -1);
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var score;
      try {
        score = -quiesce(-beta, -alpha, ply + 1, deadline);
      } finally {
        game.undo();
      }
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function search(depth, alpha, beta, ply, deadline, useQuiesce) {
    var game = state.game;
    nodeCount++;
    if ((nodeCount & 31) === 0 && performance.now() > deadline) throw TIMEOUT;

    var moves = game.moves({ verbose: true });

    /* No legal replies: checkmate or stalemate. */
    if (!moves.length) return game.in_check() ? -MATE + ply : 0;

    if (depth <= 0) {
      return useQuiesce ? quiesce(alpha, beta, ply, deadline) : evalSide();
    }

    var alphaOrig = alpha;
    var key = positionKey();
    var entry = tt.get(key);
    var pvKey = null;
    if (entry) {
      pvKey = entry.key;
      if (entry.depth >= depth) {
        if (entry.flag === TT_EXACT) return entry.score;
        if (entry.flag === TT_LOWER && entry.score >= beta) return entry.score;
        if (entry.flag === TT_UPPER && entry.score <= alpha) return entry.score;
      }
    }

    var ordered = orderMoves(moves, pvKey, ply);
    var best = -Infinity;
    var bestMove = null;

    for (var i = 0; i < ordered.length; i++) {
      var move = ordered[i];
      game.move(move);
      var score;
      try {
        score = -search(depth - 1, -beta, -alpha, ply + 1, deadline, useQuiesce);
      } finally {
        game.undo();
      }
      if (score > best) { best = score; bestMove = move; }
      if (best > alpha) alpha = best;
      if (alpha >= beta) {
        if (!move.captured && !move.promotion) {
          rememberKiller(move, ply);
          history[moveKey(move)] = (history[moveKey(move)] || 0) + depth * depth;
        }
        break;
      }
    }

    if (tt.size < TT_MAX) {
      /* Mate scores are stored without a value: they are ply-dependent, but
         the move is still useful for ordering. */
      var scored = Math.abs(best) < MATE - 1000;
      var flag = best <= alphaOrig ? TT_UPPER : (best >= beta ? TT_LOWER : TT_EXACT);
      tt.set(key, {
        depth: scored ? depth : 0,
        score: scored ? best : 0,
        flag: flag,
        key: bestMove ? moveKey(bestMove) : null
      });
    }
    return best;
  }

  /* Returns every root move with its score, best first. */
  function searchRoot(depth, deadline, useQuiesce, pvMove) {
    var game = state.game;
    var moves = orderMoves(game.moves({ verbose: true }), pvMove ? moveKey(pvMove) : null, 0);
    var alpha = -Infinity;
    var scored = [];

    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var score;
      try {
        /* A repetition is a draw — never better than a winning line. */
        score = game.in_threefold_repetition()
          ? 0
          : -search(depth - 1, -Infinity, -alpha, 1, deadline, useQuiesce);
      } finally {
        game.undo();
      }
      scored.push({ move: moves[i], score: score });
      if (score > alpha) alpha = score;
    }

    scored.sort(function (a, b) { return b.score - a.score; });
    return scored;
  }

  /* Iterative deepening: keep the deepest completed result within budget. */
  function chooseComputerMove() {
    var cfg = difficultyConfig();
    var moves = state.game.moves({ verbose: true });
    if (!moves.length) return null;

    if (cfg.blunder > 0 && Math.random() < cfg.blunder) return randomMove();

    var deadline = performance.now() + cfg.time;
    var ranked = null;
    nodeCount = 0;
    resetSearchTables();

    for (var depth = 1; depth <= cfg.depth; depth++) {
      var result;
      try {
        result = searchRoot(depth, deadline, cfg.quiesce, ranked ? ranked[0].move : null);
      } catch (error) {
        if (error !== TIMEOUT) throw error;
        break;
      }
      if (result && result.length) ranked = result;
      if (performance.now() > deadline) break;
    }

    if (!ranked) return randomMove();

    var best = ranked[0].move;
    /* Weaker levels sometimes settle for a near-best move. Never do this when
       a mate is on the board. */
    if (cfg.spread > 0 && ranked.length > 1 && ranked[0].score < MATE - 1000) {
      var top = ranked[0].score;
      var pool = ranked.filter(function (item) { return item.score >= top - cfg.spread; });
      best = pool[Math.floor(Math.random() * pool.length)].move;
    }
    return best;
  }

  function syncClockTurn() {
    if (state.timeControl <= 0) {
      state.clockRunning = false;
      return;
    }
    state.clockLast = performance.now();
    state.clockRunning = true;
    clearInterval(tickTimer);
    tickTimer = setInterval(tickClock, 120);
  }

  function tickClock() {
    if (!state.clockRunning || state.over || state.timeControl <= 0) return;
    var now = performance.now();
    var dt = now - state.clockLast;
    state.clockLast = now;
    var color = state.game.turn();
    state.clock[color] = Math.max(0, state.clock[color] - dt);
    renderClocks();
    if (state.clock[color] === 0) {
      state.clockRunning = false;
      clearInterval(tickTimer);
      endGame({ over: true, winner: otherColor(color), reason: "time" });
    }
  }

  function onResign() {
    if (state.over) return;
    showConfirm("Resign game?", "Your current position will be lost.", "Resign", function () {
      var loser = state.mode === "computer" ? state.humanColor : state.game.turn();
      endGame({ over: true, winner: otherColor(loser), reason: "resign" });
    });
  }

  function showConfirm(title, text, okLabel, action) {
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmAction = action;
    $("confirmOk").textContent = okLabel;
    openOverlay(confirmModal);
  }

  function onFlip() {
    state.orientation = otherColor(state.orientation);
    renderAll();
  }

  function onNewGameClick() {
    showStart();
  }

  function onRematch() {
    closeOverlay(resultModal);
    startGame(state.mode, state.timeControl, state.difficulty);
  }

  function onResultNew() {
    closeOverlay(resultModal);
    showStart();
  }

  function onTopNewGame() {
    showStart();
  }

  function onStartModeClick(event) {
    var btn = event.target.closest(".mode");
    if (!btn) return;
    state.mode = btn.dataset.mode;
    syncStartScreen();
  }

  function onStartDifficulty(event) {
    var btn = event.target.closest(".seg");
    if (!btn) return;
    state.difficulty = btn.dataset.difficulty;
    syncStartScreen();
  }

  function onStartTime(event) {
    var btn = event.target.closest(".seg");
    if (!btn) return;
    state.timeControl = parseInt(btn.dataset.time, 10);
    syncStartScreen();
  }

  function onStartPlay() {
    startGame(state.mode, state.timeControl, state.difficulty);
  }

  function announce(moved) {
    if (!moved) return;
    var text = colorName(moved.color) + " played " + moved.san;
    if (liveEl) liveEl.textContent = text;
  }

  function wireEvents() {
    boardEl.addEventListener("pointerdown", onPointerDown);
    if ($("btnResign")) $("btnResign").addEventListener("click", onResign);
    if ($("btnFlip")) $("btnFlip").addEventListener("click", onFlip);
    if ($("btnRematch")) $("btnRematch").addEventListener("click", onRematch);
    if ($("btnResultNew")) $("btnResultNew").addEventListener("click", onResultNew);
    if ($("topNewGame")) $("topNewGame").addEventListener("click", onTopNewGame);
    if ($("sidebarNew")) $("sidebarNew").addEventListener("click", onNewGameClick);
    if ($("startPlay")) $("startPlay").addEventListener("click", onStartPlay);
    if ($("confirmOk")) $("confirmOk").addEventListener("click", function () { if (confirmAction) confirmAction(); closeOverlay(confirmModal); });
    if ($("confirmCancel")) $("confirmCancel").addEventListener("click", function () { closeOverlay(confirmModal); });
    if ($("startClose")) $("startClose").addEventListener("click", function () { closeOverlay(startScreen); });
    if (modeGroup) modeGroup.addEventListener("click", onStartModeClick);
    if (difficultyGroup) difficultyGroup.addEventListener("click", onStartDifficulty);
    if (startTimeGroup) startTimeGroup.addEventListener("click", onStartTime);
  }

  function init() {
    if (!window.Chess) {
      var err = $("loadError");
      if (err) err.hidden = false;
      return;
    }
    wireEvents();
    resetGame(state.mode, state.timeControl, state.difficulty);
    renderAll();
    showStart();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
