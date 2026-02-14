import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function PUT(request: NextRequest) {
  try {
    console.log('=== DEBUG API TIMETABLE SAVE ===');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NON DÉFINIE');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NON DÉFINIE');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variables Supabase manquantes');
      return NextResponse.json(
        { success: false, message: 'Configuration Supabase manquante dans Vercel. Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
        { status: 500 }
      );
    }

    const { userId, allData } = await request.json();

    if (!userId || !allData) {
      return NextResponse.json(
        { success: false, message: 'Données manquantes: userId et allData sont requis' },
        { status: 400 }
      );
    }

    console.log('Création du client Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Test de connexion à Supabase...');
    // Test simple de connexion
    const { data: testData, error: testError } = await supabase
      .from('timetables')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Erreur de test de connexion:', testError);
      return NextResponse.json(
        { success: false, message: `Erreur de connexion à Supabase: ${testError.message}. Vérifiez l\'URL et la clé API.` },
        { status: 500 }
      );
    }

    console.log('Connexion réussie, sauvegarde des données...');
    console.log('Utilisateur:', userId);
    console.log('Taille des données:', JSON.stringify(allData).length, 'caractères');

    // Vérifier si la table timetables existe, sinon la créer
    const { error: tableError } = await supabase
      .from('timetables')
      .select('id')
      .limit(1);

    if (tableError && tableError.message?.includes('relation') && tableError.message?.includes('does not exist')) {
      console.error('La table timetables n\'existe pas');
      return NextResponse.json(
        { 
          success: false, 
          message: 'La table "timetables" n\'existe pas dans Supabase. Créez la table avec les colonnes: id (UUID), user_id (TEXT), data (JSON), created_at (TIMESTAMP), updated_at (TIMESTAMP).' 
        },
        { status: 500 }
      );
    }

    // Upsert : mettre à jour si existe, sinon insérer
    const { data, error } = await supabase
      .from('timetables')
      .upsert({
        user_id: userId,
        data: allData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      
      // Vérifier si c'est une erreur de permissions
      if (error.message?.includes('permission denied')) {
        return NextResponse.json(
          { success: false, message: 'Permissions RLS insuffisantes sur la table "timetables". Désactivez RLS ou configurez les politiques.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: `Erreur Supabase: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Données sauvegardées avec succès pour:', userId);
    return NextResponse.json({
      success: true,
      message: 'Planning sauvegardé avec succès !',
      data: data
    });

  } catch (error) {
    console.error('Erreur serveur complète:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Erreur serveur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
      },
      { status: 500 }
    );
  }
}
