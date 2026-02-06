# Configuration de la Sécurité - Supnum Timetable

Ce guide explique comment configurer les deux barrières de sécurité pour restreindre l'accès à votre institut.

## 🛡️ Barrières de Sécurité

### 1. Filtrage par domaine d'email @supnum.mr (Côté Inscription)
- **Objectif** : Empêcher les inconnus d'entrer
- **Implémentation** : Validation côté client et serveur
- **Fichier** : `lib/auth.ts`

### 2. Policies Supabase RLS (Base de données)
- **Objectif** : Protéger les données contre les accès non autorisés
- **Implémentation** : Row Level Security dans Supabase
- **Fichier** : `supabase/policies.sql`

### 3. Gestion des rôles (Admin, Prof, Étudiant)
- **Objectif** : Contrôle d'accès granulaire
- **Implémentation** : Système de permissions
- **Fichier** : `lib/roleManager.ts`

## 🔧 Installation Étape par Étape

### Étape 1: Configuration Supabase

1. **Créer les tables requises** :
```sql
-- Table pour le stockage des données
CREATE TABLE timetable_storage (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les utilisateurs
CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'prof', 'student')),
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les logs d'accès (optionnel)
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT,
  action TEXT,
  user_email TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

2. **Appliquer les politiques RLS** :
```bash
# Exécuter le script de politiques
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < supabase/policies.sql
```

3. **Initialiser les utilisateurs par défaut** :
```bash
# Exécuter le script d'initialisation
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < supabase/seed_users.sql
```

### Étape 2: Configuration des Variables d'Environnement

Créer un fichier `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_supabase
```

### Étape 3: Configuration des Utilisateurs Initiaux

Les utilisateurs par défaut sont automatiquement créés lors de l'exécution du script `seed_users.sql` :

- **moussa.ba@supnum.mr** (Administrateur)
- **cheikh.dhib@supnum.mr** (Professeur)  
- **25064@supnum.mr** (Étudiant)

Ces utilisateurs sont stockés dans Supabase et ne peuvent pas être modifiés ou supprimés via l'interface.

## 🎯 Système de Rôles et Permissions

### Rôle Admin
- **Permissions** : Toutes les permissions
- **Accès** : Modification, gestion utilisateurs, sauvegarde, export
- **Email** : moussa.ba@supnum.mr (mot de passe: moussa.ba)

### Rôle Professeur
- **Permissions** : Voir planning, exporter/imprimer
- **Accès** : Consultation et impression uniquement
- **Email** : cheikh.dhib@supnum.mr (mot de passe: cheikh.dhib)

### Rôle Étudiant
- **Permissions** : Voir planning uniquement
- **Accès** : Consultation du planning
- **Email** : 25064@supnum.mr (mot de passe: 12345678)

**Note importante** : Seuls les administrateurs peuvent modifier les plannings. Les professeurs et étudiants ont un accès en lecture seule avec possibilité d'impression.

## 🔍 Validation des Emails

### Règles de Validation
- **Domaine obligatoire** : @supnum.mr
- **Format** : `^[a-zA-Z0-9._%+-]+@supnum\.mr$`
- **Détection automatique du rôle** :
  - `moussa.ba@supnum.mr` → Admin
  - `cheikh.dhib@supnum.mr` → Prof
  - `25064@supnum.mr` → Étudiant
  - `matricule@supnum.mr` (6+ chiffres) → Étudiant

### Mots de Passe
- **Admin** : `moussa.ba`
- **Prof** : `cheikh.dhib`
- **Étudiant** : `12345678` (mot de passe unique pour tous)

### Exemples
- ✅ `moussa.ba@supnum.mr` → Admin (mot de passe: moussa.ba)
- ✅ `cheikh.dhib@supnum.mr` → Prof (mot de passe: cheikh.dhib)
- ✅ `25064@supnum.mr` → Étudiant (mot de passe: 12345678)
- ✅ `987654321@supnum.mr` → Étudiant (mot de passe: 12345678)
- ❌ `user@gmail.com` → Refusé

## 🛠️ Scripts de Maintenance

### Vérification des Policies
```sql
-- Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('timetable_storage', 'app_users');
```

### Audit des Permissions
```sql
-- Vérifier les permissions actuelles
SELECT 
  policyname,
  tablename,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('timetable_storage', 'app_users');
```

## 🔐 Bonnes Pratiques de Sécurité

### 1. Variables d'Environnement
- Ne jamais exposer les clés Supabase dans le code client
- Utiliser `NEXT_PUBLIC_` uniquement pour les données publiques
- Protéger la clé `SERVICE_ROLE_KEY`

### 2. Monitoring
- Surveiller les logs d'accès dans `access_logs`
- Configurer des alertes pour les tentatives d'accès non autorisées
- Révoquer les comptes inactifs

### 3. Mises à Jour
- Mettre à jour régulièrement les politiques RLS
- Révoquer les permissions des utilisateurs quittant l'institut
- Auditer périodiquement les comptes existants

## 🚨 Dépannage

### Problèmes Communs

**"Email non autorisé"**
- Vérifier le domaine @supnum.mr
- Confirmer la configuration dans `lib/auth.ts`

**"Permission refusée"**
- Vérifier le rôle de l'utilisateur dans `app_users`
- Confirmer les policies RLS dans Supabase

**"RLS non activé"**
- Exécuter `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`
- Vérifier les permissions de l'utilisateur Supabase

### Tests de Validation

```bash
# Test 1: Email invalide
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "test@gmail.com", "password": "test"}'

# Test 2: Email valide
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@supnum.mr", "password": "test"}'
```

## 📋 Checklist de Déploiement

- [ ] Tables Supabase créées
- [ ] Policies RLS appliquées
- [ ] Variables d'environnement configurées
- [ ] Utilisateurs initiaux créés
- [ ] Validation des emails testée
- [ ] Permissions des rôles vérifiées
- [ ] Logs d'accès configurés
- [ ] Monitoring mis en place

## 🔄 Maintenance Continue

### Mensuel
- Réviser les comptes utilisateurs actifs
- Mettre à jour les policies si nécessaire
- Vérifier les logs d'accès suspects

### Trimestriel
- Audit complet des permissions
- Test des politiques RLS
- Mise à jour de la documentation

### Annuel
- Révision complète du système de sécurité
- Formation des utilisateurs sur les bonnes pratiques
- Plan de continuité mis à jour
