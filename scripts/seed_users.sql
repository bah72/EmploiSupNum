-- Script pour insérer les utilisateurs dans la table public.users
-- Ce script doit être exécuté dans le "SQL Editor" de votre dashboard Supabase.

-- Le mot de passe pour tous ces comptes sera : 12345678
-- Le hash bcrypt généré est : $2b$12$L9JvS70J8qZvRMKuRFWk7.MDJqLL.5Z.e4WLl9.z1TTlrJopMsEtI

INSERT INTO public.users (username, email, password_hash, role, name, is_active)
VALUES 
  ('moussa.ba@supnum.mr', 'moussa.ba@supnum.mr', '$2b$12$L9JvS70J8qZvRMKuRFWk7.MDJqLL.5Z.e4WLl9.z1TTlrJopMsEtI', 'admin', 'Moussa Ba', true),
  ('prof@supnum.mr', 'prof@supnum.mr', '$2b$12$L9JvS70J8qZvRMKuRFWk7.MDJqLL.5Z.e4WLl9.z1TTlrJopMsEtI', 'prof', 'Professeur', true),
  ('student@supnum.mr', 'student@supnum.mr', '$2b$12$L9JvS70J8qZvRMKuRFWk7.MDJqLL.5Z.e4WLl9.z1TTlrJopMsEtI', 'etudiant', 'Étudiant Test', true),
  ('meya.haroune@supnum.mr', 'meya.haroune@supnum.mr', '$2b$12$L9JvS70J8qZvRMKuRFWk7.MDJqLL.5Z.e4WLl9.z1TTlrJopMsEtI', 'prof', 'Meya Haroune', true),
  ('25064@supnum.mr', '25064@supnum.mr', '$2b$12$L9JvS70J8qZvRMKuRFWk7.MDJqLL.5Z.e4WLl9.z1TTlrJopMsEtI', 'etudiant', 'Étudiant 25064', true)
ON CONFLICT (username) DO UPDATE 
SET 
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = true;

-- Vérification
SELECT username, role, is_active FROM public.users;
