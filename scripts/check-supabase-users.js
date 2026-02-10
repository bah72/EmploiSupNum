const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('🔍 Vérification des utilisateurs dans Supabase...\n');
  
  try {
    // Récupérer tous les utilisateurs
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('username');
    
    if (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️ Aucun utilisateur trouvé dans la table users');
      return;
    }
    
    console.log(`📋 ${users.length} utilisateur(s) trouvé(s):\n`);
    
    for (const user of users) {
      console.log(`👤 ${user.username}`);
      console.log(`   Rôle: ${user.role}`);
      console.log(`   Actif: ${user.is_active ? '✅' : '❌'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Hash: ${user.password_hash ? '✅' : '❌'}`);
      
      // Vérifier si le hash correspond à "12345678"
      const isValidPassword = await bcrypt.compare('12345678', user.password_hash || '');
      console.log(`   Mot de passe "12345678": ${isValidPassword ? '✅ Valide' : '❌ Invalide'}`);
      
      console.log('');
    }
    
    // Test de connexion
    console.log('🧪 Test de connexion...\n');
    
    const testUsers = [
      { username: 'moussa.ba@supnum.mr', password: '12345678' },
      { username: 'student@supnum.mr', password: '12345678' }
    ];
    
    for (const testUser of testUsers) {
      console.log(`🔐 Test: ${testUser.username}`);
      
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', testUser.username)
        .eq('is_active', true)
        .single();
      
      if (error || !user) {
        console.log(`   ❌ Utilisateur non trouvé ou inactif`);
        continue;
      }
      
      const isValid = await bcrypt.compare(testUser.password, user.password_hash);
      console.log(`   ${isValid ? '✅ Connexion réussie' : '❌ Mot de passe incorrect'}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkUsers();
