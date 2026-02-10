const bcrypt = require('bcryptjs');

async function hash12345678() {
  console.log('Génération du hash pour "12345678"...');
  
  const hash = await bcrypt.hash('12345678', 12);
  console.log(`12345678 -> ${hash}`);
  
  console.log('\n--- POUR MISE À JOUR MANUELLE DANS SUPABASE ---');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = '25064@supnum.mr';`);
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'student@supnum.mr';`);
}

hash12345678().catch(console.error);
