import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, PROJECT_TYPES, radius } from '../theme';
import { Fab, EmptyState } from '../components/ui';

export default function ProjectsScreen({ navigation }) {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState('projets');
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('chantier');

  const rows = useMemo(() => {
    if (tab === 'projets') {
      return state.projects.filter((p) => !p.deleted).map((p) => {
        const tasks = state.tasks.filter((t) => !t.deleted && t.projectId === p.id);
        return {
          key: p.id,
          id: p.id,
          name: p.name,
          type: p.type,
          total: tasks.length,
          todo: tasks.filter((t) => !t.done).length,
        };
      });
    }
    // Onglet Clients / Chantiers : regroupement par contact
    const map = new Map();
    state.tasks.forEach((t) => {
      if (t.deleted) return;
      const contact = (t.contact || '').trim();
      if (!contact) return;
      if (!map.has(contact)) map.set(contact, []);
      map.get(contact).push(t);
    });
    return [...map.entries()].map(([contact, tasks]) => ({
      key: contact,
      contact,
      name: contact,
      type: 'client',
      total: tasks.length,
      todo: tasks.filter((t) => !t.done).length,
    }));
  }, [state.projects, state.tasks, tab]);

  const openRow = (row) => {
    navigation.navigate('ProjectTasks', {
      title: row.name,
      projectId: row.id || null,
      contact: row.contact || null,
    });
  };

  const createProject = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_PROJECT', project: { name: trimmed, address: address.trim(), type } });
    setName('');
    setAddress('');
    setType('chantier');
    setModal(false);
  };

  const confirmDelete = (row) => {
    if (!row.id) return;
    Alert.alert(
      'Supprimer le projet',
      `« ${row.name} » sera retiré. Ses tâches restent dans la liste, sans projet.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => dispatch({ type: 'DELETE_PROJECT', id: row.id }),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {[
          { key: 'projets', label: 'PROJETS' },
          { key: 'clients', label: 'CLIENTS / CHANTIERS' },
        ].map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tab}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            <View style={[styles.tabBar, tab === t.key && styles.tabBarActive]} />
          </Pressable>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={({ item }) => {
          const meta = PROJECT_TYPES[item.type] || PROJECT_TYPES.autre;
          return (
            <Pressable
              onPress={() => openRow(item)}
              onLongPress={() => confirmDelete(item)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgAlt }]}
            >
              <View style={[styles.icon, { backgroundColor: meta.color }]}>
                <Ionicons name={meta.icon} size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rowSub}>
                  {item.total} tâche{item.total > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.count, item.todo > 0 && { color: colors.gold }]}>
                  {item.todo}
                </Text>
                <Text style={styles.countLabel}>à faire</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title={tab === 'projets' ? 'Aucun projet' : 'Aucun client renseigné'}
            hint={
              tab === 'projets'
                ? 'Appuyez sur + pour créer un projet ou un chantier.'
                : 'Renseignez le champ Client / contact dans une tâche pour la retrouver ici.'
            }
          />
        }
        contentContainerStyle={{ paddingBottom: 110 }}
      />

      {tab === 'projets' ? <Fab onPress={() => setModal(true)} /> : null}

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Nouveau projet</Text>

          <Text style={styles.label}>NOM</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex. Immeuble Les Ailes, Vétroz"
            placeholderTextColor={colors.textLight}
            style={styles.input}
            autoFocus
          />

          <Text style={styles.label}>ADRESSE DU CHANTIER</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Ex. Rue du Scex 12, 1950 Sion"
            placeholderTextColor={colors.textLight}
            style={styles.input}
          />

          <Text style={styles.label}>TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
              {Object.entries(PROJECT_TYPES).map(([key, meta]) => (
                <Pressable
                  key={key}
                  onPress={() => setType(key)}
                  style={[
                    styles.typeBtn,
                    { backgroundColor: type === key ? meta.color : meta.soft },
                  ]}
                >
                  <Ionicons
                    name={meta.icon}
                    size={15}
                    color={type === key ? '#fff' : meta.color}
                  />
                  <Text style={{ color: type === key ? '#fff' : meta.color, fontWeight: '700', fontSize: 13 }}>
                    {meta.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setModal(false)}>
              <Text style={styles.btnGhostText}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={createProject}>
              <Text style={styles.btnPrimaryText}>Créer le projet</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', backgroundColor: colors.card },
  tab: { flex: 1, alignItems: 'center', paddingTop: 12 },
  tabText: { fontSize: 12.5, fontWeight: '800', color: colors.textLight, letterSpacing: 0.5 },
  tabTextActive: { color: colors.navy },
  tabBar: { height: 3, backgroundColor: 'transparent', alignSelf: 'stretch', marginTop: 10 },
  tabBarActive: { backgroundColor: colors.navy },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15.5, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  count: { fontSize: 18, fontWeight: '800', color: colors.textLight },
  countLabel: { fontSize: 11, color: colors.textMuted },

  backdrop: { flex: 1, backgroundColor: 'rgba(12,24,48,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.navy, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  btn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  btnGhost: { backgroundColor: colors.bgAlt },
  btnGhostText: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
  btnPrimary: { backgroundColor: colors.navy },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
