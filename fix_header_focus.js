// Script pour corriger définitivement le problème de focus du HeaderBanner
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Trouver et extraire le HeaderBanner du composant App
const headerBannerStart = content.indexOf('// --- HEADER BANNER');
const headerBannerEnd = content.indexOf('const handleExportPDF');

if (headerBannerStart !== -1 && headerBannerEnd !== -1) {
    // Extraire le HeaderBanner
    let headerBannerCode = content.substring(headerBannerStart, headerBannerEnd);
    
    // Modifier le HeaderBanner pour qu'il soit mémorisé et en dehors du composant App
    headerBannerCode = headerBannerCode.replace(
        'const HeaderBanner = ({ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config }: any) => {',
        'const HeaderBanner = React.memo(({ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config }: any) => {'
    );
    
    // Ajouter la fermeture du memo
    headerBannerCode = headerBannerCode.replace(/}\s*$/, '});');
    
    // Supprimer le HeaderBanner de sa position actuelle
    content = content.substring(0, headerBannerStart) + content.substring(headerBannerEnd);
    
    // Trouver où insérer le HeaderBanner (après SearchInput mais avant export default)
    const exportDefaultIndex = content.indexOf('export default function App()');
    if (exportDefaultIndex !== -1) {
        content = content.substring(0, exportDefaultIndex) + headerBannerCode + '\n\n' + content.substring(exportDefaultIndex);
    }
}

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ HeaderBanner déplacé en dehors du composant App et mémorisé !');
console.log('🔄 Le champ de recherche ne devrait plus perdre le focus');