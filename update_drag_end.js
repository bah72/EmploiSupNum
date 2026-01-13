const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Trouver la partie de handleDragEnd qui place les cours et la modifier
// Chercher la partie qui met à jour le schedule
const scheduleUpdatePattern = /setSchedule\(prev => \{[\s\S]*?next\[`\$\{semester\}\|w\$\{currentWeek\}\|\$\{activeMainGroup\}\|\$\{targetTimeSlot\}`\] = newCourse\.id;[\s\S]*?\}\);/;

const newScheduleUpdate = `setSchedule(prev => {
                const next = { ...prev as Record<string, string | null | string[]> };
                const targetSlotKey = \`\${semester}|w\${currentWeek}|\${activeMainGroup}|\${targetTimeSlot}\`;
                
                // Ajouter le cours au slot (gérer les cours multiples)
                const existingValue = next[targetSlotKey];
                if (existingValue) {
                    // Il y a déjà des cours dans ce slot
                    const existingIds = Array.isArray(existingValue) ? existingValue : [existingValue];
                    next[targetSlotKey] = [...existingIds, newCourse.id];
                } else {
                    // Premier cours dans ce slot
                    next[targetSlotKey] = newCourse.id;
                }
                
                return next;
            });`;

if (content.match(scheduleUpdatePattern)) {
    content = content.replace(scheduleUpdatePattern, newScheduleUpdate);
    console.log('✅ Mise à jour de handleDragEnd pour les cours simultanés (copie)');
} else {
    console.log('❌ Pattern de mise à jour du schedule (copie) non trouvé');
}

// Aussi mettre à jour la partie pour le déplacement normal
const moveSchedulePattern = /setSchedule\(prev => \{[\s\S]*?next\[`\$\{semester\}\|w\$\{currentWeek\}\|\$\{activeMainGroup\}\|\$\{targetTimeSlot\}`\] = sourceId;[\s\S]*?\}\);/;

const newMoveSchedule = `setSchedule(prev => {
                const next = { ...prev as Record<string, string | null | string[]> };
                
                // Retirer le cours de tous les créneaux où il était placé
                groupsToPlace.forEach(group => {
                    Object.keys(next).forEach(k => {
                        if (k.startsWith(\`\${semester}|w\${currentWeek}|\${group}|\`)) {
                            const value = next[k];
                            // Normaliser la valeur pour gérer les cas string | null | string[]
                            if (Array.isArray(value)) {
                                const filtered = value.filter(id => !allSimilarCourseIds.includes(id));
                                next[k] = filtered.length > 0 ? filtered : null;
                            } else if (value && allSimilarCourseIds.includes(value)) {
                                next[k] = null;
                            }
                        }
                    });
                });
                
                // Placer le cours dans le nouveau créneau
                groupsToPlace.forEach(group => {
                    const targetSlotKey = \`\${semester}|w\${currentWeek}|\${group}|\${targetTimeSlot}\`;
                    const existingValue = next[targetSlotKey];
                    
                    if (existingValue) {
                        // Il y a déjà des cours dans ce slot
                        const existingIds = Array.isArray(existingValue) ? existingValue : [existingValue];
                        next[targetSlotKey] = [...existingIds, sourceId];
                    } else {
                        // Premier cours dans ce slot
                        next[targetSlotKey] = sourceId;
                    }
                });
                
                return next;
            });`;

if (content.match(moveSchedulePattern)) {
    content = content.replace(moveSchedulePattern, newMoveSchedule);
    console.log('✅ Mise à jour de handleDragEnd pour les cours simultanés (déplacement)');
} else {
    console.log('❌ Pattern de mise à jour du schedule (déplacement) non trouvé');
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec la logique de cours simultanés');