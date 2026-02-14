import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG API USERS ===');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NON DÉFINIE');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NON DÉFINIE');
    
    // Vérifier si les variables d'environnement sont définies
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variables Supabase manquantes');
      return NextResponse.json(
        { error: 'Configuration Supabase manquante dans Vercel. Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans les Environment Variables de Vercel.' },
        { status: 500 }
      );
    }

    console.log('Création du client Supabase...');
    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Test de connexion à Supabase...');
    // Test simple de connexion
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Erreur de test de connexion:', testError);
      return NextResponse.json(
        { error: `Erreur de connexion à Supabase: ${testError.message}. Vérifiez l\'URL et la clé API.` },
        { status: 500 }
      );
    }

    console.log('Connexion réussie, récupération des utilisateurs...');
    // Récupérer tous les utilisateurs
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, role, name, is_active, created_at')
      .order('created_at', { ascending: false });

    console.log('Résultat Supabase:', { users: users?.length || 0, error: error?.message });

    if (error) {
      console.error('Erreur Supabase:', error);
      
      // Vérifier si c'est une erreur de table non trouvée
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'La table "users" n\'existe pas. Exécutez le script SQL fourni.' },
          { status: 500 }
        );
      }
      
      // Vérifier si c'est une erreur de permissions
      if (error.message?.includes('permission denied')) {
        return NextResponse.json(
          { error: 'Permissions RLS insuffisantes. Désactivez RLS ou configurez les politiques.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: `Erreur Supabase: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Utilisateurs récupérés avec succès:', users?.length || 0);
    return NextResponse.json(users || []);

  } catch (error) {
    console.error('Erreur serveur complète:', error);
    return NextResponse.json(
      { error: `Erreur serveur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, role, name } = await request.json();

    if (!username || !email || !password || !role || !name) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Configuration Supabase manquante' },
        { status: 500 }
      );
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insérer le nouvel utilisateur
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role,
        name,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création:', error);
      return NextResponse.json(
        { error: `Erreur lors de la création: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: `Erreur serveur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Configuration Supabase manquante' },
        { status: 500 }
      );
    }

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Supprimer l'utilisateur
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la suppression:', error);
      return NextResponse.json(
        { error: `Erreur lors de la suppression: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: `Erreur serveur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { is_active } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    if (is_active === undefined) {
      return NextResponse.json(
        { error: 'Statut is_active requis' },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Configuration Supabase manquante' },
        { status: 500 }
      );
    }

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mettre à jour le statut de l'utilisateur
    const { data, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la mise à jour:', error);
      return NextResponse.json(
        { error: `Erreur lors de la mise à jour: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: `Erreur serveur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}
