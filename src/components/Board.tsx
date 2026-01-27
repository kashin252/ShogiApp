import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Dimensions, ImageBackground, Platform } from 'react-native';
import { colors } from '../styles/colors';
import { PIECE_CHARS, PIECE_CHARS_EN } from '../types/game.types';
import i18n from '../i18n/translations';

interface BoardProps {
  board: Int8Array;
  lastMovePos: number;
  selectedPos: number | null;
  legalMoves: number[];
  onSquarePress: (sq: number) => void;
}

const { width, height } = Dimensions.get('window');
const BOARD_PADDING = 12;
const OTHER_UI_HEIGHT = 350; // Restored to reasonable size now that SafeAreaView works correctly

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
          <View style={[
            styles.pieceContainer,
            !isSente && styles.pieceRotatedContainer
          ]}>
            <Text
              style={[
                styles.piece,
                pt >= 9 && styles.piecePromoted,
              ]}
            >
              {i18n.locale.startsWith('en') ? PIECE_CHARS_EN[pt] : PIECE_CHARS[pt]}
            </Text>
          </View>
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
      <ImageBackground
        source={require('../../assets/board_texture.png')}
        style={styles.board}
        imageStyle={{ borderRadius: 2 }}
      >
        {Array.from({ length: 9 }, (_, i) => renderRow(i))}
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    backgroundColor: '#333', // Dark border around the board
    borderRadius: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 1,
    borderColor: '#000',
  },
  row: {
    flexDirection: 'row',
    height: SQUARE_SIZE,
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.3)', // Semi-transparent grid
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selected: {
    backgroundColor: 'rgba(255, 255, 0, 0.3)', // Highlight with transparency
  },
  lastMove: {
    backgroundColor: 'rgba(255, 165, 0, 0.3)', // Highlight with transparency
  },
  legalDot: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.2,
    height: SQUARE_SIZE * 0.2,
    borderRadius: SQUARE_SIZE * 0.1,
    backgroundColor: 'rgba(0, 100, 0, 0.5)',
    zIndex: 1,
  },
  pieceContainer: {
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0c36d', // Wood color for piece
    borderRadius: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    // Slightly pentagon-ish shape using border trick is hard, stick to rounded rect for now
    borderBottomWidth: 2,
    borderBottomColor: '#d0a34d',
  },
  piece: {
    fontSize: SQUARE_SIZE * 0.65,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Mincho ProN' : 'serif',
    includeFontPadding: false,
    lineHeight: SQUARE_SIZE * 0.7,
  },
  pieceRotatedContainer: {
    transform: [{ rotate: '180deg' }],
  },
  piecePromoted: {
    color: '#d00', // Red for promoted
  },
});