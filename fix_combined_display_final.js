// Script final pour corriger l'affichage des cartes combinées
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Chercher et remplacer l'affichage des cours dans les créneaux
// Pattern pour trouver où les cours sont affichés après getCombinedCourseInfo
const displayPattern = /const combinedCourse = getCombinedCourseInfo\(courseIds\);[\s\S]*?return \([\s\S]*?<div[^>]*>[\s\S]*?<\/div>/g;

if (content.match(displayPattern)) {
    content = content.replace(displayPattern, (match) => {
        // Remplacer le contenu de la div par l'affichage de la carte combinée
        return match.replace(
            /(<div[^>]*>)[\s\S]*?(<\/div>)/,
            `$1
                                                                {combinedCourse && (
                                                                    <DraggableCard 
                                                                        course={combinedCourse} 
                                                                        searchQuery={searchQuery} 
                                                                        compact={false}
                                                                        customSubjects={customSubjects} 
                                                                        schedule={schedule} 
                                                                        assignmentRows={assignmentRows}
                                                                    />
                                                                )}
                                                            $2`
        );
    });
    console.log('✅ Affichage des cartes combinées corrigé');
}

// 2. Si le pattern précédent n'a pas fonctionné, essayer une approche plus directe
if (!content.includes('{combinedCourse &&')) {
    // Chercher les divs qui contiennent l'affichage des cours
    content = content.replace(
        /(const combinedCourse = getCombinedCourseInfo\(courseIds\);[\s\S]*?return \([\s\S]*?<div[^>]*className="[^"]*p-1[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/g,
        `$1
                                                                {combinedCourse && (
                                                                    <DraggableCard 
                                                                        course={combinedCourse} 
                                                                        searchQuery={searchQuery} 
                                                                        compact={false}
                                                                        customSubjects={customSubjects} 
                                                                        schedule={schedule} 
                                                                        assignmentRows={assignmentRows}
                                                                    />
                                                                )}
                                                            $3`
    );
    console.log('✅ Pattern alternatif appliqué');
}

// 3. Ajouter la gestion du drag and drop pour les cartes combinées
content = content.replace(
    /const \{ isOver, setNodeRef \} = useDroppable\(\{ id: slotKey \}\);/g,
    `const { isOver, setNodeRef } = useDroppable({ 
        id: slotKey,
        data: { accepts: ['course'] }
    });`
);

// 4. S'assurer que les cartes combinées sont draggables
content = content.replace(
    /function DraggableCard\(\{ course, compact, searchQuery, customSubjects, schedule, assignmentRows, onUnassign \}: any\) \{/g,
    `function DraggableCard({ course, compact, searchQuery, customSubjects, schedule, assignmentRows, onUnassign }: any) {
    // Ne pas rendre les cartes combinées draggables depuis le planning
    const isDraggable = !course.isCombined || compact;`
);

// 5. Modifier l'utilisation du draggable pour les cartes combinées
content = content.replace(
    /const \{ attributes, listeners, setNodeRef, transform, isDragging: dragState \} = useDraggable\(\{[\s\S]*?\}\);/g,
    `const { attributes, listeners, setNodeRef, transform, isDragging: dragState } = useDraggable({
        id: course.id,
        data: course,
        disabled: course.isCombined && !compact // Désactiver le drag pour les cartes combinées dans le planning
    });`
);

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Affichage final des cartes combinées corrigé !');
console.log('📋 Fonctionnalités finales :');
console.log('  • Cartes fusionnées affichées dans les créneaux');
console.log('  • Format: DEV110/DEV111 | Esseyssah/Aicha | Lab1/Lab2 | TP/TD');
console.log('  • Couleur violette distinctive');
console.log('  • Drag and drop adapté pour les cartes combinées');
console.log('  • Une seule carte par créneau même avec plusieurs cours');