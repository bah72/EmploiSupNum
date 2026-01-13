const fs = require('fs');

console.log('🔧 Correction SEULEMENT de l\'erreur runtime...');

let content = fs.readFileSync('app/page.tsx', 'utf8');

// Chercher toutes les fonctions getSessionsInfo et ajouter une vérification de sécurité
const patterns = [
    /const getSessionsInfo = \(\) => \{([\s\S]*?)const similarCourses = assignmentRows\.filter\(r =>/g,
    /const getSessionsInfo = \(subject: string, semester: string\) => \{([\s\S]*?)const subjectData = customSubjects/g
];

patterns.forEach((pattern, index) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, (match, functionBody) => {
            if (index === 0) {
                return `const getSessionsInfo = () => {
        // Vérification de sécurité
        if (!assignmentRows || !Array.isArray(assignmentRows)) {
            return { realized: 0, total: 0 };
        }
        ${functionBody}const similarCourses = (assignmentRows || []).filter(r =>`;
            } else {
                return `const getSessionsInfo = (subject: string, semester: string) => {
        // Vérification de sécurité
        if (!assignmentRows || !Array.isArray(assignmentRows)) {
            return { realized: 0, total: 0 };
        }
        ${functionBody}const subjectData = customSubjects`;
            }
        });
        console.log(`✅ Corrigé getSessionsInfo pattern ${index + 1}`);
    }
});

// Ajouter des vérifications pour tous les .filter() sur assignmentRows
content = content.replace(/assignmentRows\.filter\(/g, '(assignmentRows || []).filter(');
content = content.replace(/assignmentRows\.find\(/g, '(assignmentRows || []).find(');

console.log('✅ Ajouté vérifications de sécurité pour assignmentRows');

// Sauvegarder le fichier
fs.writeFileSync('app/page.tsx', content);
console.log('🎯 Erreur runtime corrigée!');