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

    const success = TimetableDatabase.saveData(userId, dataType, dataContent);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Données ${dataType} sauvegardées avec succès`
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la sauvegarde' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erreur API sauvegarde:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
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

    let successCount = 0;
    const dataTypes = ['assignment_rows', 'schedule', 'config', 'custom_rooms', 'custom_subjects'];

    for (const dataType of dataTypes) {
      if (allData[dataType] !== undefined) {
        const success = TimetableDatabase.saveData(userId, dataType as any, allData[dataType]);
        if (success) successCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${successCount} types de données sauvegardés avec succès`,
      savedCount: successCount
    });
  } catch (error) {
    console.error('Erreur API sauvegarde complète:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}