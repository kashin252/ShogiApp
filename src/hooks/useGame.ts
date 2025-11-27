import { useState, useEffect, useCallback } from 'react';
import { ShogiGame } from '../engine/game';
import { GameState, GameMode, Selection } from '../types/game.types';
import { decodeTo } from '../engine/move';

export function useGame(mode: GameMode = 'pvp') {
  const [game] = useState(() => new ShogiGame());
  const [gameState, setGameState] = useState<GameState>(game.getState());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [playerSide, setPlayerSide] = useState<0 | 1>(0);

  const updateState = useCallback(() => {
    setGameState(game.getState());
  }, [game]);

  const resetGame = useCallback(() => {
    game.reset();
    setSelection(null);
    setIsThinking(false);
    
    if (mode === 'ai') {
      setPlayerSide(Math.random() < 0.5 ? 0 : 1);
    } else {
      setPlayerSide(0);
    }
    
    updateState();
  }, [game, mode, updateState]);

  const makeMove = useCallback(
    async (encodedMove: number) => {
      const success = game.applyMove(encodedMove);
      game.lastMovePos = decodeTo(encodedMove);
      updateState();
      setSelection(null);

      if (mode === 'ai' && !game.gameOver && game.turn !== playerSide) {
        setIsThinking(true);
        
        setTimeout(async () => {
          const result = await game.findBestMove(15000);
          
          if (result.move !== 0) {
            game.applyMove(result.move);
            game.lastMovePos = decodeTo(result.move);
            updateState();
          }
          
          setIsThinking(false);
        }, 300);
      }

      return success;
    },
    [game, mode, playerSide, updateState]
  );

  const getLegalMoves = useCallback(
    (from?: number, dropPiece?: number): number[] => {
      return game.getLegalMoves(from, dropPiece);
    },
    [game]
  );

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  return {
    gameState,
    selection,
    setSelection,
    isThinking,
    playerSide,
    makeMove,
    getLegalMoves,
    resetGame,
  };
}