import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
} from 'react-native';
import { Board } from '../components/Board';
import { CapturedPieces } from '../components/CapturedPieces';
import { useGame } from '../hooks/useGame';
import { GameSettings, TimeControl } from '../types/game.types';
import { colors } from '../styles/colors';
import { decodeTo, decodePromote } from '../engine/move';

export const GameScreen: React.FC = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState(true);
  const [showResignModal, setShowResignModal] = useState(false);

  // 新規対局の設定
  const [newGameSettings, setNewGameSettings] = useState<GameSettings>({
    mode: 'pvp',
    timeControl: 30,
  });

  const {
    gameState,
    selection,
    setSelection,
    isThinking,
    searchResult,
    settings,
    senteTime,
    goteTime,
    gameResult,
    makeMove,
    getLegalMoves,
    resetGame,
    resign,
  } = useGame(newGameSettings);

  const [legalMoves, setLegalMoves] = useState<number[]>([]);

  const handleSquarePress = (sq: number) => {
    if (gameState.gameOver) return;
    if (settings.mode === 'ai' && gameState.turn === settings.aiSide) return;

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
    if (settings.mode === 'ai' && gameState.turn === settings.aiSide) return;

    setSelection({ drop: { piece, side } });
    const legal = getLegalMoves(undefined, piece);
    setLegalMoves(legal.map((m) => decodeTo(m)));
  };

  const startNewGame = () => {
    setShowNewGameModal(false);
    resetGame(newGameSettings);
  };

  const handleResign = () => {
    resign(gameState.turn);
    setShowResignModal(false);
  };

  // 結果メッセージの取得
  const getResultMessage = (): string => {
    if (!gameResult) {
      if (gameState.gameOver) {
        return `${gameState.turn === 0 ? '後手' : '先手'}の勝ち`;
      }
      return '';
    }

    switch (gameResult) {
      case 'sente_win':
        return '先手の勝ち';
      case 'gote_win':
        return '後手の勝ち';
      case 'sente_timeout':
        return '先手時間切れ - 後手の勝ち';
      case 'gote_timeout':
        return '後手時間切れ - 先手の勝ち';
      case 'sente_resign':
        return '先手投了 - 後手の勝ち';
      case 'gote_resign':
        return '後手投了 - 先手の勝ち';
      default:
        return '';
    }
  };

  // 時間をフォーマット
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          ) : gameState.gameOver || gameResult ? (
            <Text style={styles.statusText}>{getResultMessage()}</Text>
          ) : (
            <Text style={styles.statusText}>
              {`${gameState.turn === 0 ? '先手' : '後手'}の番`}
            </Text>
          )}

          {/* Search Info Display */}
          {settings.mode === 'ai' && searchResult && (
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
          {/* Top Section: Timer + Hand (Horizontal) */}
          <View style={styles.playerSection}>
            <View style={[styles.timerBox, gameState.turn === topHandSide && styles.timerActive]}>
              <Text style={styles.timerLabel}>{topHandSide === 0 ? '先手' : '後手'}</Text>
              <Text style={styles.timerText}>
                {formatTime(topHandSide === 0 ? senteTime : goteTime)}
              </Text>
            </View>

            <View style={styles.handContainer}>
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
            </View>
          </View>

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

          {/* Bottom Section: Hand + Timer (Horizontal) */}
          <View style={styles.playerSection}>
            <View style={[styles.timerBox, gameState.turn === bottomHandSide && styles.timerActive]}>
              <Text style={styles.timerLabel}>{bottomHandSide === 0 ? '先手' : '後手'}</Text>
              <Text style={styles.timerText}>
                {formatTime(bottomHandSide === 0 ? senteTime : goteTime)}
              </Text>
            </View>

            <View style={styles.handContainer}>
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
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={() => setShowNewGameModal(true)}>
            <Text style={styles.buttonText}>新規対局</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resignBtn]}
            onPress={() => setShowResignModal(true)}
            disabled={gameState.gameOver || !!gameResult}
          >
            <Text style={styles.buttonText}>投了</Text>
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
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>新規対局</Text>

                {/* モード選択 */}
                <Text style={styles.sectionLabel}>対局モード</Text>
                <View style={styles.optionRow}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      newGameSettings.mode === 'pvp' && styles.optionButtonSelected,
                    ]}
                    onPress={() =>
                      setNewGameSettings({ ...newGameSettings, mode: 'pvp', aiSide: undefined })
                    }
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        newGameSettings.mode === 'pvp' && styles.optionButtonTextSelected,
                      ]}
                    >
                      対人戦
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      newGameSettings.mode === 'ai' && styles.optionButtonSelected,
                    ]}
                    onPress={() =>
                      setNewGameSettings({ ...newGameSettings, mode: 'ai', aiSide: 1 })
                    }
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        newGameSettings.mode === 'ai' && styles.optionButtonTextSelected,
                      ]}
                    >
                      対AI戦
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* AI戦の手番選択 */}
                {newGameSettings.mode === 'ai' && (
                  <>
                    <Text style={styles.sectionLabel}>あなたの手番</Text>
                    <View style={styles.optionRow}>
                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          newGameSettings.aiSide === 1 && styles.optionButtonSelected,
                        ]}
                        onPress={() => setNewGameSettings({ ...newGameSettings, aiSide: 1 })}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            newGameSettings.aiSide === 1 && styles.optionButtonTextSelected,
                          ]}
                        >
                          先手
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          newGameSettings.aiSide === 0 && styles.optionButtonSelected,
                        ]}
                        onPress={() => setNewGameSettings({ ...newGameSettings, aiSide: 0 })}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            newGameSettings.aiSide === 0 && styles.optionButtonTextSelected,
                          ]}
                        >
                          後手
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* 持ち時間選択 */}
                <Text style={styles.sectionLabel}>持ち時間（1手あたり）</Text>
                <View style={styles.optionRow}>
                  {([10, 30, 60] as TimeControl[]).map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.optionButton,
                        styles.timeButton,
                        newGameSettings.timeControl === time && styles.optionButtonSelected,
                      ]}
                      onPress={() => setNewGameSettings({ ...newGameSettings, timeControl: time })}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          newGameSettings.timeControl === time && styles.optionButtonTextSelected,
                        ]}
                      >
                        {time}秒
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 開始・キャンセルボタン */}
                <TouchableOpacity style={styles.modalButton} onPress={startNewGame}>
                  <Text style={styles.modalButtonText}>対局開始</Text>
                </TouchableOpacity>

                {!showNewGameModal && (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => setShowNewGameModal(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>キャンセル</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Resign Modal */}
        <Modal
          visible={showResignModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowResignModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>投了確認</Text>
              <Text style={styles.modalMessage}>
                {gameState.turn === 0 ? '先手' : '後手'}が投了します。よろしいですか?
              </Text>

              <TouchableOpacity style={styles.modalButton} onPress={handleResign}>
                <Text style={styles.modalButtonText}>投了する</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowResignModal(false)}
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
    gap: 4,
    width: '100%',
  },
  playerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'space-between',
  },
  handContainer: {
    flex: 1,
  },
  timerBox: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timerActive: {
    backgroundColor: '#fff3cd',
    borderColor: colors.primary,
  },
  timerLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  boardRotated: {
    transform: [{ rotate: '180deg' }],
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  resignBtn: {
    backgroundColor: '#dc3545',
  },
  rotateBtn: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 360,
    alignItems: 'stretch',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeButton: {
    flex: 0,
    minWidth: 70,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  modalButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    backgroundColor: '#ddd',
    marginTop: 0,
  },
  modalCancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});