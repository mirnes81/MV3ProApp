export const colors = {
  navy: '#0C1830',
  navySoft: '#1B2B4B',
  brandRed: '#E1251B',
  gold: '#F59E0B',

  bg: '#FFFFFF',
  bgAlt: '#F4F6FA',
  card: '#FFFFFF',
  border: '#E5E9F0',

  text: '#0C1830',
  textMuted: '#6B7A90',
  textLight: '#9AA7B8',

  green: '#16A34A',
  greenSoft: '#DCFCE7',
  red: '#E11D2B',
  redSoft: '#FEE2E2',
  blue: '#2563EB',
  blueSoft: '#DBEAFE',
};

export const PRIORITIES = {
  1: { value: 1, label: 'Haute priorité', short: 'Haute', color: '#E11D2B' },
  2: { value: 2, label: 'Moyenne priorité', short: 'Moyenne', color: '#F59E0B' },
  3: { value: 3, label: 'Basse priorité', short: 'Basse', color: '#2563EB' },
};

export const PROJECT_TYPES = {
  chantier: { label: 'Chantier', icon: 'business', color: '#2563EB', soft: '#DBEAFE' },
  appartement: { label: 'Appartement', icon: 'home', color: '#F59E0B', soft: '#FEF3C7' },
  devis: { label: 'Devis', icon: 'construct', color: '#16A34A', soft: '#DCFCE7' },
  client: { label: 'Client', icon: 'document-text', color: '#7C3AED', soft: '#EDE9FE' },
  fournisseur: { label: 'Fournisseur', icon: 'bus', color: '#0EA5E9', soft: '#E0F2FE' },
  autre: { label: 'Autre', icon: 'ellipsis-horizontal', color: '#6B7A90', soft: '#EEF1F6' },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
