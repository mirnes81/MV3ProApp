import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

/**
 * Marque MV-3 PRO avec « Tâches » en dessous.
 * Reconstruite en composants natifs plutôt qu'en image : nette à toute
 * taille, et elle suit automatiquement le fond clair ou sombre.
 *
 * @param {number}  size     hauteur de référence du bloc MV-3
 * @param {boolean} onDark   sur fond navy
 * @param {boolean} withWord affiche « Tâches » sous le logo
 */
export default function Brand({ size = 20, onDark = false, withWord = true }) {
  const mvColor = onDark ? '#FFFFFF' : colors.navy;
  const wordColor = onDark ? colors.gold : colors.gold;

  return (
    <View style={styles.wrap}>
      <View style={styles.line}>
        <Text style={[styles.mv, { fontSize: size, color: mvColor }]}>MV-3</Text>
        <View
          style={[
            styles.box,
            {
              paddingHorizontal: size * 0.26,
              paddingVertical: size * 0.1,
              borderRadius: size * 0.16,
              marginLeft: size * 0.26,
            },
          ]}
        >
          <Text style={[styles.pro, { fontSize: size * 0.54 }]}>PRO</Text>
        </View>
      </View>
      {withWord ? (
        <Text style={[styles.word, { fontSize: size * 0.48, color: wordColor }]}>
          Tâches
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  line: { flexDirection: 'row', alignItems: 'center' },
  mv: { fontWeight: '900', letterSpacing: -0.5 },
  box: { backgroundColor: colors.brandRed, alignItems: 'center', justifyContent: 'center' },
  pro: { color: '#fff', fontWeight: '900', letterSpacing: 0.5 },
  word: { fontWeight: '700', letterSpacing: 1.6, marginTop: 1 },
});
