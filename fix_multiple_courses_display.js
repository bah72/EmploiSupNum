// Script pour corriger l'affichage de plusieurs cours dans un même créneau
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Modifier l'affichage des créneaux pour supporter plusieurs cours
// 1. Modifier le rendu des créneaux dans la grille de planning
const droppableCellPattern = /<DroppableCell[^>]*>\s*{course && \([\s\S]*?<\/DroppableCell>/g;

if (content.match(droppableCellPattern)) {
    content = content.replace(droppableCellPattern, (match) => {
        return match.replace(
            /{course && \(/,
            `{courses.length > 0 && (`
        ).replace(
            /<CourseBadge[^>]*course={course}[^>]*\/>/g,
            `<div className="space-y-1">
                                                {courses.map((course, index) => (
                                                    <CourseBadge 
                                                        key={course.id}
                                                        course={course} 
                                                        onUnassign={() => handleUnassign(course.id)}
                                                        updateRow={updateRow}
                                                        uniqueTeachers={UNIQUE_TEACHERS}
                                                        customRooms={customRooms}
                                                        isMultiple={courses.length > 1}
                                                        index={index}
                                                    />
                                                ))}
                                            </div>`
        );
    });
    console.log('✅ Affichage des créneaux modifié pour supporter plusieurs cours');
}

// 2. Modifier la fonction handleUnassign pour supporter les tableaux
content = content.replace(
    /const handleUnassign = \(courseId: string\) => \{[\s\S]*?\};/g,
    `const handleUnassign = (courseId: string) => {
        setSchedule(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => {
                if (Array.isArray(next[k])) {
                    // Supprimer du tableau
                    next[k] = next[k].filter(id => id !== courseId);
                    // Si le tableau devient vide, le supprimer
                    if (next[k].length === 0) {
                        next[k] = null;
                    } else if (next[k].length === 1) {
                        // Si un seul élément reste, convertir en string
                        next[k] = next[k][0];
                    }
                } else if (next[k] === courseId) {
                    next[k] = null;
                }
            });
            return next;
        });
    };`
);

// 3. Modifier le composant CourseBadge pour supporter l'affichage multiple
content = content.replace(
    /const CourseBadge = \(\{ course, onUnassign, updateRow, uniqueTeachers, customRooms \}: any\) => \{/g,
    `const CourseBadge = ({ course, onUnassign, updateRow, uniqueTeachers, customRooms, isMultiple = false, index = 0 }: any) => {`
);

// 4. Modifier le style des badges multiples
content = content.replace(
    /className={\`relative rounded border-2/g,
    `className={\`relative rounded border-2 \${isMultiple ? 'mb-1 opacity-90' : ''}`
);

// 5. Corriger la détection des cours placés pour les tableaux
content = content.replace(
    /const placedIdsThisWeek = Object\.keys\(schedule\)[\s\S]*?\.map\(k => schedule\[k\] as string\);/g,
    `const placedIdsThisWeek = Object.keys(schedule)
        .filter(k => k.startsWith(\`\${semester}|w\${currentWeek}|\${activeMainGroup}|\`) && schedule[k])
        .flatMap(k => {
            const value = schedule[k];
            return Array.isArray(value) ? value : [value];
        })
        .filter(Boolean);`
);

// 6. Modifier la logique de placement pour supporter les tableaux
content = content.replace(
    /next\[`\${semester}\|w\${currentWeek}\|\${activeMainGroup}\|\${targetTimeSlot}`\] = newCourse\.id/g,
    `// Ajouter le nouveau cours au créneau
    const slotKey = \`\${semester}|w\${currentWeek}|\${activeMainGroup}|\${targetTimeSlot}\`;
    if (!next[slotKey]) {
        next[slotKey] = newCourse.id;
    } else if (Array.isArray(next[slotKey])) {
        next[slotKey] = [...next[slotKey], newCourse.id];
    } else {
        next[slotKey] = [next[slotKey], newCourse.id];
    }`
);

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Affichage des cours multiples corrigé !');
console.log('📋 Améliorations :');
console.log('  • Créneaux peuvent afficher plusieurs cours empilés');
console.log('  • Chaque cours a son propre badge');
console.log('  • Suppression individuelle des cours');
console.log('  • Support des tableaux dans le schedule');
console.log('  • Détection correcte des cours placés');