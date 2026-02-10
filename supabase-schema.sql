-- Création de la table users pour l'authentification sécurisée
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'prof', 'student')),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  last_failed_login TIMESTAMP WITH TIME ZONE,
  failed_login_count INTEGER DEFAULT 0,
  
  -- Contraintes de sécurité
  CONSTRAINT users_username_check CHECK (username ~ '^[a-zA-Z0-9._%+-]+@supnum\.mr$'),
  CONSTRAINT users_email_check CHECK (email ~ '^[a-zA-Z0-9._%+-]+@supnum\.mr$')
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS (Row Level Security) pour Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (
        auth.uid()::text = id::text OR 
        auth.jwt() ->> 'role' = 'admin'
    );

-- Politique : Les admins peuvent voir tous les utilisateurs
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Politique : Les admins peuvent insérer des utilisateurs
CREATE POLICY "Admins can insert users" ON users
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Politique : Les admins peuvent mettre à jour les utilisateurs
CREATE POLICY "Admins can update users" ON users
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Politique : Les utilisateurs peuvent mettre à jour leur propre profil (mot de passe)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (
        auth.uid()::text = id::text
    );

-- Insertion des utilisateurs initiaux
INSERT INTO users (username, email, password_hash, role, name) VALUES
('moussa.ba@supnum.mr', 'moussa.ba@supnum.mr', '$2b$12$U/cKA5eXfTFXoBErWIPBy.A9RriGCeDcUbP34K4L/wKgFSgUOXJAC', 'admin', 'Moussa Ba (Admin)'),
('prof@supnum.mr', 'prof@supnum.mr', '$2b$12$7tzaDJlpyc7Hh.uUS3Adne1NxvNCdbNg/XIwN2AhfyIqV7HNndpeu', 'prof', 'Professeur'),
('student@supnum.mr', 'student@supnum.mr', '$2b$12$iNCZ00dfFJg7yYOz1o1SUuO007huKt2VCFLafsWRgic0L/dPRCiZa', 'student', 'Étudiant')
ON CONFLICT (username) DO NOTHING;

-- Note : Les mots de passe hashés ci-dessus sont pour 12345678
-- admin12345678 -> $2b$12$U/cKA5eXfTFXoBErWIPBy.A9RriGCeDcUbP34K4L/wKgFSgUOXJAC
-- prof12345678 -> $2b$12$7tzaDJlpyc7Hh.uUS3Adne1NxvNCdbNg/XIwN2AhfyIqV7HNndpeu
-- student12345678 -> $2b$12$iNCZ00dfFJg7yYOz1o1SUuO007huKt2VCFLafsWRgic0L/dPRCiZa
