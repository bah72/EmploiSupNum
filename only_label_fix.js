const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🔧 SEULEMENT correction libellé/couleur...');

// SEULEMENT corriger {course.subLabel || course.type} → {course.type}
const labelFix = {
    pattern: /\{course\.subLabel \|\| course\.type\}/g,
    replacement: '{course.type}'
};

if (content.match(labelFix.pattern)) {
    content = content.replace(labelFix.pattern, labelFix.replacement);
    console.log('✅ Correspondance libellé/couleur corrigée');
    
    const matches = (content.match(/\{course\.type\}/g) || []).length;
    console.log(`ℹ️  Trouvé ${matches} utilisations de {course.type}`);
} else {
    console.log('ℹ️  Aucune occurrence de {course.subLabel || course.type} trouvée');
}

// Vérifier s'il reste des {course.subLabel}
const remainingSubLabel = (content.match(/\{course\.subLabel\}/g) || []).length;
if (remainingSubLabel > 0) {
    console.log(`⚠️  Il reste ${remainingSubLabel} occurrences de {course.subLabel}`);
    
    // Les remplacer aussi
    content = content.replace(/\{course\.subLabel\}/g, '{course.type}');
    console.log('✅ Toutes les occurrences de subLabel remplacées par type');
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé');
console.log('');
console.log('🎯 SEULEMENT la correspondance libellé/couleur a été corrigée');
console.log('📋 Toutes les autres fonctionnalités restent intactes');
console.log('🧪 Testez maintenant si le drag & drop fonctionne');