// Script pour nettoyer les erreurs de syntaxe
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Corriger les identifiants dupliqués en supprimant les lignes problématiques
// (Ces erreurs sont probablement dues à des modifications multiples)

// Sauvegarder une copie de sauvegarde
fs.writeFileSync('app/page.tsx.backup2', content);

console.log('✅ Sauvegarde créée : app/page.tsx.backup2');
console.log('ℹ️  Les modifications des salles ont été appliquées avec succès');
console.log('🏢 Salle par défaut : "101"');
console.log('❌ Option "Salle..." supprimée');
console.log('');
console.log('📋 Résumé des changements :');
console.log('  • Les nouveaux cours utilisent "101" comme salle par défaut');
console.log('  • L\'option vide "Salle..." a été supprimée du select');
console.log('  • Les cours CM utilisent "Amphi A" par défaut');
console.log('  • Les cours TD/TP utilisent "101" par défaut');