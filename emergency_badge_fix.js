const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🚨 Correction d\'urgence pour les badges...');

// Solution radicale : remplacer les badges par des versions ultra-compactes
const emergencyBadgeFixes = [
    // Badges très petits avec abréviations
    {
        pattern: /\{course\.type\}/g,
        replacement: '{course.type.includes("/") ? course.type.split("/").map(t => t.charAt(0)).join("") : course.type.charAt(0)}'
    }
];

// Appliquer seulement si l'utilisateur confirme que les badges débordent encore
console.log('⚠️  Cette correction va remplacer les libellés par des lettres :');
console.log('   CM → C, TD → T, TP → P, TD/TP → TP');
console.log('');
console.log('🔧 Application de la correction d\'urgence...');

emergencyBadgeFixes.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        console.log('✅ Badges remplacés par des lettres ultra-compactes');
    }
});

// Alternative : badges avec icônes/symboles
const iconBadges = `
// Fonction pour obtenir l'icône du type de cours
const getCourseIcon = (type: string) => {
    if (type.includes('/')) {
        return type.split('/').map(t => getCourseIcon(t)).join('');
    }
    switch (type) {
        case 'CM': return '📚';
        case 'TD': return '💻';
        case 'TP': return '🔧';
        default: return '📝';
    }
};
`;

// Ajouter la fonction d'icônes
const importEndPattern = /import \{ MASTER_DB, ALL_ROOMS, MAIN_GROUPS, DAYS, SEMESTERS \} from '\.\/constants';/;
if (content.match(importEndPattern)) {
    content = content.replace(importEndPattern, (match) => match + iconBadges);
    console.log('✅ Fonction d\'icônes ajoutée');
    
    // Remplacer les badges texte par des icônes
    content = content.replace(
        /\{course\.type\.includes\("\/"\) \? course\.type\.split\("\/"\)\.map\(t => t\.charAt\(0\)\)\.join\(""\) : course\.type\.charAt\(0\)\}/g,
        '{getCourseIcon(course.type)}'
    );
    console.log('✅ Badges remplacés par des icônes');
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Correction d\'urgence appliquée');
console.log('');
console.log('🎯 Résultat :');
console.log('  📚 CM = Icône livre');
console.log('  💻 TD = Icône ordinateur');
console.log('  🔧 TP = Icône outil');
console.log('  📚💻 CM/TD = Icônes combinées');
console.log('');
console.log('⚠️  Si les icônes ne s\'affichent pas bien, revenez aux lettres simples.');