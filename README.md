# Gambit · Play Chess

A complete chess game that runs entirely in the browser — no build step, no
framework, no backend. Open `index.html` and play.

You can play against the computer at four strength levels or against a friend
on the same device, with a real clock, full chess rules, and a clean board
inspired by the big chess sites (own design, own name, no copied assets).

---

## Features

- **Full chess rules** — castling, en passant, promotion (with a piece picker),
  check, checkmate, stalemate, threefold repetition, the fifty-move rule and
  insufficient material.
- **Two opponents**
  - *Play vs Computer* — a minimax engine with alpha–beta pruning, quiescence
    search, a transposition table, killer/history move ordering and iterative
    deepening.
  - *Play with a Friend* — two players taking turns on this screen.
- **Four computer strengths** — Easy, Medium, Hard and Extremely hard.
- **Time controls** — 10 minutes per player, or unlimited. A clock reaching
  zero loses the game (flag fall).
- **Board interaction** — click a piece and then a square, or drag it with the
  mouse or a finger. Legal targets show as dots, captures as rings.
- **Clear feedback** — the last move is highlighted, the king is highlighted
  when in check, and there is a small dot on every legal destination.
- **Move list** in standard algebraic notation, with captured pieces and a
  material counter next to each player.
- **Controls** — Resign (with confirmation), New Game, Rematch and Flip Board.
- **Responsive** — three columns on desktop, a single column on phones.

## Computer strengths

| Level            | Search depth | Thinking time | Blunder chance | Quiescence |
| ---------------- | ------------ | ------------- | -------------- | ---------- |
| Easy             | 1            | 0.15 s        | 35 %           | off        |
| Medium           | 2            | 0.5 s         | 5 %            | on         |
| Hard             | 4            | 1.2 s         | 0 %            | on         |
| Extremely hard   | 6            | 2.5 s         | 0 %            | on         |

The engine is deliberately **not** a full modern chess engine. It is a clean,
readable minimax implementation with a piece-square-table evaluation — strong
enough to punish loose play at the top level, but not a Grandmaster.

> **Note:** the top level thinks on the main thread for up to ~2.5 seconds per
> move, so the page is briefly unresponsive while it is "thinking". Lower the
> `time` budget in the `DIFFICULTY` table in `script.js` if you want snappier
> play.

## Running it

### Just play

Double-click **`index.html`**. That is all — it opens in your browser and works
straight from the file system (`file://`).

### With a local server (optional)

Any static server works, for example:

```bash
# Python 3
python -m http.server 8000

# Node
npx serve .
```

Then open <http://localhost:8000>.

> **Internet on first load:** the game pulls `chess.js` and the Inter font from
> public CDNs over HTTPS. If you are offline, a small banner explains why the
> board did not start. To run fully offline, see *Making it fully offline*
> below.

## Project structure

```
chess-game/
├── index.html          # Page structure, overlays and script tags
├── style.css           # Theme, layout, board squares, responsive rules
├── script.js           # All game logic in one IIFE
├── assets/
│   └── pieces/         # 12 SVG pieces (wp.svg, bn.svg, ...)
└── README.md
```

Everything lives in three files. `script.js` is organised in sections: state,
rendering, board interaction, game flow, clocks, the computer engine, and
event wiring.

## How it works

- **`chess.js`** (v0.12.1, loaded from cdnjs) owns the rules: it validates
  moves, tracks history, and detects check, mate, draws and repetition. The
  older 0.12.x build is used on purpose — it exposes a plain global `Chess`
  that works with a normal `<script src>` from `file://`. The newer 1.x builds
  are ESM/CJS only and will not load this way.
- **Rendering** rebuilds the 64 squares, then paints selection, target and
  check highlights without a full re-render. Moves animate with the Web
  Animations API (a FLIP-style animation).
- **Coordinates** (a–h, 1–8) are drawn inside the edge squares and sized with
  CSS container queries, so they scale with the board.
