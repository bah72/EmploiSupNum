// Script pour permettre les cours simultanés avec des salles et enseignants différents
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Modifier la logique de détection des conflits pour permettre les cours simultanés
// si ils ont des salles ET des enseignants différents

// 1. Modifier la fonction checkInstantConflict pour permettre les cours simultanés
// Chercher et remplacer la logique de conflit simple
const simpleConflictPattern = /const checkInstantConflict = \(courseId: string, day: string, time: string\): string \| null => \{[\s\S]*?return null;\s*\};/g;

if (content.match(simpleConflictPattern)) {
    const newCheckInstantConflict = `const checkInstantConflict = (courseId: string, day: string, time: string): string | null => {
        const slotKey = \`\${semester}|w\${currentWeek}|\${activeMainGroup}|\${day}|\${time}\`;
        const existingCourseIds = Object.keys(schedule)
            .filter(k => k === slotKey && schedule[k])
            .map(k => schedule[k] as string);
        
        if (existingCourseIds.length === 0) return null; // Pas de cours existant
        
        const draggingCourse = assignmentRows.find(r => r.id === courseId);
        if (!draggingCourse) return null;
        
        // Vérifier les conflits avec chaque cours existant
        for (const existingCourseId of existingCourseIds) {
            if (existingCourseId === courseId) continue; // Même cours
            
            const existingCourse = assignmentRows.find(r => r.id === existingCourseId);
            if (!existingCourse) continue;
            
            // Conflit de salle (même salle non vide)
            if (draggingCourse.room && existingCourse.room &&
                draggingCourse.room !== '?' && existingCourse.room !== '?' &&
                draggingCourse.room !== '' && existingCourse.room !== '' &&
                draggingCourse.room === existingCourse.room) {
                return \`CONFLIT SALLE : \${draggingCourse.room} déjà utilisée par \${existingCourse.subject}\`;
            }
            
            // Conflit d'enseignant (même enseignant)
            const draggingTeachers = (draggingCourse.teacher || '').split('/').map(t => t.trim()).filter(t => t && t !== '?');
            const existingTeachers = (existingCourse.teacher || '').split('/').map(t => t.trim()).filter(t => t && t !== '?');
            const commonTeacher = draggingTeachers.find(t => existingTeachers.includes(t));
            
            if (commonTeacher) {
                return \`CONFLIT ENSEIGNANT : \${commonTeacher} enseigne déjà \${existingCourse.subject}\`;
            }
        }
        
        return null; // Pas de conflit - cours simultanés autorisés avec salles/enseignants différents
    };`;
    
    content = content.replace(simpleConflictPattern, newCheckInstantConflict);
    console.log('✅ Fonction checkInstantConflict modifiée pour permettre les cours simultanés');
}

// 2. Modifier la structure de données du schedule pour supporter plusieurs cours par créneau
// Remplacer les assignations simples par des tableaux
content = content.replace(
    /next\[`\${semester}\|w\${currentWeek}\|\${activeMainGroup}\|\${targetTimeSlot}`\] = sourceId;/g,
    `// Supporter plusieurs cours par créneau
    const slotKey = \`\${semester}|w\${currentWeek}|\${activeMainGroup}|\${targetTimeSlot}\`;
    if (!next[slotKey]) {
        next[slotKey] = sourceId;
    } else if (Array.isArray(next[slotKey])) {
        if (!next[slotKey].includes(sourceId)) {
            next[slotKey].push(sourceId);
        }
    } else {
        // Convertir en tableau si pas déjà fait
        next[slotKey] = [next[slotKey], sourceId];
    }`
);

// 3. Modifier l'affichage des cartes pour supporter plusieurs cours par créneau
content = content.replace(
    /const courseId = schedule\[slotId\];/g,
    `const courseValue = schedule[slotId];
    const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);`
);

// 4. Modifier l'affichage des cours dans les créneaux
content = content.replace(
    /const course = courseId \? assignmentRows\.find\(r => r\.id === courseId\) : null;/g,
    `const courses = courseIds.map(id => assignmentRows.find(r => r.id === id)).filter(Boolean);`
);

// 5. Modifier le rendu des créneaux pour afficher plusieurs cours
content = content.replace(
    /{course && \(/g,
    `{courses.length > 0 && (`
);

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Cours simultanés autorisés !');
console.log('📋 Modifications appliquées :');
console.log('  • Plusieurs cours peuvent être placés dans le même créneau');
console.log('  • Conflits détectés seulement si même salle OU même enseignant');
console.log('  • Cours avec salles et enseignants différents = OK');
console.log('  • Structure de données modifiée pour supporter les tableaux');