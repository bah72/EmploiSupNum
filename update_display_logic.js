const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Remplacer la logique d'affichage des cours individuels
const oldPattern = /const courseIds = Array\.isArray\(courseValue\) \? courseValue : \(courseValue \? \[courseValue\] : \[\]\);\s*const courses = courseIds\.map\(id => assignmentRows\.find\(c => c\.id === id\)\)\.filter\(c => c !== undefined\);/;

const newPattern = `const courseIds = Array.isArray(courseValue) ? courseValue : (courseValue ? [courseValue] : []);
                                                        const combinedCourse = getCombinedCourseInfo(courseIds);`;

if (content.match(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    console.log('✅ Remplacé la logique de mapping des cours par getCombinedCourseInfo');
} else {
    console.log('❌ Pattern de mapping des cours non trouvé');
}

// Remplacer l'affichage des cours multiples par l'affichage d'un seul cours combiné
const oldMapPattern = /\{courses\.map\(course => \(\s*<CourseBadge\s+key=\{\`\$\{course!\}\.id\}-\$\{refreshKey\}\`\}\s+course=\{course!\}\s+onUnassign=\{handleUnassign\}\s+conflicts=\{conflicts\}\s+\/>\s*\)\)\}/;

const newMapPattern = `{combinedCourse && (
                                                                        <CourseBadge 
                                                                            key={\`\${combinedCourse.id}-\${refreshKey}\`}
                                                                            course={combinedCourse}
                                                                            onUnassign={handleUnassign}
                                                                            conflicts={conflicts}
                                                                        />
                                                                    )}`;

if (content.match(oldMapPattern)) {
    content = content.replace(oldMapPattern, newMapPattern);
    console.log('✅ Remplacé l\'affichage des cours multiples par un cours combiné');
} else {
    console.log('❌ Pattern d\'affichage des cours non trouvé');
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé avec la logique de cours combinés');