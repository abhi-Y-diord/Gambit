<div align="center">

# Gambit

**A complete chess game that runs entirely in the browser.**

No build step · no framework · no backend · three files

[![Live demo](https://img.shields.io/badge/demo-live%20now-5b8db8?style=flat-square)](https://abhi-Y-diord.github.io/Gambit/)
[![Deployment](https://img.shields.io/github/deployments/abhi-Y-diord/Gambit/github-pages?style=flat-square&label=pages&logo=github)](https://github.com/abhi-Y-diord/Gambit/actions)
[![Last commit](https://img.shields.io/github/last-commit/abhi-Y-diord/Gambit?style=flat-square&color=5b8db8)](https://github.com/abhi-Y-diord/Gambit/commits/main)
[![Stars](https://img.shields.io/github/stars/abhi-Y-diord/Gambit?style=flat-square&color=5b8db8)](https://github.com/abhi-Y-diord/Gambit)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![chess.js](https://img.shields.io/badge/chess.js-0.12.1-5b8db8?style=flat-square)
![No build step](https://img.shields.io/badge/build-none-3ba55d?style=flat-square)

### [Play the live demo →](https://abhi-Y-diord.github.io/Gambit/)

</div>

<div align="center">
  <img src="screenshot.png" width="760" alt="Gambit — a game in progress against the computer on Extremely hard">
  <br>
  <sub>A game against the computer on <b>Extremely hard</b> — last move highlighted, clocks running, moves in algebraic notation.</sub>
</div>

---

## Overview

Gambit is a full chess game written in plain HTML, CSS and JavaScript. Open it
in a browser and play — there is nothing to install, compile or configure.

You can play **against the computer** at four strength levels, or **against a
friend** on the same screen, with a real per-player clock, complete chess
rules, and a clean board that stays readable on a phone as well as a desktop.

## Features

**Complete chess rules**

| Rule | Supported |
| --- | --- |
| Castling, both sides | Yes |
| En passant | Yes |
| Promotion with a piece picker | Yes |
| Check and checkmate | Yes |
| Stalemate | Yes |
| Threefold repetition | Yes |
| Fifty-move rule | Yes |
| Insufficient material | Yes |
| Flag fall (clock reaches zero) | Yes |

**Playing**

- **Two opponents** — the computer, or a friend sharing the screen.
- **Four computer strengths** — Easy, Medium, Hard and Extremely hard.
- **Time controls** — ten minutes per player, or unlimited. The clock starts on
  the first move and a player who runs out of time loses.
- **Move by click or drag** — click a piece then a destination, or drag it with
  the mouse or a finger.

**Interface**

- Legal destinations are marked with a dot, captures with a ring.
- The last move is highlighted, and the king is highlighted while in check.
- A side panel lists every move in standard algebraic notation with a turn
  indicator.
- Captured pieces and a material advantage counter beside each player.
- Resign (with a confirmation step), New Game, Rematch and Flip Board.
- Fully responsive: three columns on a desktop, a single column on a phone.

## Computer opponent

The engine is a classic minimax search with alpha-beta pruning, a transposition
table, killer/history move ordering, iterative deepening and a quiescence
search, scored by material plus piece-square tables.

| Level | Search depth | Thinking time | Blunder chance | Quiescence |
| --- | --- | --- | --- | --- |
| Easy | 1 | 0.15 s | 35 % | off |
| Medium | 2 | 0.5 s | 5 % | on |
| Hard | 4 | 1.2 s | 0 % | on |
| **Extremely hard** | 6 | 2.5 s | 0 % | on |

Extremely hard is genuinely hard to beat: it does not hang pieces, it refuses
poisoned pawns, and it never settles for a near-best move when a forced mate is
on the board.

> **Note** — the top level thinks on the main thread for up to 2.5 seconds per
> move, so the page is briefly unresponsive while it is thinking. Lower the
> `time` value in the `DIFFICULTY` table in `script.js` to make it snappier, or
> raise the `depth` value to make it stronger.

## Quick start

**Play online** — nothing to install:

> ### [abhi-Y-diord.github.io/Gambit](https://abhi-Y-diord.github.io/Gambit/)

**Run it locally** — download the project and double-click `index.html`. It
opens in your browser and works straight from the file system.

Any static server works too, if you prefer one:

```bash
python -m http.server 8000     # Python 3
npx serve .                    # Node
```

> The game loads `chess.js` and the Inter font from public CDNs, so it needs an
> internet connection the first time. Offline use is described below.

## How to play

| Action | How |
| --- | --- |
| Move a piece | Click it, then click a highlighted square — or drag it |
| Choose a promotion piece | Pick from the dialog that appears |
| Resign | **Resign** in the side panel, then confirm |
| Start over | **New game** |
| Play the same settings again | **Rematch** on the result screen |
| Turn the board around | **Flip board** |

## Project structure

```
Gambit/
├── index.html          Page structure, dialogs and script tags
├── style.css           Theme, layout, board squares, responsive rules
├── script.js           All game logic, plus the embedded piece artwork
├── screenshot.png      The image at the top of this README
├── assets/
│   └── pieces/         12 source SVGs for the piece artwork
└── tools/
    └── embed-pieces.js Bakes the SVGs above into script.js
```

**Only `index.html`, `style.css` and `script.js` are needed to run the game.**
`assets/` and `tools/` are development sources and are never requested at
runtime.

## How it works

- **Rules** come from [chess.js](https://github.com/jhlywa/chess.js) 0.12.1,
  loaded from cdnjs. That older build is used on purpose: it exposes a plain
  global `Chess`, which works with a normal `<script src>` even from a `file://`
  page. The 1.x builds are ESM-only and will not load this way.
- **Rendering** rebuilds the 64 squares, then paints selection, target and check
  highlights without a full re-render. Moves animate using the Web Animations
  API.
- **Coordinates** (a–h, 1–8) are drawn inside the edge squares and sized with
  CSS container queries, so they scale with the board.
- **Piece artwork is embedded** in `script.js` as base64 SVG data URIs. The page
  therefore makes no image requests and needs no asset folder; the `.svg` files
  in `assets/pieces/` are the editable source.

## Customising

| What | Where |
| --- | --- |
| Colours | CSS custom properties at the top of `style.css` |
| Board colours | `--sq-light` and `--sq-dark` (light `#eaf1f8`, dark `#5b8db8`) |
| Computer strength | the `DIFFICULTY` table near the top of `script.js` |
| Time controls | the `data-time` buttons in the start screen |
| Piece artwork | edit `assets/pieces/*.svg`, then run `node tools/embed-pieces.js` |

**Making it fully offline** — download `chess.min.js` (0.12.1) and the Inter
font into the project, then point the `<script>` and `<link>` tags in
`index.html` at the local copies. Nothing else needs to change: the game uses
no `fetch`, no modules and no local storage.

## Deploying

This is a static site, so any static host works — GitHub Pages, Netlify,
Cloudflare Pages or Vercel. For GitHub Pages:

1. Push `index.html`, `style.css` and `script.js` to a public repository.
2. Go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose
   branch **main** and folder **/ (root)**, then **Save**.
3. Wait about a minute for the first build.
4. Your game is live at `https://<username>.github.io/<repository>/`.

### After you change a file

GitHub Pages serves every file with `Cache-Control: max-age=600`, so your
browser keeps its own copy for up to ten minutes per file and will not even ask
the server whether it changed. If a change seems to have no effect, force a
fresh fetch:

- **Windows / Linux:** `Ctrl` + `Shift` + `R` · **macOS:** `Cmd` + `Shift` + `R`
- Or open the site in a private/incognito window.
- Or keep DevTools open on the **Network** tab with *Disable cache* ticked.

## Browser support

Any current version of Chrome, Edge, Firefox or Safari. The layout uses CSS
Grid, container queries and the Web Animations API.

## Credits and licensing

| Component | Author | Licence |
| --- | --- | --- |
| Chess rules — [chess.js](https://github.com/jhlywa/chess.js) | Jeff Hlywa | BSD-2-Clause |
| Piece artwork — the *cburnett* set, via [Lichess](https://lichess.org) | Colin M. L. Burnett | GPLv2+ |
| Typeface — [Inter](https://fonts.google.com/specimen/Inter) | Rasmus Andersson | SIL OFL 1.1 |

The piece artwork is licensed under the GPLv2+, and it is embedded in
`script.js`, so redistributing this project means keeping the attribution above
and honouring that licence.

The name, layout and styling of Gambit are original. It is not affiliated with,
and does not copy assets from, chess.com or any other chess site.
