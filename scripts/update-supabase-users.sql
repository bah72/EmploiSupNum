-- Script de mise à jour pour les utilisateurs Supabase
-- Utilisez ce script si vous devez mettre à jour les mots de passe ou rôles

-- Mettre à jour le mot de passe pour moussa.ba@supnum.mr (12345678)
UPDATE users 
SET password_hash = '$2b$12$szLXW4Zy/sH4uz7IhQm.u.LqhcksAFZYpItEDoP31JXn915FDRFz6'
WHERE username = 'moussa.ba@supnum.mr';

-- Mettre à jour le mot de passe pour student@supnum.mr (12345678)
UPDATE users 
SET password_hash = '$2b$12$szLXW4Zy/sH4uz7IhQm.u.LqhcksAFZYpItEDoP31JXn915FDRFz6'
WHERE username = 'student@supnum.mr';

-- Supprimer l'utilisateur 25064@supnum.mr s'il existe
DELETE FROM users WHERE username = '25064@supnum.mr';

-- Vérifier les utilisateurs
SELECT username, role, name, is_active, created_at FROM users ORDER BY username;
