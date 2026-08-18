import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, selectStats, sortTasks } from '../store';
import { TaskRow, StatsBar, SectionTitle, Fab, SearchBar, EmptyState } from '../components/ui';
import { colors } from '../theme';
import { todayKey } from '../dates';

/**
 * mode: 'today' | 'plan' | 'all'
 */
export default function TaskListScreen({ navigation, route, mode = 'today' }) {
  const { state, dispatch } = useStore();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('todo'); // pour le mode 'all'

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 4 }}>
          <Pressable onPress={() => setSearching(true)} hitSlop={10}>
            <Ionicons name="search" size={22} color={colors.navy} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Sync')} hitSlop={10}>
            <Ionicons name="sync-outline" size={22} color={colors.navy} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={10}>
            <Ionicons name="settings-outline" size={22} color={colors.navy} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const projectsById = useMemo(
    () => Object.fromEntries(state.projects.map((p) => [p.id, p])),
    [state.projects]
  );

  const tasks = useMemo(() => {
    const key = todayKey();
    let list = state.tasks.filter((t) => !t.deleted);

    const gardeTerminees = state.settings.showDone;

    if (mode === 'today') {
      list = list.filter((t) => (gardeTerminees || !t.done) && t.dueDate && t.dueDate <= key);
    } else if (mode === 'plan') {
      list = list.filter((t) => (gardeTerminees || !t.done) && !t.dueDate);
    } else {
      if (filter === 'todo') list = list.filter((t) => !t.done);
      if (filter === 'done') list = list.filter((t) => t.done);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.note || '').toLowerCase().includes(q) ||
          (t.contact || '').toLowerCase().includes(q)
      );
    }

    return sortTasks(list);
  }, [state.tasks, state.settings.showDone, mode, filter, query]);

  const stats = useMemo(() => selectStats(state.tasks), [state.tasks]);

  const sectionLabel =
    mode === 'today' ? 'TÂCHES DU JOUR' : mode === 'plan' ? 'À PLANIFIER' : 'TOUTES LES TÂCHES';

  const emptyProps =
    mode === 'today'
      ? { icon: 'sunny-outline', title: 'Rien pour aujourd\'hui', hint: 'Les tâches datées d\'aujourd\'hui ou en retard apparaissent ici.' }
      : mode === 'plan'
      ? { icon: 'albums-outline', title: 'Aucune tâche à planifier', hint: 'Les tâches sans date d\'échéance atterrissent ici.' }
      : { icon: 'list-outline', title: 'Aucune tâche', hint: 'Appuyez sur + pour créer votre première tâche.' };

  return (
    <View style={styles.container}>
      {searching ? (
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onClose={() => {
            setSearching(false);
            setQuery('');
          }}
        />
      ) : null}

      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <View>
            {mode === 'today' && !searching ? <StatsBar stats={stats} /> : null}
            {mode === 'all' ? (
              <View style={styles.filters}>
                {[
                  { key: 'todo', label: 'À faire' },
                  { key: 'done', label: 'Terminées' },
                  { key: 'allf', label: 'Toutes' },
                ].map((f) => (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <SectionTitle
              right={<Text style={styles.count}>{tasks.length}</Text>}
            >
              {sectionLabel}
            </SectionTitle>
          </View>
        }
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            project={projectsById[item.projectId]}
            onPress={() => navigation.navigate('TaskDetail', { id: item.id })}
            onToggle={() => dispatch({ type: 'TOGGLE_TASK', id: item.id })}
          />
        )}
        ListEmptyComponent={<EmptyState {...emptyProps} />}
        contentContainerStyle={{ paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
      />

      {state.settings.voiceEnabled ? (
        <Pressable
          onPress={() => navigation.navigate('Voice')}
          accessibilityRole="button"
          accessibilityLabel="Dicter une tâche"
          style={({ pressed }) => [styles.micFab, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="mic" size={24} color="#fff" />
        </Pressable>
      ) : null}

      <Fab onPress={() => navigation.navigate('TaskEdit', { mode })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  count: { fontSize: 12, fontWeight: '700', color: colors.textLight },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.bgAlt,
  },
  filterBtnActive: { backgroundColor: colors.navy },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterTextActive: { color: '#fff' },
  micFab: {
    position: 'absolute', right: 26, bottom: 92,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
});
