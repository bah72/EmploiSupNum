const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Fonction à ajouter
const functionToAdd = `
    // Fonction pour combiner les cours dans un même créneau
    const getCombinedCourseInfo = (courseIds: string[]) => {
        if (!courseIds || courseIds.length === 0) return null;
        if (courseIds.length === 1) {
            // Un seul cours - retourner tel quel
            const course = assignmentRows.find(r => r.id === courseIds[0]);
            return course ? { ...course, isCombined: false } : null;
        }
        
        // Plusieurs cours - créer une carte combinée
        const courses = courseIds.map(id => assignmentRows.find(r => r.id === id)).filter(c => c !== undefined);
        if (courses.length === 0) return null;
        
        // Combiner les informations
        const subjects = courses.map(c => c.subject).join('/');
        const teachers = courses.map(c => c.teacher).join('/');
        const rooms = courses.map(c => c.room).join('/');
        const types = courses.map(c => c.type).join('/');
        
        return {
            id: courseIds.join('_'),
            subject: subjects,
            subjectLabel: courses.map(c => c.subjectLabel).join('/'),
            type: types,
            mainGroup: courses[0].mainGroup,
            sharedGroups: courses[0].sharedGroups,
            subLabel: types,
            teacher: teachers,
            room: rooms,
            semester: courses[0].semester,
            isCombined: true,
            originalCourses: courses
        };
    };
`;

// Trouver la ligne avec activeDragItem et ajouter la fonction après
const pattern = /const \[activeDragItem, setActiveDragItem\] = useState<AssignmentRow \| null>\(null\);/;
const match = content.match(pattern);

if (match) {
    const insertPoint = content.indexOf(match[0]) + match[0].length;
    content = content.slice(0, insertPoint) + functionToAdd + content.slice(insertPoint);
    console.log('✅ Fonction getCombinedCourseInfo ajoutée après activeDragItem');
} else {
    console.log('❌ Déclaration activeDragItem non trouvée');
}

// Écrire le fichier modifié
fs.writeFileSync('app/page.tsx', content);
console.log('✅ Fichier sauvegardé');