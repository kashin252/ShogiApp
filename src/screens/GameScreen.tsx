import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
import { Board } from '../components/Board';
import { CapturedPieces } from '../components/CapturedPieces';
import { PlayLimitModal } from '../components/PlayLimitModal';
import { PromoteModal } from '../components/PromoteModal';
import { Dropdown } from '../components/Dropdown';
import { InfoModal } from '../components/InfoModal';
import { PremiumScreen } from './PremiumScreen';
import { useGame } from '../hooks/useGame';
import { GameSettings, TimeControl, GameResult } from '../types/game.types';
import i18n from '../i18n/translations';
import { colors } from '../styles/colors';
import { decodeTo, decodePromote } from '../engine/move';
import { StorageService } from '../services/StorageService';
// import { AdService } from '../services/AdService';
// import { PurchaseService } from '../services/PurchaseService';

export const GameScreen: React.FC = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [showPlayLimitModal, setShowPlayLimitModal] = useState(false);
  const [showPremiumScreen, setShowPremiumScreen] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [remainingPlays, setRemainingPlays] = useState(3);

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
    undo,
  } = useGame(newGameSettings);

  const [legalMoves, setLegalMoves] = useState<number[]>([]);

  // 成り選択用
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [pendingPromoteMoves, setPendingPromoteMoves] = useState<number[]>([]);

  // 初期化: プレミアム状態とサービスの初期化
  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      // 開発環境の場合はデータをリセット
      await StorageService.initForDev();

      // プレミアム状態をチェック
      const premium = await StorageService.isPremium();
      setIsPremium(premium);

      // 残りプレイ回数を取得
      const remaining = await StorageService.getRemainingPlays();
      setRemainingPlays(remaining);
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }

    // 広告とIAPを初期化（エラーが発生しても続行）
    // クラッシュ調査のため一時的に無効化
    /*
    try {
      await AdService.initAds();
    } catch (error) {
      console.error('Failed to initialize ads:', error);
    }

    try {
      await PurchaseService.initIAP();
    } catch (error) {
      console.error('Failed to initialize IAP:', error);
    }
    */
  };

  // プレミアム状態が変わったら再チェック
  useEffect(() => {
    if (showPremiumScreen === false) {
      checkPremiumStatus();
    }
  }, [showPremiumScreen]);

  const checkPremiumStatus = async () => {
    const premium = await StorageService.isPremium();
    setIsPremium(premium);
    const remaining = await StorageService.getRemainingPlays();
    setRemainingPlays(remaining);
  };

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
        // 成る手と成らない手の両方があるかチェック
        const promoteMove = targetMoves.find((m) => decodePromote(m));
        const noPromoteMove = targetMoves.find((m) => !decodePromote(m));

        if (promoteMove && noPromoteMove) {
          // 成るか成らないかの選択が必要
          setPendingPromoteMoves(targetMoves);
          setShowPromoteModal(true);
        } else {
          // 選択肢がない場合（強制的に成る、成れない、または既に成り駒）
          makeMove(targetMoves[0]);
          setSelection(null);
          setLegalMoves([]);
        }
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

  const handlePromoteSelect = (shouldPromote: boolean) => {
    if (pendingPromoteMoves.length === 0) {
      setShowPromoteModal(false);
      return;
    }

    const move = pendingPromoteMoves.find((m) => decodePromote(m) === shouldPromote);

    if (move) {
      makeMove(move);
    } else {
      // フォールバック（通常ありえないが、念のため）
      makeMove(pendingPromoteMoves[0]);
    }

    setShowPromoteModal(false);
    setPendingPromoteMoves([]);
    setSelection(null);
    setLegalMoves([]);
  };

  const handleHandPress = (side: 0 | 1, piece: number) => {
    if (gameState.gameOver || side !== gameState.turn) return;
    if (settings.mode === 'ai' && gameState.turn === settings.aiSide) return;

    setSelection({ drop: { piece, side } });
    const legal = getLegalMoves(undefined, piece);
    setLegalMoves(legal.map((m) => decodeTo(m)));
  };

  const startNewGame = async () => {
    // プレイ回数制限をチェック
    const canPlay = await StorageService.canPlay();

    if (!canPlay) {
      setShowNewGameModal(false);
      setShowPlayLimitModal(true);
      return;
    }

    // 広告機能は一時的に無効化（将来的に復活予定）
    // 直接対局を開始
    startGameAfterAd();
  };

  const startGameAfterAd = async () => {
    setShowNewGameModal(false);
    resetGame(newGameSettings);

    // プレイ回数をインクリメント
    await StorageService.incrementPlayCount();
    const remaining = await StorageService.getRemainingPlays();
    setRemainingPlays(remaining);
  };

  const handleResign = () => {
    resign(gameState.turn);
    setShowResignModal(false);
  };

  // 結果メッセージの取得
  const getResultText = (result: GameResult) => {
    switch (result) {
      case 'sente_win':
        return i18n.t('result.senteWin');
      case 'gote_win':
        return i18n.t('result.goteWin');
      case 'sente_timeout':
        return `${i18n.t('turn.sente')} ${i18n.t('result.timeout')} - ${i18n.t('result.goteWin')}`;
      case 'gote_timeout':
        return `${i18n.t('turn.gote')} ${i18n.t('result.timeout')} - ${i18n.t('result.senteWin')}`;
      case 'sente_resign':
        return `${i18n.t('turn.sente')} ${i18n.t('result.resign')} - ${i18n.t('result.goteWin')}`;
      case 'gote_resign':
        return `${i18n.t('turn.gote')} ${i18n.t('result.resign')} - ${i18n.t('result.senteWin')}`;
      default:
        return '';
    }
  };

  // Format time (seconds) to MM:SS
  const formatTime = (seconds: number) => {
    if (seconds === 0 && settings.timeControl === 0) return i18n.t('time.unlimited');
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine which hand to show at top/bottom based on flip state
  const topHandSide = isFlipped ? 0 : 1;
  const bottomHandSide = isFlipped ? 1 : 0;

  const handleUndo = () => {
    if (isPremium) {
      undo();
    } else {
      setShowPremiumScreen(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{i18n.t('appTitle')}</Text>
            <Text style={styles.subTitle}>
              {settings.mode === 'pvp' ? i18n.t('gameMode.pvp') : i18n.t('gameMode.ai')}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowInfoModal(true)}
            >
              <Text style={styles.infoButtonText}>ⓘ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.premiumButton, isPremium && styles.premiumButtonActive]}
              onPress={() => setShowPremiumScreen(true)}
            >
              <Text style={[styles.premiumButtonText, isPremium && styles.premiumButtonTextActive]}>
                {isPremium ? i18n.t('modals.premium.subscribed') : i18n.t('modals.premium.remaining', { count: remainingPlays })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusPanel}>
          {isThinking ? (
            <View style={styles.thinkingPanel}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.statusText}>{i18n.t('status.thinking')}</Text>
            </View>
          ) : gameState.gameOver || gameResult ? (
            <Text style={styles.statusText}>{getResultText(gameResult)}</Text>
          ) : (
            <Text style={styles.statusText}>
              {`${gameState.turn === 0 ? i18n.t('turn.sente') : i18n.t('turn.gote')}${i18n.t('turn.suffix')}`}
            </Text>
          )}

          {/* Search Info Display */}
          {settings.mode === 'ai' && searchResult && (
            <View style={styles.searchInfo}>
              <Text style={styles.searchInfoText}>
                {i18n.t('search.depth')}: {searchResult.depth} | {i18n.t('search.score')}: {searchResult.score > 0 ? '+' : ''}{searchResult.score}
              </Text>
              <Text style={styles.searchInfoText}>
                {i18n.t('search.nodes')}: {searchResult.nodes.toLocaleString()} | {i18n.t('search.time')}: {searchResult.time}ms
              </Text>
            </View>
          )}
        </View>

        <View style={styles.gameArea}>
          {/* Top Section: Timer + Hand (Horizontal) */}
          <View style={styles.playerSection}>
            <View style={[styles.timerBox, gameState.turn === topHandSide && styles.timerActive]}>
              <Text style={styles.timerLabel}>{topHandSide === 0 ? i18n.t('turn.sente') : i18n.t('turn.gote')}</Text>
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
                title={topHandSide === 0 ? i18n.t('hand.sente') : i18n.t('hand.gote')}
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

          {/* Sente Hand & Timer */}
          <View style={styles.playerSection}>
            <View style={[styles.timerBox, gameState.turn === 0 && !gameResult && styles.timerActive]}>
              <Text style={styles.timerLabel}>{i18n.t('turn.sente')}</Text>
              <Text style={styles.timerText}>{formatTime(senteTime)}</Text>
            </View>
            <View style={styles.handContainer}>
              <CapturedPieces
                hand={gameState.hand[0]}
                side={0}
                selectedPiece={
                  selection && selection.drop && selection.drop.side === 0
                    ? selection.drop.piece
                    : null
                }
                onPiecePress={(p) => handleHandPress(0, p)}
                title={i18n.t('hand.sente')}
              />
            </View>
          </View>
        </View>

        {/* Footer Controls */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowNewGameModal(true)}
          >
            <Text style={styles.buttonText}>{i18n.t('buttons.newGame')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resignBtn]}
            onPress={() => setShowResignModal(true)}
            disabled={gameState.gameOver || !!gameResult}
          >
            <Text style={styles.buttonText}>{i18n.t('buttons.resign')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.rotateBtn]}
            onPress={() => setIsFlipped(!isFlipped)}
          >
            <Text style={styles.buttonText}>{i18n.t('buttons.rotate')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#888', marginLeft: 8 }]}
            onPress={handleUndo}
            disabled={isThinking || gameState.moveCount === 0}
          >
            <Text style={styles.buttonText}>{i18n.t('buttons.undo')}</Text>
          </TouchableOpacity>
        </View>

        {/* New Game Modal */}
        <Modal
          visible={showNewGameModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowNewGameModal(false)}
        >
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{i18n.t('modals.newGame.title')}</Text>

                {/* モード選択 */}
                <Dropdown
                  label={i18n.t('modals.newGame.mode')}
                  value={newGameSettings.mode}
                  options={[
                    { label: i18n.t('gameMode.pvp'), value: 'pvp' },
                    { label: i18n.t('gameMode.ai'), value: 'ai' },
                  ]}
                  onSelect={(value) => {
                    if (value === 'pvp') {
                      setNewGameSettings({ ...newGameSettings, mode: 'pvp', aiSide: undefined });
                    } else {
                      // AI戦に切り替える際、持ち時間が無制限(0)なら30秒に変更
                      const newTime = newGameSettings.timeControl === 0 ? 30 : newGameSettings.timeControl;
                      setNewGameSettings({
                        ...newGameSettings,
                        mode: 'ai',
                        aiSide: 1,
                        timeControl: newTime
                      });
                    }
                  }}
                />

                {/* AI戦の手番選択 */}
                {newGameSettings.mode === 'ai' && (
                  <Dropdown
                    label={i18n.t('modals.newGame.aiSide')}
                    value={newGameSettings.aiSide}
                    options={[
                      { label: i18n.t('turn.sente'), value: 1 },
                      { label: i18n.t('turn.gote'), value: 0 },
                    ]}
                    onSelect={(value) => setNewGameSettings({ ...newGameSettings, aiSide: value })}
                  />
                )}

                {/* 持ち時間選択 */}
                <Dropdown
                  label={i18n.t('modals.newGame.timeControl')}
                  value={newGameSettings.timeControl}
                  options={[
                    ...(newGameSettings.mode === 'pvp' ? [{ label: i18n.t('time.unlimited'), value: 0 }] : []),
                    { label: `10${i18n.t('time.seconds')}`, value: 10 },
                    { label: `30${i18n.t('time.seconds')}`, value: 30 },
                    { label: `60${i18n.t('time.seconds')}`, value: 60 },
                  ]}
                  onSelect={(value) => setNewGameSettings({ ...newGameSettings, timeControl: value })}
                />

                {/* 開始・キャンセルボタン */}
                <TouchableOpacity style={styles.modalButton} onPress={startNewGame}>
                  <Text style={styles.modalButtonText}>
                    {newGameSettings.mode === 'pvp' ? i18n.t('modals.newGame.startPvp') : i18n.t('modals.newGame.startAi')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowNewGameModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>{i18n.t('buttons.cancel')}</Text>
                </TouchableOpacity>
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
              <Text style={styles.modalTitle}>{i18n.t('modals.resign.title')}</Text>
              <Text style={styles.modalMessage}>
                {gameState.turn === 0 ? i18n.t('turn.sente') : i18n.t('turn.gote')}{i18n.t('modals.resign.message')}
              </Text>

              <TouchableOpacity style={styles.modalButton} onPress={handleResign}>
                <Text style={styles.modalButtonText}>{i18n.t('modals.resign.confirm')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowResignModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>{i18n.t('buttons.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Play Limit Modal */}
        <InfoModal
          visible={showInfoModal}
          onClose={() => setShowInfoModal(false)}
        />

        <PlayLimitModal
          visible={showPlayLimitModal}
          remainingPlays={remainingPlays}
          onClose={() => setShowPlayLimitModal(false)}
          onUpgrade={() => {
            setShowPlayLimitModal(false);
            setShowPremiumScreen(true);
          }}
        />

        {/* Premium Screen */}
        {
          showPremiumScreen && (
            <Modal
              visible={showPremiumScreen}
              animationType="slide"
              presentationStyle="fullScreen"
            >
              <PremiumScreen onClose={() => setShowPremiumScreen(false)} />
            </Modal>
          )
        }

        {/* Promote Selection Modal */}
        <PromoteModal
          visible={showPromoteModal}
          onPromote={() => handlePromoteSelect(true)}
          onCancel={() => handlePromoteSelect(false)}
        />
      </View >
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  premiumButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  premiumButtonActive: {
    backgroundColor: '#fff3cd',
    borderColor: colors.primary,
  },
  premiumButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  premiumButtonTextActive: {
    color: colors.primary,
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
  subTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoButton: {
    marginRight: 12,
    padding: 8,
  },
  infoButtonText: {
    fontSize: 24,
    color: colors.primary,
  },
  searchInfo: {
    marginTop: 4,
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
    gap: 8,
    width: '100%',
    paddingHorizontal: 4,
    paddingBottom: 30, // Ensure space from bottom edge
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resignBtn: {
    backgroundColor: '#dc3545',
  },
  rotateBtn: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
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
    flex: 1,
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
  optionColumn: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  radioOptionSelected: {
    backgroundColor: '#fff',
    borderColor: colors.primary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  radioText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  radioTextSelected: {
    color: colors.primary,
    fontWeight: 'bold',
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