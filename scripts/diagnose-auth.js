const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Diagnostic du problème d\'authentification\n');

// 1. Vérifier les variables d'environnement
console.log('1️⃣ Vérification des variables d\'environnement:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Définie' : '❌ Manquante'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Définie' : '❌ Manquante'}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Définie' : '❌ Manquante'}`);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n❌ Variables Supabase manquantes. Veuillez configurer .env.local');
  console.log('💡 Utilisez: node scripts/setup-env.js');
  process.exit(1);
}

// 2. Tester la connexion à Supabase
console.log('\n2️⃣ Test de connexion à Supabase:');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

try {
  const { data, error } = await supabase.from('users').select('count').single();
  if (error) {
    console.log(`   ❌ Erreur de connexion: ${error.message}`);
    process.exit(1);
  }
  console.log('   ✅ Connexion réussie à Supabase');
} catch (error) {
  console.log(`   ❌ Erreur de connexion: ${error.message}`);
  process.exit(1);
}

// 3. Vérifier les utilisateurs
console.log('\n3️⃣ Vérification des utilisateurs:');
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .order('username');

if (error) {
  console.log(`   ❌ Erreur lors de la récupération: ${error.message}`);
  process.exit(1);
}

if (!users || users.length === 0) {
  console.log('   ⚠️ Aucun utilisateur trouvé');
  console.log('   💡 Exécutez le schéma SQL pour créer les utilisateurs');
  process.exit(1);
}

console.log(`   ✅ ${users.length} utilisateur(s) trouvé(s)`);

// 4. Tester les mots de passe
console.log('\n4️⃣ Test des mots de passe:');
const testUsers = [
  { username: 'moussa.ba@supnum.mr', password: '12345678' },
  { username: 'student@supnum.mr', password: '12345678' }
];

for (const testUser of testUsers) {
  console.log(`\n   🔐 Test: ${testUser.username}`);
  
  // Chercher l'utilisateur
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', testUser.username)
    .eq('is_active', true)
    .single();
  
  if (error || !user) {
    console.log(`      ❌ Utilisateur non trouvé ou inactif`);
    continue;
  }
  
  // Vérifier le mot de passe
  const isValid = await bcrypt.compare(testUser.password, user.password_hash);
  console.log(`      ${isValid ? '✅ Mot de passe valide' : '❌ Mot de passe invalide'}`);
  
  if (!isValid) {
    console.log(`      💡 Hash stocké: ${user.password_hash}`);
    
    // Générer le bon hash
    const correctHash = await bcrypt.hash(testUser.password, 12);
    console.log(`      💡 Hash correct: ${correctHash}`);
    console.log(`      💡 SQL pour corriger: UPDATE users SET password_hash = '${correctHash}' WHERE username = '${testUser.username}';`);
  }
}

// 5. Vérifier les politiques RLS
console.log('\n5️⃣ Vérification des politiques RLS:');
const { data: rlsStatus } = await supabase.rpc('get_table_info', { table_name: 'users' }).catch(() => ({ rls_enabled: true }));

console.log(`   RLS activé: ${rlsStatus?.rls_enabled !== false ? '✅' : '❌'}`);

console.log('\n🎉 Diagnostic terminé !');
console.log('\n📝 Résumé:');
console.log('- Si les mots de passe sont invalides, utilisez les SQL fournis pour les corriger');
console.log('- Si RLS est désactivé, activez-le avec: ALTER TABLE users ENABLE ROW LEVEL SECURITY;');
console.log('- Si la connexion échoue, vérifiez vos clés Supabase');
