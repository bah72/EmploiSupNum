// Script pour créer des cartes combinées pour les cours simultanés
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Créer une fonction pour combiner les cours dans un même créneau
const combinedCoursesFunction = `
    // Fonction pour combiner les cours dans un même créneau
    const getCombinedCourseInfo = (courseIds: string[]) => {
        if (!courseIds || courseIds.length === 0) return null;
        if (courseIds.length === 1) {
            // Un seul cours - retourner tel quel
            const course = assignmentRows.find(r => r.id === courseIds[0]);
            return course ? { ...course, isCombined: false } : null;
        }
        
        // Plusieurs cours - les combiner
        const courses = courseIds.map(id => assignmentRows.find(r => r.id === id)).filter(Boolean);
        if (courses.length === 0) return null;
        
        const combined = {
            id: courseIds.join('|'), // ID combiné
            subject: courses.map(c => c.subject).join('/'),
            subjectLabel: courses.map(c => c.subjectLabel || c.subject).join('/'),
            type: courses.map(c => c.type).join('/') as CourseType,
            subLabel: courses.map(c => c.type).join('/'),
            teacher: courses.map(c => c.teacher).join('/'),
            room: courses.map(c => c.room).join('/'),
            mainGroup: courses[0].mainGroup, // Prendre le groupe du premier cours
            sharedGroups: courses[0].sharedGroups,
            semester: courses[0].semester,
            isCombined: true,
            originalCourses: courses // Garder référence aux cours originaux
        };
        
        return combined;
    };
`;

// Insérer la fonction après les imports
const importEndIndex = content.indexOf('export default function App()');
if (importEndIndex !== -1) {
    content = content.slice(0, importEndIndex) + combinedCoursesFunction + '\n' + content.slice(importEndIndex);
    console.log('✅ Fonction getCombinedCourseInfo ajoutée');
}

// 2. Modifier l'affichage des créneaux pour utiliser les cours combinés
content = content.replace(
    /const courseValue = schedule\[slotId\];\s*const courseIds = Array\.isArray\(courseValue\) \? courseValue : \(courseValue \? \[courseValue\] : \[\]\);\s*const courses = courseIds\.map\(id => assignmentRows\.find\(r => r\.id === id\)\)\.filter\(Boolean\);/g,
    `const courseValue = schedule[slotId];
                          const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);
                          const combinedCourse = getCombinedCourseInfo(courseIds);`
);

// 3. Modifier le rendu des créneaux pour afficher la carte combinée
content = content.replace(
    /{courses\.length > 0 && \(/g,
    `{combinedCourse && (`
);

content = content.replace(
    /<div className="space-y-1">\s*{courses\.map\(\(course, index\) => \(\s*<CourseBadge[\s\S]*?\)\)}\s*<\/div>/g,
    `<CourseBadge 
                                                    course={combinedCourse} 
                                                    onUnassign={() => {
                                                        if (combinedCourse.isCombined) {
                                                            // Supprimer tous les cours combinés
                                                            combinedCourse.originalCourses.forEach(c => handleUnassign(c.id));
                                                        } else {
                                                            handleUnassign(combinedCourse.id);
                                                        }
                                                    }}
                                                    updateRow={updateRow}
                                                    uniqueTeachers={UNIQUE_TEACHERS}
                                                    customRooms={customRooms}
                                                />`
);

// 4. Modifier le composant CourseBadge pour supporter les cours combinés
content = content.replace(
    /const CourseBadge = \(\{ course, onUnassign, updateRow, uniqueTeachers, customRooms[^}]*\}: any\) => \{/g,
    `const CourseBadge = ({ course, onUnassign, updateRow, uniqueTeachers, customRooms }: any) => {`
);

// 5. Modifier l'affichage des couleurs pour les cours combinés
content = content.replace(
    /const colors = getCourseColors\(course\.type\);/g,
    `const colors = course.isCombined ? {
        bg: 'bg-purple-50',
        border: 'border-purple-200', 
        borderLeft: 'border-l-purple-500',
        badge: 'bg-purple-500',
        text: 'text-purple-900'
    } : getCourseColors(course.type);`
);

// 6. Modifier la logique de placement pour créer des cours combinés
content = content.replace(
    /\/\/ Ajouter le nouveau cours au créneau[\s\S]*?next\[slotKey\] = \[next\[slotKey\], newCourse\.id\];\s*}/g,
    `// Ajouter le nouveau cours au créneau (logique combinée)
    if (!next[slotKey]) {
        next[slotKey] = newCourse.id;
    } else if (Array.isArray(next[slotKey])) {
        next[slotKey] = [...next[slotKey], newCourse.id];
    } else {
        next[slotKey] = [next[slotKey], newCourse.id];
    }`
);

// 7. Modifier la logique de déplacement normal pour supporter les cours combinés
content = content.replace(
    /next\[`\${semester}\|w\${currentWeek}\|\${activeMainGroup}\|\${targetTimeSlot}`\] = sourceId;/g,
    `// Logique de placement avec combinaison
    const targetSlotKey = \`\${semester}|w\${currentWeek}|\${activeMainGroup}|\${targetTimeSlot}\`;
    if (!next[targetSlotKey]) {
        next[targetSlotKey] = sourceId;
    } else if (Array.isArray(next[targetSlotKey])) {
        if (!next[targetSlotKey].includes(sourceId)) {
            next[targetSlotKey] = [...next[targetSlotKey], sourceId];
        }
    } else {
        // Convertir en tableau et ajouter
        next[targetSlotKey] = [next[targetSlotKey], sourceId];
    }`
);

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Système de cartes combinées créé !');
console.log('📋 Fonctionnalités :');
console.log('  • Cours simultanés fusionnés en une seule carte');
console.log('  • Format: DEV110/DEV111 | Esseyssah/Aicha | Lab1/Lab2 | TP/TD');
console.log('  • Couleur violette pour les cartes combinées');
console.log('  • Suppression de tous les cours combinés en une fois');
console.log('  • Support des tableaux dans le schedule');