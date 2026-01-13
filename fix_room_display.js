// Script pour ajouter l'affichage de la salle dans les cartes de la sidebar
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Chercher et remplacer les sections qui affichent les informations des cartes compactes
// pour inclure la salle

// Pattern 1: Cartes avec mainGroup mais sans salle
const pattern1 = /(<div className="flex justify-between items-center">\s*<span[^>]*text-\[6px\][^>]*text-slate-500[^>]*>[^<]*<\/span>\s*<span[^>]*text-\[6px\][^>]*text-slate-500[^>]*>{course\.mainGroup[^}]*}<\/span>\s*<\/div>)/g;

if (content.match(pattern1)) {
    content = content.replace(pattern1, (match) => {
        // Ajouter l'affichage de la salle avant le mainGroup
        return match.replace(
            /(<span[^>]*text-\[6px\][^>]*text-slate-500[^>]*>{course\.mainGroup[^}]*}<\/span>)/,
            '<span className="text-[6px] text-slate-500 font-medium">{course.room}</span>\n                    $1'
        );
    });
}

// Pattern 2: Chercher les sections où seul le mainGroup est affiché
const pattern2 = /(<div className="flex justify-between items-center">\s*<span[^>]*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>\s*<\/div>)/g;

if (content.match(pattern2)) {
    content = content.replace(pattern2, (match) => {
        return match.replace(
            /(<span[^>]*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>)/,
            '<span className="text-[6px] text-slate-500 font-medium">{course.room}</span>\n                    $1'
        );
    });
}

// Pattern 3: Ajouter la salle dans les cartes compactes qui n'en ont pas
// Chercher les divs qui se terminent par mainGroup et ajouter la salle avant
content = content.replace(
    /(text-\[6px\].*text-slate-500.*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>)/g,
    'text-[6px] text-slate-500 font-medium">{course.room}</span>\n                    <span className="$1'
);

// Nettoyer les doublons potentiels
content = content.replace(
    /(<span className="text-\[6px\] text-slate-500 font-medium">{course\.room}<\/span>\s*){2,}/g,
    '$1'
);

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Affichage de la salle ajouté dans les cartes de la sidebar !');
console.log('🏢 Les salles sont maintenant visibles avant placement');
console.log('📋 Les cartes affichent : Matière | Enseignant | Salle | Groupe');