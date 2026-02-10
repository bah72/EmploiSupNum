-- Script pour corriger la contrainte de rôle dans la table users
-- Ce script doit être exécuté dans le "SQL Editor" de votre dashboard Supabase.

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Ajouter la nouvelle contrainte incluant 'etudiant'
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'prof', 'student', 'etudiant'));

-- 3. Ré-exécuter l'insertion des utilisateurs (optionnel si vous relancez seed_users.sql après)
