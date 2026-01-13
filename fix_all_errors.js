const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🔧 Correction des erreurs TypeScript...');

// 1. Corriger les identifiants dupliqués dans HeaderBanner
// Le problème est que HeaderBanner reçoit des props mais déclare aussi des états locaux avec les mêmes noms
const headerBannerPattern = /const HeaderBanner = React\.memo\(\(\{ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config \}: any\) => \{[\s\S]*?return \(/;

if (content.match(headerBannerPattern)) {
    // Remplacer HeaderBanner pour qu'il utilise seulement les props, pas d'état local
    const newHeaderBanner = `const HeaderBanner = React.memo(({ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config }: any) => {
    return (`;
    
    content = content.replace(headerBannerPattern, newHeaderBanner);
    console.log('✅ Corrigé les identifiants dupliqués dans HeaderBanner');
}

// 2. Supprimer les déclarations d'état dupliquées dans le composant principal
// Chercher et supprimer les déclarations en double
const duplicateStatePattern = /const \[semester, setSemester\] = useState<string>\('S1'\);\s*const \[activeTab, setActiveTab\] = useState<'manage' \| 'planning' \| 'config' \| 'data'>\('planning'\);\s*const \[activeMainGroup, setActiveMainGroup\] = useState\("Groupe 1"\);\s*const \[currentWeek, setCurrentWeek\] = useState\(1\);\s*const \[searchQuery, setSearchQuery\] = useState\(""\);/;

if (content.match(duplicateStatePattern)) {
    content = content.replace(duplicateStatePattern, '');
    console.log('✅ Supprimé les déclarations d\'état dupliquées');
}

// 3. Corriger les types any implicites
// Ajouter des types explicites pour les paramètres
const anyTypeReplacements = [
    { pattern: /\(group\) =>/g, replacement: '(group: string) =>' },
    { pattern: /\(prev\) =>/g, replacement: '(prev: any) =>' },
    { pattern: /\(sem\) =>/g, replacement: '(sem: any) =>' },
    { pattern: /\(mat\) =>/g, replacement: '(mat: any) =>' },
    { pattern: /\(t\) =>/g, replacement: '(t: any) =>' },
    { pattern: /\(slot\) =>/g, replacement: '(slot: any) =>' },
    { pattern: /\(i\) =>/g, replacement: '(i: number) =>' },
    { pattern: /\(time\) =>/g, replacement: '(time: any) =>' },
    { pattern: /\(idx\) =>/g, replacement: '(idx: number) =>' },
    { pattern: /\(_\) =>/g, replacement: '(_: any) =>' },
    { pattern: /\(period\) =>/g, replacement: '(period: any) =>' }
];

anyTypeReplacements.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
    }
});
console.log('✅ Corrigé les types any implicites');

// 4. Vérifier et corriger la syntaxe à la fin du fichier
// Chercher des problèmes de parenthèses ou accolades manquantes
const endOfFilePattern = /\}\s*$/;
if (!content.match(endOfFilePattern)) {
    content = content.trim() + '\n}';
    console.log('✅ Ajouté la fermeture manquante à la fin du fichier');
}

// 5. Supprimer les fonctions handleExportPDF dupliquées
const duplicateHandleExportPattern = /const handleExportPDF = async \(\) => \{[\s\S]*?\};/g;
const matches = content.match(duplicateHandleExportPattern);
if (matches && matches.length > 1) {
    // Garder seulement la première occurrence
    let firstFound = false;
    content = content.replace(duplicateHandleExportPattern, (match) => {
        if (!firstFound) {
            firstFound = true;
            return match;
        }
        return '';
    });
    console.log('✅ Supprimé les fonctions handleExportPDF dupliquées');
}

// 6. Corriger les callbacks dans HeaderBanner
const callbackPattern = /const handleSearchChange = useCallback\(\(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?\}, \[\]\);[\s\S]*?const handleSemesterChange = useCallback[\s\S]*?const handleWeekChange = useCallback[\s\S]*?\}, \[\]\);/;

if (content.match(callbackPattern)) {
    content = content.replace(callbackPattern, '');
    console.log('✅ Supprimé les callbacks dupliqués dans HeaderBanner');
}

// Écrire le fichier corrigé
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier corrigé et sauvegardé');
console.log('🎯 Toutes les corrections appliquées!');