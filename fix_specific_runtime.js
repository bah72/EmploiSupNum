const fs = require('fs');

console.log('🔧 Correction spécifique de l\'erreur runtime getSessionsInfo...');

let content = fs.readFileSync('app/page.tsx', 'utf8');

// Trouver et corriger la fonction getSessionsInfo qui cause l'erreur
// L'erreur est: Cannot read properties of undefined (reading 'filter') à la ligne 2363
// Cela signifie que assignmentRows est undefined dans cette fonction

// Chercher la fonction getSessionsInfo et ajouter une vérification
const getSessionsPattern = /const getSessionsInfo = \(subject: string, semester: string\) => \{([\s\S]*?)return \{ realized: realizedSessions, total: totalSessions \};\s*\};/;

if (content.match(getSessionsPattern)) {
    content = content.replace(getSessionsPattern, (match, functionBody) => {
        // Ajouter une vérification au début de la fonction
        return `const getSessionsInfo = (subject: string, semester: string) => {
        // Vérification de sécurité
        if (!assignmentRows || !Array.isArray(assignmentRows)) {
            return { realized: 0, total: 0 };
        }
        ${functionBody}return { realized: realizedSessions, total: totalSessions };
    };`;
    });
    console.log('✅ Corrigé getSessionsInfo avec vérification assignmentRows');
}

// Sauvegarder le fichier
fs.writeFileSync('app/page.tsx', content);
console.log('🎯 Erreur runtime corrigée!');