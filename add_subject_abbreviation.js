const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🔧 Ajout de l\'abréviation des matières...');

// 1. Ajouter une fonction d'abréviation des matières après les imports
const abbreviationFunction = `
// Fonction pour abréger les noms de matières
const abbreviateSubject = (subject: string, maxLength: number = 8) => {
    if (!subject) return '';
    
    // Si c'est déjà court, retourner tel quel
    if (subject.length <= maxLength) return subject;
    
    // Règles d'abréviation spécifiques
    const abbreviations: Record<string, string> = {
        'Développement': 'Dev',
        'développement': 'Dev',
        'DÉVELOPPEMENT': 'DEV',
        'Base de données': 'BDD',
        'BASE DE DONNÉES': 'BDD',
        'Système': 'Sys',
        'SYSTÈME': 'SYS',
        'Réseau': 'Rés',
        'RÉSEAU': 'RÉS',
        'Programmation': 'Prog',
        'PROGRAMMATION': 'PROG',
        'Algorithmique': 'Algo',
        'ALGORITHMIQUE': 'ALGO',
        'Architecture': 'Arch',
        'ARCHITECTURE': 'ARCH',
        'Sécurité': 'Sécu',
        'SÉCURITÉ': 'SÉCU',
        'Intelligence': 'Intel',
        'INTELLIGENCE': 'INTEL',
        'Artificielle': 'Art',
        'ARTIFICIELLE': 'ART',
        'Machine Learning': 'ML',
        'MACHINE LEARNING': 'ML',
        'Web': 'Web',
        'WEB': 'WEB',
        'Mobile': 'Mob',
        'MOBILE': 'MOB',
        'Interface': 'UI',
        'INTERFACE': 'UI',
        'Utilisateur': 'User',
        'UTILISATEUR': 'USER'
    };
    
    // Appliquer les abréviations
    let abbreviated = subject;
    Object.entries(abbreviations).forEach(([full, abbr]) => {
        abbreviated = abbreviated.replace(new RegExp(full, 'g'), abbr);
    });
    
    // Si encore trop long, tronquer intelligemment
    if (abbreviated.length > maxLength) {
        // Essayer de garder les mots importants
        const words = abbreviated.split(' ');
        if (words.length > 1) {
            // Prendre les premières lettres de chaque mot
            abbreviated = words.map(word => word.charAt(0).toUpperCase()).join('');
            if (abbreviated.length > maxLength) {
                abbreviated = abbreviated.substring(0, maxLength);
            }
        } else {
            // Tronquer simplement
            abbreviated = abbreviated.substring(0, maxLength - 1) + '…';
        }
    }
    
    return abbreviated;
};

// Fonction pour abréger les matières combinées
const abbreviateCombinedSubjects = (subjects: string, maxLength: number = 12) => {
    if (!subjects) return '';
    
    const subjectList = subjects.split('/');
    const abbreviated = subjectList.map(subject => abbreviateSubject(subject.trim(), 6)).join('/');
    
    if (abbreviated.length <= maxLength) return abbreviated;
    
    // Si encore trop long, utiliser des codes plus courts
    return subjectList.map(subject => subject.trim().substring(0, 3)).join('/');
};
`;

// Insérer la fonction après les imports
const importEndPattern = /import \{ AssignmentRow, CourseType \} from '\.\/types';\s*import \{ MASTER_DB, ALL_ROOMS, MAIN_GROUPS, DAYS, SEMESTERS \} from '\.\/constants';/;

if (content.match(importEndPattern)) {
    content = content.replace(importEndPattern, (match) => match + abbreviationFunction);
    console.log('✅ Fonction d\'abréviation ajoutée');
}

