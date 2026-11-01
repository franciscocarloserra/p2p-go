// Practice bot: one-move lookahead with simple Go heuristics (capture, save, atari, no self-atari, don't fill own eyes)
import {nbrs, group, tryPlay} from './game.js?v=2026-11-02.3';

const W = {
  capture: 10,       // per stone captured
  save: 8,           // per own stone pulled out of atari
  atari: 4,          // putting an enemy group in atari
  selfAtari: 12,     // + group size, for leaving own group with 1 liberty
  twoLibs: 2,
  opening: 2,        // 3rd/4th line while the board is young
  edge: 3,           // first line
  near: 0.5,         // stones within 2 points
  noise: 1.5,
  passLate: 1,       // pass when the best move is worse than this late in the game
  passAfter: 3,      // ... or this when the opponent just passed
};

// Own eye: every neighbor is ours and the opponent doesn't hold too many diagonals
function isEye(b, N, i, c) {
  if (!nbrs(N, i).every(n => b[n] === c)) return false;
  const x = i % N, y = Math.floor(i / N), o = c === 'b' ? 'w' : 'b';
  let bad = 0, edge = false;
  for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const X = x + dx, Y = y + dy;
    if (X < 0 || Y < 0 || X >= N || Y >= N) edge = true;
    else if (b[Y * N + X] === o) bad++;
  }
  return bad < (edge ? 1 : 2);
}

export function botMove(s, p) {
  if (s.phase === 'score') return {type: 'accept'};
  const N = s.size, B = s.board, c = 'bw'[p], o = 'bw'[1 - p];
  let best = -1, bs = -Infinity;
  for (let i = 0; i < N * N; i++) {
    if (B[i] !== '.' || i === s.ko || isEye(B, N, i, c)) continue;
    const r = tryPlay(B, N, i, c);
    if (!r) continue;
    let sc = r.captured.length * W.capture;
    if (r.libs === 1) sc -= W.selfAtari + r.size; else if (r.libs === 2) sc -= W.twoLibs;
    const seen = new Set();
    for (const n of nbrs(N, i)) {
      if (B[n] === c && !seen.has(n)) {
        const g = group(B, N, n); g.stones.forEach(k => seen.add(k));
        if (g.libs.size === 1 && r.libs > 1) sc += W.save * g.stones.length;
      } else if (r.board[n] === o && group(r.board, N, n).libs.size === 1) sc += W.atari;
    }
    const x = i % N, y = Math.floor(i / N), e = Math.min(x, y, N - 1 - x, N - 1 - y);
    if (e === 0) sc -= W.edge;
    if (s.moves < N * 2 && (e === 2 || e === 3)) sc += W.opening;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < N && Y < N && B[Y * N + X] !== '.') { near = true; break; }
    }
    if (near) sc += W.near;
    sc += Math.random() * W.noise;
    if (sc > bs) { bs = sc; best = i; }
  }
  if (best < 0 || (s.passes && bs < W.passAfter) || (s.moves > N * N * 0.6 && bs < W.passLate)) return {type: 'pass'};
  return {type: 'play', i: best};
}
