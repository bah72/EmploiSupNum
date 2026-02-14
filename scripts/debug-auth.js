const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Debug authentification Supabase\n');

// 1. Vérifier les variables
console.log('1️⃣ Variables d\'environnement:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}`);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n❌ Variables manquantes - utilisez node scripts/setup-env.js');
  process.exit(1);
}

// 2. Tester la connexion
console.log('\n2️⃣ Test de connexion Supabase:');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

try {
  // Test simple
  const { data, error } = await supabase.from('users').select('count').single();
  if (error) {
    console.log(`   ❌ Erreur connexion: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    console.log(`   Details: ${error.details}`);
  } else {
    console.log('   ✅ Connexion réussie');
  }
} catch (err) {
  console.log(`   ❌ Erreur critique: ${err.message}`);
}

// 3. Tester la requête d'authentification exacte
console.log('\n3️⃣ Test authentification exacte:');
try {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', 'moussa.ba@supnum.mr')
    .eq('is_active', true)
    .single();

  if (error) {
    console.log(`   ❌ Erreur recherche utilisateur: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    
    // Essayer sans le filtre is_active
    console.log('\n   🔍 Test sans filtre is_active:');
    const { data: user2, error: error2 } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'moussa.ba@supnum.mr')
      .single();
    
    if (error2) {
      console.log(`   ❌ Toujours erreur: ${error2.message}`);
    } else {
      console.log(`   ✅ Utilisateur trouvé (is_active: ${user2.is_active})`);
    }
  } else {
    console.log(`   ✅ Utilisateur trouvé: ${user.username} (role: ${user.role})`);
    
    // Tester le mot de passe
    const isValid = await bcrypt.compare('12345678', user.password_hash);
    console.log(`   🔑 Mot de passe valide: ${isValid ? '✅' : '❌'}`);
  }
} catch (err) {
  console.log(`   ❌ Erreur critique: ${err.message}`);
}

// 4. Lister tous les utilisateurs
console.log('\n4️⃣ Liste des utilisateurs:');
try {
  const { data: users, error } = await supabase
    .from('users')
    .select('username, role, is_active, created_at')
    .order('username');

  if (error) {
    console.log(`   ❌ Erreur liste: ${error.message}`);
  } else {
    console.log(`   ✅ ${users.length} utilisateur(s):`);
    users.forEach(u => {
      console.log(`      - ${u.username} (${u.role}) ${u.is_active ? '✅' : '❌'}`);
    });
  }
} catch (err) {
  console.log(`   ❌ Erreur critique: ${err.message}`);
}

console.log('\n🎯 Diagnostic terminé !');
