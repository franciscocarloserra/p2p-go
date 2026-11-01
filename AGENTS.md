# p2p-go

Static site: `index.html` (UI, sync, chat), `game.js` (rules, state, scoring), `bot.js` (one-move-lookahead practice bot). Same flow as p2p-mancala and burako.

## Sync
Whole state is broadcast on every commit; highest `v` wins, ties by lowest `id`. `valid()` in `index.html` rejects malformed states. Board is a string of `.bw`, `players[0]` is black.

## Deploying without breaking live games
- State stays `schema: 1`. Only add fields with defaults; never rename, drop or change the meaning of a field.
- Bump the same version string in `index.html` (`VERSION` and every `?v=` import), `bot.js` and `version.txt`.
- Before pushing: play bot-vs-bot games on every size in node through `act` + `botMove`.

## Text
UI text is English in the code; `ES` in `index.html` maps each English string to Spanish. New strings go through `t()` and get an `ES` entry. Game log goes in `s.ev` (`[template, ...args]`) so each peer shows it in its own language.

## Dev
`python3 dev-serve.py 7810` serves the site and appends browser errors/warnings (sent when not on github.io) to `/tmp/p2p-go-console.jsonl`. Read that log instead of asking for screenshots.
