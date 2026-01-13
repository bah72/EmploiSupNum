const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Supprimer les déclarations dupliquées dans HeaderBanner
// Il semble qu'il y ait des déclarations d'état dupliquées

// 1. Trouver le HeaderBanner qui a des paramètres dupliqués
const headerBannerPattern = /const HeaderBanner = React\.memo\(\(\{ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config \}: any\) => \{[\s\S]*?const \[semester, setSemester\] = useState<string>\('S1'\);[\s\S]*?\}\);/;

if (content.match(headerBannerPattern)) {
    console.log('❌ Trouvé HeaderBanner avec déclarations dupliquées');
    
    // Supprimer les déclarations d'état à l'intérieur de HeaderBanner
    content = content.replace(
        /(const HeaderBanner = React\.memo\(\(\{ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config \}: any\) => \{)[\s\S]*?(const \[isClient, setIsClient\] = useState\(false\);[\s\S]*?const handleWeekChange = useCallback\(\(value: number\) => setCurrentWeek\(value\), \[\]\);)/,
        '$1\n    return ('
    );
    
    console.log('✅ Supprimé les déclarations dupliquées dans HeaderBanner');
}

// 2. Vérifier s'il y a des HeaderBanner dupliqués
const headerBannerCount = (content.match(/const HeaderBanner = React\.memo/g) || []).length;
if (headerBannerCount > 1) {
    console.log(`❌ Trouvé ${headerBannerCount} définitions de HeaderBanner`);
    
    // Garder seulement la première définition
    const firstHeaderBanner = content.match(/const HeaderBanner = React\.memo[\s\S]*?\}\);/);
    if (firstHeaderBanner) {
        // Supprimer toutes les autres définitions
        content = content.replace(/const HeaderBanner = React\.memo[\s\S]*?\}\);/g, '');
        // Remettre la première
        const insertPoint = content.indexOf('// --- HEADER BANNER ---');
        if (insertPoint !== -1) {
            content = content.slice(0, insertPoint) + '// --- HEADER BANNER ---\n' + firstHeaderBanner[0] + '\n\n' + content.slice(insertPoint + 23);
        }
    }
}

// 3. Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier corrigé pour les duplications');