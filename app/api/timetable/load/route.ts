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

    if (dataType) {
      // Charger un type de données spécifique
      const data = TimetableDatabase.loadData(userId, dataType as any);
      return NextResponse.json({
        success: true,
        data: data,
        dataType: dataType
      });
    } else {
      // Charger toutes les données
      const allData = TimetableDatabase.loadAllData(userId);
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
      const data = TimetableDatabase.loadData(userId, dataType);
      return NextResponse.json({
        success: true,
        data: data,
        dataType: dataType
      });
    } else {
      // Charger toutes les données
      const allData = TimetableDatabase.loadAllData(userId);
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