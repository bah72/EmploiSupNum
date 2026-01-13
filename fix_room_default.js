// Script pour corriger la sélection des salles par défaut
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Supprimer l'option "Salle..." vide
content = content.replace(
    /<option value="">Salle\.\.\.<\/option>/g,
    ''
);

// Modifier la logique de création des cours pour avoir "101" par défaut au lieu de salle vide
// Dans loadFullDataset
content = content.replace(
    /room: defaultRoom,/g,
    'room: defaultRoom || "101",'
);

// Dans la création initiale des cours
content = content.replace(
    /room: '101',/g,
    'room: "101",'
);

// Modifier aussi les nouvelles lignes de cours pour avoir "101" par défaut
content = content.replace(
    /room: '101',\s*semester: semesterCode/g,
    'room: "101",\n        semester: semesterCode'
);

// S'assurer que les cours existants avec une salle vide ont "101" par défaut
content = content.replace(
    /value={row\.room \|\| ""}/g,
    'value={row.room || "101"}'
);

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Salle par défaut corrigée !');
console.log('🏢 "101" est maintenant la salle par défaut');
console.log('❌ Option "Salle..." supprimée');