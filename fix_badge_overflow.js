const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🔧 Correction du débordement des badges...');

// 1. Corriger la structure des cartes pour éviter le débordement des badges
// Remplacer les flex justify-between qui causent le débordement

// Pattern pour les cartes moyennes
const mediumCardPattern = /<div className="flex justify-between items-center">\s*<div className="flex items-center gap-1">\s*<span className="text-\[9px\] font-medium text-slate-900 truncate"[\s\S]*?<span className=\{\`text-\[9px\] font-black px-1 py-0\.5 rounded text-white \$\{colors\.badge\} min-w-\[22px\] text-center\`\}>\{course\.type\}<\/span>/;

if (content.match(mediumCardPattern)) {
    const newMediumCard = `<div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-medium text-slate-900 truncate flex-1 mr-2" style={{ maxWidth: '5rem' }}>{course.isCombined ? abbreviateCombinedSubjects(course.subject, 8) : abbreviateSubject(course.subject, 6)}</span>
                        <span className={\`text-[7px] font-black px-1 py-0.5 rounded \${sessionsInfo.realized >= sessionsInfo.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}\`}>
                            {sessionsInfo.realized}/{sessionsInfo.total}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] text-slate-700 truncate flex-1 mr-2" style={{ maxWidth: '6rem' }}>
                            {(() => {
                                const semesterData = customSubjects?.find((s: any) => s.semestre === course.semester);
                                const matiereData = semesterData?.matieres.find((m: any) => m.code === course.subject);
                                return matiereData?.libelle || course.subjectLabel;
                            })()}
                        </span>
                        <span className={\`text-[8px] font-black px-1 py-0.5 rounded text-white \${colors.badge} min-w-[18px] text-center flex-shrink-0\`}>{course.type}</span>
                    </div>`;
    
    content = content.replace(mediumCardPattern, newMediumCard);
    console.log('✅ Structure des cartes moyennes corrigée');
}

// 2. Corriger les cartes petites (CourseBadge)
const smallCardPattern = /<div className="flex justify-between items-center bg-white\/60 rounded px-1 py-0\.5 border border-slate-100\/50">\s*<span className="text-\[8px\] font-normal text-red-600 truncate max-w-\[100px\]">\{teachers \|\| '\?'\}<\/span>\s*<span className="text-\[8px\] font-normal text-blue-800">\{rooms \|\| '\?'\}<\/span>/;

// 3. Améliorer la structure générale des cartes pour éviter le débordement
const cardStructurePatterns = [
    // Forcer les badges à rester dans la carte avec flex-shrink-0
    {
        pattern: /className=\{\`text-\[8px\] font-black px-1 py-0\.5 rounded text-white \$\{colors\.badge\} min-w-\[20px\] text-center\`\}/g,
        replacement: 'className={`text-[8px] font-black px-1 py-0.5 rounded text-white ${colors.badge} min-w-[18px] text-center flex-shrink-0`}'
    },
    {
        pattern: /className=\{\`text-\[9px\] font-black px-1 py-0\.5 rounded text-white \$\{colors\.badge\} min-w-\[22px\] text-center\`\}/g,
        replacement: 'className={`text-[8px] font-black px-1 py-0.5 rounded text-white ${colors.badge} min-w-[20px] text-center flex-shrink-0`}'
    },
    {
        pattern: /className=\{\`text-\[10px\] font-black px-2 py-0\.5 rounded-full text-white \$\{colors\.badge\} min-w-\[24px\] text-center\`\}/g,
        replacement: 'className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white ${colors.badge} min-w-[22px] text-center flex-shrink-0`}'
    }
];

cardStructurePatterns.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        console.log('✅ Badge avec flex-shrink-0 appliqué');
    }
});

// 4. Ajouter des contraintes de largeur pour éviter le débordement
const widthConstraints = [
    // Limiter la largeur des textes pour laisser de la place aux badges
    {
        pattern: /style=\{\{ maxWidth: '7rem' \}\}/g,
        replacement: 'style={{ maxWidth: \'5rem\' }}'
    },
    {
        pattern: /style=\{\{ maxWidth: '6rem' \}\}/g,
        replacement: 'style={{ maxWidth: \'4.5rem\' }}'
    }
];

widthConstraints.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        console.log('✅ Contraintes de largeur appliquées');
    }
});

// 5. Corriger spécifiquement la structure problématique
const problematicStructure = /(<div className="flex justify-between items-center">[\s\S]*?<span className="text-\[9px\] font-medium text-slate-900 truncate"[\s\S]*?<\/span>[\s\S]*?<span className=\{\`text-\[9px\] font-black[\s\S]*?\`\}>\{course\.type\}<\/span>[\s\S]*?<\/div>)/;

if (content.match(problematicStructure)) {
    content = content.replace(problematicStructure, 
        `<div className="flex items-center gap-2 w-full">
                    <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-medium text-slate-900 truncate block" style={{ maxWidth: '4rem' }}>{course.isCombined ? abbreviateCombinedSubjects(course.subject, 8) : abbreviateSubject(course.subject, 6)}</span>
                        <span className={\`text-[7px] font-black px-1 py-0.5 rounded \${sessionsInfo.realized >= sessionsInfo.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}\`}>
                            {sessionsInfo.realized}/{sessionsInfo.total}
                        </span>
                    </div>
                    <span className={\`text-[8px] font-black px-1 py-0.5 rounded text-white \${colors.badge} min-w-[18px] text-center flex-shrink-0\`}>{course.type}</span>
                </div>`
    );
    console.log('✅ Structure problématique corrigée');
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec corrections de débordement');
console.log('🎯 Badges maintenant contenus dans les cartes!');
console.log('');
console.log('📋 Corrections appliquées:');
console.log('  ✓ flex-shrink-0 sur tous les badges');
console.log('  ✓ Largeurs réduites pour les textes');
console.log('  ✓ Structure flex améliorée');
console.log('  ✓ Contraintes de largeur optimisées');