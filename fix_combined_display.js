const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Remplacer la logique d'affichage des cours individuels par la logique combinée
const oldPattern = /const courseIds = Array\.isArray\(courseValue\) \? courseValue : \(courseValue \? \[courseValue\] : \[\]\);\s*const courses = courseIds\.map\(id => assignmentRows\.find\(c => c\.id === id\)\)\.filter\(c => c !== undefined\);\s*return \(\s*<div key=\{time\} className="p-1 border-r last:border-0 relative">\s*<DroppableSlot id=\{\`\$\{day\}\|\$\{time\}\`\}>\s*\{courses\.map\(course => \(/;

const newPattern = `const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);
                                                        const combinedCourse = getCombinedCourseInfo(courseIds);

                                                        return (
                                                            <div key={time} className="p-1 border-r last:border-0 relative">
                                                                <DroppableSlot id={\`\${day}|\${time}\`}>
                                                                    {combinedCourse && (`;

if (content.match(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    console.log('✅ Remplacé la logique d\'affichage des cours par la logique combinée');
} else {
    console.log('❌ Pattern d\'affichage des cours non trouvé');
}

// Remplacer aussi la fermeture du map
const closingPattern = /\)\}\s*<\/DroppableSlot>/;
const newClosing = `)}
                                                                </DroppableSlot>`;

if (content.match(closingPattern)) {
    content = content.replace(closingPattern, newClosing);
    console.log('✅ Remplacé la fermeture du map');
}

// Remplacer l'affichage de la carte individuelle par l'affichage de la carte combinée
const cardPattern = /<CourseBadge\s+key=\{\`\$\{course!\}\.id\}-\$\{refreshKey\}\`\}\s+course=\{course!\}\s+onUnassign=\{handleUnassign\}\s+conflicts=\{conflicts\}\s+\/>/;

const newCard = `<CourseBadge 
                                                                            key={\`\${combinedCourse.id}-\${refreshKey}\`}
                                                                            course={combinedCourse}
                                                                            onUnassign={handleUnassign}
                                                                            conflicts={conflicts}
                                                                        />`;

if (content.match(cardPattern)) {
    content = content.replace(cardPattern, newCard);
    console.log('✅ Remplacé l\'affichage de la carte par la carte combinée');
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec la logique de cartes combinées');