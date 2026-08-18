import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { getSyncConfig, setSyncConfig, getSyncState, resetSyncCursor, runSync } from '../sync';
import { colors, radius } from '../theme';

export default function SyncScreen() {
  const { state, dispatch } = useStore();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState({ lastRun: null, lastError: null, since: 0 });

  useEffect(() => {
    (async () => {
      const cfg = await getSyncConfig();
      setUrl(cfg.url || '');
      setToken(cfg.token || '');
      setInfo(await getSyncState());
    })();
  }, []);

  const save = async () => {
    await setSyncConfig({ url: url.trim(), token: token.trim() });
    setStatus({ ok: true, message: 'Réglages enregistrés.' });
  };

  const sync = async () => {
    await setSyncConfig({ url: url.trim(), token: token.trim() });
    setBusy(true);
    setStatus(null);

    const result = await runSync(
      { tasks: state.tasks, projects: state.projects },
      { wifiOnlyUpload: state.settings.wifiOnlyUpload }
    );

    if (result.ok) {
      dispatch({ type: 'MERGE', merged: result.merged });
    }
    setStatus(result);
    setInfo(await getSyncState());
    setBusy(false);
  };

  const fullResync = () => {
    Alert.alert(
      'Tout retélécharger',
      'Le téléphone va redemander la totalité des données au serveur. Vos tâches locales sont conservées, les plus récentes gagnent.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          onPress: async () => {
            await resetSyncCursor();
            setInfo(await getSyncState());
            sync();
          },
        },
      ]
    );
  };

  const pending = state.tasks.filter((t) => (t.updatedAt || 0) > (info.since || 0)).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.banner}>
        <Ionicons name="sync-outline" size={20} color={colors.navy} />
        <Text style={styles.bannerText}>
          Ces deux valeurs se trouvent dans Dolibarr, menu Tâches MV-3 puis Configuration.
        </Text>
      </View>

      <Text style={styles.label}>ADRESSE DE SYNCHRONISATION</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://crm.mv-3pro.ch/custom/mv3taches/sync.php"
        placeholderTextColor={colors.textLight}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Text style={styles.label}>JETON</Text>
      <TextInput
        value={token}
        onChangeText={setToken}
        placeholder="Collez le jeton depuis Dolibarr"
        placeholderTextColor={colors.textLight}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Pressable style={styles.secondary} onPress={save}>
        <Text style={styles.secondaryText}>Enregistrer les réglages</Text>
      </Pressable>

      <Pressable
        style={[styles.primary, busy && { opacity: 0.6 }]}
        onPress={sync}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="sync" size={20} color="#fff" />
            <Text style={styles.primaryText}>Synchroniser maintenant</Text>
          </>
        )}
      </Pressable>

      {status ? (
        <View style={[styles.status, status.ok ? styles.statusOk : styles.statusErr]}>
          <Ionicons
            name={status.ok ? 'checkmark-circle' : 'alert-circle'}
            size={19}
            color={status.ok ? colors.green : colors.red}
          />
          <Text style={[styles.statusText, { color: status.ok ? colors.green : colors.red }]}>
            {status.message}
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>ÉTAT</Text>
      <View style={styles.infoBox}>
        <InfoRow
          label="Dernière synchronisation"
          value={info.lastRun ? new Date(info.lastRun).toLocaleString('fr-CH') : 'Jamais'}
        />
        <InfoRow
          label="Modifications en attente"
          value={pending === 0 ? 'Aucune' : `${pending} tâche${pending > 1 ? 's' : ''}`}
        />
        <InfoRow label="Tâches locales" value={String(state.tasks.filter((t) => !t.deleted).length)} />
        {info.lastError ? <InfoRow label="Dernière erreur" value={info.lastError} error /> : null}
      </View>

      <Pressable style={styles.ghost} onPress={fullResync}>
        <Ionicons name="cloud-download-outline" size={18} color={colors.textMuted} />
        <Text style={styles.ghostText}>Tout retélécharger depuis le serveur</Text>
      </Pressable>

      <Text style={styles.help}>
        La synchronisation fonctionne dans les deux sens. Ce que vous modifiez sur le téléphone
        remonte dans Dolibarr, et ce que vous changez dans Dolibarr redescend ici. Si la même
        tâche a été modifiée des deux côtés, la version la plus récente l'emporte. Sans réseau,
        l'application continue de fonctionner normalement : tout repart au prochain passage.
      </Text>
    </ScrollView>
  );
}

function InfoRow({ label, value, error }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, error && { color: colors.red }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.bgAlt,
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  bannerText: { flex: 1, fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },

  label: {
    fontSize: 11.5, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 0.7, marginTop: 20, marginBottom: 8,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5, color: colors.text,
    backgroundColor: '#fff',
  },

  secondary: {
    marginTop: 16, paddingVertical: 13, borderRadius: radius.md,
    backgroundColor: colors.bgAlt, alignItems: 'center',
  },
  secondaryText: { color: colors.textMuted, fontWeight: '700', fontSize: 14.5 },

  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    marginTop: 12, paddingVertical: 16, borderRadius: radius.md, backgroundColor: colors.navy,
    minHeight: 54,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15.5 },

  status: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    marginTop: 14, padding: 13, borderRadius: radius.md,
  },
  statusOk: { backgroundColor: colors.greenSoft },
  statusErr: { backgroundColor: colors.redSoft },
  statusText: { flex: 1, fontSize: 13.5, fontWeight: '600', lineHeight: 19 },

  infoBox: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13.5, color: colors.textMuted },
  infoValue: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.text, textAlign: 'right' },

  ghost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 18, paddingVertical: 12,
  },
  ghostText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },

  help: {
    marginTop: 18, fontSize: 13, color: colors.textLight, lineHeight: 19,
  },
});
