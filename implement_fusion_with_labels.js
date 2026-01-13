const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

console.log('🔧 Implémentation de la fusion avec correction des libellés...');

// 1. CORRIGER LA CORRESPONDANCE LIBELLÉ/COULEUR
// Remplacer {course.subLabel || course.type} par {course.type}
const labelReplacements = [
    { pattern: /\{course\.subLabel \|\| course\.type\}/g, replacement: '{course.type}' },
    { pattern: /\{course\.subLabel\}/g, replacement: '{course.type}' }
];

labelReplacements.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        console.log(`✅ Remplacé ${pattern.source} par ${replacement}`);
    }
});

// 2. AJOUTER LA FONCTION getCombinedCourseInfo
const assignmentRowsPattern = /const \[assignmentRows, setAssignmentRows\] = useState<AssignmentRow\[\]>\(\[\]\);/;
const match = content.match(assignmentRowsPattern);

if (match && !content.includes('getCombinedCourseInfo')) {
    const insertPoint = content.indexOf(match[0]) + match[0].length;
    const functionToAdd = `

    // Fonction pour combiner les cours dans un même créneau
    const getCombinedCourseInfo = (courseIds: string[]) => {
        if (!courseIds || courseIds.length === 0) return null;
        if (courseIds.length === 1) {
            // Un seul cours - retourner tel quel
            const course = assignmentRows.find(r => r.id === courseIds[0]);
            return course ? { ...course, isCombined: false } : null;
        }
        
        // Plusieurs cours - créer une carte combinée
        const courses = courseIds.map(id => assignmentRows.find(r => r.id === id)).filter(c => c !== undefined);
        if (courses.length === 0) return null;
        
        // Combiner les informations avec le format demandé
        const subjects = courses.map(c => c.subject).join('/');
        const teachers = courses.map(c => c.teacher).join('/');
        const rooms = courses.map(c => c.room).join('/');
        const types = courses.map(c => c.type).join('/');
        
        return {
            id: courseIds.join('_'),
            subject: subjects,
            subjectLabel: courses.map(c => c.subjectLabel).join('/'),
            type: types, // IMPORTANT: utiliser types combinés pour la couleur
            mainGroup: courses[0].mainGroup,
            sharedGroups: courses[0].sharedGroups,
            subLabel: types, // Garder cohérence avec type
            teacher: teachers,
            room: rooms,
            semester: courses[0].semester,
            isCombined: true,
            originalCourses: courses
        };
    };`;
    
    content = content.slice(0, insertPoint) + functionToAdd + content.slice(insertPoint);
    console.log('✅ Fonction getCombinedCourseInfo ajoutée');
}

// 3. REMPLACER L'AFFICHAGE DES COURS DANS LA GRILLE
const oldDisplayPattern = /const courseIds = Array\.isArray\(courseValue\) \? courseValue : \(courseValue \? \[courseValue\] : \[\]\);\s*const courses = courseIds\.map\(id => assignmentRows\.find\(c => c\.id === id\)\)\.filter\(c => c !== undefined\);/;

const newDisplayPattern = `const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);
                                                        const combinedCourse = getCombinedCourseInfo(courseIds);`;

if (content.match(oldDisplayPattern)) {
    content = content.replace(oldDisplayPattern, newDisplayPattern);
    console.log('✅ Logique d\'affichage mise à jour pour utiliser getCombinedCourseInfo');
}

// 4. REMPLACER courses.map PAR combinedCourse
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

// 5. METTRE À JOUR getCourseColor POUR LES COURS COMBINÉS
const getCourseColorPattern = /function getCourseColor\(type: CourseType\) \{[\s\S]*?switch \(type\) \{[\s\S]*?default:[\s\S]*?\}\s*\}/;

const newGetCourseColor = `function getCourseColor(type: CourseType | string) {
    // Vérifier si c'est un cours combiné (contient des slashes)
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
    console.log('✅ Couleurs pour cours combinés ajoutées (purple)');
}

// Écrire le fichier corrigé
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé');
console.log('🎯 Fusion des cartes implémentée avec correction des libellés!');
console.log('');
console.log('📋 Fonctionnalités:');
console.log('  ✓ Libellés correspondent aux couleurs (course.type seulement)');
console.log('  ✓ Cours multiples fusionnent en une carte purple');
console.log('  ✓ Format: "DEV110/DEV111 | Esseyssah/Aicha | Lab1/Lab2 | TP/TD"');