# Guide de déploiement manuel sur Vercel

## Problème actuel
Un verrou Git (`.git/index.lock`) empêche les opérations Git normales.

## Solution 1 : Script automatique (recommandé)

Exécutez le script PowerShell fourni :

```powershell
.\deploy-fix-copie.ps1
```

## Solution 2 : Déploiement manuel

### Étape 1 : Résoudre le verrou Git

1. **Fermez tous les processus Git actifs** :
   - Fermez votre IDE (VS Code, etc.)
   - Fermez tous les terminaux Git
   - Fermez GitHub Desktop si vous l'utilisez

2. **Supprimez le fichier verrou** :
   ```powershell
   Remove-Item -Force .git\index.lock
   ```

3. **Attendez quelques secondes** puis vérifiez :
   ```powershell
   git status
   ```

### Étape 2 : Commit et Push

```powershell
# Ajouter les fichiers modifiés
git add app/page.tsx
git add COPIE_CARTES_COMBINEES.md
git add test-copie-cartes-combinees.html

# Créer le commit
git commit -m "Fix: Amélioration copie cartes combinées - détection Ctrl multi-méthodes"

# Push vers GitHub
git push origin master
```

### Étape 3 : Vérifier le déploiement Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Vérifiez que le déploiement démarre automatiquement
4. Attendez 2-3 minutes pour la fin du build

## Solution 3 : Déploiement via Vercel CLI

Si Git ne fonctionne toujours pas :

```powershell
# Installer Vercel CLI si nécessaire
npm i -g vercel

# Se connecter
vercel login

# Déployer directement
vercel --prod
```

## Solution 4 : Déploiement via l'interface Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur "Deployments"
4. Cliquez sur "Redeploy" sur le dernier déploiement
5. Sélectionnez "Use existing Build Cache" (décoché)
6. Cliquez sur "Redeploy"

**Note** : Cette méthode ne déploiera pas vos dernières modifications locales. Vous devez d'abord résoudre le problème Git.

## Vérification post-déploiement

Une fois déployé, testez la fonctionnalité :

1. Ouvrez votre application sur Vercel
2. Créez une carte combinée (plusieurs cours dans un créneau)
3. Maintenez **Ctrl** et faites glisser la carte
4. Vérifiez que le badge "COPIE" apparaît
5. Déposez dans un nouveau créneau
6. Vérifiez que la copie est créée

## Fichiers modifiés dans ce déploiement

- `app/page.tsx` : Amélioration de la détection Ctrl pour les cartes combinées
- `COPIE_CARTES_COMBINEES.md` : Documentation de la fonctionnalité
- `test-copie-cartes-combinees.html` : Page de test

## Logs de débogage

Si la copie ne fonctionne pas après déploiement, ouvrez la console du navigateur et cherchez :

```
🎯 Carte combinée détectée: combined-...
⌨️ Détection Ctrl - global: ... event: ... final: ...
📋 Mode copie activé pour la carte combinée
✅ Carte combinée copiée avec succès
```

## Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs de build Vercel
2. Vérifiez la console du navigateur
3. Testez en local avec `npm run dev`
4. Comparez avec la version de production
