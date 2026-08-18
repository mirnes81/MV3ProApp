import { Linking, Platform, Alert } from 'react-native';

/**
 * Ouverture d'une adresse dans l'application de cartes du téléphone.
 * On passe par les schémas d'URL standard : aucune clé d'API, aucun coût,
 * et l'utilisateur reste dans l'application qu'il a déjà choisie par défaut.
 */

function encode(address) {
  return encodeURIComponent((address || '').trim());
}

/** Affiche l'adresse sur la carte. */
export async function openInMaps(address) {
  const q = encode(address);
  if (!q) return;

  // geo: est le schéma Android natif, il laisse le choix de l'application.
  const geo = Platform.OS === 'android'
    ? `geo:0,0?q=${q}`
    : `maps://?q=${q}`;
  const web = `https://www.google.com/maps/search/?api=1&query=${q}`;

  try {
    const ok = await Linking.canOpenURL(geo);
    await Linking.openURL(ok ? geo : web);
  } catch (e) {
    try {
      await Linking.openURL(web);
    } catch (e2) {
      Alert.alert('Ouverture impossible', "Aucune application de cartes n'a été trouvée.");
    }
  }
}

/** Lance la navigation guidée vers l'adresse. */
export async function openDirections(address) {
  const q = encode(address);
  if (!q) return;

  const nav = Platform.OS === 'android'
    ? `google.navigation:q=${q}`
    : `maps://?daddr=${q}`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${q}`;

  try {
    const ok = await Linking.canOpenURL(nav);
    await Linking.openURL(ok ? nav : web);
  } catch (e) {
    try {
      await Linking.openURL(web);
    } catch (e2) {
      Alert.alert('Navigation impossible', "Aucune application de navigation n'a été trouvée.");
    }
  }
}

/** Compose un numéro de téléphone. */
export async function callNumber(number) {
  const n = (number || '').replace(/[^\d+]/g, '');
  if (!n) return;
  try {
    await Linking.openURL(`tel:${n}`);
  } catch (e) {
    Alert.alert('Appel impossible', 'Le numéro ne peut pas être composé.');
  }
}
