import React from 'react';
import { View, Image, StyleSheet, Pressable, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function PhotoScreen({ navigation, route }) {
  const { uri, name } = route.params || {};
  const { width, height } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      <Image
        source={{ uri }}
        style={{ width, height: height - 140 }}
        resizeMode="contain"
      />
      <View style={styles.bar}>
        <Text style={styles.name} numberOfLines={1}>{name || 'Photo'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.close} hitSlop={12}>
          <Ionicons name="close" size={22} color="#fff" />
          <Text style={styles.closeText}>Fermer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 34, gap: 14, alignItems: 'center',
  },
  name: { color: '#fff', fontSize: 14, opacity: 0.85 },
  close: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
