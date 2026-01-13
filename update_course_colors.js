const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Trouver la fonction getCourseColor et la remplacer
const oldFunction = /function getCourseColor\(type: CourseType\) \{[\s\S]*?switch \(type\) \{[\s\S]*?default:[\s\S]*?\}\s*\}/;

const newFunction = `function getCourseColor(type: CourseType | string) {
    // Vérifier si c'est un cours combiné (contient des slashes)
    if (typeof type === 'string' && type.includes('/')) {
        return { bg: 'bg-purple-50', border: 'border-purple-300', borderLeft: 'border-l-purple-600', badge: 'bg-purple-600' };
    }
    
    switch (type) {
        case 'CM': return { bg: 'bg-emerald-50', border: 'border-emerald-300', borderLeft: 'border-l-emerald-600', badge: 'bg-emerald-600' };
        case 'TD': return { bg: 'bg-blue-50', border: 'border-blue-300', borderLeft: 'border-l-blue-600', badge: 'bg-blue-600' };
        case 'TP': return { bg: 'bg-orange-50', border: 'border-orange-300', borderLeft: 'border-l-orange-600', badge: 'bg-orange-600' };
        default: return { bg: 'bg-gray-50', border: 'border-gray-300', borderLeft: 'border-l-gray-600', badge: 'bg-gray-600' };
    }
}`;

if (content.match(oldFunction)) {
    content = content.replace(oldFunction, newFunction);
    console.log('✅ Fonction getCourseColor mise à jour pour les cours combinés');
} else {
    console.log('❌ Fonction getCourseColor non trouvée');
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec les couleurs pour cours combinés');