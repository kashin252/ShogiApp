import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
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
  const [showNewGameModal, setShowNewGameModal] = useState(false);

  const {
    gameState,
    selection,
    setSelection,
    isThinking,
    playerSide,
    searchResult,
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

  const startNewGame = (newMode: GameMode) => {
    setShowNewGameModal(false);
    setMode(newMode);
    // Wait for next render cycle to ensure mode is updated
    setTimeout(() => {
      resetGame();
    }, 0);
  };

  // Determine which hand to show at top/bottom based on flip state
  const topHandSide = isFlipped ? 0 : 1;
  const bottomHandSide = isFlipped ? 1 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎴 将棋アプリ</Text>
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

          {/* Search Info Display */}
          {mode === 'ai' && searchResult && (
            <View style={styles.searchInfo}>
              <Text style={styles.searchInfoText}>
                深さ: {searchResult.depth} | 評価値: {searchResult.score > 0 ? '+' : ''}{searchResult.score}
              </Text>
              <Text style={styles.searchInfoText}>
                探索局面数: {searchResult.nodes.toLocaleString()} | 時間: {searchResult.time}ms
              </Text>
            </View>
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

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={() => setShowNewGameModal(true)}>
            <Text style={styles.buttonText}>新規対局</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.rotateBtn]}
            onPress={() => setIsFlipped(!isFlipped)}
          >
            <Text style={styles.buttonText}>盤面反転</Text>
          </TouchableOpacity>
        </View>

        {/* New Game Modal */}
        <Modal
          visible={showNewGameModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowNewGameModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>新規対局</Text>
              <Text style={styles.modalMessage}>対局モードを選択してください</Text>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => startNewGame('pvp')}
              >
                <Text style={styles.modalButtonText}>対人戦 (PvP)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => startNewGame('ai')}
              >
                <Text style={styles.modalButtonText}>対AI戦</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowNewGameModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: 8,
  },
  statusPanel: {
    marginVertical: 4,
    alignItems: 'center',
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
  searchInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  searchInfoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  footer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  rotateBtn: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.text,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    backgroundColor: '#ddd',
    marginBottom: 0,
  },
  modalCancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});