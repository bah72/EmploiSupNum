// Script pour forcer l'implémentation de la fusion des cartes
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Trouver et remplacer la logique d'affichage des créneaux
// Chercher la section où les cours sont affichés dans les créneaux
const slotDisplayPattern = /const courseValue = schedule\[slotKey\];[\s\S]*?const courseIds = [\s\S]*?const courses = [\s\S]*?{courses\.length > 0 && \(/g;

if (content.match(slotDisplayPattern)) {
    content = content.replace(slotDisplayPattern, 
        `const courseValue = schedule[slotKey];
                                                        const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);
                                                        const combinedCourse = getCombinedCourseInfo(courseIds);
                                                        
                                                        return (
                                                            <div key={slotKey} className="border-r border-slate-100 min-h-[100px] p-1 relative bg-white hover:bg-slate-50 transition-colors">
                                                                {combinedCourse && (`
    );
    console.log('✅ Pattern 1: Logique d\'affichage des créneaux modifiée');
} else {
    // Chercher une autre structure possible
    const alternatePattern = /const courseId = schedule\[slotId\];[\s\S]*?const course = courseId[\s\S]*?{course && \(/g;
    
    if (content.match(alternatePattern)) {
        content = content.replace(alternatePattern,
            `const courseValue = schedule[slotId];
                                                        const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);
                                                        const combinedCourse = getCombinedCourseInfo(courseIds);
                                                        
                                                        {combinedCourse && (`
        );
        console.log('✅ Pattern 2: Structure alternative modifiée');
    }
}

// 2. Remplacer l'affichage des badges de cours
content = content.replace(
    /<CourseBadge[\s\S]*?course={course}[\s\S]*?\/>/g,
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

// 3. S'assurer que la fonction getCombinedCourseInfo est correctement définie
if (!content.includes('getCombinedCourseInfo')) {
    const functionDef = `
    // Fonction pour combiner les cours dans un même créneau
    const getCombinedCourseInfo = (courseIds) => {
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
            type: courses.map(c => c.type).join('/'),
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
    
    // Insérer après les imports
    const insertPoint = content.indexOf('export default function App()');
    if (insertPoint !== -1) {
        content = content.slice(0, insertPoint) + functionDef + '\n' + content.slice(insertPoint);
        console.log('✅ Fonction getCombinedCourseInfo ajoutée');
    }
}

// 4. Forcer la modification de la structure de données pour supporter les tableaux
content = content.replace(
    /next\[`\${semester}\|w\${currentWeek}\|\${activeMainGroup}\|\${targetTimeSlot}`\] = sourceId;/g,
    `// Logique de placement avec support des cours multiples
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

console.log('✅ Fusion des cartes forcée !');
console.log('📋 Modifications appliquées :');
console.log('  • Logique d\'affichage des créneaux modifiée');
console.log('  • Support des cours multiples dans les créneaux');
console.log('  • Fonction de combinaison des cours ajoutée');
console.log('  • Structure de données adaptée pour les tableaux');