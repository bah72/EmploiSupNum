const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🔧 Correction des conflits HeaderBanner...');

// 1. Trouver et corriger le HeaderBanner qui cause les conflits
// Le problème est que HeaderBanner reçoit des props mais a aussi des déclarations d'état internes
const headerBannerStart = content.indexOf('const HeaderBanner = React.memo(');
const headerBannerEnd = content.indexOf('});', headerBannerStart) + 3;

if (headerBannerStart !== -1 && headerBannerEnd !== -1) {
    const headerBannerContent = content.slice(headerBannerStart, headerBannerEnd);
    
    // Nouveau HeaderBanner simplifié qui utilise seulement les props
    const newHeaderBanner = `const HeaderBanner = React.memo(({ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups, config }: any) => {
    return (
        <div className="flex flex-col bg-white shrink-0 shadow-sm z-40" style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>
            <div className="flex items-center justify-between w-full h-14 md:h-16 bg-green-700 px-3 md:px-6 overflow-hidden">
                <div className="shrink-0 pr-2 md:pr-4 h-full flex items-center">
                    <img src="/rim.png" alt="RIM" className="h-8 md:h-10 w-auto object-contain" />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                    <h1 className="text-base md:text-lg font-semibold text-white leading-tight tracking-wide">Institut Supérieur du Numérique</h1>
                    <h2 className="text-[11px] md:text-xs font-medium text-green-100 uppercase tracking-widest">Emploi du temps</h2>
                </div>
                <div className="shrink-0 pl-2 md:pl-4 h-full flex items-center">
                    <img src="/supnum.png" alt="SupNum" className="h-8 md:h-10 w-auto object-contain" />
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 gap-2 w-full">
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white px-2 py-1 rounded border border-blue-200 shadow-sm">
                        <span className="mr-1 text-black-800 font-bold text-[10px]">Semestre:</span>
                        <select value={semester} onChange={(e) => setSemester(e.target.value)} className="text-blue-700 font-bold bg-transparent outline-none cursor-pointer text-xs">
                            {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center bg-white px-2 py-1 rounded border border-blue-200 shadow-sm">
                        <span className="mr-1 text-black-800 font-bold text-[10px]">Groupe:</span>
                        <select value={group} onChange={(e) => setGroup(e.target.value)} className="text-blue-700 font-bold bg-transparent outline-none cursor-pointer text-xs">
                            {dynamicGroups.map((g: string) => <option key={g} value={g}>{g.replace("Groupe ","G")}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center bg-white px-2 py-1 rounded border border-blue-200 shadow-sm">
                        <span className="mr-1 text-black-800 font-bold text-[10px]">Semaine:</span>
                        <select value={week} onChange={(e) => setWeek(parseInt(e.target.value))} className="text-blue-700 font-bold bg-transparent outline-none cursor-pointer text-xs">
                            {Array.from({ length: totalWeeks }, (_, i) => {
                                const weekNum = i + 1;
                                return (
                                    <option key={weekNum} value={weekNum}>
                                         {weekNum}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
                <div className="hidden sm:flex text-[12px] text-slate-600 font-medium">
                    Du&nbsp;&nbsp;<span className="text-blue-700 font-bold">{startStr}</span>&nbsp;&nbsp;au&nbsp;&nbsp;<span className="text-blue-700 font-bold">{endStr}</span>
                </div>
                <div className="flex items-center gap-2">
                    <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded p-1.5 shadow-sm transition-all" title="Exporter PDF"><FileDown size={14} /></button>
                </div>
            </div>
        </div>
    );
})`;

    // Remplacer l'ancien HeaderBanner
    content = content.slice(0, headerBannerStart) + newHeaderBanner + content.slice(headerBannerEnd);
    console.log('✅ HeaderBanner corrigé');
}

// 2. Supprimer les déclarations handleExportPDF dupliquées (garder seulement celle dans le composant principal)
const handleExportPattern = /const handleExportPDF = async \(\) => \{[\s\S]*?\};/g;
const exportMatches = content.match(handleExportPattern);
if (exportMatches && exportMatches.length > 1) {
    // Trouver la position de la première occurrence (dans le composant principal)
    const firstOccurrence = content.indexOf(exportMatches[0]);
    const appComponentStart = content.indexOf('export default function App()');
    
    // Si la première occurrence est avant le composant App, la supprimer
    if (firstOccurrence < appComponentStart) {
        content = content.replace(exportMatches[0], '');
        console.log('✅ Supprimé handleExportPDF dupliqué');
    }
}

// 3. Corriger les variables d'état dans le composant principal
// S'assurer qu'il n'y a qu'une seule déclaration de chaque état
const stateDeclarations = [
    'semester', 'setSemester',
    'activeTab', 'setActiveTab', 
    'activeMainGroup', 'setActiveMainGroup',
    'currentWeek', 'setCurrentWeek',
    'searchQuery', 'setSearchQuery',
    'isExporting', 'setIsExporting',
    'config', 'setConfig',
    'dynamicGroups'
];

// Chercher et supprimer les déclarations d'état en double dans le composant principal
const appStart = content.indexOf('export default function App()');
if (appStart !== -1) {
    const appContent = content.slice(appStart);
    
    // Ajouter les déclarations d'état manquantes au début du composant App
    const stateDeclarationsCode = `
    const [isClient, setIsClient] = useState(false);
    const [semester, setSemester] = useState<string>('S1');
    const [activeTab, setActiveTab] = useState<'manage' | 'planning' | 'config' | 'data'>('planning'); 
    const [activeMainGroup, setActiveMainGroup] = useState("Groupe 1");
    const [currentWeek, setCurrentWeek] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [toastMessage, setToastMessage] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
    const [manageFilterCode, setManageFilterCode] = useState<string>("");
    
    // États pour la gestion des données
    const [dataSubTab, setDataSubTab] = useState<'rooms' | 'subjects' | 'progress'>('subjects');
    const [dataFilterSemester, setDataFilterSemester] = useState<string>("");
    const [dataFilterSubject, setDataFilterSubject] = useState<string>("");
    const [showDataMenu, setShowDataMenu] = useState(false);
`;

    // Insérer après la déclaration de la fonction App
    const insertPoint = content.indexOf('{', appStart) + 1;
    content = content.slice(0, insertPoint) + stateDeclarationsCode + content.slice(insertPoint);
    console.log('✅ États du composant App organisés');
}

// Écrire le fichier corrigé
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier corrigé et sauvegardé');
console.log('🎯 Conflits HeaderBanner résolus!');