- **Clocks** start on the first move, not when the game begins.

## Customising

| What                     | Where                                                       |
| ------------------------ | ----------------------------------------------------------- |
| Colours                  | CSS custom properties at the top of `style.css`              |
| Board colours            | `--sq-light` / `--sq-dark` (light `#eaf1f8`, dark `#5b8db8`) |
| Computer strength        | the `DIFFICULTY` table near the top of `script.js`           |
| Time controls            | the `data-time` buttons in the start screen                  |
| Piece artwork            | replace the SVGs in `assets/pieces/`                         |

### Making it fully offline

Download `chess.min.js` (0.12.1) and the Inter font into the project, then
point the `<script>` and `<link>` tags in `index.html` at the local copies.
Nothing else needs to change — the game uses no `fetch`, no modules and no
local storage.

## Browser support

Any modern browser (Chrome, Edge, Firefox, Safari). The layout uses CSS Grid,
container queries and the Web Animations API, all of which are widely
supported today.

## Deployment

This is a pure static site — three files plus an `assets/` folder. It needs no
Node, no build step and no server-side code, so **yes, it can be deployed on
GitHub Pages**, and that is the easiest free option.

### Option 1 — GitHub Pages, no command line

1. Create a new **public** repository on GitHub (private repos need a paid plan
   for Pages), for example `gambit`.
2. On the new repo page choose **uploading an existing file**, then drag the
   *contents* of the `chess-game` folder into the browser (not the folder
   itself): `index.html`, `style.css`, `script.js`, `assets/` and this README.
3. Commit the upload.
4. Go to **Settings → Pages**. Under *Build and deployment*, set **Source** to
   *Deploy from a branch*, pick branch **main** and folder **/ (root)**, then
   **Save**.
5. Wait a minute or two. Your game is live at
   `https://<your-username>.github.io/<repo-name>/`.

### Option 2 — GitHub Pages with git

```bash
cd chess-game
git init
git add .
git commit -m "Gambit chess"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then enable Pages exactly as in step 4 above.

### Option 3 — Other free hosts

Any static host works with zero changes, and most are even simpler than Pages
(usually drag-and-drop with no Git at all):

| Host                   | Notes                                                          |
| ---------------------- | -------------------------------------------------------------- |
| **Netlify Drop**       | Drag the folder onto <https://app.netlify.com/drop>. Instant.   |
| **Cloudflare Pages**   | Connect a Git repo or upload directly; generous free tier.      |
| **Vercel**             | Import the repo, no framework preset needed.                    |
| **Surge / Render**     | Simple static hosting via CLI or Git.                           |

### Two things to know before you deploy

- **Filenames are case-sensitive on the web.** Windows ignores case, Linux
  hosts do not, and `index.html`, `style.css`, `script.js` and the SVG names in
  `assets/pieces/` are all lowercase and referenced in lowercase. Upload them
  exactly as they are and every link will resolve. A `.nojekyll` file is
  already included in this folder so GitHub Pages serves the files as-is
  instead of running them through Jekyll.
- **The two external dependencies load over the internet.** `chess.js` and the
  Inter font fetch over HTTPS, which works fine on Pages, Netlify and the rest.
  For a build that works with no connection at all, vendor those two files
  locally as described in *Making it fully offline* above.

None of these hosts need custom headers, redirects or a build command.

## Credits

- Chess rules: [chess.js](https://github.com/jhlywa/chess.js) by Jeff Hlywa
  (BSD-2-Clause).
- Piece artwork: the **cburnett** set by Colin M. L. Burnett, taken from
  [Lichess](https://lichess.org) and licensed under the **GPLv2+**. If you
  redistribute this project, keep this attribution and respect that licence.
- Typeface: [Inter](https://fonts.google.com/specimen/Inter) by Rasmus
  Andersson, licensed under the SIL Open Font License.

The name, logo, layout and styling of this project are original. It is not
affiliated with, and does not copy assets from, chess.com or any other site.
