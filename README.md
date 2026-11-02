# p2p go - Play Go online without a server

Go for two, browser to browser (WebRTC via Trystero/Nostr, no server), on 7×7, 9×9, 13×13 or 19×19. There is also a practice mode against a simple bot. The UI is in English, or Spanish if the browser language is Spanish.

Live: https://franciscocarloserra.github.io/p2p-go/ — pick a board size and "Online with link"; that creates a `#room:key` link. Send the whole link to the other player. "Practice vs bot" and "Local 2 players" play offline on one device, with undo. The "menu" pill starts a new game from anywhere.

<img width="1232" height="1229" alt="Screenshot_20261102_060611" src="https://github.com/user-attachments/assets/8ef6f184-1b59-47d7-b66f-7a780c476e48" />


Rules: area scoring, komi 7.5, simple ko, no suicide. After two passes both players tap dead stones (groups in atari start marked) and accept; "Resume" goes back to playing. Resign is always available. The "count" pill shows the current estimate during play.

The game and chat are saved on each device (localStorage) and re-sync on reconnect. To ship a new version, bump the version in `index.html` (`VERSION` and the `?v=` imports), `bot.js` and `version.txt`. Open clients show "update".

The bot only looks one move ahead; it's for learning the controls, not for a real game.
