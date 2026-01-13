const fs = require('fs');

console.log('🔧 Correction de tous les problèmes structurels...');

let content = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Supprimer le HeaderBanner dupliqué qui cause les problèmes
// Chercher et supprimer la première déclaration de HeaderBanner qui a des états dupliqués
const duplicateHeaderPattern = /\/\/ --- HEADER BANNER \(déplacé en dehors du composant App\) ---[\s\S]*?const HeaderBanner = React\.memo\(\(\{ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config \}: any\) => \{[\s\S]*?const \[toastMessage, setToastMessage\] = useState<\{msg: string, type: 'error' \| 'success'\} \| null>\(null\);[\s\S]*?\}\);/;

if (content.match(duplicateHeaderPattern)) {
    content = content.replace(duplicateHeaderPattern, '');
    console.log('✅ Supprimé le HeaderBanner dupliqué');
}

// 2. Supprimer les déclarations handleExportPDF dupliquées
const duplicateExportPattern = /const handleExportPDF = async \(\) => \{[\s\S]*?\};/g;
const exportMatches = content.match(duplicateExportPattern);
if (exportMatches && exportMatches.length > 1) {
    // Garder seulement la première occurrence
    let firstFound = false;
    content = content.replace(duplicateExportPattern, (match) => {
        if (!firstFound) {
            firstFound = true;
            return match;
        }
        return '';
    });
    console.log('✅ Supprimé les handleExportPDF dupliqués');
}

// 3. Corriger les problèmes de syntaxe
// Vérifier s'il y a des problèmes de parenthèses
const lines = content.split('\n');
let openBraces = 0;
let openParens = 0;
let openBrackets = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '(') openParens++;
        if (char === ')') openParens--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
    }
}

console.log(`ℹ️  Vérification syntaxe: braces=${openBraces}, parens=${openParens}, brackets=${openBrackets}`);

// 4. Ajouter la fonction getSessionsInfo manquante si elle n'existe pas
if (!content.includes('const getSessionsInfo = (subject: string, semester: string)')) {
    const getSessionsFunction = `
  // Fonction pour calculer les sessions réalisées/totales
  const getSessionsInfo = (subject: string, semester: string) => {
    // Vérification de sécurité
    if (!assignmentRows || !Array.isArray(assignmentRows)) {
      return { realized: 0, total: 0 };
    }
    
    const subjectData = customSubjects
        .find((sem: any) => sem.semestre === semester)
        ?.matieres.find((mat: any) => mat.code === subject);
    
    if (!subjectData) return { realized: 0, total: 0 };
    
    const credit = subjectData.credit || 0;
    const totalSessions = credit * 8;
    
    // Compter les sessions réalisées (cours placés dans le planning)
    const realizedSessions = Object.values(schedule).filter(courseId => {
        if (!courseId) return false;
        const course = assignmentRows.find(r => r.id === courseId);
        return course && course.subject === subject && course.semester === semester;
    }).length;
    
    return { realized: realizedSessions, total: totalSessions };
  };`;
    
    // Insérer après la déclaration de updateRow
    const insertPoint = content.indexOf('const updateRow = (id: string, field: keyof AssignmentRow, value: any)');
    if (insertPoint !== -1) {
        const beforeInsert = content.substring(0, insertPoint);
        const afterInsert = content.substring(insertPoint);
        content = beforeInsert + getSessionsFunction + '\n\n  ' + afterInsert;
        console.log('✅ Ajouté la fonction getSessionsInfo');
    }
}

// Sauvegarder le fichier
fs.writeFileSync('app/page.tsx', content);
console.log('🎯 Problèmes structurels corrigés!');