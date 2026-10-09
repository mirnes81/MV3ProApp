# ⛔ DÉPÔT OBSOLÈTE — NE PLUS UTILISER

Ce dépôt est une ancienne copie/test de **MV-3 PRO Tâches**.

La version active et maintenue est désormais dans le dépôt GitHub :

**`mirnes81/mv3-taches`**

Aucun nouveau développement ni build automatique ne doit être réalisé ici.
Ce dépôt est conservé uniquement comme historique jusqu'à archivage/suppression
définitive dans GitHub.

---

# MV-3 PRO Tâches — v1.3

Application Android de gestion de tâches, projets et chantiers.
Stockage 100 % local, fonctionne sans connexion Internet.

Package Android : `ch.mv3pro.taches`

---

## Obtenir l'APK — méthode GitHub Actions (recommandée)

Aucun logiciel à installer sur votre machine. GitHub compile à votre place.

1. Créez un dépôt sur GitHub (privé ou public), par exemple `mv3-taches`.
2. Déposez le contenu de ce dossier à la racine du dépôt, puis poussez sur `main`.

   ```bash
   cd mv3-taches
   git init
   git add .
   git commit -m "MV-3 PRO Tâches v1.0"
   git branch -M main
   git remote add origin https://github.com/VOTRE-COMPTE/mv3-taches.git
   git push -u origin main
   ```

3. Le workflow démarre seul. Suivez-le dans l'onglet **Actions** du dépôt.
4. Au bout de 8 à 12 minutes, récupérez l'APK à deux endroits :
   - onglet **Actions** → le build → section **Artifacts** → `MV3-Taches-APK`
   - onglet **Releases** → `MV-3 PRO Tâches — build N` → fichier `.apk`

Chaque `git push` produit une nouvelle version numérotée automatiquement.

## Obtenir l'APK — méthode EAS Build

```bash
npm install
npx expo login
npx eas build -p android --profile preview
```

Expo renvoie un lien de téléchargement à la fin du build.

## Lancer en développement

```bash
npm install
npx expo start
```

Scannez le QR code avec l'application Expo Go sur votre téléphone.

---

## Installation sur le téléphone

L'APK est signé avec la clé de debug : suffisant pour un usage interne,
mais Android demande une autorisation explicite.

- Ouvrez le fichier `.apk` → autorisez **l'installation d'applications inconnues**.
- **Sur Samsung** : désactivez d'abord **Auto Blocker**
  (Paramètres → Sécurité et confidentialité → Auto Blocker), sinon l'installation
  est bloquée sans message d'erreur explicite.

Pour publier sur le Play Store, il faudra une clé de signature de production
et le profil `production` d'EAS (génère un `.aab`).

---

## Fonctionnalités livrées

| Domaine | Détail |
|---|---|
| Tâches | Créer, modifier, supprimer, terminer, rouvrir |
| Priorités | Haute (rouge), Moyenne (orange), Basse (bleu) |
| Sous-tâches | Ajout inline, cochage, suppression par appui long |
| Dates | Échéance, raccourcis Aujourd'hui / Demain / 7 jours, calendrier |
| Retards | Les échéances dépassées passent en rouge automatiquement |
| Projets | Chantier, Appartement, Devis, Client, Fournisseur, Autre |
| Clients | Vue regroupée par contact, alimentée par le champ Client |
| Pièces jointes | Photo depuis la galerie ou l'appareil photo |
| Recherche | Titres, notes et contacts |
| Stockage | AsyncStorage local, sauvegarde à chaque modification |
| Dictée vocale | Phrase libre en français, analysée sur le téléphone |
| Pièces jointes | Photo, galerie, PDF ; visionneuse plein écran |
| Paramètres | Priorité et échéance par défaut, écran d'ouverture, qualité photo |
| Sauvegarde | Export JSON partageable, purge des tâches terminées |
| Synchronisation | Échange bidirectionnel avec le module Dolibarr `mv3taches` |
| Adresse chantier | Sur la tâche ou le projet, boutons Carte et Itinéraire |
| Rappels | Notification la veille au soir et le matin de l'échéance |
| Sauvegarde | Export et restauration d'un fichier JSON |
| Identité | Logo MV-3 PRO en icône, écran de démarrage et paramètres |

Quatre onglets : **Aujourd'hui**, **À planifier**, **Projets**, **Tâches**.

---

## Structure du code

