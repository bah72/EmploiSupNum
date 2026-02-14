# 🚀 Déployer les modifications MAINTENANT

## ⚠️ Problème actuel
Un processus Git est actif et bloque les opérations. Voici comment résoudre :

## ✅ Solution rapide (3 étapes)

### 1. Fermer tous les processus Git
- Fermez **VS Code** ou votre IDE
- Fermez **tous les terminaux**
- Fermez **GitHub Desktop** si vous l'utilisez
- Attendez 5 secondes

### 2. Ouvrir un NOUVEAU terminal PowerShell

Ouvrez un nouveau terminal PowerShell et exécutez :

```powershell
cd P:\supnum-timetable-app\supnum-timetable

# Supprimer le verrou
Remove-Item -Force .git\index.lock

# Ajouter les fichiers
git add app/page.tsx
git add COPIE_CARTES_COMBINEES.md  
git add test-copie-cartes-combinees.html

# Commit
git commit -m "Fix: Copie cartes combinees - detection Ctrl amelioree"

# Push vers GitHub (Vercel deploiera automatiquement)
git push origin master
```

### 3. Vérifier le déploiement

1. Allez sur https://vercel.com/dashboard
2. Vous verrez le déploiement démarrer automatiquement
3. Attendez 2-3 minutes

## 🎯 Alternative : Déploiement direct avec Vercel CLI

Si Git ne fonctionne toujours pas :

```powershell
# Installer Vercel CLI (si pas déjà fait)
npm i -g vercel

# Déployer directement
vercel --prod
```

## 📝 Qu'est-ce qui a été modifié ?

### app/page.tsx
- Amélioration de la détection Ctrl (3 méthodes au lieu d'1)
- Correction du badge "COPIE" pour les cartes combinées
- Meilleurs logs de débogage

### Nouveaux fichiers
- `COPIE_CARTES_COMBINEES.md` : Documentation
- `test-copie-cartes-combinees.html` : Page de test

## ✅ Test après déploiement

1. Ouvrez votre app sur Vercel
2. Créez une carte combinée (plusieurs cours dans un créneau)
3. Maintenez **Ctrl** et glissez la carte
4. Vérifiez que "COPIE" apparaît
5. Déposez dans un nouveau créneau
6. La copie doit être créée ✅

## 🆘 Besoin d'aide ?

Si ça ne fonctionne toujours pas :
1. Redémarrez votre ordinateur
2. Réessayez les commandes ci-dessus
3. Ou utilisez l'interface Vercel pour redéployer manuellement
