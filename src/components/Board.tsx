import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { colors } from '../styles/colors';
import { PIECE_CHARS } from '../types/game.types';

interface BoardProps {
  board: Int8Array;
  lastMovePos: number;
  selectedPos: number | null;
  legalMoves: number[];
  onSquarePress: (sq: number) => void;
}

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

  return (
    <View style={styles.board}>
      {Array.from({ length: 81 }, (_, i) => renderSquare(i))}
    </View>
  );
};

const SQUARE_SIZE = 38;

const styles = StyleSheet.create({
  board: {
    width: SQUARE_SIZE * 9,
    height: SQUARE_SIZE * 9,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: colors.boardBg,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.legalMove,
    zIndex: 1,
  },
  piece: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.pieceSente,
  },
  pieceRotated: {
    transform: [{ rotate: '180deg' }],
  },
  piecePromoted: {
    color: colors.piecePromoted,
  },
});