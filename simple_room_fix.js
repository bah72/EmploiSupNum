// Script simple pour ajouter l'affichage de la salle
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Chercher et remplacer les patterns simples pour ajouter la salle
// Pattern 1: Ajouter la salle dans les divs qui ont teacher et mainGroup
let modified = false;

// Chercher les sections avec teacher et mainGroup et ajouter room
const patterns = [
    // Pattern pour les cartes compactes
    {
        search: /(<div className="text-\[8px\] font-normal text-slate-700[^>]*>\s*{teacher[^}]*}\s*<\/div>\s*<div className="flex justify-between items-center[^>]*>\s*<span[^>]*text-\[6px\][^>]*text-slate-500[^>]*font-medium[^>]*>[^<]*<\/span>\s*<span[^>]*text-\[6px\][^>]*text-slate-500[^>]*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>)/g,
        replace: '$1\n                    <span className="text-[6px] text-slate-500 font-medium">{course.room}</span>'
    },
    // Pattern pour ajouter la salle avant le groupe
    {
        search: /(<span[^>]*text-\[6px\][^>]*text-slate-500[^>]*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>)/g,
        replace: '<span className="text-[6px] text-slate-500 font-medium">{course.room}</span>\n                    $1'
    }
];

patterns.forEach((pattern, index) => {
    if (content.match(pattern.search)) {
        content = content.replace(pattern.search, pattern.replace);
        console.log(`✅ Pattern ${index + 1} appliqué`);
        modified = true;
    }
});

// Si aucun pattern n'a fonctionné, essayer une approche plus générale
if (!modified) {
    // Chercher toutes les occurrences de mainGroup et ajouter room avant si pas déjà présent
    const mainGroupMatches = content.match(/{course\.mainGroup\.replace\("Groupe ", "G"\)}/g);
    if (mainGroupMatches) {
        console.log(`Trouvé ${mainGroupMatches.length} occurrences de mainGroup`);
        
        // Ajouter la salle avant chaque mainGroup qui n'a pas déjà de room
        content = content.replace(
            /(<span[^>]*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>)/g,
            (match, p1) => {
                // Vérifier si room n'est pas déjà présent dans les 200 caractères précédents
                const index = content.indexOf(match);
                const before = content.substring(Math.max(0, index - 200), index);
                if (!before.includes('{course.room}')) {
                    return `<span className="text-[6px] text-slate-500 font-medium">{course.room}</span>\n                    ${p1}`;
                }
                return match;
            }
        );
        modified = true;
        console.log('✅ Ajouté la salle avant les groupes');
    }
}

if (modified) {
    // Sauvegarder le fichier corrigé
    fs.writeFileSync('app/page.tsx', content);
    console.log('✅ Fichier modifié avec succès !');
} else {
    console.log('ℹ️  Aucune modification nécessaire ou patterns non trouvés');
}

console.log('🏢 Les salles devraient maintenant être visibles dans les cartes de la sidebar');