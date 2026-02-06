-- ========================================
-- SCRIPT D'INITIALISATION DES UTILISATEURS
-- ========================================

-- Ce script doit être exécuté une seule fois pour initialiser les utilisateurs par défaut

-- Insérer les utilisateurs par défaut s'ils n'existent pas
INSERT INTO app_users (id, username, email, role, name, is_active, created_at, updated_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'moussa.ba',
    'moussa.ba@supnum.mr',
    'admin',
    'Moussa Ba',
    true,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'cheikh.dhib',
    'cheikh.dhib@supnum.mr',
    'prof',
    'Cheikh Dhib',
    true,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '25064',
    '25064@supnum.mr',
    'student',
    'Étudiant 25064',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Vérification de l'insertion
SELECT 
  username,
  email,
  role,
  name,
  is_active,
  created_at
FROM app_users 
WHERE username IN ('moussa.ba', 'cheikh.dhib', '25064')
ORDER BY username;
