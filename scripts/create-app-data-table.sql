-- Créer la table pour sauvegarder toutes les données de l'application
CREATE TABLE IF NOT EXISTS app_data (
    id VARCHAR(50) PRIMARY KEY,
    schedule JSONB NOT NULL DEFAULT '{}',
    assignment_rows JSONB NOT NULL DEFAULT '[]',
    config JSONB NOT NULL DEFAULT '{}',
    custom_rooms JSONB NOT NULL DEFAULT '[]',
    custom_subjects JSONB NOT NULL DEFAULT '[]',
    users JSONB NOT NULL DEFAULT '[]',
    current_semester VARCHAR(10) NOT NULL DEFAULT 'S1',
    current_week INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS (Row Level Security)
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour permettre toutes les opérations
CREATE POLICY "Allow all operations on app_data" ON app_data
    FOR ALL USING (true)
    WITH CHECK (true);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_app_data_id ON app_data(id);

-- Commentaires
COMMENT ON TABLE app_data IS 'Table pour sauvegarder toutes les données de l application (planning, cours, config, utilisateurs)';
COMMENT ON COLUMN app_data.id IS 'ID unique pour les données principales de l app';
COMMENT ON COLUMN app_data.schedule IS 'Planning/emploi du temps (créneaux horaires)';
COMMENT ON COLUMN app_data.assignment_rows IS 'Liste des cartes/matières disponibles';
COMMENT ON COLUMN app_data.config IS 'Configuration de l application';
COMMENT ON COLUMN app_data.custom_rooms IS 'Salles personnalisées';
COMMENT ON COLUMN app_data.custom_subjects IS 'Matières personnalisées';
COMMENT ON COLUMN app_data.users IS 'Utilisateurs personnalisés';
COMMENT ON COLUMN app_data.current_semester IS 'Semestre actuel';
COMMENT ON COLUMN app_data.current_week IS 'Semaine actuelle';
