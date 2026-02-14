import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validation des entrées
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username et password sont requis' },
        { status: 400 }
      );
    }

    console.log('🔐 Tentative de connexion pour:', username);

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rechercher l'utilisateur dans Supabase
    console.log('🔍 Recherche utilisateur:', username);
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      console.error('❌ Utilisateur non trouvé:', error);
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    console.log('✅ Utilisateur trouvé:', user.username, 'Hash:', user.password_hash?.substring(0, 20) + '...');

    // Vérifier le mot de passe avec bcrypt
    console.log('🔐 Vérification du mot de passe...');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 Résultat vérification:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.error('❌ Mot de passe incorrect pour:', username);
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    console.log('✅ Authentification réussie pour:', username);

    // Générer le token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retourner les données utilisateur (sans le mot de passe)
    const { password_hash, ...secureUser } = user;

    return NextResponse.json({
      success: true,
      user: secureUser,
      token
    });

  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'authentification' },
      { status: 500 }
    );
  }
}
