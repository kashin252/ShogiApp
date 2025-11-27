import { ShogiGame } from './game';
import { FU, KYO, KEI, GIN, KIN, TO, NKYO, NKEI, NGIN, KAKU, HI, OU, UMA, RYU, ZOU, TAISHI } from '../types/game.types';
import {
  ATTACK_KEI_S, ATTACK_KEI_G, ATTACK_GIN_S, ATTACK_GIN_G,
  ATTACK_KIN_S, ATTACK_KIN_G, ATTACK_OU, ATTACK_ZOU_S, ATTACK_ZOU_G
} from './attackTables';

export function isAttacked(game: ShogiGame, sq: number, bySide: number): boolean {
  const sign = bySide === 0 ? 1 : -1;

  // 歩
  const fuSq = bySide === 0 ? sq + 9 : sq - 9;
  if (fuSq >= 0 && fuSq < 81 && game.board[fuSq] === sign * FU) return true;

  // 桂馬
  const keiArr = bySide === 0 ? ATTACK_KEI_G[sq] : ATTACK_KEI_S[sq];
  for (let i = 0; i < keiArr.length; i++) {
    if (game.board[keiArr[i]] === sign * KEI) return true;
  }

  // 銀
  const ginArr = bySide === 0 ? ATTACK_GIN_G[sq] : ATTACK_GIN_S[sq];
  for (let i = 0; i < ginArr.length; i++) {
    if (game.board[ginArr[i]] === sign * GIN) return true;
  }

  // 金・成駒
  const kinArr = bySide === 0 ? ATTACK_KIN_G[sq] : ATTACK_KIN_S[sq];
  for (let i = 0; i < kinArr.length; i++) {
    const v = game.board[kinArr[i]];
    const av = v * sign;
    if (av === KIN || av === TO || av === NKYO || av === NKEI || av === NGIN) return true;
  }

  // 玉・太子
  for (let i = 0; i < ATTACK_OU[sq].length; i++) {
    const v = game.board[ATTACK_OU[sq][i]];
    const av = v * sign;
    if (av === OU || av === TAISHI) return true;
  }

  // 象
  const zouArr = bySide === 0 ? ATTACK_ZOU_G[sq] : ATTACK_ZOU_S[sq];
  for (let i = 0; i < zouArr.length; i++) {
    if (game.board[zouArr[i]] === sign * ZOU) return true;
  }

  // 香車
  const kyoDir = bySide === 0 ? 9 : -9;
  let ks = sq + kyoDir;
  while (ks >= 0 && ks < 81) {
    const kr = Math.floor(ks / 9);
    const sqr = Math.floor(sq / 9);
    if ((bySide === 0 && kr <= sqr) || (bySide === 1 && kr >= sqr)) break;
    const v = game.board[ks];
    if (v !== 0) {
      if (v === sign * KYO) return true;
      break;
    }
    ks += kyoDir;
  }

  // 角・馬
  const r = Math.floor(sq / 9);
  const c = sq % 9;
  const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
      const v = game.board[nr * 9 + nc];
      if (v !== 0) {
        const av = v * sign;
        if (av === KAKU || av === UMA) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  // 飛車・龍
  const orthDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of orthDirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
      const v = game.board[nr * 9 + nc];
      if (v !== 0) {
        const av = v * sign;
        if (av === HI || av === RYU) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  // 馬の縦横1マス
  for (const [dr, dc] of orthDirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
      if (game.board[nr * 9 + nc] === sign * UMA) return true;
    }
  }

  // 龍の斜め1マス
  for (const [dr, dc] of diagDirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
      if (game.board[nr * 9 + nc] === sign * RYU) return true;
    }
  }

  return false;
}

export function isInCheck(game: ShogiGame, side: number): boolean {
  const sign = side === 0 ? 1 : -1;
  for (let sq = 0; sq < 81; sq++) {
    if (game.board[sq] === sign * OU) {
      return isAttacked(game, sq, 1 - side);
    }
  }
  return true;
}