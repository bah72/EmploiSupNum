-- Créer les utilisateurs avec mots de passe en clair pour les tests
-- Supprimer les anciens utilisateurs
DELETE FROM users WHERE username IN ('admin@supnum.mr', 'etudiant@supnum.mr');

-- Insérer les nouveaux utilisateurs avec mots de passe en clair
INSERT INTO users (username, email, password_hash, role, name, is_active) VALUES
('admin@supnum.mr', 'admin@supnum.mr', 'admin123', 'admin', 'Administrateur', true),
('etudiant@supnum.mr', 'etudiant@supnum.mr', 'etudiant123', 'etudiant', 'Étudiant', true);

-- Vérifier les utilisateurs créés
SELECT username, email, role, name, is_active, password_hash FROM users 
WHERE username IN ('admin@supnum.mr', 'etudiant@supnum.mr')
ORDER BY username;
