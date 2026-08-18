import React, { useLayoutEffect, useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useStore, sortTasks } from '../store';
import { TaskRow, EmptyState, Fab } from '../components/ui';
import { colors } from '../theme';

export default function ProjectTasksScreen({ navigation, route }) {
  const { title, projectId, contact } = route.params;
  const { state, dispatch } = useStore();

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const projectsById = useMemo(
    () => Object.fromEntries(state.projects.map((p) => [p.id, p])),
    [state.projects]
  );

  const tasks = useMemo(() => {
    const list = state.tasks.filter(
      (t) =>
        !t.deleted &&
        (projectId ? t.projectId === projectId : (t.contact || '').trim() === contact)
    );
    return sortTasks(list);
  }, [state.tasks, projectId, contact]);

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            project={projectsById[item.projectId]}
            onPress={() => navigation.navigate('TaskDetail', { id: item.id })}
            onToggle={() => dispatch({ type: 'TOGGLE_TASK', id: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="Aucune tâche ici"
            hint="Appuyez sur + pour ajouter une tâche à ce dossier."
          />
        }
        contentContainerStyle={{ paddingBottom: 110 }}
      />
      <Fab
        onPress={() =>
          navigation.navigate('TaskEdit', { presetProjectId: projectId, presetContact: contact })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
