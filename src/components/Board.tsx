import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Dimensions } from 'react-native';
import { colors } from '../styles/colors';
import { PIECE_CHARS } from '../types/game.types';

interface BoardProps {
  board: Int8Array;
  lastMovePos: number;
  selectedPos: number | null;
  legalMoves: number[];
  onSquarePress: (sq: number) => void;
}

const { width, height } = Dimensions.get('window');
const BOARD_PADDING = 16;
const OTHER_UI_HEIGHT = 320; // Approx height for header, captured pieces, buttons, margins

// Ensure the board fits within the screen width AND height
const MAX_BOARD_WIDTH = Math.min(width - BOARD_PADDING * 2, 400);
const MAX_BOARD_HEIGHT = height - OTHER_UI_HEIGHT;

// Calculate square size based on the most constraining dimension
const SQUARE_SIZE_W = Math.floor(MAX_BOARD_WIDTH / 9);
const SQUARE_SIZE_H = Math.floor(MAX_BOARD_HEIGHT / 9);
const SQUARE_SIZE = Math.min(SQUARE_SIZE_W, SQUARE_SIZE_H);

const BOARD_SIZE = SQUARE_SIZE * 9;

export const Board: React.FC<BoardProps> = ({
  board,
  lastMovePos,
  selectedPos,
  legalMoves,
  onSquarePress,
}) => {
  const renderSquare = (sq: number) => {
    const v = board[sq];
    const pt = v > 0 ? v : -v;
    const isSente = v > 0;
    const isSelected = selectedPos === sq;
    const isLastMove = lastMovePos === sq;
    const isLegalMove = legalMoves.includes(sq);

    const squareStyle = [
      styles.square,
      isSelected && styles.selected,
      isLastMove && styles.lastMove,
    ];

    return (
      <TouchableOpacity
        key={sq}
        style={squareStyle}
        onPress={() => onSquarePress(sq)}
        activeOpacity={0.7}
      >
        {isLegalMove && <View style={styles.legalDot} />}
        {v !== 0 && (
          <Text
            style={[
              styles.piece,
              !isSente && styles.pieceRotated,
              pt >= 9 && styles.piecePromoted,
            ]}
          >
            {PIECE_CHARS[pt]}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderRow = (rowIdx: number) => {
    return (
      <View key={rowIdx} style={styles.row}>
        {Array.from({ length: 9 }, (_, colIdx) => {
          const sq = rowIdx * 9 + colIdx;
          return renderSquare(sq);
        })}
      </View>
    );
  };

  return (
    <View style={styles.boardContainer}>
      <View style={styles.board}>
        {Array.from({ length: 9 }, (_, i) => renderRow(i))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    backgroundColor: colors.boardBg,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: colors.boardBg,
  },
  row: {
    flexDirection: 'row',
    height: SQUARE_SIZE,
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderWidth: 0.5,
    borderColor: colors.boardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selected: {
    backgroundColor: colors.selectedSquare,
  },
  lastMove: {
    backgroundColor: colors.lastMove,
  },
  legalDot: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.25,
    height: SQUARE_SIZE * 0.25,
    borderRadius: SQUARE_SIZE * 0.125,
    backgroundColor: colors.legalMove,
    zIndex: 1,
    opacity: 0.6,
  },
  piece: {
    fontSize: SQUARE_SIZE * 0.6,
    fontWeight: 'bold',
    color: colors.pieceSente,
    textAlign: 'center',
    lineHeight: SQUARE_SIZE * 0.7, // Adjust line height to center vertically better if needed
  },
  pieceRotated: {
    transform: [{ rotate: '180deg' }],
  },
  piecePromoted: {
    color: colors.piecePromoted,
  },
});