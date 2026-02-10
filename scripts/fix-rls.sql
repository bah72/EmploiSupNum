-- Correction des politiques RLS pour Supabase

-- 1. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- 2. Créer des politiques plus permissives pour l'authentification
CREATE POLICY "Enable read access for all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON users
    FOR UPDATE USING (true);

-- 3. Vérifier que RLS est activé
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Tester la connexion
SELECT username, role, is_active FROM users WHERE is_active = true;
