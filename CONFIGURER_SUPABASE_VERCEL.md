# 🔧 Configurer Supabase sur Vercel

## ❌ Problème actuel

L'onglet "Utilisateurs" affiche une erreur 500 car les variables d'environnement Supabase ne sont pas configurées sur Vercel.

## ✅ Solution : Ajouter les variables d'environnement sur Vercel

### Étape 1 : Récupérer vos credentials Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **Settings** (⚙️) dans la sidebar
4. Cliquez sur **API**
5. Notez ces deux valeurs :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (commence par `eyJ...`)

### Étape 2 : Configurer sur Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet **supnum-timetable**
3. Cliquez sur **Settings** en haut
4. Dans la sidebar, cliquez sur **Environment Variables**
5. Ajoutez ces 2 variables :

#### Variable 1 : NEXT_PUBLIC_SUPABASE_URL
- **Name** : `NEXT_PUBLIC_SUPABASE_URL`
- **Value** : Votre Project URL (ex: `https://xxxxx.supabase.co`)
- **Environment** : Cochez **Production**, **Preview**, et **Development**
- Cliquez sur **Save**

#### Variable 2 : NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Name** : `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value** : Votre anon public key (commence par `eyJ...`)
- **Environment** : Cochez **Production**, **Preview**, et **Development**
- Cliquez sur **Save**

### Étape 3 : Redéployer

Après avoir ajouté les variables, vous devez redéployer :

**Option A : Depuis le dashboard Vercel**
1. Allez dans l'onglet **Deployments**
2. Cliquez sur les 3 points (...) du dernier déploiement
3. Cliquez sur **Redeploy**
4. Cliquez sur **Redeploy** pour confirmer

**Option B : Depuis votre terminal**
```powershell
vercel --prod --yes
```

### Étape 4 : Vérifier

1. Attendez que le déploiement se termine (2-3 minutes)
2. Ouvrez https://supnum-timetable.vercel.app
3. Connectez-vous en tant qu'admin
4. Allez dans l'onglet **Utilisateurs**
5. Vous devriez voir la liste de vos utilisateurs ✅

## 🔍 Diagnostic

Pour vérifier si les variables sont bien configurées, ouvrez :
https://supnum-timetable.vercel.app/api/users/debug

Vous devriez voir :
```json
{
  "hasUrl": true,
  "hasKey": true,
  "urlPreview": "https://xxxxx.supabase.co...",
  "keyPreview": "eyJ..."
}
```

Si `hasUrl` ou `hasKey` est `false`, les variables ne sont pas configurées.

## ⚠️ Important

- Les variables `NEXT_PUBLIC_*` sont exposées côté client
- Ne mettez JAMAIS la `SERVICE_ROLE_KEY` dans une variable `NEXT_PUBLIC_*`
- La `anon public` key est sécurisée par les Row Level Security (RLS) de Supabase

## 🆘 Problèmes courants

### Erreur : "relation users does not exist"
➡️ La table `users` n'existe pas dans Supabase. Exécutez le script SQL fourni.

### Erreur : "permission denied"
➡️ Les politiques RLS bloquent l'accès. Désactivez RLS sur la table `users` ou configurez les politiques.

### Les variables ne sont pas prises en compte
➡️ Vous devez redéployer après avoir ajouté les variables.

## 📝 Variables locales (.env.local)

Pour tester en local, créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Puis lancez :
```powershell
npm run dev
```
