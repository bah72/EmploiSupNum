const fs = require('fs');

console.log('🔧 Correction des identifiants dupliqués dans HeaderBanner...');

let content = fs.readFileSync('app/page.tsx', 'utf8');

// Trouver le HeaderBanner et supprimer les déclarations d'état dupliquées
const headerBannerPattern = /const HeaderBanner = React\.memo\(\(\{ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config \}: any\) => \{[\s\S]*?const \[isClient, setIsClient\] = useState\(false\);[\s\S]*?const \[toastMessage, setToastMessage\] = useState<\{msg: string, type: 'error' \| 'success'\} \| null>\(null\);/;

if (content.match(headerBannerPattern)) {
    // Remplacer par une version propre sans les déclarations dupliquées
    content = content.replace(headerBannerPattern, `const HeaderBanner = React.memo(({ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config }: any) => {
    // Stabiliser la fonction de changement de recherche pour éviter les re-rendus
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, [setSearchQuery]);`);
    
    console.log('✅ Supprimé les déclarations d\'état dupliquées dans HeaderBanner');
}

// Sauvegarder le fichier
fs.writeFileSync('app/page.tsx', content);
console.log('🎯 Identifiants dupliqués corrigés!');