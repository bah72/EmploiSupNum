const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🔧 Correction spécifique de l\'erreur getSessionsInfo...');

// 1. Trouver et corriger toutes les fonctions getSessionsInfo
// Remplacer les fonctions qui utilisent assignmentRows sans vérification
const getSessionsPattern1 = /const getSessionsInfo = \(\) => \{[\s\S]*?const similarCourses = assignmentRows\.filter\(r =>/g;

if (content.match(getSessionsPattern1)) {
    content = content.replace(getSessionsPattern1, (match) => {
        return match.replace(
            'const similarCourses = assignmentRows.filter(r =>',
            'const similarCourses = (assignmentRows || []).filter(r =>'
        );
    });
    console.log('✅ Corrigé getSessionsInfo avec vérification assignmentRows');
}

// 2. Ajouter une vérification au début de chaque fonction getSessionsInfo
const getSessionsStartPattern = /const getSessionsInfo = \(\) => \{\s*const semesterData/g;

if (content.match(getSessionsStartPattern)) {
    content = content.replace(getSessionsStartPattern, 
        `const getSessionsInfo = () => {
        // Vérification de sécurité
        if (!assignmentRows || !Array.isArray(assignmentRows)) {
            return { realized: 0, total: 0 };
        }
        
        const semesterData`
    );
    console.log('✅ Ajouté vérifications de sécurité dans getSessionsInfo');
}

// 3. Corriger spécifiquement la ligne qui cause l'erreur
const errorLinePattern = /const similarCourses = assignmentRows\.filter\(r =>\s*r\.subject === course\.subject &&\s*r\.type === course\.type &&\s*r\.teacher === course\.teacher &&/g;

if (content.match(errorLinePattern)) {
    content = content.replace(errorLinePattern, 
        `const similarCourses = (assignmentRows || []).filter(r =>
            r.subject === course.subject &&
            r.type === course.type &&
            r.teacher === course.teacher &&`
    );
    console.log('✅ Corrigé la ligne exacte qui causait l\'erreur');
}

// 4. Ajouter une vérification globale pour toutes les utilisations d'assignmentRows
const allAssignmentRowsPattern = /assignmentRows\./g;
const matches = content.match(allAssignmentRowsPattern);
if (matches) {
    console.log(`ℹ️ Trouvé ${matches.length} utilisations d'assignmentRows`);
}

// Remplacer toutes les utilisations non sécurisées restantes
content = content.replace(/(?<![\(\[]assignmentRows \|\| \[\]\.)assignmentRows\./g, '(assignmentRows || []).');

// Écrire le fichier corrigé
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec corrections complètes');
console.log('🎯 Toutes les utilisations d\'assignmentRows sont maintenant sécurisées!');