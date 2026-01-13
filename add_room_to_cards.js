// Script pour ajouter l'affichage de la salle dans les cartes compactes
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Chercher la section compacte du DraggableCard et ajouter l'affichage de la salle
// Pattern pour trouver les cartes compactes qui affichent les informations en bas

// 1. Ajouter la salle dans les cartes compactes - chercher les sections avec teacher et mainGroup
const compactCardPattern = /(if \(compact\)[\s\S]*?return \([\s\S]*?<div className="flex justify-between items-center">\s*<span[^>]*>{teacher[^}]*}<\/span>\s*<span[^>]*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>\s*<\/div>)/g;

if (content.match(compactCardPattern)) {
    content = content.replace(compactCardPattern, (match) => {
        return match.replace(
            /(<div className="flex justify-between items-center">\s*<span[^>]*>{teacher[^}]*}<\/span>)/,
            '$1\n                    <span className="text-[6px] text-slate-500 font-medium">{course.room}</span>'
        );
    });
    console.log('✅ Pattern 1: Ajouté la salle dans les cartes compactes');
}

// 2. Chercher les sections avec flex justify-between qui n'ont que teacher et mainGroup
const flexPattern = /(<div className="flex justify-between items-center">\s*<span[^>]*text-\[6px\][^>]*>{teacher[^}]*}<\/span>\s*<span[^>]*text-\[6px\][^>]*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>\s*<\/div>)/g;

if (content.match(flexPattern)) {
    content = content.replace(flexPattern, (match) => {
        return match.replace(
            /(<span[^>]*text-\[6px\][^>]*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>)/,
            '<span className="text-[6px] text-slate-500 font-medium">{course.room}</span>\n                    $1'
        );
    });
    console.log('✅ Pattern 2: Ajouté la salle avant le groupe');
}

// 3. Chercher et remplacer les sections qui ont seulement teacher et mainGroup pour ajouter room
const teacherGroupPattern = /(<div className="flex justify-between items-center mt-1">\s*<span[^>]*>{teacher[^}]*}<\/span>\s*<span[^>]*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>\s*<\/div>)/g;

if (content.match(teacherGroupPattern)) {
    content = content.replace(teacherGroupPattern, (match) => {
        return match.replace(
            /(<span[^>]*>{course\.mainGroup\.replace\("Groupe ", "G"\)}<\/span>)/,
            '<span className="text-[6px] text-slate-500 font-medium">{course.room}</span>\n                    $1'
        );
    });
    console.log('✅ Pattern 3: Ajouté la salle dans les cartes avec mt-1');
}

// 4. Ajouter la salle dans toutes les sections qui affichent le mainGroup sans salle
const mainGroupPattern = /(<div className="flex[^>]*>\s*(?!.*{course\.room}).*<span[^>]*>{course\.mainGroup[^}]*}<\/span>\s*<\/div>)/g;

let matches = content.match(mainGroupPattern);
if (matches) {
    content = content.replace(mainGroupPattern, (match) => {
        // Vérifier si la salle n'est pas déjà présente
        if (!match.includes('{course.room}')) {
            return match.replace(
                /(<span[^>]*>{course\.mainGroup[^}]*}<\/span>)/,
                '<span className="text-[6px] text-slate-500 font-medium">{course.room}</span>\n                    $1'
            );
        }
        return match;
    });
    console.log(`✅ Pattern 4: Ajouté la salle dans ${matches.length} sections avec mainGroup`);
}

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Affichage de la salle ajouté dans les cartes !');
console.log('🏢 Les salles sont maintenant visibles dans la sidebar');
console.log('📋 Format: Enseignant | Salle | Groupe');