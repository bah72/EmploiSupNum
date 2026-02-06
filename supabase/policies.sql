-- ========================================
-- POLITIQUES DE SÉCURITÉ SUPABASE RLS
-- ========================================

-- Activer RLS sur toutes les tables
ALTER TABLE timetable_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLICIES POUR timetable_storage
-- ========================================

-- Policy: Les utilisateurs peuvent lire leurs propres données
CREATE POLICY "Users can view own data" ON timetable_storage
  FOR SELECT USING (
    auth.email() LIKE '%@supnum.mr' AND
    (
      -- Données publiques (config, etc.)
      key IN ('main_db', 'app_users', 'config') OR
      -- Données utilisateur spécifiques
      (key LIKE 'user_%' AND REPLACE(key, 'user_', '') = auth.uid())
    )
  );

-- Policy: Les admins peuvent lire toutes les données
CREATE POLICY "Admins can view all data" ON timetable_storage
  FOR SELECT USING (
    auth.email() LIKE '%@supnum.mr' AND
    EXISTS (
      SELECT 1 FROM app_users 
      WHERE email = auth.email() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

-- Policy: Les utilisateurs peuvent insérer leurs propres données
CREATE POLICY "Users can insert own data" ON timetable_storage
  FOR INSERT WITH CHECK (
    auth.email() LIKE '%@supnum.mr' AND
    (
      -- Données utilisateur spécifiques
      (key LIKE 'user_%' AND REPLACE(key, 'user_', '') = auth.uid()) OR
      -- Admins peuvent insérer des données système
      (
        key IN ('main_db', 'app_users', 'config') AND
        EXISTS (
          SELECT 1 FROM app_users 
          WHERE email = auth.email() 
          AND role = 'admin' 
          AND is_active = true
        )
      )
    )
  );

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres données
CREATE POLICY "Users can update own data" ON timetable_storage
  FOR UPDATE USING (
    auth.email() LIKE '%@supnum.mr' AND
    (
      -- Données utilisateur spécifiques
      (key LIKE 'user_%' AND REPLACE(key, 'user_', '') = auth.uid()) OR
      -- Admins peuvent mettre à jour tout
      EXISTS (
        SELECT 1 FROM app_users 
        WHERE email = auth.email() 
        AND role = 'admin' 
        AND is_active = true
      )
    )
  );

-- Policy: Seuls les admins peuvent supprimer
CREATE POLICY "Only admins can delete data" ON timetable_storage
  FOR DELETE USING (
    auth.email() LIKE '%@supnum.mr' AND
    EXISTS (
      SELECT 1 FROM app_users 
      WHERE email = auth.email() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

-- ========================================
-- POLICIES POUR app_users
-- ========================================

-- Policy: Tout le monde peut voir les utilisateurs actifs (sauf champs sensibles)
CREATE POLICY "Anyone can view active users" ON app_users
  FOR SELECT USING (
    auth.email() LIKE '%@supnum.mr' AND
    is_active = true
  );

-- Policy: Les admins peuvent voir tous les utilisateurs
CREATE POLICY "Admins can view all users" ON app_users
  FOR SELECT USING (
    auth.email() LIKE '%@supnum.mr' AND
    EXISTS (
      SELECT 1 FROM app_users 
      WHERE email = auth.email() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

-- Policy: Seuls les admins peuvent gérer les utilisateurs
CREATE POLICY "Only admins can manage users" ON app_users
  FOR ALL USING (
    auth.email() LIKE '%@supnum.mr' AND
    EXISTS (
      SELECT 1 FROM app_users 
      WHERE email = auth.email() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

-- ========================================
-- INSERTION DES UTILISATEURS PAR DÉFAUT
-- ========================================

-- Insérer les utilisateurs par défaut s'ils n'existent pas
INSERT INTO app_users (id, username, email, role, name, is_active, created_at)
VALUES 
  (
    gen_random_uuid(),
    'moussa.ba',
    'moussa.ba@supnum.mr',
    'admin',
    'Moussa Ba',
    true,
    NOW()
  ),
  (
    gen_random_uuid(),
    'cheikh.dhib',
    'cheikh.dhib@supnum.mr',
    'prof',
    'Cheikh Dhib',
    true,
    NOW()
  ),
  (
    gen_random_uuid(),
    '25064',
    '25064@supnum.mr',
    'student',
    'Étudiant 25064',
    true,
    NOW()
  )
ON CONFLICT (username) DO NOTHING;

-- ========================================
-- TRIGGERS ET FONCTIONS DE SÉCURITÉ
-- ========================================

-- Fonction pour vérifier le domaine email
CREATE OR REPLACE FUNCTION validate_supnum_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@supnum.mr' THEN
    RAISE EXCEPTION 'Seuls les emails @supnum.mr sont autorisés';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour valider les emails
CREATE TRIGGER validate_user_email
  BEFORE INSERT OR UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION validate_supnum_email();

-- Fonction pour logger les accès
CREATE OR REPLACE FUNCTION log_data_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO access_logs (table_name, action, user_email, timestamp)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.email(),
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- VUES SÉCURISÉES
-- ========================================

-- Vue pour les données utilisateur filtrées
CREATE OR REPLACE VIEW user_data_secure AS
SELECT 
  key,
  value,
  updated_at,
  CASE 
    WHEN auth.email() LIKE '%@supnum.mr' THEN value
    ELSE NULL
  END as secure_value
FROM timetable_storage
WHERE auth.email() LIKE '%@supnum.mr';

-- Vue pour les profils utilisateurs publics
CREATE OR REPLACE VIEW user_profiles_public AS
SELECT 
  id,
  username,
  name,
  role,
  is_active,
  created_at
FROM app_users
WHERE is_active = true
AND auth.email() LIKE '%@supnum.mr';
