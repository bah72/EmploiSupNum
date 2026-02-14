# Guide : Copier les cartes combinées

## Problème résolu
Les cartes combinées (plusieurs matières dans un même créneau) peuvent maintenant être copiées correctement.

## Comment copier une carte combinée

### Méthode 1 : Depuis le planning
1. Maintenez la touche **Ctrl** (ou **Cmd** sur Mac) enfoncée
2. Cliquez et faites glisser la carte combinée depuis le planning
3. Déposez-la dans un nouveau créneau
4. Une copie complète de tous les cours de la carte sera créée

### Méthode 2 : Depuis la sidebar (si disponible)
1. Maintenez la touche **Ctrl** (ou **Cmd** sur Mac) enfoncée
2. Cliquez et faites glisser la carte depuis la sidebar
3. Déposez-la dans le planning
4. Une copie sera créée

## Indicateur visuel
Quand vous maintenez Ctrl pendant le glissement, un badge bleu **"COPIE"** apparaît sur la carte pour confirmer que vous êtes en mode copie.

## Détails techniques

### Améliorations apportées
1. **Détection Ctrl améliorée** : Utilise plusieurs méthodes de détection pour plus de fiabilité
   - Variable globale `isCtrlGloballyPressed`
   - Événement `activatorEvent.ctrlKey`
   - Événement `activatorEvent.metaKey` (pour Mac)

2. **Copie complète** : Tous les cours de la carte combinée sont copiés avec de nouveaux IDs uniques

3. **Placement automatique** : Les copies sont automatiquement placées dans le créneau cible

### Code modifié
- `app/page.tsx` : Fonction `handleDragEnd` améliorée pour les cartes combinées
- Détection Ctrl unifiée pour les cartes simples et combinées
- Badge "COPIE" utilise la variable globale pour une meilleure synchronisation

## Notes importantes
- Les cartes combinées dans le planning sont toujours draggables
- Vous pouvez copier une carte combinée autant de fois que nécessaire
- Chaque copie crée de nouveaux cours indépendants avec leurs propres IDs
