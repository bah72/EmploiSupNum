const bcrypt = require('bcryptjs');

async function hashNewPasswords() {
  const passwords = {
    'admin12345678': '',
    'prof12345678': '',
    'student12345678': ''
  };

  console.log('Génération des nouveaux hashes de mots de passe...');
  
  for (const [password] of Object.keys(passwords)) {
    const hash = await bcrypt.hash(password, 12);
    passwords[password] = hash;
    console.log(`${password} -> ${hash}`);
  }
  
  console.log('\n--- POUR LE SCHEMA SQL ---');
  console.log('INSERT INTO users (username, email, password_hash, role, name) VALUES');
  console.log(`('moussa.ba@supnum.mr', 'moussa.ba@supnum.mr', '${passwords['admin12345678']}', 'admin', 'Moussa Ba (Admin)'),`);
  console.log(`('prof@supnum.mr', 'prof@supnum.mr', '${passwords['prof12345678']}', 'prof', 'Professeur'),`);
  console.log(`('student@supnum.mr', 'student@supnum.mr', '${passwords['student12345678']}', 'student', 'Étudiant')`);
  console.log('ON CONFLICT (username) DO NOTHING;');
}

hashNewPasswords().catch(console.error);
