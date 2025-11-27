import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Board } from '../components/Board';
import { CapturedPieces } from '../components/CapturedPieces';
import { useGame } from '../hooks/useGame';
import { GameMode } from '../types/game.types';
import { colors } from '../styles/colors';
import { decodeTo, decodePromote } from '../engine/move';

export const GameScreen: React.FC = () => {
  const [mode, setMode] = useState<GameMode>('pvp');
  const {
    gameState,
    selection,
    setSelection,
    isThinking,
    playerSide,
    makeMove,
    getLegalMoves,
    resetGame,
  } = useGame(mode);

  const [legalMoves, setLegalMoves] = useState<number[]>([]);

  const handleSquarePress = (sq: number) => {
    if (gameState.gameOver) return;
    if (mode === 'ai' && gameState.turn !== playerSide) return;

    const v = gameState.board[sq];

    // 持ち駒打ち
    if (selection && selection.drop) {
      const moves = getLegalMoves(undefined, selection.drop.piece);
      const targetMove = moves.find((m) => decodeTo(m) === sq);
      
      if (targetMove) {
        makeMove(targetMove);
        setSelection(null);
        setLegalMoves([]);
      }
      return;
    }

    // 盤上の駒移動
    if (selection && selection.pos !== undefined) {
      const moves = getLegalMoves(selection.pos);
      const targetMoves = moves.filter((m) => decodeTo(m) === sq);

      if (targetMoves.length > 0) {
        if (targetMoves.length === 2) {
          const promoteMove = targetMoves.find((m) => decodePromote(m));
          makeMove(promoteMove || targetMoves[0]);
        } else {
          makeMove(targetMoves[0]);
        }
        
        setSelection(null);
        setLegalMoves([]);
        return;
      }
    }

    // 駒選択
    if ((v > 0) === (gameState.turn === 0) && v !== 0) {
      setSelection({ pos: sq });
      const legal = getLegalMoves(sq);
      setLegalMoves(legal.map((m) => decodeTo(m)));
    } else {
      setSelection(null);
      setLegalMoves([]);
    }
  };

  const handleHandPress = (side: 0 | 1, piece: number) => {
    if (gameState.gameOver || side !== gameState.turn) return;
    if (mode === 'ai' && gameState.turn !== playerSide) return;

    setSelection({ drop: { piece, side } });
    const legal = getLegalMoves(undefined, piece);
    setLegalMoves(legal.map((m) => decodeTo(m)));
  };

  const handleModeChange = (newMode: GameMode) => {
    setMode(newMode);
    resetGame();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🎴 将棋アプリ</Text>

      <View style={styles.modePanel}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'pvp' && styles.modeBtnActive]}
          onPress={() => handleModeChange('pvp')}
        >
          <Text style={[styles.modeBtnText, mode === 'pvp' && styles.modeBtnTextActive]}>
            対人
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'ai' && styles.modeBtnActive]}
          onPress={() => handleModeChange('ai')}
        >
          <Text style={[styles.modeBtnText, mode === 'ai' && styles.modeBtnTextActive]}>
            対AI
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusPanel}>
        {isThinking ? (
          <View style={styles.thinkingPanel}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.statusText}>AI思考中...</Text>
          </View>
        ) : (
          <Text style={styles.statusText}>
            {gameState.gameOver
              ? `${gameState.turn === 0 ? '後手' : '先手'}の勝ち`
              : `${gameState.turn === 0 ? '先手' : '後手'}の番`}
          </Text>
        )}
      </View>

      <View style={styles.gameArea}>
        <CapturedPieces
          hand={gameState.hand[1]}
          side={1}
          selectedPiece={
            selection && selection.drop && selection.drop.side === 1
              ? selection.drop.piece
              : null
          }
          onPiecePress={(p) => handleHandPress(1, p)}
          title="後手持ち駒"
        />

        <Board
          board={gameState.board}
          lastMovePos={gameState.lastMovePos}
          selectedPos={selection && selection.pos !== undefined ? selection.pos : null}
          legalMoves={legalMoves}
          onSquarePress={handleSquarePress}
        />

        <CapturedPieces
          hand={gameState.hand[0]}
          side={0}
          selectedPiece={
            selection && selection.drop && selection.drop.side === 0
              ? selection.drop.piece
              : null
          }
          onPiecePress={(p) => handleHandPress(0, p)}
          title="先手持ち駒"
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={resetGame}>
        <Text style={styles.buttonText}>新規対局</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: 16,
  },
  modePanel: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    backgroundColor: '#ddd',
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    fontWeight: 'bold',
    color: '#666',
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  statusPanel: {
    marginBottom: 16,
  },
  thinkingPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  gameArea: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});