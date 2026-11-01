// Go rules and state, no DOM. Board: string, one char per point ('.' empty, 'b' black, 'w' white), row by row.
// players[0] plays black. Area scoring (stones + empty points surrounded by one color), komi to white. Simple ko, no suicide.
export const SIZES = [7, 9, 13, 19];
export const KOMI = 7.5;
const COL = 'bw';

export function nbrs(N, i) {
  const x = i % N, r = [];
  if (i >= N) r.push(i - N);
  if (i < N * N - N) r.push(i + N);
  if (x) r.push(i - 1);
  if (x < N - 1) r.push(i + 1);
  return r;
}

export function group(b, N, i) {
  const c = b[i], seen = new Set([i]), libs = new Set(), stones = [i];
  for (let k = 0; k < stones.length; k++) for (const n of nbrs(N, stones[k])) {
    if (b[n] === '.') libs.add(n);
    else if (b[n] === c && !seen.has(n)) { seen.add(n); stones.push(n); }
  }
  return {stones, libs};
}

// Put color c at i: {board, captured, libs, size} of the new group, or null if occupied or suicide
export function tryPlay(board, N, i, c) {
  if (board[i] !== '.') return null;
  const b = [...board], o = c === 'b' ? 'w' : 'b', captured = [];
  b[i] = c;
  for (const n of nbrs(N, i)) if (b[n] === o) {
    const g = group(b, N, n);
    if (!g.libs.size) for (const k of g.stones) { b[k] = '.'; captured.push(k); }
  }
  const g = group(b, N, i);
  if (!g.libs.size) return null;
  return {board: b.join(''), captured, libs: g.libs.size, size: g.stones.length};
}

export function newState(id, size, me) {
  return {schema: 1, id, v: 0, size, komi: KOMI, players: me ? [me] : [], phase: 'waiting', board: '.'.repeat(size * size),
    turn: 0, caps: [0, 0], ko: -1, passes: 0, last: -1, taken: [], moves: 0, dead: [], ok: [false, false], result: null, ev: null};
}

// Start or restart on the same two seats; swap = the other player takes black
export function begin(s, size = s.size, swap = false) {
  if (swap) s.players.reverse();
  Object.assign(s, newState(s.id, size), {v: s.v, players: s.players, phase: 'play', ev: ['{0} plays black', s.players[0].name]});
}

export function score(s, dead = s.dead) {
  const N = s.size, b = [...s.board], own = Array(N * N).fill(''), seen = new Uint8Array(N * N);
  for (const i of dead) b[i] = '.';
  let B = 0, W = 0;
  for (let i = 0; i < N * N; i++) {
    if (b[i] === 'b') { B++; continue; }
    if (b[i] === 'w') { W++; continue; }
    if (seen[i]) continue;
    const reg = [i], edge = new Set();
    seen[i] = 1;
    for (let k = 0; k < reg.length; k++) for (const n of nbrs(N, reg[k])) {
      if (b[n] !== '.') edge.add(b[n]);
      else if (!seen[n]) { seen[n] = 1; reg.push(n); }
    }
    if (edge.size !== 1) continue;
    const c = [...edge][0];
    for (const k of reg) own[k] = c;
    if (c === 'b') B += reg.length; else W += reg.length;
  }
  return {b: B, w: W + s.komi, own};
}

// First guess after both pass: groups in atari are dead. Players fix it by tapping groups.
function guessDead(s) {
  const out = [];
  for (let i = 0; i < s.board.length; i++) if (s.board[i] !== '.' && !out.includes(i)) {
    const g = group(s.board, s.size, i);
    if (g.libs.size === 1) out.push(...g.stones);
  }
  return out;
}

const name = (s, p) => s.players[p]?.name ?? '?';
const finish = (s, result) => Object.assign(s, {phase: 'over', result});

// p = seat (0 black, 1 white). Returns an error string, or nothing when the action was applied.
export function act(s, p, a) {
  if (p !== 0 && p !== 1) return 'you are watching';
  if (a.type === 'resign') {
    if (s.phase !== 'play' && s.phase !== 'score') return 'game is not on';
    finish(s, {winner: 1 - p, by: 'resign'});
    s.ev = ['{0} resigned', name(s, p)];
    return;
  }
  if (s.phase === 'play') {
    if (s.turn !== p) return 'not your turn';
    if (a.type === 'play') {
      if (!Number.isInteger(a.i) || a.i < 0 || a.i >= s.board.length) return 'invalid move';
      if (a.i === s.ko) return 'ko: play elsewhere first';
      const r = tryPlay(s.board, s.size, a.i, COL[p]);
      if (!r) return s.board[a.i] === '.' ? 'suicide is not allowed' : 'occupied';
      const ko = r.captured.length === 1 && r.size === 1 && r.libs === 1 ? r.captured[0] : -1;
      Object.assign(s, {board: r.board, ko, last: a.i, taken: r.captured, passes: 0, turn: 1 - p, moves: s.moves + 1});
      s.caps[p] += r.captured.length;
      s.ev = r.captured.length ? ['{0} captured {1}', name(s, p), r.captured.length] : null;
      return;
    }
    if (a.type === 'pass') {
      Object.assign(s, {ko: -1, last: -1, taken: [], passes: s.passes + 1, turn: 1 - p, moves: s.moves + 1});
      s.ev = ['{0} passed', name(s, p)];
      if (s.passes >= 2) Object.assign(s, {phase: 'score', dead: guessDead(s), ok: [false, false], ev: ['both passed: mark dead stones']});
      return;
    }
  }
  if (s.phase === 'score') {
    if (a.type === 'dead') {
      if (!Number.isInteger(a.i) || s.board[a.i] !== 'b' && s.board[a.i] !== 'w') return 'tap a group';
      const g = group(s.board, s.size, a.i).stones;
      s.dead = s.dead.includes(a.i) ? s.dead.filter(k => !g.includes(k)) : [...new Set([...s.dead, ...g])];
      s.ok = [false, false];
      return;
    }
    if (a.type === 'accept') {
      s.ok[p] = true;
      if (s.ok[0] && s.ok[1]) {
        const sc = score(s);
        finish(s, {winner: sc.b > sc.w ? 0 : sc.w > sc.b ? 1 : -1, by: 'score', b: sc.b, w: sc.w});
        s.ev = null;
      }
      return;
    }
    if (a.type === 'resume') {
      Object.assign(s, {phase: 'play', passes: 0, dead: [], ok: [false, false], ev: ['{0} resumed play', name(s, p)]});
      return;
    }
  }
  return 'not now';
}