// 2. Remplacer les affichages de course.subject par des versions abrégées
const subjectDisplayReplacements = [
    // Dans les cartes compactes
    {
        pattern: /<span className="text-\[12px\] font-black text-slate-900 uppercase truncate" style=\{\{ maxWidth: '7rem' \}\}>\{course\.subject\}<\/span>/g,
        replacement: '<span className="text-[12px] font-black text-slate-900 uppercase truncate" style={{ maxWidth: \'7rem\' }}>{course.isCombined ? abbreviateCombinedSubjects(course.subject, 10) : abbreviateSubject(course.subject, 8)}</span>'
    },
    // Dans les cartes moyennes
    {
        pattern: /<span className="text-\[9px\] font-medium text-slate-900 truncate" style=\{\{ maxWidth: '7rem' \}\}>\{course\.subject\}<\/span>/g,
        replacement: '<span className="text-[9px] font-medium text-slate-900 truncate" style={{ maxWidth: \'7rem\' }}>{course.isCombined ? abbreviateCombinedSubjects(course.subject, 8) : abbreviateSubject(course.subject, 6)}</span>'
    },
    // Dans les cartes petites
    {
        pattern: /<span title=\{course\.subject\} className="font-medium text-\[9px\] text-slate-950 leading-none truncate" style=\{\{ maxWidth: '6rem' \}\}>\{course\.subject\}<\/span>/g,
        replacement: '<span title={course.subject} className="font-medium text-[9px] text-slate-950 leading-none truncate" style={{ maxWidth: \'6rem\' }}>{course.isCombined ? abbreviateCombinedSubjects(course.subject, 6) : abbreviateSubject(course.subject, 5)}</span>'
    }
];

subjectDisplayReplacements.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        console.log('✅ Affichage des matières abrégé');
    }
});

// 3. S'assurer que les libellés de type sont toujours visibles
// Forcer l'affichage du libellé même dans les petites cartes
const labelForcePatterns = [
    // Augmenter la visibilité des badges de type
    {
        pattern: /className=\{\`text-\[7px\] font-black px-1 rounded text-white \$\{colors\.badge\}\`\}/g,
        replacement: 'className={`text-[8px] font-black px-1 py-0.5 rounded text-white ${colors.badge} min-w-[20px] text-center`}'
    },
    {
        pattern: /className=\{\`text-\[8px\] font-black px-1 rounded text-white \$\{colors\.badge\}\`\}/g,
        replacement: 'className={`text-[9px] font-black px-1 py-0.5 rounded text-white ${colors.badge} min-w-[22px] text-center`}'
    },
    {
        pattern: /className=\{\`text-\[9px\] font-black px-2 py-0\.5 rounded-full text-white \$\{colors\.badge\}\`\}/g,
        replacement: 'className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${colors.badge} min-w-[24px] text-center`}'
    }
];

labelForcePatterns.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        console.log('✅ Libellés de type renforcés');
    }
});

// 4. Améliorer l'affichage des cours combinés dans getCombinedCourseInfo
const combinedSubjectsPattern = /const subjects = courses\.map\(c => c\.subject\)\.join\('\/'\);/;
if (content.match(combinedSubjectsPattern)) {
    content = content.replace(combinedSubjectsPattern, 
        `const subjects = courses.map(c => c.subject).join('/');
        const abbreviatedSubjects = abbreviateCombinedSubjects(subjects, 12);`
    );
    
    // Utiliser les sujets abrégés dans le retour
    content = content.replace(
        /subject: subjects,/,
        'subject: abbreviatedSubjects,'
    );
    
    console.log('✅ Cours combinés utilisent des sujets abrégés');
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec abréviations');
console.log('🎯 Matières abrégées et libellés forcés dans les cartes!');
console.log('');
console.log('📋 Améliorations:');
console.log('  ✓ Fonction abbreviateSubject() pour raccourcir les noms');
console.log('  ✓ Fonction abbreviateCombinedSubjects() pour cours multiples');
console.log('  ✓ Libellés de type plus visibles (taille et largeur min)');
console.log('  ✓ Abréviations intelligentes (Dev, BDD, Sys, etc.)');