import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Board } from '../components/Board';
import { CapturedPieces } from '../components/CapturedPieces';
import { useGame } from '../hooks/useGame';
import { GameMode } from '../types/game.types';
import { colors } from '../styles/colors';
import { decodeTo, decodePromote } from '../engine/move';

export const GameScreen: React.FC = () => {
  const [mode, setMode] = useState<GameMode>('pvp');
  const [isFlipped, setIsFlipped] = useState(false);

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
    // If flipped, the click coordinates need to be mapped if the Board component doesn't handle it.
    // However, since we are just rotating the VIEW of the board, the logical indices (0-80) remain the same
    // relative to the board's internal logic.
    // BUT, if we rotate the board view 180deg, the top-left visual square becomes the bottom-right logical square?
    // Actually, if we just rotate the whole Board component, the visual tap on "top left" will hit the "bottom right" component.
    // Let's check how Board handles presses. It maps index to square.
    // If we rotate the Board View, the touch events rotate with it.
    // So pressing the visual top-left (which is logically 80) should correctly pass 80 to this handler.
    // So no coordinate transformation is needed here if we use transform: rotate.

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

  const handleNewGamePress = () => {
    Alert.alert(
      '新規対局',
      '対局モードを選択してください',
      [
        {
          text: '対人戦 (PvP)',
          onPress: () => {
            setMode('pvp');
            resetGame();
          },
        },
        {
          text: '対AI戦',
          onPress: () => {
            setMode('ai');
            resetGame();
          },
        },
        {
          text: 'キャンセル',
          style: 'cancel',
        },
      ]
    );
  };

  // Determine which hand to show at top/bottom based on flip state
  const topHandSide = isFlipped ? 0 : 1;
  const bottomHandSide = isFlipped ? 1 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎴 将棋アプリ</Text>
          <TouchableOpacity
            style={styles.rotateBtn}
            onPress={() => setIsFlipped(!isFlipped)}
          >
            <Text style={styles.rotateBtnText}>盤面反転</Text>
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
          {/* Top Hand */}
          <CapturedPieces
            hand={gameState.hand[topHandSide]}
            side={topHandSide}
            selectedPiece={
              selection && selection.drop && selection.drop.side === topHandSide
                ? selection.drop.piece
                : null
            }
            onPiecePress={(p) => handleHandPress(topHandSide, p)}
            title={topHandSide === 0 ? "先手持ち駒" : "後手持ち駒"}
          />

          {/* Board */}
          <View style={isFlipped ? styles.boardRotated : null}>
            <Board
              board={gameState.board}
              lastMovePos={gameState.lastMovePos}
              selectedPos={selection && selection.pos !== undefined ? selection.pos : null}
              legalMoves={legalMoves}
              onSquarePress={handleSquarePress}
            />
          </View>

          {/* Bottom Hand */}
          <CapturedPieces
            hand={gameState.hand[bottomHandSide]}
            side={bottomHandSide}
            selectedPiece={
              selection && selection.drop && selection.drop.side === bottomHandSide
                ? selection.drop.piece
                : null
            }
            onPiecePress={(p) => handleHandPress(bottomHandSide, p)}
            title={bottomHandSide === 0 ? "先手持ち駒" : "後手持ち駒"}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNewGamePress}>
          <Text style={styles.buttonText}>新規対局</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: 8,
  },
  rotateBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    backgroundColor: '#ddd',
    borderRadius: 5,
  },
  rotateBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  statusPanel: {
    marginVertical: 4,
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
    gap: 8,
    width: '100%',
  },
  boardRotated: {
    transform: [{ rotate: '180deg' }],
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});