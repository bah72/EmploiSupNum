import { NextResponse } from 'next/server';
import { TimetableDatabase } from '../../../../lib/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const dataType = searchParams.get('dataType');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId manquant' },
        { status: 400 }
      );
    }

    let targetUserId = userId;

    // Si l'utilisateur n'est pas admin, essayer de charger les données de l'admin
    if (userId !== 'admin') {
      const userData = await TimetableDatabase.loadAllData(userId);
      if (!userData || Object.keys(userData).length === 0) {
        // Pas de données pour cet utilisateur, essayer de charger les données de l'admin
        targetUserId = 'admin';
      }
    }

    if (dataType) {
      // Charger un type de données spécifique
      const data = await TimetableDatabase.loadData(targetUserId, dataType as any);
      console.log(`Chargement de ${dataType} pour ${targetUserId}: ${data ? 'trouvé' : 'non trouvé'}`);
      return NextResponse.json({
        success: true,
        data: data,
        dataType: dataType,
        sourceUser: targetUserId
      });
    } else {
      // Charger toutes les données
      const allData = await TimetableDatabase.loadAllData(targetUserId);
      console.log(`Chargement global pour ${targetUserId}: ${Object.keys(allData).length} types trouvés`);
      return NextResponse.json({
        success: true,
        data: allData,
        sourceUser: targetUserId
      });
    }
  } catch (error) {
    console.error('Erreur API chargement:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, dataType } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId manquant' },
        { status: 400 }
      );
    }

    if (dataType) {
      // Charger un type de données spécifique
      const data = await TimetableDatabase.loadData(userId, dataType);
      return NextResponse.json({
        success: true,
        data: data,
        dataType: dataType
      });
    } else {
      // Charger toutes les données
      const allData = await TimetableDatabase.loadAllData(userId);
      return NextResponse.json({
        success: true,
        data: allData
      });
    }
  } catch (error) {
    console.error('Erreur API chargement:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}