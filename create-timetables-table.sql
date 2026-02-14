-- Créer la table timetables pour la sauvegarde des plannings
CREATE TABLE IF NOT EXISTS timetables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Désactiver les RLS (Row Level Security) pour permettre l'accès depuis l'API
ALTER TABLE timetables DISABLE ROW LEVEL SECURITY;

-- Créer un index pour optimiser les recherches par utilisateur
CREATE INDEX IF NOT EXISTS idx_timetables_user_id ON timetables(user_id);

-- Créer un index pour le champ updated_at
CREATE INDEX IF NOT EXISTS idx_timetables_updated_at ON timetables(updated_at);

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_timetables_updated_at 
    BEFORE UPDATE ON timetables 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Afficher la structure de la table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'timetables' 
ORDER BY ordinal_position;

-- Insérer un exemple de données (optionnel)
-- INSERT INTO timetables (user_id, data) 
-- VALUES ('admin', '{"assignment_rows": [], "schedule": {}, "config": {}, "custom_rooms": [], "custom_subjects": []}')
-- ON CONFLICT (user_id) DO NOTHING;
