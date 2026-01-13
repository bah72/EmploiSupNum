const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Trouver la fonction checkInstantConflict et la remplacer
const oldFunctionPattern = /const checkInstantConflict = \(courseId: string, day: string, time: string\): string \| null => \{[\s\S]*?\};/;

const newFunction = `const checkInstantConflict = (courseId: string, day: string, time: string): string | null => {
        const draggingCourse = assignmentRows.find(r => r.id === courseId);
        if (!draggingCourse) return null;

        // Utiliser sharedGroups, ou détecter automatiquement les groupes concernés
        let groupsToCheck: string[] = [];
        if (draggingCourse.sharedGroups && draggingCourse.sharedGroups.length > 0) {
            groupsToCheck = draggingCourse.sharedGroups;
        } else {
            groupsToCheck = [draggingCourse.mainGroup];
        }

        // Vérifier les conflits pour tous les groupes concernés
        for (const group of groupsToCheck) {
            const currentSlotKey = \`\${semester}|w\${currentWeek}|\${group}|\${day}|\${time}\`;
            const existingLocalValue = schedule[currentSlotKey];
            // Normaliser la valeur (gérer les cas string | null | string[])
            const existingLocalIds = Array.isArray(existingLocalValue) ? existingLocalValue : (existingLocalValue ? [existingLocalValue] : []);
            
            if (existingLocalIds.length > 0) {
                // Vérifier si on peut ajouter ce cours (différentes salles ET différents enseignants)
                const existingCourses = existingLocalIds.map(id => assignmentRows.find(r => r.id === id)).filter(c => c !== undefined);
                
                for (const existingCourse of existingCourses) {
                    // Conflit si même salle OU même enseignant
                    if (existingCourse.room === draggingCourse.room) {
                        return \`Conflit de salle: \${existingCourse.room} déjà occupée par \${existingCourse.subject}\`;
                    }
                    if (existingCourse.teacher === draggingCourse.teacher) {
                        return \`Conflit d'enseignant: \${existingCourse.teacher} déjà assigné à \${existingCourse.subject}\`;
                    }
                }
            }
        }

        // Vérifier les conflits avec les autres groupes (même enseignant)
        const otherGroups = dynamicGroups.filter(g => !groupsToCheck.includes(g));
        for (const otherGroup of otherGroups) {
            const otherSlotKey = \`\${semester}|w\${currentWeek}|\${otherGroup}|\${day}|\${time}\`;
            const otherCourseValue = schedule[otherSlotKey];
            // Normaliser la valeur (gérer les cas string | null | string[])
            const otherCourseIds = Array.isArray(otherCourseValue) ? otherCourseValue : (otherCourseValue ? [otherCourseValue] : []);

            for (const otherCourseId of otherCourseIds) {
                const otherCourse = assignmentRows.find(r => r.id === otherCourseId);
                if (otherCourse && otherCourse.teacher === draggingCourse.teacher) {
                    return \`Conflit d'enseignant: \${draggingCourse.teacher} déjà assigné au \${otherGroup}\`;
                }
            }
        }

        return null; // Pas de conflit
    };`;

if (content.match(oldFunctionPattern)) {
    content = content.replace(oldFunctionPattern, newFunction);
    console.log('✅ Fonction checkInstantConflict mise à jour pour permettre les cours simultanés');
} else {
    console.log('❌ Fonction checkInstantConflict non trouvée');
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec la nouvelle logique de conflits');