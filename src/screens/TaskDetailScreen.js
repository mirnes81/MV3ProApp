import React, { useLayoutEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useStore, taskAddress } from '../store';
import { openInMaps, openDirections } from '../maps';
import { colors, PRIORITIES, PROJECT_TYPES, radius } from '../theme';
import { formatDate, isOverdue } from '../dates';

export default function TaskDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const { state, dispatch } = useStore();
  const task = state.tasks.find((t) => t.id === id);
  const [newSub, setNewSub] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Détail de la tâche',
      headerRight: () =>
        task ? (
          <Pressable
            onPress={() => navigation.navigate('TaskEdit', { id: task.id })}
            hitSlop={10}
            style={{ paddingHorizontal: 6 }}
          >
            <Ionicons name="create-outline" size={22} color={colors.navy} />
          </Pressable>
        ) : null,
    });
  }, [navigation, task]);

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Cette tâche n'existe plus.</Text>
      </View>
    );
  }

  const project = state.projects.find((p) => p.id === task.projectId);
  const prio = PRIORITIES[task.priority] || PRIORITIES[2];
  const typeMeta = project ? PROJECT_TYPES[project.type] || PROJECT_TYPES.autre : null;
  const late = !task.done && isOverdue(task.dueDate);
  const adresse = taskAddress(task, state.projects);

  const addSubtask = () => {
    const t = newSub.trim();
    if (!t) return;
    dispatch({ type: 'ADD_SUBTASK', taskId: task.id, title: t });
    setNewSub('');
  };

  const qualite = { low: 0.4, medium: 0.7, high: 0.92 }[state.settings.photoQuality] || 0.7;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès refusé', 'Autorisez l\'accès aux photos dans les réglages Android pour joindre une image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: qualite });
    if (!res.canceled && res.assets?.[0]) {
      dispatch({
        type: 'ADD_ATTACHMENT',
        taskId: task.id,
        attachment: {
          uri: res.assets[0].uri,
          name: res.assets[0].fileName || 'Photo',
          mimetype: res.assets[0].mimeType || 'image/jpeg',
        },
      });
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès refusé', 'Autorisez l\'appareil photo dans les réglages Android.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: qualite });
    if (!res.canceled && res.assets?.[0]) {
      dispatch({
        type: 'ADD_ATTACHMENT',
        taskId: task.id,
        attachment: {
          uri: res.assets[0].uri,
          name: 'Photo chantier',
          mimetype: 'image/jpeg',
        },
      });
    }
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets && res.assets[0]) {
      const f = res.assets[0];
      dispatch({
        type: 'ADD_ATTACHMENT',
        taskId: task.id,
        attachment: {
          uri: f.uri,
          name: f.name || 'Document',
          mimetype: f.mimeType || 'application/pdf',
          size: f.size || 0,
        },
      });
    }
  };

  const removeAttachment = (att) => {
    Alert.alert('Supprimer la pièce jointe', att.name || 'Ce fichier sera retiré de la tâche.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          dispatch({ type: 'DELETE_ATTACHMENT', taskId: task.id, attachmentId: att.id }),
      },
    ]);
  };

  const confirmDelete = () => {
    if (!state.settings.confirmDelete) {
      dispatch({ type: 'DELETE_TASK', id: task.id });
      navigation.goBack();
      return;
    }
    Alert.alert('Supprimer la tâche', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'DELETE_TASK', id: task.id });
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.prioRow}>
          <View style={[styles.dot, { backgroundColor: prio.color }]} />
          <Text style={[styles.prioText, { color: prio.color }]}>
            {prio.label.toUpperCase()}
          </Text>
        </View>

        <Text style={[styles.title, task.done && styles.strike]}>{task.title}</Text>

        {task.contact ? (
          <View style={styles.metaLine}>
            <Ionicons name="person-outline" size={17} color={colors.textMuted} />
            <Text style={styles.metaText}>{task.contact}</Text>
          </View>
        ) : null}

        {project ? (
          <View style={styles.metaLine}>
            <Ionicons name="folder-outline" size={17} color={colors.textMuted} />
            <Text style={styles.metaText}>{project.name}</Text>
            {typeMeta ? (
              <View style={[styles.chip, { backgroundColor: typeMeta.soft }]}>
                <Text style={{ color: typeMeta.color, fontSize: 11, fontWeight: '700' }}>
                  {typeMeta.label}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {adresse ? (
          <View style={styles.addressBox}>
            <View style={styles.metaLine}>
              <Ionicons name="location-outline" size={17} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.metaText}>{adresse.address}</Text>
                {adresse.inherited ? (
                  <Text style={styles.inherited}>Adresse du chantier</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.mapActions}>
              <Pressable style={styles.mapBtn} onPress={() => openInMaps(adresse.address)}>
                <Ionicons name="map-outline" size={18} color={colors.blue} />
                <Text style={styles.mapText}>Voir sur la carte</Text>
              </Pressable>
              <Pressable
                style={[styles.mapBtn, styles.mapBtnMain]}
                onPress={() => openDirections(adresse.address)}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={[styles.mapText, { color: '#fff' }]}>Itinéraire</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.metaLine}>
          <Ionicons
            name="calendar-outline"
            size={17}
            color={task.dueDate ? (late ? colors.red : colors.textMuted) : colors.gold}
          />
          <Text
            style={[
              styles.metaText,
              !task.dueDate && { color: colors.gold, fontWeight: '700' },
              late && { color: colors.red, fontWeight: '700' },
            ]}
          >
            {task.dueDate ? formatDate(task.dueDate) : 'À planifier'}
            {late ? ' — en retard' : ''}
          </Text>
        </View>

        {task.note ? (
          <>
            <Text style={styles.section}>DESCRIPTION / NOTE</Text>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{task.note}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.section}>SOUS-TÂCHES</Text>
        {task.subtasks.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => dispatch({ type: 'TOGGLE_SUBTASK', taskId: task.id, subtaskId: s.id })}
            onLongPress={() =>
              dispatch({ type: 'DELETE_SUBTASK', taskId: task.id, subtaskId: s.id })
            }
            style={styles.subRow}
          >
            <View style={[styles.subCircle, s.done && { backgroundColor: colors.green, borderColor: colors.green }]}>
              {s.done ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
            </View>
            <Text style={[styles.subText, s.done && styles.strikeMuted]}>{s.title}</Text>
          </Pressable>
        ))}

        <View style={styles.addSubRow}>
          <Ionicons name="add-circle-outline" size={20} color={colors.blue} />
          <TextInput
            value={newSub}
            onChangeText={setNewSub}
            onSubmitEditing={addSubtask}
            placeholder="Ajouter une sous-tâche"
            placeholderTextColor={colors.textLight}
            style={styles.addSubInput}
            returnKeyType="done"
          />
          {newSub.trim() ? (
            <Pressable onPress={addSubtask} hitSlop={10}>
              <Text style={styles.addSubBtn}>Ajouter</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.section}>PIÈCES JOINTES</Text>
        {task.attachments.length ? (
          <View style={styles.attachGrid}>
            {task.attachments.map((a) => {
              const isImage = !a.mimetype || a.mimetype.indexOf('image/') === 0;
              return (
                <View key={a.id} style={{ width: 100 }}>
                  <Pressable
                    onPress={() =>
                      isImage
                        ? navigation.navigate('Photo', { uri: a.uri, name: a.name })
                        : null
                    }
                    onLongPress={() => removeAttachment(a)}
                  >
                    {isImage ? (
                      <Image source={{ uri: a.uri }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbDoc]}>
                        <Ionicons name="document-text-outline" size={30} color={colors.textMuted} />
                      </View>
                    )}
                    {!a.synced ? <View style={styles.pending} /> : null}
                  </Pressable>
                  <Text style={styles.thumbName} numberOfLines={1}>
                    {a.name || 'Fichier'}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.attachActions}>
          <Pressable onPress={takePhoto} style={styles.attachBtn}>
            <Ionicons name="camera-outline" size={19} color={colors.blue} />
            <Text style={styles.attachText}>Photo</Text>
          </Pressable>
          <Pressable onPress={pickImage} style={styles.attachBtn}>
            <Ionicons name="images-outline" size={19} color={colors.blue} />
            <Text style={styles.attachText}>Galerie</Text>
          </Pressable>
          <Pressable onPress={pickDocument} style={styles.attachBtn}>
            <Ionicons name="document-attach-outline" size={19} color={colors.blue} />
            <Text style={styles.attachText}>Fichier</Text>
          </Pressable>
        </View>
        {task.attachments.some((a) => !a.synced) ? (
          <Text style={styles.pendingHint}>
            Le point orange signale les fichiers pas encore envoyés au serveur.
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.action, styles.delete]} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={19} color={colors.red} />
          <Text style={[styles.actionText, { color: colors.red }]}>Supprimer</Text>
        </Pressable>
        <Pressable
          style={[styles.action, styles.finish, task.done && { backgroundColor: colors.textMuted }]}
          onPress={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
        >
          <Ionicons name={task.done ? 'arrow-undo' : 'checkmark'} size={19} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff' }]}>
            {task.done ? 'Rouvrir' : 'Terminer'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  prioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  prioText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
  title: { fontSize: 23, fontWeight: '800', color: colors.navy, lineHeight: 30, marginBottom: 16 },
  strike: { textDecorationLine: 'line-through', color: colors.textLight },
  strikeMuted: { textDecorationLine: 'line-through', color: colors.textLight },

  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  metaText: { fontSize: 15, color: colors.text },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  addressBox: {
    backgroundColor: colors.bgAlt, borderRadius: radius.md,
    padding: 14, marginBottom: 12, marginTop: 2,
  },
  inherited: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  mapActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  mapBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 11, borderRadius: radius.md,
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
  },
  mapBtnMain: { backgroundColor: colors.blue, borderColor: colors.blue },
  mapText: { color: colors.blue, fontSize: 13.5, fontWeight: '700' },

  section: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.7,
    marginTop: 24,
    marginBottom: 10,
  },
  noteBox: { backgroundColor: colors.bgAlt, borderRadius: radius.md, padding: 14 },
  noteText: { fontSize: 14.5, color: colors.text, lineHeight: 21 },

  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  subCircle: {
    width: 21, height: 21, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  subText: { flex: 1, fontSize: 14.5, color: colors.text, lineHeight: 20 },

  addSubRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, marginTop: 4,
  },
  addSubInput: { flex: 1, fontSize: 14.5, color: colors.text, paddingVertical: 4 },
  addSubBtn: { color: colors.blue, fontWeight: '700', fontSize: 14 },

  attachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  thumb: { width: 100, height: 100, borderRadius: radius.md, backgroundColor: colors.bgAlt },
  thumbDoc: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  thumbName: { fontSize: 11.5, color: colors.textMuted, marginTop: 4 },
  pending: {
    position: 'absolute', top: 6, right: 6,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: colors.gold, borderWidth: 2, borderColor: '#fff',
  },
  pendingHint: { fontSize: 12.5, color: colors.textMuted, marginTop: 10, lineHeight: 17 },
  attachActions: { flexDirection: 'row', gap: 20, marginTop: 6, flexWrap: 'wrap' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  attachText: { color: colors.blue, fontSize: 14, fontWeight: '600' },

  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: '#fff',
  },
  action: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: radius.md,
  },
  delete: { backgroundColor: colors.redSoft },
  finish: { backgroundColor: colors.green },
  actionText: { fontWeight: '700', fontSize: 15 },
});
