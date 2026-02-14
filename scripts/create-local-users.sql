-- Créer les utilisateurs admin et etudiant dans Supabase
-- Ces utilisateurs remplacent les comptes @supnum.mr pour les tests

-- Supprimer les anciens utilisateurs s'ils existent
DELETE FROM users WHERE username IN ('admin', 'etudiant');

-- Insérer les nouveaux utilisateurs
INSERT INTO users (username, email, password_hash, role, name, is_active) VALUES
('admin', 'admin@supnum.mr', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'admin', 'Administrateur', true),
('etudiant', 'etudiant@supnum.mr', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'etudiant', 'Étudiant', true);

-- Hash pour "admin123" et "etudiant123"
-- Les deux utilisent le même hash pour simplifier: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm

-- Vérifier les utilisateurs créés
SELECT username, email, role, name, is_active, created_at FROM users 
WHERE username IN ('admin', 'etudiant')
ORDER BY username;
