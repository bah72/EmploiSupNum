# 🔒 Configuration du Système d'Authentification Sécurisé

## 📋 Vue d'ensemble

Ce système d'authentification utilise :
- **Supabase** comme base de données sécurisée
- **bcrypt** pour le hashage des mots de passe (12 rounds)
- **JWT** pour les tokens de session (24h d'expiration)
- **Validation @supnum.mr** obligatoire
- **Politiques RLS** (Row Level Security) sur Supabase

## 🚀 Installation

### 1. Variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase

# JWT Secret (en production, utilisez une clé forte)
JWT_SECRET=votre-cle-jwt-tres-secrete
```

### 2. Initialisation de la base de données

Exécutez le schéma SQL dans votre projet Supabase :

```bash
# Copiez le contenu de supabase-schema.sql et exécutez-le dans l'éditeur SQL Supabase
```

Ou utilisez le script d'initialisation :

```bash
# Configurez vos variables d'environnement
export NEXT_PUBLIC_SUPABASE_URL=votre_url
export NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle

# Lancez l'initialisation
node scripts/init-supabase.js
```

## 🔑 Comptes par défaut

| Email | Mot de passe | Rôle | Accès |
|-------|-------------|-------|--------|
| moussa.ba@supnum.mr | admin12345678 | admin | Complet |
| prof@supnum.mr | prof12345678 | prof | Consultation, impression |
| student@supnum.mr | student12345678 | student | Consultation, impression |

## 🛡️ Mesures de sécurité

### ✅ Implémentées

1. **Hashage bcrypt** (12 rounds) pour tous les mots de passe
2. **Validation @supnum.mr** obligatoire pour tous les comptes
3. **Tokens JWT** avec expiration 24h
4. **Protection contre force brute** (1s délai après échec)
5. **Politiques RLS** sur Supabase
6. **Journalisation** des tentatives de connexion
7. **Comptes désactivables** via `is_active`

### 🔒 Recommandations pour la production

1. **Variables d'environnement fortes** :
   ```bash
   # Générer une clé JWT forte
   openssl rand -base64 32
   
   # Utiliser des clés Supabase fortes
   ```

2. **Configuration Supabase** :
   - Activer l'authentification multi-facteurs
   - Configurer les domaines autorisés
   - Activer les logs d'audit

3. **Monitoring** :
   - Surveiller les tentatives de connexion échouées
   - Alertes sur les activités suspectes
   - Rotation régulière des clés

## 📝 Utilisation

### Connexion

```typescript
// L'authentification est automatiquement sécurisée
const authResult = await secureAuthenticate(username, password);

if (authResult.success) {
  // Token JWT généré et stocké
  // Utilisateur connecté avec les bonnes restrictions
}
```

### Restrictions par rôle

- **admin** : Accès complet à toutes les fonctionnalités
- **prof** : Consultation et impression uniquement
- **student** : Consultation et impression uniquement

### Déconnexion

```typescript
// Nettoyage automatique du localStorage et token
setCurrentUser(null);
localStorage.removeItem('supnum_user');
localStorage.removeItem('supnum_token');
```

## 🔄 Mise à jour des mots de passe

Pour hasher de nouveaux mots de passe :

```bash
node scripts/hash-new-passwords.js
```

## 🚨 Alertes de sécurité

Le système journalise automatiquement :
- Tentatives de connexion échouées
- Comptes désactivés
- Activités suspectes
- Changements de rôle

## 📞 Support

En cas de problème de sécurité :
1. Vérifiez les logs de la console
2. Contactez l'administrateur système
3. Révisez les politiques RLS Supabase

---

**⚠️ IMPORTANT** : Changez les mots de passe par défaut dès la première connexion !
