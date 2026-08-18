import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, ScrollView, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { parseDictation } from '../parse';
import { isVoiceAvailable, startListening, stopListening, destroyVoice } from '../voice';
import { colors, radius, PRIORITIES, PROJECT_TYPES } from '../theme';
import { humanDate } from '../dates';

export default function VoiceScreen({ navigation }) {
  const { state, dispatch } = useStore();
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [parsed, setParsed] = useState(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const dispo = isVoiceAvailable();

  useEffect(() => () => { destroyVoice(); }, []);

  // Battement du bouton pendant l'écoute
  useEffect(() => {
    if (listening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.18, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [listening, pulse]);

  const contacts = [...new Set(state.tasks.map((t) => (t.contact || '').trim()).filter(Boolean))];

  const analyse = (phrase) => {
    if (!phrase || !phrase.trim()) {
      setParsed(null);
      return;
    }
    setParsed(parseDictation(phrase, { projects: state.projects, contacts }));
  };

  const listen = async () => {
    setError(null);
    setText('');
    setParsed(null);
    setListening(true);

    const ok = await startListening({
      onPartial: (t) => setText(t),
      onResult: (t) => { setText(t); analyse(t); },
      onError: (msg) => { setError(msg); setListening(false); },
      onEnd: () => setListening(false),
    });

    if (!ok) setListening(false);
  };

  const stop = async () => {
    await stopListening();
    setListening(false);
    analyse(text);
  };

  const create = () => {
    if (!parsed || !parsed.title) return;
    dispatch({
      type: 'ADD_TASK',
      task: {
        title: parsed.title,
        note: parsed.note,
        contact: parsed.contact,
        projectId: parsed.projectId,
        priority: parsed.priority,
        dueDate: parsed.dueDate,
        subtasks: parsed.subtasks,
      },
    });
    navigation.goBack();
  };

  const project = parsed && parsed.projectId
    ? state.projects.find((p) => p.id === parsed.projectId)
    : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.intro}>
        Dictez votre tâche en une phrase. La date, la priorité et le chantier sont
        reconnus automatiquement.
      </Text>

      <View style={styles.micWrap}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            onPress={listening ? stop : listen}
            disabled={!dispo}
            style={[
              styles.mic,
              listening && { backgroundColor: colors.red },
              !dispo && { backgroundColor: colors.textLight },
            ]}
            accessibilityRole="button"
            accessibilityLabel={listening ? "Arrêter l'écoute" : 'Démarrer la dictée'}
          >
            <Ionicons name={listening ? 'stop' : 'mic'} size={44} color="#fff" />
          </Pressable>
        </Animated.View>
        <Text style={styles.micLabel}>
          {!dispo
            ? 'Dictée indisponible — tapez votre phrase'
            : listening
            ? 'Je vous écoute… appuyez pour arrêter'
            : 'Appuyez et parlez'}
        </Text>
      </View>

      {error ? (
        <View style={styles.error}>
          <Ionicons name="alert-circle" size={18} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>PHRASE</Text>
      <TextInput
        value={text}
        onChangeText={(v) => { setText(v); analyse(v); }}
        placeholder="Ex. poser les tringles chez AZ Construction jeudi urgent"
        placeholderTextColor={colors.textLight}
        style={styles.input}
        multiline
      />

      {parsed ? (
        <>
          <Text style={styles.label}>TÂCHE RECONNUE</Text>
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>{parsed.title}</Text>

            <View style={styles.badges}>
              <Badge
                icon="flag"
                label={PRIORITIES[parsed.priority].short}
                color={PRIORITIES[parsed.priority].color}
              />
              <Badge
                icon="calendar"
                label={parsed.dueDate ? humanDate(parsed.dueDate) : 'À planifier'}
                color={parsed.dueDate ? colors.blue : colors.gold}
              />
              {project ? (
                <Badge
                  icon={(PROJECT_TYPES[project.type] || PROJECT_TYPES.autre).icon}
                  label={project.name}
                  color={(PROJECT_TYPES[project.type] || PROJECT_TYPES.autre).color}
                />
              ) : null}
              {parsed.contact ? (
                <Badge icon="person" label={parsed.contact} color={colors.navySoft} />
              ) : null}
            </View>

            {parsed.subtasks.length ? (
              <View style={styles.subs}>
                {parsed.subtasks.map((s) => (
                  <View key={s.id} style={styles.subRow}>
                    <Ionicons name="ellipse-outline" size={14} color={colors.textLight} />
                    <Text style={styles.subText}>{s.title}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <Pressable style={styles.create} onPress={create}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.createText}>Créer la tâche</Text>
          </Pressable>

          <Pressable
            style={styles.edit}
            onPress={() => {
              navigation.replace('TaskEdit', { prefill: parsed });
            }}
          >
            <Ionicons name="create-outline" size={18} color={colors.textMuted} />
            <Text style={styles.editText}>Ajuster avant de créer</Text>
          </Pressable>
        </>
      ) : null}

      <Text style={styles.help}>
        Exemples qui fonctionnent : « poser le carrelage chez AZ Construction jeudi urgent »,
        « commander 60 pièces demain », « faire le métré appartement Saillon dans 3 jours »,
        « poser le carrelage puis faire les joints ensuite nettoyer ».
      </Text>
    </ScrollView>
  );
}

function Badge({ icon, label, color }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[styles.badgeText, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 24 },

  micWrap: { alignItems: 'center', gap: 14, marginBottom: 10 },
  mic: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: colors.navy,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  micLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },

  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.redSoft, padding: 12, borderRadius: radius.md, marginTop: 16,
  },
  errorText: { flex: 1, color: colors.red, fontSize: 13.5, fontWeight: '600' },

  label: {
    fontSize: 11.5, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 0.7, marginTop: 24, marginBottom: 8,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
    minHeight: 70, textAlignVertical: 'top',
  },

  preview: {
    borderWidth: 1.5, borderColor: colors.navy, borderRadius: radius.md, padding: 16,
  },
  previewTitle: { fontSize: 17, fontWeight: '800', color: colors.navy, lineHeight: 23 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
    maxWidth: '100%',
  },
  badgeText: { fontSize: 12.5, fontWeight: '700', flexShrink: 1 },
  subs: { marginTop: 12, gap: 6 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subText: { flex: 1, fontSize: 14, color: colors.textMuted },

  create: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.navy, paddingVertical: 16, borderRadius: radius.md, marginTop: 20,
  },
  createText: { color: '#fff', fontWeight: '700', fontSize: 15.5 },

  edit: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 14,
  },
  editText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },

  help: { marginTop: 20, fontSize: 13, color: colors.textLight, lineHeight: 19 },
});
