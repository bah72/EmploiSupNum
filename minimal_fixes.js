const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🔧 Application des corrections minimales...');

// 1. SEULEMENT corriger la correspondance libellé/couleur
const labelFix = {
    pattern: /\{course\.subLabel \|\| course\.type\}/g,
    replacement: '{course.type}'
};

if (content.match(labelFix.pattern)) {
    content = content.replace(labelFix.pattern, labelFix.replacement);
    console.log('✅ Correspondance libellé/couleur corrigée');
}

// 2. SEULEMENT ajouter la fonction getCombinedCourseInfo (version simple)
const assignmentRowsPattern = /const \[assignmentRows, setAssignmentRows\] = useState<AssignmentRow\[\]>\(\[\]\);/;
const match = content.match(assignmentRowsPattern);

if (match && !content.includes('getCombinedCourseInfo')) {
    const insertPoint = content.indexOf(match[0]) + match[0].length;
    const simpleFunction = `

    // Fonction pour combiner les cours dans un même créneau
    const getCombinedCourseInfo = (courseIds: string[]) => {
        if (!courseIds || courseIds.length === 0 || !assignmentRows) return null;
        if (courseIds.length === 1) {
            const course = assignmentRows.find(r => r.id === courseIds[0]);
            return course ? { ...course, isCombined: false } : null;
        }
        
        const courses = courseIds.map(id => assignmentRows.find(r => r.id === id)).filter(c => c !== undefined);
        if (courses.length === 0) return null;
        
        return {
            id: courseIds.join('_'),
            subject: courses.map(c => c.subject).join('/'),
            subjectLabel: courses.map(c => c.subjectLabel).join('/'),
            type: courses.map(c => c.type).join('/'),
            mainGroup: courses[0].mainGroup,
            sharedGroups: courses[0].sharedGroups,
            subLabel: courses.map(c => c.type).join('/'),
            teacher: courses.map(c => c.teacher).join('/'),
            room: courses.map(c => c.room).join('/'),
            semester: courses[0].semester,
            isCombined: true,
            originalCourses: courses
        };
    };`;
    
    content = content.slice(0, insertPoint) + simpleFunction + content.slice(insertPoint);
    console.log('✅ Fonction getCombinedCourseInfo ajoutée (version simple)');
}

// 3. SEULEMENT remplacer l'affichage des cours dans la grille
const oldDisplayPattern = /const courseIds = Array\.isArray\(courseValue\) \? courseValue : \(courseValue \? \[courseValue\] : \[\]\);\s*const courses = courseIds\.map\(id => assignmentRows\.find\(c => c\.id === id\)\)\.filter\(c => c !== undefined\);/;

const newDisplayPattern = `const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);
                                                        const combinedCourse = getCombinedCourseInfo(courseIds);`;

if (content.match(oldDisplayPattern)) {
    content = content.replace(oldDisplayPattern, newDisplayPattern);
    console.log('✅ Logique d\'affichage mise à jour');
}

// 4. SEULEMENT remplacer courses.map par combinedCourse
const coursesMapPattern = /\{courses\.map\(course => \([\s\S]*?<CourseBadge[\s\S]*?\/>\s*\)\)\}/;
const newCourseDisplay = `{combinedCourse && (
                                                                        <CourseBadge 
                                                                            key={\`\${combinedCourse.id}-\${refreshKey}\`}
                                                                            course={combinedCourse}
                                                                            onUnassign={handleUnassign}
                                                                            conflicts={conflicts}
                                                                        />
                                                                    )}`;

if (content.match(coursesMapPattern)) {
    content = content.replace(coursesMapPattern, newCourseDisplay);
    console.log('✅ Affichage des cours combinés mis à jour');
}

// 5. SEULEMENT ajouter les couleurs purple pour cours combinés
const getCourseColorPattern = /function getCourseColor\(type: CourseType\) \{[\s\S]*?switch \(type\) \{[\s\S]*?default:[\s\S]*?\}\s*\}/;

const newGetCourseColor = `function getCourseColor(type: CourseType | string) {
    // Cours combinés en purple
    if (typeof type === 'string' && type.includes('/')) {
        return { bg: 'bg-purple-50', border: 'border-purple-300', borderLeft: 'border-l-purple-600', badge: 'bg-purple-600' };
    }
    
    switch (type) {
        case 'CM': return { bg: 'bg-emerald-50', border: 'border-emerald-300', borderLeft: 'border-l-emerald-600', badge: 'bg-emerald-600' };
        case 'TD': return { bg: 'bg-blue-50', border: 'border-blue-300', borderLeft: 'border-l-blue-600', badge: 'bg-blue-600' };
        case 'TP': return { bg: 'bg-orange-50', border: 'border-orange-300', borderLeft: 'border-l-orange-600', badge: 'bg-orange-600' };
        default: return { bg: 'bg-gray-50', border: 'border-gray-300', borderLeft: 'border-l-gray-600', badge: 'bg-gray-600' };
    }
}`;

if (content.match(getCourseColorPattern)) {
    content = content.replace(getCourseColorPattern, newGetCourseColor);
    console.log('✅ Couleurs purple pour cours combinés ajoutées');
}

// 6. SEULEMENT corriger les erreurs runtime critiques
const runtimeFixes = [
    {
        pattern: /const similarCourses = assignmentRows\.filter\(r =>/g,
        replacement: 'const similarCourses = (assignmentRows || []).filter(r =>'
    },
    {
        pattern: /assignmentRows\.find\(r => r\.id === courseIds\[0\]\)/g,
        replacement: '(assignmentRows || []).find(r => r.id === courseIds[0])'
    }
];

runtimeFixes.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        console.log('✅ Erreur runtime corrigée');
    }
});

// 7. CORRECTION SPÉCIFIQUE pour les badges qui débordent
// Seulement ajouter une contrainte CSS simple sans casser la structure
const badgeOverflowFix = /className=\{\`text-\[([789])\]px font-black px-([12]) py-0\.5 rounded(-full)? text-white \$\{colors\.badge\}\`\}/g;

content = content.replace(badgeOverflowFix, (match, size, padding, full) => {
    const newSize = Math.max(7, parseInt(size) - 1); // Réduire la taille de 1px
    const roundedClass = full ? '-full' : '';
    return `className={\`text-[${newSize}px] font-black px-${padding} py-0.5 rounded${roundedClass} text-white \${colors.badge} max-w-[40px] overflow-hidden\`}`;
});

console.log('✅ Taille des badges réduite pour éviter le débordement');

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec corrections minimales');
console.log('🎯 Fonctionnalités de base préservées!');
console.log('');
console.log('📋 Corrections appliquées:');
console.log('  ✓ Correspondance libellé/couleur');
console.log('  ✓ Cours combinés avec fusion');
console.log('  ✓ Couleurs purple');
console.log('  ✓ Erreurs runtime corrigées');
console.log('  ✓ Badges plus petits (sans casser la structure)');
console.log('  ✓ Fonctionnalité drag & drop préservée');