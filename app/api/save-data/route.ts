
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { rooms, subjects } = await request.json();

        // Construire le contenu du fichier constants.ts
        const fileContent = `export const ALL_ROOMS = ${JSON.stringify(rooms, null, 2)};
export const MAIN_GROUPS = ["Groupe 1", "Groupe 2", "Groupe 3", "Groupe 4"];
export const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
export const SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

export const MASTER_DB = ${JSON.stringify(subjects, null, 2)};
`;

        // Chemin absolu vers le fichier
        const filePath = path.join(process.cwd(), 'app', 'constants.ts');

        // Écrire le fichier
        fs.writeFileSync(filePath, fileContent, 'utf-8');

        return NextResponse.json({ success: true, message: 'Fichier sauvegardé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du fichier:', error);
        return NextResponse.json({ success: false, message: 'Erreur lors de la sauvegarde' }, { status: 500 });
    }
}
