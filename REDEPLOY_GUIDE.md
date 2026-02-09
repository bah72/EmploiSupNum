# Guide de Redéploiement sur Vercel

## 🚀 Étapes pour Redéployer

### 1. **Variables d'Environnement Vercel**
Assurez-vous que ces variables sont configurées dans votre dashboard Vercel :

```
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

### 2. **Options de Redéploiement**

#### Option A : Via Vercel CLI (Recommandé)
```bash
# Installer Vercel CLI si non installé
npm install -g vercel

# Se connecter à Vercel
vercel login

# Déployer en production
vercel --prod
```

#### Option B : Via GitHub (Automatique)
1. Poussez les changements sur GitHub
2. Vercel déploiera automatiquement

#### Option C : Via Dashboard Vercel
1. Allez sur https://vercel.com/dashboard
2. Trouvez votre projet "supnum-timetable"
3. Cliquez sur "Redeploy"

### 3. **Configuration Supabase (si non fait)**
Exécutez ce SQL dans votre dashboard Supabase :

```sql
-- Créer la table pour stocker les données de l'emploi du temps
CREATE TABLE IF NOT EXISTS timetable_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    config JSONB,
    custom_rooms JSONB,
    custom_subjects JSONB,
    schedule JSONB,
    assignment_rows JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS et créer les politiques de sécurité
ALTER TABLE timetable_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own timetable data" ON timetable_data
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

### 4. **Activer l'Authentification Supabase**
1. Allez dans `Authentication > Settings` dans Supabase
2. Activez `Email auth`
3. Configurez les URLs de redirection :
   - Site URL : `https://supnum-timetable.vercel.app`
   - Redirect URLs : `https://supnum-timetable.vercel.app/**`

## ✅ Corrections Apportées

### Problèmes Résolus :
- ✅ **Bouton Save fonctionne** sur le cloud
- ✅ **Message "Données chargées depuis l'administrateur"** supprimé
- ✅ **Noms de boutons** plus cryptés (texte clair sans accents)
- ✅ **Persistance de session** après rafraîchissement
- ✅ **Build réussi** sans erreurs

### Nouvelles Fonctionnalités :
- 🔐 Authentification complète avec Supabase
- 💾 Sauvegarde cloud par utilisateur
- 🔄 Session persistante
- 📱 Messages clairs et non cryptés
- 🛡️ Mode dégradé si Supabase indisponible

## 🧪 Tests Après Déploiement

1. **Connexion** : Testez la connexion et la persistance
2. **Sauvegarde** : Vérifiez "Donnees stockees sur le cloud avec succes"
3. **Rafraîchissement** : Confirmez que vous restez connecté
4. **Boutons** : Vérifiez que tous les textes sont lisibles

## 🎯 URL de Déploiement

Votre application sera disponible sur :
**https://supnum-timetable.vercel.app/**

## 🚨 Dépannage

### Si le déploiement échoue :
1. Vérifiez les variables d'environnement Vercel
2. Assurez-vous que le build est successful localement
3. Vérifiez les logs de déploiement Vercel

### Si l'authentification ne fonctionne pas :
1. Confirmez les variables Supabase
2. Vérifiez les URLs de redirection
3. Testez avec un nouveau compte

**L'application est prête pour le redéploiement !** 🚀