```
App.js                        navigation (onglets + pile)
index.js                      point d'entrée Expo
app.json                      nom, package Android, permissions
eas.json                      profils de build EAS
.github/workflows/android.yml compilation automatique de l'APK
src/
  theme.js                    couleurs navy/gold, priorités, types de projet
  dates.js                    formatage et calculs de dates en français
  store.js                    état global, actions, persistance locale
  data/seed.js                jeu de données de démarrage
  components/ui.js            ligne de tâche, puces, stats, FAB, recherche
  screens/
    TaskListScreen.js         Aujourd'hui / À planifier / Toutes les tâches
    ProjectsScreen.js         Projets et Clients-Chantiers
    ProjectTasksScreen.js     tâches d'un projet ou d'un client
    TaskDetailScreen.js       détail, sous-tâches, pièces jointes
    TaskEditScreen.js         création et modification
```

## Personnalisation rapide

- **Couleurs** : `src/theme.js`, tout part de `colors.navy` et `colors.gold`.
- **Données de démarrage** : `src/data/seed.js`. Videz les tableaux pour
  démarrer sur une application vierge.
- **Nom affiché / package** : `app.json`, champs `name` et `android.package`.
- **Icône** : déposez `icon.png` (1024×1024) dans `assets/` et référencez-le
  dans `app.json` sous `expo.icon`.

---

## La dictée vocale

Appuyez sur le bouton doré en bas à droite de l'écran Aujourd'hui, puis
dictez une phrase entière. L'analyse se fait sur le téléphone, sans réseau
et sans service tiers.

Ce qui est reconnu automatiquement :

| Dans la phrase | Résultat |
|---|---|
| demain, après-demain, jeudi, dans 3 jours, le 15 septembre, 25.08 | échéance |
| urgent, important, au plus vite | priorité haute |
| pas urgent, plus tard | priorité basse |
| le nom d'un de vos projets | rattachement au projet |
| chez Dupont, ou un contact déjà connu | client / contact |
| puis, ensuite, et après | découpage en sous-tâches |

Exemple : « poser le carrelage chez AZ Construction jeudi urgent puis faire
les joints » produit une tâche haute priorité, datée de jeudi, rattachée à
AZ Construction, avec une sous-tâche.

La reconnaissance s'appuie sur le moteur Android. Pour qu'elle fonctionne
hors connexion, installez le pack de langue française :
Paramètres Android → Général → Reconnaissance vocale → Français, télécharger.

Si le module natif est absent (cas d'Expo Go), l'écran bascule
automatiquement sur la saisie clavier, l'analyse reste identique.

---

## Adresse de chantier

Deux niveaux, pour éviter de ressaisir vingt fois la même adresse :

- **Sur le projet** : saisie une fois lors de sa création, elle est héritée
  automatiquement par toutes ses tâches.
- **Sur la tâche** : renseignée uniquement quand elle diffère de celle du
  chantier. Elle prend alors le dessus.

La fiche de tâche affiche deux boutons : **Voir sur la carte** et
**Itinéraire**, qui ouvrent l'application de navigation déjà installée sur
le téléphone. Aucune clé d'API, aucun coût, aucune permission de
localisation. Une petite épingle apparaît dans la liste sur les tâches
qui ont une adresse.

L'adresse remonte dans Dolibarr et s'y affiche avec les mêmes deux liens.

---

## Rappels

À activer dans Paramètres → Rappels. Deux notifications par tâche datée :
la veille au soir, réglable entre 16 h et 20 h, et le matin de l'échéance,
réglable entre 5 h et 8 h. Tout est programmé par Android, donc les rappels
fonctionnent sans connexion. Ils sont replanifiés à chaque ouverture de
l'application.

Android 13 et suivants demandent une autorisation explicite pour les
notifications : acceptez-la, sinon rien ne s'affichera.

---

## Sauvegarde

Paramètres → Mes données. **Exporter** produit un fichier JSON que vous
pouvez envoyer par mail ou déposer sur un cloud. **Restaurer** relit ce
fichier et remplace le contenu du téléphone, après confirmation.

À faire avant chaque changement de téléphone, et de temps en temps par
sécurité — c'est le seul filet si vous n'utilisez pas la synchronisation.

---

## Synchronisation Dolibarr

Voir le module `mv3taches` et sa notice d'installation. Une fois le module
activé, reportez l'adresse et le jeton dans Paramètres → Serveur Dolibarr.
