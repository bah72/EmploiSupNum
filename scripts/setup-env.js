const fs = require('fs');
const path = require('path');

console.log('🔧 Configuration des variables Supabase\n');

// Demander les informations à l'utilisateur
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => readline.question(prompt, resolve));

async function setupEnv() {
  console.log('Veuillez fournir vos informations Supabase:');
  console.log('(Allez sur https://supabase.com -> Project -> Settings -> API)\n');
  
  const supabaseUrl = await question('URL du projet Supabase (ex: https://abcdefgh.supabase.co): ');
  const supabaseAnonKey = await question('Clé ANON publique: ');
  const jwtSecret = await question('Clé secrète JWT (laissez vide pour générer): ');
  
  // Générer une clé JWT si non fournie
  const finalJwtSecret = jwtSecret || require('crypto').randomBytes(64).toString('hex');
  
  // Créer le contenu du fichier .env.local
  const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseAnonKey}

# JWT Secret pour l'authentification
JWT_SECRET=${finalJwtSecret}

# Autres configurations
NODE_ENV=development
`;

  // Écrire le fichier .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ Fichier .env.local créé avec succès !');
  console.log('\n📋 Variables configurées:');
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
  console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log(`   JWT_SECRET: ${finalJwtSecret.substring(0, 20)}...`);
  
  console.log('\n🚀 Vous pouvez maintenant lancer: npm run dev');
  
  readline.close();
}

setupEnv().catch(console.error);
