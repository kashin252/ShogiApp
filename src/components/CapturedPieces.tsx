import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { colors } from '../styles/colors';
import { PIECE_CHARS, PIECE_CHARS_EN, FU, KYO, KEI, GIN, KIN, KAKU, HI } from '../types/game.types';
import i18n from '../i18n/translations';

interface CapturedPiecesProps {
  hand: Int8Array;
  side: 0 | 1;
  selectedPiece: number | null;
  onPiecePress: (piece: number) => void;
  title: string;
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  hand,
  side,
  selectedPiece,
  onPiecePress,
  title,
}) => {
  const order = [FU, KYO, KEI, GIN, KIN, KAKU, HI];
  const isGote = side === 1;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isGote && styles.titleRotated]}>{title}</Text>
      <View style={styles.pieces}>
        {order.map((pt) => {
          const cnt = hand[pt];
          if (cnt === 0) return null;

          const isSelected = selectedPiece === pt;

          return (
            <TouchableOpacity
              key={pt}
              style={[
                styles.piece,
                isSelected && styles.pieceSelected,
                isGote && styles.pieceRotated // Rotate the whole piece container
              ]}
              onPress={() => onPiecePress(pt)}
            >
              <Text style={styles.pieceText}>
                {i18n.locale.startsWith('en') ? PIECE_CHARS_EN[pt] : PIECE_CHARS[pt]}
              </Text>
              {cnt > 1 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cnt}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f4f4f4',
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 8,
    padding: 8,
    minWidth: 80,
    minHeight: 80, // Reduced min height slightly
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  titleRotated: {
    transform: [{ rotate: '180deg' }],
  },
  pieces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
  },
  piece: {
    width: 34,
    height: 34,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pieceRotated: {
    transform: [{ rotate: '180deg' }],
  },
  pieceSelected: {
    backgroundColor: colors.selectedSquare,
    borderColor: '#f57c00',
  },
  pieceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.pieceSente,
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#333',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    zIndex: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});