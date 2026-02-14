-- Créer la table pour sauvegarder les emplois du temps
CREATE TABLE IF NOT EXISTS schedules (
    id VARCHAR(50) PRIMARY KEY, -- Format: S1_w1, S1_w2, etc.
    semester VARCHAR(10) NOT NULL,
    week INTEGER NOT NULL,
    schedule_data JSONB NOT NULL DEFAULT '{}',
    assignment_rows JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS (Row Level Security)
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour permettre toutes les opérations
CREATE POLICY "Allow all operations on schedules" ON schedules
    FOR ALL USING (true)
    WITH CHECK (true);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_schedules_semester_week ON schedules(semester, week);

-- Commentaires
COMMENT ON TABLE schedules IS 'Table pour sauvegarder les emplois du temps par semestre et semaine';
COMMENT ON COLUMN schedules.id IS 'ID unique au format semestre_semaine (ex: S1_w1)';
COMMENT ON COLUMN schedules.schedule_data IS 'Données de l emploi du temps (créneaux horaires)';
COMMENT ON COLUMN schedules.assignment_rows IS 'Liste des cartes/matières disponibles';
