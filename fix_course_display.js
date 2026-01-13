const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Remplacer l'affichage des cours multiples par l'affichage d'un seul cours combiné
// Chercher le pattern exact avec courses.map
const oldPattern = /\{courses\.map\(course => \(\s*<CourseBadge\s+key=\{\`\$\{course!\}\.id\}-\$\{refreshKey\}\`\}\s+course=\{course!\}\s+onUnassign=\{handleUnassign\}\s+conflicts=\{conflicts\}\s+\/>\s*\)\)\}/s;

const newPattern = `{combinedCourse && (
                                                                        <CourseBadge 
                                                                            key={\`\${combinedCourse.id}-\${refreshKey}\`}
                                                                            course={combinedCourse}
                                                                            onUnassign={handleUnassign}
                                                                            conflicts={conflicts}
                                                                        />
                                                                    )}`;

if (content.match(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    console.log('✅ Remplacé courses.map par combinedCourse');
} else {
    // Essayer un pattern plus simple
    const simplePattern = /\{courses\.map\(course => \([\s\S]*?<CourseBadge[\s\S]*?\/>\s*\)\)\}/;
    if (content.match(simplePattern)) {
        content = content.replace(simplePattern, newPattern);
        console.log('✅ Remplacé courses.map par combinedCourse (pattern simple)');
    } else {
        console.log('❌ Pattern courses.map non trouvé');
        
        // Afficher le contexte autour de courses.map pour debug
        const contextMatch = content.match(/courses\.map[\s\S]{0,200}/);
        if (contextMatch) {
            console.log('Contexte trouvé:', contextMatch[0]);
        }
    }
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé');