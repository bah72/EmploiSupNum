import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { 
      schedule, 
      assignmentRows, 
      config, 
      customRooms, 
      customSubjects,
      users,
      semester,
      week 
    } = await request.json();

    if (!schedule || !assignmentRows || !config) {
      return NextResponse.json(
        { error: 'Données incomplètes' },
        { status: 400 }
      );
    }

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sauvegarder toutes les données de l'application
    const appData = {
      id: 'app_data_main',
      schedule,
      assignment_rows: assignmentRows,
      config,
      custom_rooms: customRooms || [],
      custom_subjects: customSubjects || [],
      users: users || [],
      current_semester: semester,
      current_week: week,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('app_data')
      .upsert(appData)
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la sauvegarde complète:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Toutes les données sauvegardées avec succès',
      data
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer toutes les données de l'application
    const { data, error } = await supabase
      .from('app_data')
      .select('*')
      .eq('id', 'app_data_main')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erreur lors de la récupération:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || {
        schedule: {},
        assignment_rows: [],
        config: {},
        custom_rooms: [],
        custom_subjects: [],
        users: [],
        current_semester: 'S1',
        current_week: 1
      }
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
