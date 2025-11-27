export const ATTACK_FU_S = new Int8Array(81);
export const ATTACK_FU_G = new Int8Array(81);
export const ATTACK_KEI_S: number[][] = [];
export const ATTACK_KEI_G: number[][] = [];
export const ATTACK_GIN_S: number[][] = [];
export const ATTACK_GIN_G: number[][] = [];
export const ATTACK_KIN_S: number[][] = [];
export const ATTACK_KIN_G: number[][] = [];
export const ATTACK_OU: number[][] = [];
export const ATTACK_ZOU_S: number[][] = [];
export const ATTACK_ZOU_G: number[][] = [];

export function initAttackTables(): void {
  for (let sq = 0; sq < 81; sq++) {
    const r = Math.floor(sq / 9);
    const c = sq % 9;

    ATTACK_FU_S[sq] = r > 0 ? sq - 9 : -1;
    ATTACK_FU_G[sq] = r < 8 ? sq + 9 : -1;

    ATTACK_KEI_S[sq] = [];
    if (r >= 2) {
      if (c > 0) ATTACK_KEI_S[sq].push(sq - 19);
      if (c < 8) ATTACK_KEI_S[sq].push(sq - 17);
    }

    ATTACK_KEI_G[sq] = [];
    if (r <= 6) {
      if (c > 0) ATTACK_KEI_G[sq].push(sq + 17);
      if (c < 8) ATTACK_KEI_G[sq].push(sq + 19);
    }

    ATTACK_GIN_S[sq] = [];
    ATTACK_GIN_G[sq] = [];
    if (r > 0) {
      ATTACK_GIN_S[sq].push(sq - 9);
      if (c > 0) {
        ATTACK_GIN_S[sq].push(sq - 10);
        ATTACK_GIN_G[sq].push(sq - 10);
      }
      if (c < 8) {
        ATTACK_GIN_S[sq].push(sq - 8);
        ATTACK_GIN_G[sq].push(sq - 8);
      }
    }
    if (r < 8) {
      ATTACK_GIN_G[sq].push(sq + 9);
      if (c > 0) {
        ATTACK_GIN_S[sq].push(sq + 8);
        ATTACK_GIN_G[sq].push(sq + 8);
      }
      if (c < 8) {
        ATTACK_GIN_S[sq].push(sq + 10);
        ATTACK_GIN_G[sq].push(sq + 10);
      }
    }

    ATTACK_KIN_S[sq] = [];
    ATTACK_KIN_G[sq] = [];
    if (r > 0) {
      ATTACK_KIN_S[sq].push(sq - 9);
      ATTACK_KIN_G[sq].push(sq - 9);
      if (c > 0) ATTACK_KIN_S[sq].push(sq - 10);
      if (c < 8) ATTACK_KIN_S[sq].push(sq - 8);
    }
    if (r < 8) {
      ATTACK_KIN_S[sq].push(sq + 9);
      ATTACK_KIN_G[sq].push(sq + 9);
      if (c > 0) ATTACK_KIN_G[sq].push(sq + 8);
      if (c < 8) ATTACK_KIN_G[sq].push(sq + 10);
    }
    if (c > 0) {
      ATTACK_KIN_S[sq].push(sq - 1);
      ATTACK_KIN_G[sq].push(sq - 1);
    }
    if (c < 8) {
      ATTACK_KIN_S[sq].push(sq + 1);
      ATTACK_KIN_G[sq].push(sq + 1);
    }

    ATTACK_OU[sq] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
          ATTACK_OU[sq].push(nr * 9 + nc);
        }
      }
    }

    ATTACK_ZOU_S[sq] = [];
    ATTACK_ZOU_G[sq] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
          const nsq = nr * 9 + nc;
          if (!(dr === 1 && dc === 0)) ATTACK_ZOU_S[sq].push(nsq);
          if (!(dr === -1 && dc === 0)) ATTACK_ZOU_G[sq].push(nsq);
        }
      }
    }
  }
}

export function kyoAttacks(sq: number, side: number, board: Int8Array): number[] {
  const moves: number[] = [];
  const dir = side === 0 ? -9 : 9;
  let s = sq + dir;
  const startRow = Math.floor(sq / 9);
  
  while (s >= 0 && s < 81) {
    const currentRow = Math.floor(s / 9);
    if ((side === 0 && currentRow >= startRow) || (side === 1 && currentRow <= startRow)) {
      break;
    }
    moves.push(s);
    if (board[s] !== 0) break;
    s += dir;
  }
  return moves;
}

export function kakuAttacks(sq: number, board: Int8Array): number[] {
  const moves: number[] = [];
  const r = Math.floor(sq / 9);
  const c = sq % 9;
  const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  
  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
      const nsq = nr * 9 + nc;
      moves.push(nsq);
      if (board[nsq] !== 0) break;
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

export function hiAttacks(sq: number, board: Int8Array): number[] {
  const moves: number[] = [];
  const r = Math.floor(sq / 9);
  const c = sq % 9;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
      const nsq = nr * 9 + nc;
      moves.push(nsq);
      if (board[nsq] !== 0) break;
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}