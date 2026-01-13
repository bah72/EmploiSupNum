const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🔧 Correction finale du HeaderBanner...');

// 1. Supprimer complètement l'ancien HeaderBanner problématique
const headerBannerStart = content.indexOf('const HeaderBanner = React.memo(');
if (headerBannerStart !== -1) {
    // Trouver la fin du HeaderBanner (chercher la fermeture correspondante)
    let braceCount = 0;
    let pos = headerBannerStart;
    let inString = false;
    let stringChar = '';
    
    while (pos < content.length) {
        const char = content[pos];
        
        if (!inString) {
            if (char === '"' || char === "'" || char === '`') {
                inString = true;
                stringChar = char;
            } else if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    // Chercher la fermeture de React.memo
                    const closingPos = content.indexOf('});', pos);
                    if (closingPos !== -1) {
                        // Supprimer tout le HeaderBanner
                        content = content.slice(0, headerBannerStart) + content.slice(closingPos + 3);
                        console.log('✅ Ancien HeaderBanner supprimé');
                        break;
                    }
                }
            }
        } else {
            if (char === stringChar && content[pos - 1] !== '\\\\') {
                inString = false;
            }
        }
        pos++;
    }
}

// 2. Supprimer les déclarations d'état dupliquées au début du composant App
const appStart = content.indexOf('export default function App()');
if (appStart !== -1) {
    const appOpenBrace = content.indexOf('{', appStart);
    
    // Chercher et supprimer les déclarations d'état en double
    const duplicateStates = [
        /const \[isClient, setIsClient\] = useState\(false\);/,
        /const \[semester, setSemester\] = useState<string>\('S1'\);/,
        /const \[activeTab, setActiveTab\] = useState<'manage' \| 'planning' \| 'config' \| 'data'>\('planning'\);/,
        /const \[activeMainGroup, setActiveMainGroup\] = useState\("Groupe 1"\);/,
        /const \[currentWeek, setCurrentWeek\] = useState\(1\);/,
        /const \[searchQuery, setSearchQuery\] = useState\(""\);/
    ];
    
    duplicateStates.forEach(pattern => {
        const matches = content.match(new RegExp(pattern.source, 'g'));
        if (matches && matches.length > 1) {
            // Supprimer toutes les occurrences sauf la première
            let firstFound = false;
            content = content.replace(new RegExp(pattern.source, 'g'), (match) => {
                if (!firstFound) {
                    firstFound = true;
                    return match;
                }
                return '';
            });
        }
    });
    
    console.log('✅ États dupliqués supprimés');
}

// 3. Ajouter un HeaderBanner simple et propre
const simpleHeaderBanner = `
// HeaderBanner simplifié
const HeaderBanner = ({ semester, setSemester, group, setGroup, week, setWeek, totalWeeks, startStr, endStr, searchQuery, setSearchQuery, handleExportPDF, isExporting, dynamicGroups }: any) => (
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
                        {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((s: string) => <option key={s} value={s}>{s}</option>)}
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
                        {Array.from({ length: totalWeeks }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                    </select>
                </div>
            </div>
            <div className="hidden sm:flex text-[12px] text-slate-600 font-medium">
                Du&nbsp;&nbsp;<span className="text-blue-700 font-bold">{startStr}</span>&nbsp;&nbsp;au&nbsp;&nbsp;<span className="text-blue-700 font-bold">{endStr}</span>
            </div>
            <div className="flex items-center gap-2">
                <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded p-1.5 shadow-sm transition-all" title="Exporter PDF">
                    <FileDown size={14} />
                </button>
            </div>
        </div>
    </div>
);

`;

// Insérer le nouveau HeaderBanner avant le composant App
const appComponentStart = content.indexOf('export default function App()');
if (appComponentStart !== -1) {
    content = content.slice(0, appComponentStart) + simpleHeaderBanner + content.slice(appComponentStart);
    console.log('✅ Nouveau HeaderBanner ajouté');
}

// Écrire le fichier corrigé
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier corrigé et sauvegardé');
console.log('🎯 HeaderBanner reconstruit proprement!');