const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initializeDatabase() {
  console.log('🚀 Initialisation de la base de données Supabase...');
  
  try {
    // Créer les utilisateurs initiaux
    const users = [
      {
        username: 'moussa.ba@supnum.mr',
        email: 'moussa.ba@supnum.mr',
        password: 'admin12345678',
        role: 'admin',
        name: 'Moussa Ba (Admin)'
      },
      {
        username: 'prof@supnum.mr',
        email: 'prof@supnum.mr',
        password: 'prof12345678',
        role: 'prof',
        name: 'Professeur'
      },
      {
        username: 'student@supnum.mr',
        email: 'student@supnum.mr',
        password: 'student12345678',
        role: 'student',
        name: 'Étudiant'
      }
    ];

    for (const userData of users) {
      console.log(`📝 Création de l'utilisateur: ${userData.username}`);
      
      // Hasher le mot de passe
      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      // Insérer l'utilisateur
      const { data, error } = await supabase
        .from('users')
        .upsert({
          username: userData.username,
          email: userData.email,
          password_hash: passwordHash,
          role: userData.role,
          name: userData.name,
          is_active: true,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'username'
        })
        .select();
      
      if (error) {
        console.error(`❌ Erreur lors de la création de ${userData.username}:`, error);
      } else {
        console.log(`✅ Utilisateur ${userData.username} créé avec succès`);
      }
    }
    
    console.log('🎉 Initialisation terminée avec succès !');
    console.log('\n📋 Comptes créés:');
    console.log('🔑 moussa.ba@supnum.mr / admin12345678 (admin)');
    console.log('🔑 prof@supnum.mr / prof12345678 (prof)');
    console.log('🔑 student@supnum.mr / student12345678 (student)');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

initializeDatabase();
