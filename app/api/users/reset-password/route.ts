import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'ID utilisateur et nouveau mot de passe requis' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Configuration Supabase manquante' },
        { status: 500 }
      );
    }

    // Hasher le nouveau mot de passe
    console.log('🔐 Hachage du nouveau mot de passe...');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    console.log('✅ Hash généré:', passwordHash.substring(0, 20) + '...');

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mettre à jour le mot de passe
    console.log('💾 Mise à jour dans Supabase pour userId:', userId);
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur lors de la réinitialisation:', error);
      return NextResponse.json(
        { error: `Erreur lors de la réinitialisation: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Mot de passe mis à jour avec succès pour:', data.username);
    return NextResponse.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès' 
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: `Erreur serveur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}
