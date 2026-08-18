import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, PRIORITIES, PROJECT_TYPES, radius } from '../theme';
import { formatDate, isOverdue } from '../dates';

/* ---------- Puce colorée (Chantier, Devis, ...) ---------- */
export function Chip({ label, color, soft }) {
  return (
    <View style={[styles.chip, { backgroundColor: soft || colors.bgAlt }]}>
      <Text style={[styles.chipText, { color: color || colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ---------- Cercle de priorité, tap = terminer ---------- */
export function PriorityCircle({ priority = 2, done, onPress, size = 22 }) {
  const color = PRIORITIES[priority]?.color || colors.textLight;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!done }}
      accessibilityLabel={done ? 'Rouvrir la tâche' : 'Terminer la tâche'}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: done ? colors.green : color,
          backgroundColor: done ? colors.green : 'transparent',
        },
      ]}
    >
      {done ? <Ionicons name="checkmark" size={size - 8} color="#fff" /> : null}
    </Pressable>
  );
}

/* ---------- Ligne de tâche ---------- */
export function TaskRow({ task, project, onPress, onToggle }) {
  const hasAddress = !!(
    (task.address && task.address.trim()) || (project && project.address && project.address.trim())
  );
  const type = project ? PROJECT_TYPES[project.type] || PROJECT_TYPES.autre : null;
  const late = !task.done && isOverdue(task.dueDate);
  const subtitle = task.contact || project?.name || '';
  const doneSubs = task.subtasks?.filter((s) => s.done).length || 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgAlt }]}
    >
      <PriorityCircle priority={task.priority} done={task.done} onPress={onToggle} />

      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, task.done && styles.strike]}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}

        <View style={styles.rowMeta}>
          {task.dueDate ? (
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={late ? colors.red : colors.textMuted}
              />
              <Text style={[styles.metaText, late && { color: colors.red, fontWeight: '600' }]}>
                {formatDate(task.dueDate)}
              </Text>
            </View>
          ) : (
            <View style={styles.metaItem}>
              <Ionicons name="albums-outline" size={13} color={colors.gold} />
              <Text style={[styles.metaText, { color: colors.gold, fontWeight: '600' }]}>
                À planifier
              </Text>
            </View>
          )}

          {task.subtasks?.length ? (
            <View style={styles.metaItem}>
              <Ionicons name="list-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {doneSubs}/{task.subtasks.length}
              </Text>
            </View>
          ) : null}

          {hasAddress ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            </View>
          ) : null}

          {task.attachments?.length ? (
            <View style={styles.metaItem}>
              <Ionicons name="attach-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{task.attachments.length}</Text>
            </View>
          ) : null}

          {type ? <Chip label={type.label} color={type.color} soft={type.soft} /> : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </Pressable>
  );
}

/* ---------- Bandeau de statistiques ---------- */
export function StatsBar({ stats }) {
  const items = [
    { value: stats.todo, label: 'À faire', color: colors.red },
    { value: stats.waiting, label: 'En attente', color: colors.gold },
    { value: stats.done, label: 'Terminées', color: colors.green },
  ];
  return (
    <View style={styles.stats}>
      {items.map((it, i) => (
        <React.Fragment key={it.label}>
          {i > 0 ? <View style={styles.statsDivider} /> : null}
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: it.color }]}>{it.value}</Text>
            <Text style={styles.statLabel}>{it.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

/* ---------- Titre de section ---------- */
export function SectionTitle({ children, right }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

/* ---------- Bouton flottant ---------- */
export function Fab({ onPress, icon = 'add' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ajouter une tâche"
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={28} color="#fff" />
    </Pressable>
  );
}

/* ---------- Barre de recherche ---------- */
export function SearchBar({ value, onChangeText, onClose }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        autoFocus
        value={value}
        onChangeText={onChangeText}
        placeholder="Rechercher dans les titres et notes"
        placeholderTextColor={colors.textLight}
        style={styles.searchInput}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.textLight} />
        </Pressable>
      ) : (
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.searchCancel}>Annuler</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ---------- Écran vide ---------- */
export function EmptyState({ icon = 'checkmark-done-outline', title, hint }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={colors.textLight} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  chipText: { fontSize: 11, fontWeight: '600' },

  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15.5, fontWeight: '700', color: colors.text, lineHeight: 21 },
  strike: { textDecorationLine: 'line-through', color: colors.textLight },
  rowSubtitle: { fontSize: 13, color: colors.textMuted },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.textMuted },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statsDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.border },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 4 },
  searchCancel: { fontSize: 14, color: colors.blue, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyHint: { fontSize: 13.5, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
});
