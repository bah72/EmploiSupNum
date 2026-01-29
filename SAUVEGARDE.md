# Fonctionnalité de Sauvegarde avec Base de Données

## 🗄️ Sauvegarde en Base de Données

L'application utilise maintenant une base de données SQLite pour la persistance des données :

### Sauvegarde Automatique
- **Cours et assignations** : Sauvegardés automatiquement à chaque modification
- **Planning** : Sauvegardé automatiquement à chaque déplacement de cours
- **Configuration** : Sauvegardée lors des changements de paramètres
- **Salles et matières** : Sauvegardées lors des modifications

### Sauvegarde Manuelle
Deux boutons ont été ajoutés dans la barre d'outils :

1. **Bouton de sauvegarde** (icône 💾 vert) :
   - Force la sauvegarde immédiate de toutes les données en base
   - Affiche un message de confirmation avec le nombre de types de données sauvegardés
   - Sauvegarde aussi en localStorage comme backup

2. **Bouton de chargement** (icône ⬇️ bleu) :
   - Charge les données depuis la base de données
   - Remplace les données actuelles par celles de la base
   - Utile pour synchroniser ou récupérer des données

## 🔄 Fonctionnement Hybride

L'application utilise un système hybride pour maximiser la fiabilité :

### Chargement des Données (par ordre de priorité)
1. **Base de données** : Si l'utilisateur est connecté, charge depuis la DB
2. **localStorage** : Fallback si la DB n'est pas disponible
3. **Données par défaut** : Si aucune sauvegarde n'existe

### Sauvegarde des Données
- **Base de données** : Sauvegarde principale pour la persistance
- **localStorage** : Sauvegarde locale comme backup

## 🗃️ Structure de la Base de Données

### Table `timetable_data`
- `id` : Identifiant unique
- `user_id` : Nom d'utilisateur
- `data_type` : Type de données (assignment_rows, schedule, config, etc.)
- `data_content` : Contenu JSON des données
- `created_at` : Date de création
- `updated_at` : Date de dernière modification

### Types de Données Sauvegardés
1. `assignment_rows` - Liste des cours et leurs assignations
2. `schedule` - Planning avec les créneaux occupés
3. `config` - Configuration générale (dates, nombre de groupes, etc.)
4. `custom_rooms` - Liste des salles personnalisées
5. `custom_subjects` - Matières et enseignants personnalisés

## 🔧 APIs Disponibles

### Sauvegarde
- `POST /api/timetable/save` - Sauvegarder un type de données
- `PUT /api/timetable/save` - Sauvegarder toutes les données

### Chargement
- `GET /api/timetable/load?userId=xxx` - Charger toutes les données
- `GET /api/timetable/load?userId=xxx&dataType=schedule` - Charger un type spécifique

## 🚀 Avantages

### Persistance Réelle
- Les données survivent à la fermeture du navigateur
- Pas de perte de données lors du nettoyage du cache
- Partage possible entre différents navigateurs/appareils

### Sécurité
- Données liées à l'utilisateur connecté
- Isolation des données par utilisateur
- Sauvegarde locale comme backup

### Performance
- Chargement rapide depuis la base locale SQLite
- Sauvegarde automatique en arrière-plan
- Interface réactive avec feedback utilisateur

## 📝 Utilisation

1. **Connexion** : Connectez-vous avec votre compte utilisateur
2. **Travail normal** : Créez et modifiez vos plannings normalement
3. **Sauvegarde auto** : Les données se sauvegardent automatiquement
4. **Sauvegarde manuelle** : Cliquez sur 💾 pour forcer la sauvegarde
5. **Chargement** : Cliquez sur ⬇️ pour recharger depuis la base
6. **Synchronisation** : Les données sont automatiquement chargées à la connexion