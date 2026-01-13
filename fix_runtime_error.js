const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🔧 Correction de l\'erreur runtime assignmentRows...');

// 1. Ajouter des vérifications de sécurité pour assignmentRows.filter
const filterPatterns = [
    // Pattern pour les fonctions qui utilisent assignmentRows.filter
    {
        pattern: /const similarCourses = assignmentRows\.filter\(r =>/g,
        replacement: 'const similarCourses = (assignmentRows || []).filter(r =>'
    },
    {
        pattern: /const groupCourses = assignmentRows\.filter\(r =>/g,
        replacement: 'const groupCourses = (assignmentRows || []).filter(r =>'
    },
    {
        pattern: /assignmentRows\.filter\(r =>\s*r\.mainGroup === activeMainGroup/g,
        replacement: '(assignmentRows || []).filter(r => r.mainGroup === activeMainGroup'
    }
];

filterPatterns.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        console.log(`✅ Ajouté vérification de sécurité pour ${pattern.source}`);
    }
});

// 2. Ajouter une vérification spécifique pour la fonction getSessionsInfo
// Chercher la fonction qui cause l'erreur et ajouter une vérification
const getSessionsPattern = /const getSessionsInfo = \(subject: string, semester: string\) => \{[\s\S]*?const similarCourses = assignmentRows\.filter/;

if (content.match(getSessionsPattern)) {
    content = content.replace(
        /const getSessionsInfo = \(subject: string, semester: string\) => \{/,
        `const getSessionsInfo = (subject: string, semester: string) => {
        // Vérification de sécurité
        if (!assignmentRows || !Array.isArray(assignmentRows)) {
            return { realized: 0, total: 0 };
        }`
    );
    console.log('✅ Ajouté vérification de sécurité dans getSessionsInfo');
}

// 3. Ajouter des vérifications pour toutes les autres utilisations d'assignmentRows
const otherPatterns = [
    {
        pattern: /assignmentRows\.find\(r => r\.id === courseIds\[0\]\)/g,
        replacement: '(assignmentRows || []).find(r => r.id === courseIds[0])'
    },
    {
        pattern: /assignmentRows\.find\(r => r\.id === id\)/g,
        replacement: '(assignmentRows || []).find(r => r.id === id)'
    },
    {
        pattern: /assignmentRows\.find\(c => c\.id === id\)/g,
        replacement: '(assignmentRows || []).find(c => c.id === id)'
    },
    {
        pattern: /assignmentRows\.find\(r => r\.id === courseId\)/g,
        replacement: '(assignmentRows || []).find(r => r.id === courseId)'
    }
];

otherPatterns.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        console.log(`✅ Ajouté vérification de sécurité pour find()`);
    }
});

// 4. Ajouter une vérification globale au début de getCombinedCourseInfo
const getCombinedPattern = /const getCombinedCourseInfo = \(courseIds: string\[\]\) => \{[\s\S]*?if \(!courseIds \|\| courseIds\.length === 0\) return null;/;

if (content.match(getCombinedPattern)) {
    content = content.replace(
        /if \(!courseIds \|\| courseIds\.length === 0\) return null;/,
        `if (!courseIds || courseIds.length === 0) return null;
        if (!assignmentRows || !Array.isArray(assignmentRows)) return null;`
    );
    console.log('✅ Ajouté vérification de sécurité dans getCombinedCourseInfo');
}

// Écrire le fichier corrigé
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec corrections de sécurité');
console.log('🎯 Erreur runtime corrigée!');