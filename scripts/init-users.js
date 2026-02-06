import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Variables Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utilisateurs par défaut
const defaultUsers = [
  {
    id: 'moussa.ba',
    username: 'moussa.ba',
    email: 'moussa.ba@supnum.mr',
    role: 'admin',
    name: 'Moussa Ba',
    isActive: true
  },
  {
    id: 'cheikh.dhib',
    username: 'cheikh.dhib',
    email: 'cheikh.dhib@supnum.mr',
    role: 'prof',
    name: 'Cheikh Dhib',
    isActive: true
  },
  {
    id: '25064',
    username: '25064',
    email: '25064@supnum.mr',
    role: 'student',
    name: 'Étudiant 25064',
    isActive: true
  }
];

async function initializeUsers() {
  console.log('Initialisation des utilisateurs dans Supabase...');
  
  try {
    // Vérifier si les utilisateurs existent déjà
    const { data: existingUsers, error: fetchError } = await supabase
      .from('timetable_storage')
      .select('value')
      .eq('key', 'app_users')
      .maybeSingle();

    if (fetchError) {
      console.error('Erreur lors de la vérification des utilisateurs:', fetchError);
      return;
    }

    if (existingUsers && existingUsers.value) {
      console.log('Les utilisateurs existent déjà dans Supabase');
      console.log('Utilisateurs existants:', existingUsers.value);
      return;
    }

    // Insérer les utilisateurs par défaut
    const { error: insertError } = await supabase
      .from('timetable_storage')
      .upsert({ 
        key: 'app_users', 
        value: defaultUsers, 
        updated_at: new Date().toISOString() 
      });

    if (insertError) {
      console.error('Erreur lors de l\'insertion des utilisateurs:', insertError);
      return;
    }

    console.log('✅ Utilisateurs initialisés avec succès dans Supabase');
    console.log('Utilisateurs créés:', defaultUsers);

  } catch (error) {
    console.error('Erreur inattendue:', error);
  }
}

// Exécuter l'initialisation
initializeUsers();
