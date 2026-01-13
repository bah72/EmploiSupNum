const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Trouver et supprimer la fonction getCombinedCourseInfo qui est mal placée
const functionPattern = /\/\/ Fonction pour combiner les cours dans un même créneau\s*const getCombinedCourseInfo = \(courseIds: string\[\]\) => \{[\s\S]*?\};/;

let functionContent = '';
const match = content.match(functionPattern);
if (match) {
    functionContent = match[0];
    content = content.replace(functionPattern, '');
    console.log('✅ Fonction getCombinedCourseInfo trouvée et supprimée de sa position incorrecte');
}

// 2. Trouver où insérer la fonction (après la déclaration de assignmentRows)
const insertPoint = content.indexOf('const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([]);');

if (insertPoint !== -1) {
    // Trouver la fin de cette ligne
    const lineEnd = content.indexOf('\n', insertPoint);
    
    // Insérer la fonction après cette ligne
    const beforeInsert = content.slice(0, lineEnd + 1);
    const afterInsert = content.slice(lineEnd + 1);
    
    content = beforeInsert + '\n    ' + functionContent + '\n' + afterInsert;
    console.log('✅ Fonction getCombinedCourseInfo déplacée après la déclaration de assignmentRows');
} else {
    console.log('❌ Point d\'insertion non trouvé');
}

// 3. Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec la fonction dans la bonne portée');