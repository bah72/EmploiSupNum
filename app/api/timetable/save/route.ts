import { NextResponse } from 'next/server';
import { TimetableDatabase } from '../../../../lib/database';

export async function POST(request: Request) {
  try {
    const { userId, dataType, dataContent } = await request.json();

    if (!userId || !dataType || dataContent === undefined) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    const result = await TimetableDatabase.saveData(userId, dataType, dataContent);

    if (result.success) {
      return NextResponse.json({
        success: true,
        source: result.source,
        message: `Données ${dataType} sauvegardées avec succès sur ${result.source === 'cloud' ? 'le Cloud' : 'le serveur local'}`
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la sauvegarde: ' + (result.error || 'Inconnue'), source: result.source },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erreur API sauvegarde:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur: ' + (error.message || 'Inconnue') },
      { status: 500 }
    );
  }
}

// Sauvegarder toutes les données en une fois
export async function PUT(request: Request) {
  try {
    const { userId, allData } = await request.json();

    if (!userId || !allData) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    const result = await TimetableDatabase.saveAllData(userId, allData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        source: result.source,
        message: `Toutes les données ont été sauvegardées avec succès sur ${result.source === 'cloud' ? 'le Cloud (Supabase)' : 'le serveur local'}`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Erreur lors de la sauvegarde complète: ' + (result.error || 'Inconnue'),
        source: result.source
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Erreur API sauvegarde complète:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur: ' + (error.message || 'Inconnue') },
      { status: 500 }
    );
  }
}