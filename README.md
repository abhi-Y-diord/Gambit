<div align="center">

# ♞ Gambit · Play Chess

**A complete chess game that runs entirely in your browser.**
No build step. No framework. No backend. Just open and play.

<br>

[![Play Live](https://img.shields.io/badge/▶_PLAY_LIVE-abhi--y--diord.github.io/Gambit-5b8db8?style=for-the-badge&logo=githubpages&logoColor=white)](https://abhi-y-diord.github.io/Gambit/)

<br>

[![Live Demo](https://img.shields.io/website?url=https%3A%2F%2Fabhi-y-diord.github.io%2FGambit%2F&label=demo&up_message=online&style=flat-square&logo=githubpages)](https://abhi-y-diord.github.io/Gambit/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![chess.js](https://img.shields.io/badge/chess.js-0.12.1-5b8db8?style=flat-square)](https://github.com/jhlywa/chess.js)
[![No Dependencies to Install](https://img.shields.io/badge/build-none_needed-success?style=flat-square)](#-running-it)

[![Stars](https://img.shields.io/github/stars/abhi-Y-diord/Gambit?style=flat-square&logo=github)](https://github.com/abhi-Y-diord/Gambit/stargazers)
[![Forks](https://img.shields.io/github/forks/abhi-Y-diord/Gambit?style=flat-square&logo=github)](https://github.com/abhi-Y-diord/Gambit/network/members)
[![Issues](https://img.shields.io/github/issues/abhi-Y-diord/Gambit?style=flat-square&logo=github)](https://github.com/abhi-Y-diord/Gambit/issues)
[![Last Commit](https://img.shields.io/github/last-commit/abhi-Y-diord/Gambit?style=flat-square&logo=github)](https://github.com/abhi-Y-diord/Gambit/commits/main)
[![Repo Size](https://img.shields.io/github/repo-size/abhi-Y-diord/Gambit?style=flat-square&logo=github)](https://github.com/abhi-Y-diord/Gambit)

<br>

[**🎮 Play Now**](https://abhi-y-diord.github.io/Gambit/) &nbsp;·&nbsp;
[**✨ Features**](#-features) &nbsp;·&nbsp;
[**🤖 Engine**](#-computer-strengths) &nbsp;·&nbsp;
[**🚀 Run Locally**](#-running-it) &nbsp;·&nbsp;
[**🎨 Customise**](#-customising)

</div>

---

## 📖 About

**Gambit** is a fully playable chess game built with plain HTML, CSS and JavaScript. Play against the computer at four strength levels, or challenge a friend on the same device, with a real clock, complete chess rules, and a clean blue board with its own original design and name.

> 👉 **[Play it right now: abhi-y-diord.github.io/Gambit](https://abhi-y-diord.github.io/Gambit/)**

---

## ✨ Features

| | Feature | Details |
|---|---|---|
| ♟️ | **Full chess rules** | Castling, en passant, promotion (with a piece picker), check, checkmate, stalemate, threefold repetition, fifty-move rule, insufficient material |
| 🤖 | **Play vs Computer** | Minimax engine with alpha-beta pruning, quiescence search, transposition table, killer/history move ordering and iterative deepening |
| 👥 | **Play with a Friend** | Two players taking turns on the same screen |
| 🎚️ | **4 difficulty levels** | Easy, Medium, Hard and Extremely hard |
| ⏱️ | **Time controls** | 10 minutes per player, or unlimited. A clock reaching zero loses the game |
| 🖱️ | **Click or drag** | Click a piece then a square, or drag with a mouse or finger |
| 💡 | **Clear feedback** | Legal targets shown as dots, captures as rings, last move highlighted, king highlighted when in check |
| 📜 | **Move list** | Standard algebraic notation, with captured pieces and a material counter for each player |
| 🎛️ | **Controls** | Resign (with confirmation), New Game, Rematch and Flip Board |
| 📱 | **Responsive** | Three columns on desktop, a single column on phones |

---

## 🤖 Computer Strengths

| Level | Search depth | Thinking time | Blunder chance | Quiescence |
| :--- | :---: | :---: | :---: | :---: |
| 🟢 Easy | 1 | 0.15 s | 35 % | off |
| 🟡 Medium | 2 | 0.5 s | 5 % | on |
| 🟠 Hard | 4 | 1.2 s | 0 % | on |
| 🔴 Extremely hard | 6 | 2.5 s | 0 % | on |

The engine is deliberately **not** a full modern chess engine. It is a clean, readable minimax implementation with a piece-square-table evaluation: strong enough to punish loose play at the top level, but not a Grandmaster.

> [!NOTE]
> The top level thinks on the main thread for up to ~2.5 seconds per move, so the page is briefly unresponsive while it is "thinking". Lower the `time` budget in the `DIFFICULTY` table in `script.js` for snappier play.

---

## 🚀 Running It

### Just play

Double-click **`index.html`**. It opens in your browser and works straight from the file system (`file://`).

### With a local server (optional)

```bash
# Clone the repository
git clone https://github.com/abhi-Y-diord/Gambit.git
cd Gambit

# Python 3
python -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

> [!IMPORTANT]
> **Internet on first load:** the game pulls `chess.js` and the Inter font from public CDNs over HTTPS. If you are offline, a small banner explains why the board did not start. See [Making it fully offline](#making-it-fully-offline) below.

---

## 🗂️ Project Structure

```text
Gambit/
├── index.html      # Page structure, overlays and script tags
├── style.css       # Theme, layout, board squares, responsive rules
├── script.js       # All game logic, plus the embedded piece artwork
├── .nojekyll       # Tells GitHub Pages to serve files as-is
└── README.md
```

`script.js` is organised in sections: state, rendering, board interaction, game flow, clocks, the computer engine, and event wiring.

---

## ⚙️ How It Works

- **Rules:** [`chess.js`](https://github.com/jhlywa/chess.js) (v0.12.1, loaded from cdnjs) validates moves, tracks history, and detects check, mate, draws and repetition. The 0.12.x build is used on purpose, because it exposes a plain global `Chess` that works with a normal `<script src>` from `file://`. Newer 1.x builds are ESM/CJS only and will not load this way.
- **Rendering:** the 64 squares are rebuilt, then selection, target and check highlights are painted without a full re-render. Moves animate with the Web Animations API (FLIP-style).
- **Coordinates:** the a–h and 1–8 labels sit inside the edge squares and scale with the board using CSS container queries.
- **Clocks:** they start on the first move, not when the game begins.
- **Piece artwork:** embedded in `script.js` as base64 SVG data URIs, so the page makes no image requests.

---

## 🎨 Customising

| What | Where |
| :--- | :--- |
| Colours | CSS custom properties at the top of `style.css` |
| Board colours | `--sq-light` / `--sq-dark` (light `#eaf1f8`, dark `#5b8db8`) |
| Computer strength | the `DIFFICULTY` table near the top of `script.js` |
| Time controls | the `data-time` buttons in the start screen |

### Making it fully offline

Download `chess.min.js` (0.12.1) and the Inter font into the project, then point the `<script>` and `<link>` tags in `index.html` at the local copies. Nothing else needs to change: the game uses no `fetch`, no modules and no local storage.

---

## 🌐 Browser Support

Any modern browser: Chrome, Edge, Firefox, Safari. The layout uses CSS Grid, container queries and the Web Animations API, all widely supported today.

---

## ☁️ Deployment

Gambit is a pure static site made of `index.html`, `style.css` and `script.js`. It is deployed on **GitHub Pages**:

1. Push the files to a public repository.
2. Go to **Settings → Pages**.
3. Set **Source** to *Deploy from a branch*, choose **main** and **/ (root)**, then **Save**.
4. Your game goes live at `https://<your-username>.github.io/<repo-name>/`.

It also works unchanged on Netlify, Cloudflare Pages, Vercel, Surge and Render. No custom headers, redirects or build command needed.

---

## 🗺️ Roadmap Ideas

- [ ] Move the engine into a Web Worker so the page never freezes while thinking
- [ ] Undo / takeback
- [ ] Save and resume games
- [ ] Export games as PGN
- [ ] Sound effects for moves and captures

---

## 🙏 Credits

- **Chess rules:** [chess.js](https://github.com/jhlywa/chess.js) by Jeff Hlywa (BSD-2-Clause)
- **Piece artwork:** the *cburnett* set by Colin M. L. Burnett, taken from [Lichess](https://lichess.org) and licensed under **GPLv2+**. If you redistribute this project, keep this attribution and respect that licence.
- **Typeface:** [Inter](https://fonts.google.com/specimen/Inter) by Rasmus Andersson (SIL Open Font License)

The name, logo, layout and styling of this project are original. It is not affiliated with, and does not copy assets from, chess.com or any other site.

---

<div align="center">

### Built by [Abhishek Yadav](https://github.com/abhi-Y-diord)

[![GitHub](https://img.shields.io/badge/GitHub-abhi--Y--diord-181717?style=for-the-badge&logo=github)](https://github.com/abhi-Y-diord)
[![Play](https://img.shields.io/badge/Play-Gambit-5b8db8?style=for-the-badge&logo=githubpages&logoColor=white)](https://abhi-y-diord.github.io/Gambit/)

⭐ **If you enjoyed the game, consider giving it a star!** ⭐

</div>
