const fs = require('fs');

console.log('🔧 Correction SEULEMENT du débordement des badges...');

let content = fs.readFileSync('app/page.tsx', 'utf8');

// Chercher et corriger les badges qui débordent
// Remplacer les classes de badge pour qu'ils restent dans la carte
const badgePatterns = [
    {
        // Badge principal dans les cartes
        pattern: /className="absolute top-1 right-1 bg-[\w-]+ text-white px-1\.5 py-0\.5 rounded text-\[10px\] font-bold shadow-sm"/g,
        replacement: 'className="absolute top-1 right-1 bg-blue-600 text-white px-1 py-0.5 rounded text-[8px] font-bold shadow-sm max-w-[40px] overflow-hidden"'
    },
    {
        // Badge compact
        pattern: /className="absolute top-0\.5 right-0\.5 bg-[\w-]+ text-white px-1 py-0\.5 rounded text-\[8px\] font-bold shadow-sm"/g,
        replacement: 'className="absolute top-0.5 right-0.5 bg-blue-600 text-white px-1 py-0.5 rounded text-[7px] font-bold shadow-sm max-w-[35px] overflow-hidden"'
    }
];

badgePatterns.forEach((pattern, index) => {
    if (content.match(pattern.pattern)) {
        content = content.replace(pattern.pattern, pattern.replacement);
        console.log(`✅ Corrigé badge pattern ${index + 1}`);
    }
});

// Forcer les labels à être ultra-compacts
const labelReplacements = [
    { from: '"CM"', to: '"C"' },
    { from: '"TD"', to: '"T"' },
    { from: '"TP"', to: '"P"' },
    { from: '"TD/TP"', to: '"T/P"' },
    { from: '"CM/TD"', to: '"C/T"' },
    { from: '"CM/TP"', to: '"C/P"' }
];

labelReplacements.forEach(replacement => {
    const regex = new RegExp(`\\{course\\.type\\}.*${replacement.from}`, 'g');
    if (content.includes(replacement.from)) {
        content = content.replace(new RegExp(replacement.from, 'g'), replacement.to);
        console.log(`✅ Remplacé ${replacement.from} par ${replacement.to}`);
    }
});

// Sauvegarder le fichier
fs.writeFileSync('app/page.tsx', content);
console.log('🎯 Débordement des badges corrigé!');