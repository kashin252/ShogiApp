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

    // 時間無制限の場合はタイマーを動かさない
    if (settings.timeControl === 0) return;

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
  }, [game, gameResult, clearTimer, settings.timeControl]);

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

        // AIの思考時間を持ち時間の90%に設定（一手ごとにリセットされるため）
        const aiThinkTime = newSettings.timeControl * 900;
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

  // 待った処理
  const undo = useCallback(() => {
    if (isThinking) return; // AI思考中は不可

    if (settings.mode === 'pvp') {
      // 対人戦は1手戻す
      if (game.undo()) {
        clearTimer();
        setGameResult(null); // 決着がついていても戻す

        // 手番の時間をリセット
        if (game.turn === 0) {
          setSenteTime(settings.timeControl);
        } else {
          setGoteTime(settings.timeControl);
        }

        updateState();
        startTimer();
      }
    } else {
      // AI戦は2手戻す（自分の手番に戻す）
      // ただし、AIが先手でまだ初手の場合は何もしない、あるいは自分が後手でAIが指した直後なら1手戻すなど調整が必要
      // 基本的に「自分の手番」に戻すことを目指す

      // 1手戻す（AIの手を戻す）
      if (game.undo()) {
        // さらにもう1手戻す（自分の手を戻す）
        game.undo();

        clearTimer();
        setGameResult(null);

        // 自分の手番の時間だけリセットすれば良いが、念のため両方リセット
        setSenteTime(settings.timeControl);
        setGoteTime(settings.timeControl);

        updateState();
        startTimer();
      }
    }
  }, [game, settings, isThinking, clearTimer, startTimer, updateState]);

  const makeMove = useCallback(
    async (encodedMove: number) => {
      const success = game.applyMove(encodedMove);
      game.lastMovePos = decodeTo(encodedMove);

      // 詰みチェック
      if (game.gameOver) {
        clearTimer();
        setGameResult(game.turn === 0 ? 'gote_win' : 'sente_win');
      } else {
        // 手が進んだら次の手番の持ち時間をリセット
        if (game.turn === 0) {
          setSenteTime(settings.timeControl);
        } else {
          setGoteTime(settings.timeControl);
        }
        startTimer();
      }

      updateState();
      setSelection(null);

      // AI対局の場合
      if (settings.mode === 'ai' && !game.gameOver && game.turn === settings.aiSide) {
        setIsThinking(true);

        setTimeout(async () => {
          // AIの思考時間を持ち時間の90%に設定（一手ごとにリセットされるため）
          const aiThinkTime = settings.timeControl * 900;

          const startTime = Date.now();
          const result = await game.findBestMove(aiThinkTime);
          const elapsed = Math.floor((Date.now() - startTime) / 1000); // 経過時間（秒）

          setSearchResult(result);

          if (result.move !== 0) {
            const success = game.applyMove(result.move);
            game.lastMovePos = decodeTo(result.move);

            // AIの消費時間を反映
            if (game.turn === 0) { // 次が先手（つまりAIは後手だった）
              setGoteTime(prev => Math.max(0, prev - elapsed));
            } else { // 次が後手（つまりAIは先手だった）
              setSenteTime(prev => Math.max(0, prev - elapsed));
            }

            // 詰みチェック
            if (game.gameOver) {
              clearTimer();
              setGameResult(game.turn === 0 ? 'gote_win' : 'sente_win');
            } else {
              // AI着手後、次の手番の持ち時間をリセット
              if (game.turn === 0) {
                setSenteTime(settings.timeControl);
              } else {
                setGoteTime(settings.timeControl);
              }
              startTimer();
            }

            updateState();
          }

          setIsThinking(false);
        }, 100);
      }

      return success;
    },
    [game, settings, updateState, clearTimer, startTimer]
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
    undo,
  };
}