import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Network from 'expo-network';
import Brand from '../components/Brand';
import {
  isNotifyAvailable, requestNotifyPermission, ensureChannel, rescheduleAll, cancelAll,
} from '../notify';
import { useStore } from '../store';
import { colors, radius, PRIORITIES } from '../theme';

export default function SettingsScreen({ navigation }) {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const [busy, setBusy] = useState(false);

  const set = (patch) => dispatch({ type: 'SET_SETTINGS', patch });

  const nbTasks = state.tasks.filter((t) => !t.deleted).length;
  const nbDone = state.tasks.filter((t) => !t.deleted && t.done).length;
  const nbFiles = state.tasks.reduce((n, t) => n + (t.attachments || []).length, 0);

  /* ---------------- Sauvegarde ---------------- */

  const exportData = async () => {
    setBusy(true);
    try {
      const payload = JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), tasks: state.tasks, projects: state.projects },
        null,
        2
      );
      const name = `mv3-taches-${new Date().toISOString().slice(0, 10)}.json`;
      const path = FileSystem.cacheDirectory + name;
      await FileSystem.writeAsStringAsync(path, payload);
      await Share.share({ url: path, message: `Sauvegarde MV-3 PRO Tâches — ${nbTasks} tâches` });
    } catch (e) {
      Alert.alert('Export impossible', "La sauvegarde n'a pas pu être créée.");
    }
    setBusy(false);
  };

  const importData = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets || !res.assets[0]) return;

    setBusy(true);
    try {
      const contenu = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const data = JSON.parse(contenu);

      if (!Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
        throw new Error('format');
      }

      Alert.alert(
        'Restaurer cette sauvegarde',
        `${data.tasks.length} tâche(s) et ${data.projects.length} projet(s) trouvés.\n\n` +
          "Le contenu actuel du téléphone sera remplacé.",
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Restaurer',
            style: 'destructive',
            onPress: () => {
              dispatch({ type: 'IMPORT', tasks: data.tasks, projects: data.projects });
              Alert.alert('Sauvegarde restaurée', 'Vos tâches ont été rechargées.');
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert(
        'Fichier illisible',
        "Ce fichier n'est pas une sauvegarde MV-3 PRO Tâches valide."
      );
    }
    setBusy(false);
  };

  /* ---------------- Rappels ---------------- */

  const toggleReminders = async (actif) => {
    if (!actif) {
      set({ remindersEnabled: false });
      await cancelAll();
      return;
    }

    if (!isNotifyAvailable()) {
      Alert.alert(
        'Rappels indisponibles',
        "Le module de notifications n'est pas présent dans cette version de l'application."
      );
      return;
    }

    const ok = await requestNotifyPermission();
    if (!ok) {
      Alert.alert(
        'Autorisation refusée',
        'Activez les notifications pour MV-3 PRO Tâches dans les paramètres Android.'
      );
      return;
    }

    await ensureChannel();
    const n = await rescheduleAll(state.tasks, {
      eveningHour: s.reminderEvening,
      morningHour: s.reminderMorning,
    });
    set({ remindersEnabled: true });
    Alert.alert('Rappels activés', `${n} rappel(s) programmé(s) pour vos tâches datées.`);
  };

  const replanifier = async (patch) => {
    await rescheduleAll(state.tasks, {
      eveningHour: patch.eveningHour ?? s.reminderEvening,
      morningHour: patch.morningHour ?? s.reminderMorning,
    });
  };

  const purgeDone = () => {
    const cibles = state.tasks.filter((t) => !t.deleted && t.done);
    if (!cibles.length) {
      Alert.alert('Rien à supprimer', 'Aucune tâche terminée pour le moment.');
      return;
    }
    Alert.alert(
      'Supprimer les tâches terminées',
      `${cibles.length} tâche(s) seront supprimées. Elles disparaîtront aussi de Dolibarr à la prochaine synchronisation.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => cibles.forEach((t) => dispatch({ type: 'DELETE_TASK', id: t.id })),
        },
      ]
    );
  };

  const resetAll = () => {
    Alert.alert(
      'Tout effacer',
      'Toutes les tâches et tous les projets seront supprimés définitivement de ce téléphone. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: () => dispatch({ type: 'CLEAR_ALL' }),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgAlt }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.brand}>
        <Brand size={26} />
      </View>

      {/* Saisie */}
      <Section title="SAISIE">
        <Row
          icon="mic-outline"
          label="Dictée vocale"
          hint="Bouton micro sur l'écran Aujourd'hui"
          right={
            <Switch
              value={s.voiceEnabled}
              onValueChange={(v) => set({ voiceEnabled: v })}
              trackColor={{ true: colors.navy }}
            />
          }
        />
        <ChoiceRow
          icon="flag-outline"
          label="Priorité par défaut"
          value={PRIORITIES[s.defaultPriority].short}
          options={Object.values(PRIORITIES).map((p) => ({ key: p.value, label: p.short, color: p.color }))}
          selected={s.defaultPriority}
          onSelect={(v) => set({ defaultPriority: v })}
        />
        <ChoiceRow
          icon="calendar-outline"
          label="Échéance par défaut"
          value={
            s.defaultDue === 'today' ? "Aujourd'hui"
              : s.defaultDue === 'tomorrow' ? 'Demain' : 'À planifier'
          }
          options={[
            { key: 'none', label: 'À planifier' },
            { key: 'today', label: "Aujourd'hui" },
            { key: 'tomorrow', label: 'Demain' },
          ]}
          selected={s.defaultDue}
          onSelect={(v) => set({ defaultDue: v })}
        />
      </Section>

      {/* Affichage */}
      <Section title="AFFICHAGE">
        <ChoiceRow
          icon="home-outline"
          label="Écran d'ouverture"
          value={
            s.startScreen === 'plan' ? 'À planifier'
              : s.startScreen === 'projects' ? 'Projets'
              : s.startScreen === 'all' ? 'Tâches' : "Aujourd'hui"
          }
          options={[
            { key: 'today', label: "Aujourd'hui" },
            { key: 'plan', label: 'À planifier' },
            { key: 'projects', label: 'Projets' },
            { key: 'all', label: 'Tâches' },
          ]}
          selected={s.startScreen}
          onSelect={(v) => set({ startScreen: v })}
        />
        <Row
          icon="eye-outline"
          label="Afficher les tâches terminées"
          hint="Dans les listes du jour et des projets"
          right={
            <Switch
              value={s.showDone}
              onValueChange={(v) => set({ showDone: v })}
              trackColor={{ true: colors.navy }}
            />
          }
        />
        <Row
          icon="trash-outline"
          label="Confirmer avant suppression"
          right={
            <Switch
              value={s.confirmDelete}
              onValueChange={(v) => set({ confirmDelete: v })}
              trackColor={{ true: colors.navy }}
            />
          }
        />
      </Section>

      {/* Photos */}
      <Section title="PHOTOS ET FICHIERS">
        <ChoiceRow
          icon="image-outline"
          label="Qualité des photos"
          hint="Une qualité moindre accélère la synchronisation"
          value={s.photoQuality === 'high' ? 'Haute' : s.photoQuality === 'low' ? 'Légère' : 'Standard'}
          options={[
            { key: 'low', label: 'Légère' },
            { key: 'medium', label: 'Standard' },
            { key: 'high', label: 'Haute' },
          ]}
          selected={s.photoQuality}
          onSelect={(v) => set({ photoQuality: v })}
        />
        <Row
          icon="wifi-outline"
          label="Envoyer les photos en Wi-Fi seulement"
          hint="Économise les données mobiles sur le chantier"
          right={
            <Switch
              value={s.wifiOnlyUpload}
              onValueChange={(v) => set({ wifiOnlyUpload: v })}
              trackColor={{ true: colors.navy }}
            />
          }
        />
      </Section>

      {/* Rappels */}
      <Section title="RAPPELS">
        <Row
          icon="notifications-outline"
          label="Rappels de tâches"
          hint="La veille au soir et le matin de l'échéance"
          right={
            <Switch
              value={s.remindersEnabled}
              onValueChange={toggleReminders}
              trackColor={{ true: colors.navy }}
            />
          }
        />
        {s.remindersEnabled ? (
          <>
            <ChoiceRow
              icon="moon-outline"
              label="Rappel de la veille"
              value={`${s.reminderEvening} h`}
              options={[16, 17, 18, 19, 20].map((h) => ({ key: h, label: `${h} h` }))}
              selected={s.reminderEvening}
              onSelect={(v) => { set({ reminderEvening: v }); replanifier({ eveningHour: v }); }}
            />
            <ChoiceRow
              icon="sunny-outline"
              label="Rappel du matin"
              value={`${s.reminderMorning} h`}
              options={[5, 6, 7, 8].map((h) => ({ key: h, label: `${h} h` }))}
              selected={s.reminderMorning}
              onSelect={(v) => { set({ reminderMorning: v }); replanifier({ morningHour: v }); }}
            />
          </>
        ) : null}
      </Section>

      {/* Synchronisation */}
      <Section title="SYNCHRONISATION">
        <Pressable style={styles.row} onPress={() => navigation.navigate('Sync')}>
          <Ionicons name="sync-outline" size={21} color={colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Serveur Dolibarr</Text>
            <Text style={styles.rowHint}>Adresse, jeton et état de la synchronisation</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>
        <Row
          icon="cloud-upload-outline"
          label="Synchroniser à l'ouverture"
          hint="Lance un échange au démarrage de l'application"
          right={
            <Switch
              value={s.syncOnStart}
              onValueChange={(v) => set({ syncOnStart: v })}
              trackColor={{ true: colors.navy }}
            />
          }
        />
      </Section>

      {/* Données */}
      <Section title="MES DONNÉES">
        <View style={styles.stats}>
          <Stat value={nbTasks} label="tâches" />
          <Stat value={nbDone} label="terminées" />
          <Stat value={nbFiles} label="fichiers" />
        </View>

        <Pressable style={styles.row} onPress={exportData} disabled={busy}>
          <Ionicons name="download-outline" size={21} color={colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Exporter une sauvegarde</Text>
            <Text style={styles.rowHint}>Fichier JSON à conserver ou envoyer par mail</Text>
          </View>
        </Pressable>

        <Pressable style={styles.row} onPress={importData} disabled={busy}>
          <Ionicons name="cloud-upload-outline" size={21} color={colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Restaurer une sauvegarde</Text>
            <Text style={styles.rowHint}>Recharge un fichier JSON exporté précédemment</Text>
          </View>
        </Pressable>

        <Pressable style={styles.row} onPress={purgeDone}>
          <Ionicons name="checkmark-done-outline" size={21} color={colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Supprimer les tâches terminées</Text>
            <Text style={styles.rowHint}>Allège la liste sans toucher aux tâches en cours</Text>
          </View>
        </Pressable>

        <Pressable style={styles.row} onPress={resetAll}>
          <Ionicons name="warning-outline" size={21} color={colors.red} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.red }]}>Tout effacer</Text>
            <Text style={styles.rowHint}>Remet l'application à zéro sur ce téléphone</Text>
          </View>
        </Pressable>
      </Section>

      <Text style={styles.version}>MV-3 PRO Tâches — version 1.3</Text>
    </ScrollView>
  );
}

/* ---------------- Composants ---------------- */

function Section({ title, children }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ icon, label, hint, right }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={21} color={colors.navy} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function ChoiceRow({ icon, label, hint, value, options, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable style={styles.row} onPress={() => setOpen(!open)}>
        <Ionicons name={icon} size={21} color={colors.navy} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
        </View>
        <Text style={styles.rowValue}>{value}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textLight} />
      </Pressable>

      {open ? (
        <View style={styles.options}>
          {options.map((o) => {
            const active = o.key === selected;
            return (
              <Pressable
                key={String(o.key)}
                onPress={() => { onSelect(o.key); setOpen(false); }}
                style={[
                  styles.option,
                  active && { backgroundColor: o.color || colors.navy, borderColor: o.color || colors.navy },
                ]}
              >
                <Text style={{ color: active ? '#fff' : colors.textMuted, fontWeight: '700', fontSize: 13 }}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 11.5, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 20,
  },
  card: { backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowHint: { fontSize: 12.5, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.navy },

  options: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4,
    backgroundColor: colors.bgAlt,
  },
  option: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: '#fff',
  },

  stats: {
    flexDirection: 'row', paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.navy },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  brand: { alignItems: 'center', paddingTop: 24, paddingBottom: 4 },
  version: {
    textAlign: 'center', color: colors.textLight, fontSize: 12.5, marginTop: 26,
  },
});
