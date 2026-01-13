// Script pour améliorer l'affichage des cartes combinées
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Améliorer l'affichage des informations combinées dans les cartes
// Modifier l'affichage du sujet pour les cours combinés
content = content.replace(
    /<span className="font-bold text-\[11px\] text-slate-800 leading-tight">{course\.subject}<\/span>/g,
    `<span className="font-bold text-[11px] text-slate-800 leading-tight" title={course.isCombined ? course.originalCourses?.map(c => c.subjectLabel || c.subject).join(' + ') : course.subjectLabel}>
                        {course.subject}
                    </span>`
);

// 2. Améliorer l'affichage des enseignants pour les cours combinés
content = content.replace(
    /<div className="text-\[9px\] font-medium text-slate-700 leading-tight">\s*{teacher \|\| 'Non assigné'}\s*<\/div>/g,
    `<div className="text-[9px] font-medium text-slate-700 leading-tight" title={course.isCombined ? 'Cours combinés: ' + course.teacher : course.teacher}>
                        {teacher || 'Non assigné'}
                    </div>`
);

// 3. Améliorer l'affichage des salles pour les cours combinés
content = content.replace(
    /<span className="text-\[8px\] text-slate-500 font-medium">{course\.room}<\/span>/g,
    `<span className="text-[8px] text-slate-500 font-medium" title={course.isCombined ? 'Salles: ' + course.room : course.room}>
                        {course.room}
                    </span>`
);

// 4. Modifier l'affichage du badge pour les cours combinés
content = content.replace(
    /<span className={\`text-\[9px\] font-black px-2 py-0\.5 rounded-full text-white \${colors\.badge}\`}>{course\.type}<\/span>/g,
    `<span className={\`text-[9px] font-black px-2 py-0.5 rounded-full text-white \${colors.badge}\`} title={course.isCombined ? 'Types combinés: ' + course.type : course.type}>
                        {course.type}
                    </span>`
);

// 5. Ajouter un indicateur visuel pour les cours combinés
content = content.replace(
    /className={\`relative rounded-lg border-2 \${colors\.border} border-l-2 \${colors\.borderLeft} \${colors\.bg}/g,
    `className={\`relative rounded-lg border-2 \${colors.border} border-l-2 \${colors.borderLeft} \${colors.bg} \${course.isCombined ? 'ring-1 ring-purple-300' : ''}`
);

// 6. Ajouter un petit indicateur "COMBINÉ" pour les cours fusionnés
content = content.replace(
    /{isDragging && isCtrlPressed && \(/g,
    `{course.isCombined && (
                <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold z-10">
                    {course.originalCourses?.length || 2}
                </div>
            )}
            {isDragging && isCtrlPressed && (`
);

// 7. Améliorer le calcul des sessions pour les cours combinés
content = content.replace(
    /const getSessionsInfo = \(subject: string, semester: string\) => \{[\s\S]*?return \{ realized: realizedSessions, total: totalSessions \};\s*\};/g,
    `const getSessionsInfo = (subject: string, semester: string, isCombined = false, originalCourses = []) => {
        if (isCombined && originalCourses.length > 0) {
            // Pour les cours combinés, additionner les sessions de tous les cours
            let totalRealized = 0;
            let totalExpected = 0;
            
            originalCourses.forEach(course => {
                const subjectData = customSubjects
                    .find((sem: any) => sem.semestre === course.semester)
                    ?.matieres.find((mat: any) => mat.code === course.subject);
                
                if (subjectData) {
                    const credit = subjectData.credit || 0;
                    totalExpected += credit * 8;
                    
                    const realizedSessions = Object.values(schedule).filter(courseId => {
                        if (!courseId) return false;
                        const scheduledCourse = assignmentRows.find(r => r.id === courseId);
                        return scheduledCourse && scheduledCourse.subject === course.subject && scheduledCourse.semester === course.semester;
                    }).length;
                    
                    totalRealized += realizedSessions;
                }
            });
            
            return { realized: totalRealized, total: totalExpected };
        }
        
        // Logique normale pour un seul cours
        const subjectData = customSubjects
            .find((sem: any) => sem.semestre === semester)
            ?.matieres.find((mat: any) => mat.code === subject);
        
        if (!subjectData) return { realized: 0, total: 0 };
        
        const credit = subjectData.credit || 0;
        const totalSessions = credit * 8;
        
        const realizedSessions = Object.values(schedule).filter(courseId => {
            if (!courseId) return false;
            const course = assignmentRows.find(r => r.id === courseId);
            return course && course.subject === subject && course.semester === semester;
        }).length;
        
        return { realized: realizedSessions, total: totalSessions };
    };`
);

// 8. Modifier l'appel à getSessionsInfo pour les cours combinés
content = content.replace(
    /const sessionsInfo = getSessionsInfo\(course\.subject, course\.semester\);/g,
    `const sessionsInfo = getSessionsInfo(course.subject, course.semester, course.isCombined, course.originalCourses);`
);

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Affichage des cartes combinées amélioré !');
console.log('📋 Améliorations :');
console.log('  • Tooltips informatifs sur tous les éléments');
console.log('  • Indicateur numérique du nombre de cours combinés');
console.log('  • Bordure violette distinctive pour les cours combinés');
console.log('  • Calcul correct des sessions pour les cours fusionnés');
console.log('  • Affichage optimisé des informations multiples');