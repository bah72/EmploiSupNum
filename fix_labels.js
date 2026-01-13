// Script pour corriger les labels des cartes
// Ce script remplace tous les {course.subLabel || course.type} par {course.type}

const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Remplacer toutes les occurrences de subLabel par type pour les badges
content = content.replace(
    /\{course\.subLabel \|\| course\.type\}/g, 
    '{course.type}'
);

// Remplacer aussi les occurrences simples de subLabel dans les badges
content = content.replace(
    /\{course\.subLabel\}/g, 
    '{course.type}'
);

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Labels corrigés ! Tous les badges utilisent maintenant course.type');
console.log('🔄 Rechargez votre navigateur pour voir les changements');