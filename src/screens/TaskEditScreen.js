import React, { useLayoutEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../store';
import { colors, PRIORITIES, PROJECT_TYPES, radius } from '../theme';
import { addDays, formatDate, fromKey, todayKey, toKey } from '../dates';

export default function TaskEditScreen({ navigation, route }) {
  const { id, mode, presetProjectId, presetContact, prefill } = route.params || {};
  const { state, dispatch } = useStore();
  const existing = id ? state.tasks.find((t) => t.id === id) : null;
  const s = state.settings;

  const dueParDefaut =
    mode === 'today' || s.defaultDue === 'today' ? todayKey()
      : s.defaultDue === 'tomorrow' ? addDays(1) : null;

  const [title, setTitle] = useState(existing?.title || prefill?.title || '');
  const [note, setNote] = useState(existing?.note || prefill?.note || '');
  const [contact, setContact] = useState(existing?.contact || prefill?.contact || presetContact || '');
  const [address, setAddress] = useState(existing?.address || prefill?.address || '');
  const [priority, setPriority] = useState(existing?.priority || prefill?.priority || s.defaultPriority);
  const [projectId, setProjectId] = useState(
    existing?.projectId || prefill?.projectId || presetProjectId || null
  );
  const [dueDate, setDueDate] = useState(
    existing ? existing.dueDate : prefill ? prefill.dueDate : dueParDefaut
  );
  const [showPicker, setShowPicker] = useState(false);

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      navigation.goBack();
      return;
    }
    const payload = {
      title: trimmed, note: note.trim(), contact: contact.trim(),
      address: address.trim(), priority, projectId, dueDate,
    };
    if (!existing && prefill && prefill.subtasks && prefill.subtasks.length) {
      payload.subtasks = prefill.subtasks;
    }
    if (existing) {
      dispatch({ type: 'UPDATE_TASK', id: existing.id, patch: payload });
    } else {
      dispatch({ type: 'ADD_TASK', task: payload });
    }
    navigation.goBack();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: existing ? 'Modifier la tâche' : 'Nouvelle tâche',
      headerRight: () => (
        <Pressable onPress={save} hitSlop={10} style={{ paddingHorizontal: 6 }}>
          <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>Enregistrer</Text>
        </Pressable>
      ),
    });
  }, [navigation, title, note, contact, address, priority, projectId, dueDate]);

  const projetChoisi = state.projects.find((p) => p.id === projectId) || null;

  const quickDates = [
    { label: "Aujourd'hui", value: todayKey() },
    { label: 'Demain', value: addDays(1) },
    { label: 'Dans 7 jours', value: addDays(7) },
    { label: 'À planifier', value: null },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>TÂCHE</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Ex. Poser les tringles à rideaux"
        placeholderTextColor={colors.textLight}
        style={[styles.input, styles.inputTitle]}
        autoFocus={!existing}
        multiline
      />

      <Text style={styles.label}>CLIENT / CONTACT</Text>
      <TextInput
        value={contact}
        onChangeText={setContact}
        placeholder="Ex. Locataire, Sébastien Costa"
        placeholderTextColor={colors.textLight}
        style={styles.input}
      />

      <Text style={styles.label}>ADRESSE DU CHANTIER</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder={
          projetChoisi && projetChoisi.address
            ? `Hérité du chantier : ${projetChoisi.address}`
            : 'Ex. Rue du Scex 12, 1950 Sion'
        }
        placeholderTextColor={colors.textLight}
        style={styles.input}
      />
      {projetChoisi && projetChoisi.address && !address ? (
        <Text style={styles.hint}>
          L'adresse du chantier « {projetChoisi.name} » sera utilisée.
        </Text>
      ) : null}

      <Text style={styles.label}>PRIORITÉ</Text>
      <View style={styles.rowWrap}>
        {Object.values(PRIORITIES).map((p) => (
          <Pressable
            key={p.value}
            onPress={() => setPriority(p.value)}
            style={[
              styles.pill,
              { borderColor: p.color },
              priority === p.value && { backgroundColor: p.color },
            ]}
          >
            <View
              style={[
                styles.pillDot,
                { backgroundColor: priority === p.value ? '#fff' : p.color },
              ]}
            />
            <Text style={{ color: priority === p.value ? '#fff' : p.color, fontWeight: '700', fontSize: 13.5 }}>
              {p.short}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>PROJET</Text>
      <View style={styles.rowWrap}>
        <Pressable
          onPress={() => setProjectId(null)}
          style={[styles.pill, { borderColor: colors.border }, !projectId && { backgroundColor: colors.navy, borderColor: colors.navy }]}
        >
          <Text style={{ color: !projectId ? '#fff' : colors.textMuted, fontWeight: '700', fontSize: 13.5 }}>
            Aucun
          </Text>
        </Pressable>
        {state.projects.filter((p) => !p.deleted).map((p) => {
          const meta = PROJECT_TYPES[p.type] || PROJECT_TYPES.autre;
          const active = projectId === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setProjectId(p.id)}
              style={[styles.pill, { borderColor: meta.color }, active && { backgroundColor: meta.color }]}
            >
              <Ionicons name={meta.icon} size={14} color={active ? '#fff' : meta.color} />
              <Text style={{ color: active ? '#fff' : meta.color, fontWeight: '700', fontSize: 13.5 }}>
                {p.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>ÉCHÉANCE</Text>
      <View style={styles.rowWrap}>
        {quickDates.map((q) => {
          const active = dueDate === q.value;
          return (
            <Pressable
              key={q.label}
              onPress={() => setDueDate(q.value)}
              style={[styles.pill, { borderColor: colors.border }, active && { backgroundColor: colors.navy, borderColor: colors.navy }]}
            >
              <Text style={{ color: active ? '#fff' : colors.textMuted, fontWeight: '700', fontSize: 13.5 }}>
                {q.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setShowPicker(true)}
          style={[styles.pill, { borderColor: colors.blue }]}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.blue} />
          <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 13.5 }}>
            {dueDate ? formatDate(dueDate) : 'Choisir une date'}
          </Text>
        </Pressable>
      </View>

      {showPicker ? (
        <DateTimePicker
          value={dueDate ? fromKey(dueDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowPicker(Platform.OS === 'ios');
            if (event.type !== 'dismissed' && date) setDueDate(toKey(date));
          }}
        />
      ) : null}

      <Text style={styles.label}>DESCRIPTION / NOTE</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Détails, mesures, consignes de pose…"
        placeholderTextColor={colors.textLight}
        style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
        multiline
      />

      <Pressable style={styles.save} onPress={save}>
        <Ionicons name="checkmark" size={20} color="#fff" />
        <Text style={styles.saveText}>
          {existing ? 'Enregistrer les modifications' : 'Créer la tâche'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11.5, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 0.7, marginTop: 20, marginBottom: 8,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
    backgroundColor: '#fff',
  },
  inputTitle: { fontSize: 17, fontWeight: '700', minHeight: 54 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: radius.pill, borderWidth: 1.5,
  },
  pillDot: { width: 9, height: 9, borderRadius: 5 },
  hint: { fontSize: 12.5, color: colors.textMuted, marginTop: 6, lineHeight: 17 },
  save: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.navy, paddingVertical: 16, borderRadius: radius.md, marginTop: 32,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15.5 },
});
