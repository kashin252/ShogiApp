import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { colors } from '../styles/colors';
import { PIECE_CHARS, FU, KYO, KEI, GIN, KIN, KAKU, HI } from '../types/game.types';

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.pieces}>
        {order.map((pt) => {
          const cnt = hand[pt];
          if (cnt === 0) return null;

          const isSelected = selectedPiece === pt;

          return (
            <TouchableOpacity
              key={pt}
              style={[styles.piece, isSelected && styles.pieceSelected]}
              onPress={() => onPiecePress(pt)}
            >
              <Text style={styles.pieceText}>{PIECE_CHARS[pt]}</Text>
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
    minHeight: 100,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  pieces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
  },
  piece: {
    width: 32,
    height: 32,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pieceSelected: {
    backgroundColor: colors.selectedSquare,
    borderColor: '#f57c00',
  },
  pieceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#333',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});