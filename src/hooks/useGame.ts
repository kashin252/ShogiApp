import { useState, useEffect, useCallback, useRef } from 'react';
import { ShogiGame } from '../engine/game';
import { GameState, GameSettings, Selection, SearchResult, GameResult } from '../types/game.types';
import { decodeTo } from '../engine/move';

export function useGame(initialSettings: GameSettings) {
  const [game] = useState(() => new ShogiGame());
  const [gameState, setGameState] = useState<GameState>(game.getState());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [settings, setSettings] = useState<GameSettings>(initialSettings);

  // タイマー関連
  const [senteTime, setSenteTime] = useState<number>(initialSettings.timeControl);
  const [goteTime, setGoteTime] = useState<number>(initialSettings.timeControl);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = useCallback(() => {
    setGameState(game.getState());
  }, [game]);

  // タイマーをクリア
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // タイマーを開始
  const startTimer = useCallback(() => {
    clearTimer();

    timerRef.current = setInterval(() => {
      if (game.gameOver || gameResult) {
        clearTimer();
        return;
      }

      if (game.turn === 0) {
        setSenteTime((prev) => {
          if (prev <= 1) {
            clearTimer();
            setGameResult('sente_timeout');
            game.gameOver = true;
            return 0;
          }
          return prev - 1;
        });
      } else {
        setGoteTime((prev) => {
          if (prev <= 1) {
            clearTimer();
            setGameResult('gote_timeout');
            game.gameOver = true;
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
  }, [game, gameResult, clearTimer]);

  const resetGame = useCallback((newSettings: GameSettings) => {
    clearTimer();
    game.reset();
    setSelection(null);
    setIsThinking(false);
    setSearchResult(null);
    setSettings(newSettings);
    setSenteTime(newSettings.timeControl);
    setGoteTime(newSettings.timeControl);
    setGameResult(null);
    updateState();

    // タイマー開始
    setTimeout(() => startTimer(), 100);

    // AIが先手の場合、最初の手を指す
    if (newSettings.mode === 'ai' && newSettings.aiSide === 0) {
      setTimeout(async () => {
        setIsThinking(true);

        // AIの思考時間を持ち時間の40%に制限（タイムアウト防止）
        const aiThinkTime = Math.min(newSettings.timeControl * 400, newSettings.timeControl * 400);
        const result = await game.findBestMove(aiThinkTime);
        setSearchResult(result);

        if (result.move !== 0) {
          game.applyMove(result.move);
          game.lastMovePos = decodeTo(result.move);

          if (game.gameOver) {
            clearTimer();
            setGameResult(game.turn === 0 ? 'gote_win' : 'sente_win');
          }

          updateState();
        }

        setIsThinking(false);
      }, 500);
    }
  }, [game, updateState, clearTimer, startTimer]);

  // 投了処理
  const resign = useCallback((side: 0 | 1) => {
    clearTimer();
    game.gameOver = true;
    setGameResult(side === 0 ? 'sente_resign' : 'gote_resign');
    updateState();
  }, [game, clearTimer, updateState]);

  const makeMove = useCallback(
    async (encodedMove: number) => {
      const success = game.applyMove(encodedMove);
      game.lastMovePos = decodeTo(encodedMove);

      // 詰みチェック
      if (game.gameOver) {
        clearTimer();
        setGameResult(game.turn === 0 ? 'gote_win' : 'sente_win');
      } else {
        // 手が進んだらタイマーを再スタート
        startTimer();
      }

      updateState();
      setSelection(null);

      // AI対局の場合
      if (settings.mode === 'ai' && !game.gameOver && game.turn === settings.aiSide) {
        setIsThinking(true);

        setTimeout(async () => {
          // AIの思考時間を持ち時間の40%に制限（タイムアウト防止）
          const currentTime = settings.aiSide === 1 ? goteTime : senteTime;
          const aiThinkTime = Math.min(settings.timeControl * 400, currentTime * 400);

          const result = await game.findBestMove(aiThinkTime);
          setSearchResult(result);

          if (result.move !== 0) {
            game.applyMove(result.move);
            game.lastMovePos = decodeTo(result.move);

            // 詰みチェック
            if (game.gameOver) {
              clearTimer();
              setGameResult(game.turn === 0 ? 'gote_win' : 'sente_win');
            } else {
              // AI着手後もタイマーを再スタート
              startTimer();
            }

            updateState();
          }

          setIsThinking(false);
        }, 300);
      }

      return success;
    },
    [game, settings, senteTime, goteTime, updateState, clearTimer, startTimer]
  );

  const getLegalMoves = useCallback(
    (from?: number, dropPiece?: number): number[] => {
      return game.getLegalMoves(from, dropPiece);
    },
    [game]
  );

  // コンポーネントアンマウント時にタイマークリア
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
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
  };
}