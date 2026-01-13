// Script pour implémenter directement la fusion des cartes
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Remplacer la logique d'affichage des cours dans les créneaux
// Chercher et remplacer la ligne qui mappe les courseIds vers les cours
content = content.replace(
    /const courses = courseIds\.map\(id => assignmentRows\.find\(c => c\.id === id\)\)\.filter\(c => c !== undefined\);/g,
    `// Utiliser la fonction de combinaison au lieu de mapper individuellement
                                                        const combinedCourse = getCombinedCourseInfo(courseIds);`
);

// 2. Remplacer l'affichage des cours multiples par l'affichage d'une carte combinée
// Chercher les patterns d'affichage de cours multiples
content = content.replace(
    /{courses\.length > 0 && courses\.map\([\s\S]*?\)\)}/g,
    `{combinedCourse && (
                                                                    <DraggableCard 
                                                                        course={combinedCourse} 
                                                                        searchQuery={searchQuery} 
                                                                        compact={false}
                                                                        customSubjects={customSubjects} 
                                                                        schedule={schedule} 
                                                                        assignmentRows={assignmentRows}
                                                                        onUnassign={() => {
                                                                            if (combinedCourse.isCombined) {
                                                                                // Supprimer tous les cours combinés
                                                                                combinedCourse.originalCourses.forEach(c => handleUnassign(c.id));
                                                                            } else {
                                                                                handleUnassign(combinedCourse.id);
                                                                            }
                                                                        }}
                                                                    />
                                                                )}`
);

// 3. Chercher et remplacer d'autres patterns possibles d'affichage de cours
content = content.replace(
    /{courses\.map\(\(course, index\) => \([\s\S]*?\)\)}/g,
    `{combinedCourse && (
                                                                    <DraggableCard 
                                                                        course={combinedCourse} 
                                                                        searchQuery={searchQuery} 
                                                                        compact={false}
                                                                        customSubjects={customSubjects} 
                                                                        schedule={schedule} 
                                                                        assignmentRows={assignmentRows}
                                                                    />
                                                                )}`
);

// 4. Remplacer les références à courses.length par combinedCourse
content = content.replace(
    /courses\.length > 0/g,
    'combinedCourse'
);

// 5. S'assurer que la fonction getCombinedCourseInfo gère correctement les cours combinés
// Vérifier si elle existe et la corriger si nécessaire
if (content.includes('getCombinedCourseInfo')) {
    // Améliorer la fonction existante
    content = content.replace(
        /const combined = \{[\s\S]*?\};/g,
        `const combined = {
            id: courseIds.join('|'), // ID combiné
            subject: courses.map(c => c.subject).join('/'),
            subjectLabel: courses.map(c => c.subjectLabel || c.subject).join('/'),
            type: courses.map(c => c.type).join('/'),
            subLabel: courses.map(c => c.type).join('/'),
            teacher: courses.map(c => c.teacher || '').join('/'),
            room: courses.map(c => c.room || '').join('/'),
            mainGroup: courses[0].mainGroup,
            sharedGroups: courses[0].sharedGroups,
            semester: courses[0].semester,
            isCombined: true,
            originalCourses: courses
        };`
    );
}

// 6. Modifier le composant DraggableCard pour supporter les cours combinés
content = content.replace(
    /function DraggableCard\(\{ course, compact, searchQuery, customSubjects, schedule, assignmentRows \}: any\) \{/g,
    `function DraggableCard({ course, compact, searchQuery, customSubjects, schedule, assignmentRows, onUnassign }: any) {`
);

// 7. Ajouter la logique de couleur pour les cours combinés dans DraggableCard
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

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Fusion des cartes implémentée directement !');
console.log('📋 Modifications appliquées :');
console.log('  • Remplacement de la logique d\'affichage des cours multiples');
console.log('  • Utilisation de getCombinedCourseInfo pour fusionner les cours');
console.log('  • Affichage d\'une seule carte combinée par créneau');
console.log('  • Couleurs violettes pour les cartes combinées');
console.log('  • Support de la suppression des cours combinés');