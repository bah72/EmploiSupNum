const bcrypt = require('bcryptjs');

async function hashPasswords() {
  const passwords = {
    'admin123': '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm',
    'prof123': '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'student123': '$2b$12$8K1O9G9xZvZzZvZvZvZvZOZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZ'
  };

  console.log('Génération des hashes de mots de passe...');
  
  for (const [password, existingHash] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`${password} -> ${hash}`);
  }
}

hashPasswords().catch(console.error);
