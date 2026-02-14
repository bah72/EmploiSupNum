import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { schedule, assignmentRows, semester, week } = await request.json();

    if (!schedule || !assignmentRows || !semester || week === undefined) {
      return NextResponse.json(
        { error: 'Données incomplètes' },
        { status: 400 }
      );
    }

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sauvegarder l'emploi du temps
    const { data, error } = await supabase
      .from('schedules')
      .upsert({
        id: `${semester}_w${week}`, // ID unique par semestre et semaine
        semester,
        week,
        schedule_data: schedule,
        assignment_rows: assignmentRows,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Emploi du temps sauvegardé avec succès',
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
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');
    const week = searchParams.get('week');

    if (!semester || week === null) {
      return NextResponse.json(
        { error: 'Paramètres semester et week requis' },
        { status: 400 }
      );
    }

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer l'emploi du temps
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', `${semester}_w${week}`)
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
      schedule: data?.schedule_data || {},
      assignmentRows: data?.assignment_rows || []
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
