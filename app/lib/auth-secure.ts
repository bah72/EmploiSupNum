import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

import { DEFAULT_USERS } from '../constants';

// Configuration Supabase - OBLIGATOIRE
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fonction de secours pour l\'authentification locale
const authenticateLocally = async (username: string, password: string): Promise<AuthResult> => {
  // Simuler un délai réseau
  await new Promise(resolve => setTimeout(resolve, 500));

  const user = DEFAULT_USERS.find(u => u.username === username);

  if (!user) {
    return {
      success: false,
      error: 'Identifiants incorrects (Local)'
    };
  }

  // Comparaison simple pour les utilisateurs par défaut (mots de passe en clair dans constants.ts)
  if (user.password !== password) {
    return {
      success: false,
      error: 'Identifiants incorrects (Local)'
    };
  }

  // Simuler un token JWT pour le mode local
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.username,
      role: user.role,
      name: user.name,
      created_at: new Date().toISOString(),
      is_active: true
    },
    token
  };
};

// Validation de l'URL Supabase
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Ne créer le client Supabase qu'avec une URL valide
const supabase = supabaseUrl && supabaseKey && isValidUrl(supabaseUrl)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (!supabase && typeof window === 'undefined') {
  // En environnement serveur, on peut être plus strict
  if (supabaseUrl || supabaseKey) {
    console.warn('Variables Supabase invalides. Veuillez vérifier NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

// Clé secrète JWT (en production, utiliser une variable d'environnement)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export interface SecureUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'prof' | 'student' | 'etudiant';
  name: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: SecureUser;
  token?: string;
  error?: string;
}

// Hasher un mot de passe
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12; // Plus sécurisé que la valeur par défaut (10)
  return await bcrypt.hash(password, saltRounds);
};

// Vérifier un mot de passe
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Générer un token JWT
export const generateToken = (user: SecureUser): string => {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: '24h', // Token expire après 24h
      issuer: 'supnum-timetable',
      audience: 'supnum-users'
    }
  );
};

// Vérifier un token JWT
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Valider le format de l'email @supnum.mr
export const validateSupnumEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@supnum\.mr$/;
  return emailRegex.test(email.toLowerCase());
};

// Valider la force du mot de passe
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Authentification sécurisée avec Supabase UNIQUEMENT
export const secureAuthenticate = async (username: string, password: string): Promise<AuthResult> => {
  try {
    // Vérifier si Supabase est configuré
    if (!supabase) {
      console.warn('Supabase non configuré, tentative de connexion locale...');
      return await authenticateLocally(username, password);
    }

    // Validation de l'email
    if (!validateSupnumEmail(username)) {
      return {
        success: false,
        error: 'Seuls les comptes @supnum.mr sont autorisés'
      };
    }

    // Validation du mot de passe
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid && password.length > 0) {
      // Ne pas révéler les exigences de mot de passe lors de la connexion
      console.warn('Tentative de connexion avec mot de passe faible:', username);
    }

    // Rechercher l'utilisateur dans Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      // Attendre 1 seconde pour prévenir les attaques par force brute
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: false,
        error: 'Identifiants incorrects'
      };
    }

    // Vérifier le mot de passe
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Attendre 1 seconde pour prévenir les attaques par force brute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mettre à jour la tentative de connexion échouée
      await supabase
        .from('users')
        .update({
          last_failed_login: new Date().toISOString(),
          failed_login_count: (user.failed_login_count || 0) + 1
        })
        .eq('id', user.id);

      return {
        success: false,
        error: 'Identifiants incorrects'
      };
    }

    // Mettre à jour la dernière connexion réussie
    await supabase
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        failed_login_count: 0
      })
      .eq('id', user.id);

    // Générer le token JWT
    const token = generateToken(user);

    // Retourner l'utilisateur sans le mot de passe hashé
    const { password_hash, ...secureUser } = user;

    return {
      success: true,
      user: secureUser as SecureUser,
      token
    };

  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
    return {
      success: false,
      error: 'Erreur serveur lors de l\'authentification'
    };
  }
};

// Créer un utilisateur sécurisé
export const createSecureUser = async (
  username: string,
  password: string,
  role: 'admin' | 'prof' | 'student',
  name: string
): Promise<AuthResult> => {
  try {
    // Vérifier si Supabase est configuré
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase non configuré. Veuillez configurer les variables d\'environnement'
      };
    }

    // Validation de l'email
    if (!validateSupnumEmail(username)) {
      return {
        success: false,
        error: 'L\'email doit se terminer par @supnum.mr'
      };
    }

    // Validation du mot de passe
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: passwordValidation.errors.join(', ')
      };
    }

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return {
        success: false,
        error: 'Cet utilisateur existe déjà'
      };
    }

    // Hasher le mot de passe
    const passwordHash = await hashPassword(password);

    // Créer l'utilisateur
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        email: username,
        password_hash: passwordHash,
        role,
        name,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !newUser) {
      return {
        success: false,
        error: 'Erreur lors de la création de l\'utilisateur'
      };
    }

    // Retourner l'utilisateur sans le mot de passe hashé
    const { password_hash, ...secureUser } = newUser;

    return {
      success: true,
      user: secureUser as SecureUser
    };

  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return {
      success: false,
      error: 'Erreur serveur lors de la création de l\'utilisateur'
    };
  }
};

// Middleware pour vérifier le token
export const authenticateToken = (token: string): SecureUser | null => {
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }

    return decoded as SecureUser;
  } catch (error) {
    return null;
  }
};
