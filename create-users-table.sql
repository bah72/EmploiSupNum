-- Créer la table users pour la gestion des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'prof', 'etudiant')),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  failed_login_count INTEGER DEFAULT 0
);

-- Désactiver les RLS (Row Level Security) pour permettre l'accès depuis l'API
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Créer un index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insérer un utilisateur admin par défaut (mot de passe: admin123)
INSERT INTO users (username, email, password_hash, role, name, is_active)
VALUES (
  'admin',
  'admin@supnum.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO6', -- admin123
  'admin',
  'Administrateur',
  true
) ON CONFLICT (username) DO NOTHING;

-- Afficher la structure de la table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
