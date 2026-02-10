# 🚀 Configuration de Supabase pour l'Authentification

## Étape 1: Créer un projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Cliquez sur "New Project"
4. Choisissez votre organisation
5. Nommez votre projet (ex: "supnum-timetable")
6. Choisissez une région proche (ex: "EU West")
7. Créez un mot de passe pour la base de données
8. Attendez la création du projet (2-3 minutes)

## Étape 2: Récupérer les clés

Une fois le projet créé :

1. Allez dans **Settings** > **API**
2. Copiez **Project URL** (ex: `https://xxxxxxxx.supabase.co`)
3. Copiez **anon public** key (commence par `eyJ...`)

## Étape 3: Configurer les variables d'environnement

Créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
JWT_SECRET=votre-cle-jwt-secrete
```

## Étape 4: Exécuter le schéma SQL

1. Allez dans **SQL Editor** dans Supabase
2. Copiez tout le contenu de `supabase-schema.sql`
3. Collez dans l'éditeur SQL
4. Cliquez sur **Run**

## Étape 5: Vérifier l'installation

Après avoir exécuté le schéma, vérifiez :

1. **Table "users"** créée avec les 3 comptes
2. **Politiques RLS** activées
3. **Utilisateurs insérés** correctement

## Étape 6: Tester

Redémarrez l'application :

```bash
npm run dev
```

Testez les comptes :
- moussa.ba@supnum.mr / 12345678 (admin)
- student@supnum.mr / 12345678 (student)

## 🔍 Dépannage

### Erreur "Invalid Supabase URL"
- Vérifiez que l'URL est correcte (https://...)
- Vérifiez les variables d'environnement

### Erreur "relation 'users' does not exist"
- Exécutez le schéma SQL complètement
- Vérifiez que la table est bien créée

### Erreur "new row violates row-level security policy"
- Les politiques RLS sont activées
- Vérifiez que les politiques sont correctes

## 📞 Support

Si vous avez des problèmes :
1. Vérifiez les logs de la console
2. Vérifiez les erreurs Supabase
3. Contactez-moi pour de l'aide

---

**⚠️ IMPORTANT** : Ne partagez jamais vos clés Supabase !
