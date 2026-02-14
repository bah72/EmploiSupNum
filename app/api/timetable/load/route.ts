import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG API TIMETABLE LOAD ===');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NON DÉFINIE');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NON DÉFINIE');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variables Supabase manquantes');
      return NextResponse.json(
        { success: false, message: 'Configuration Supabase manquante dans Vercel.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId est requis' },
        { status: 400 }
      );
    }

    console.log('Création du client Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Recherche des données pour l\'utilisateur:', userId);

    // Récupérer les données de l'utilisateur
    const { data, error } = await supabase
      .from('timetables')
      .select('data, updated_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Erreur lors du chargement:', error);
      
      // Si aucune donnée trouvée, ce n'est pas une erreur
      if (error.message?.includes('No rows found')) {
        console.log('Aucune donnée trouvée pour l\'utilisateur:', userId);
        return NextResponse.json({
          success: true,
          data: null,
          message: 'Aucune donnée sauvegardée trouvée'
        });
      }
      
      // Vérifier si c'est une erreur de table non trouvée
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'La table "timetables" n\'existe pas. Créez la table avec les colonnes: id (UUID), user_id (TEXT), data (JSON), created_at (TIMESTAMP), updated_at (TIMESTAMP).' 
          },
          { status: 500 }
        );
      }
      
      // Vérifier si c'est une erreur de permissions
      if (error.message?.includes('permission denied')) {
        return NextResponse.json(
          { success: false, message: 'Permissions RLS insuffisantes sur la table "timetables".' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: `Erreur Supabase: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Données trouvées pour:', userId, 'Dernière mise à jour:', data?.updated_at);
    return NextResponse.json({
      success: true,
      data: data?.data || null,
      lastUpdated: data?.updated_at,
      message: 'Données chargées avec succès'
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
