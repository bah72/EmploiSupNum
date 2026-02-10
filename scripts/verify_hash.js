const bcrypt = require('bcryptjs');

const password = '12345678';
const storedHash = '$2b$12$L9JvS70J8qZvRMKuRFWk7.MDJqLL.5Z.e4WLl9.z1TTlrJopMsEtI';
// From seed_users.sql

bcrypt.compare(password, storedHash).then(isValid => {
    console.log('Password valid:', isValid);
    if (!isValid) {
        console.log('⚠️ Generating new hash...');
        bcrypt.hash(password, 12).then(newHash => {
            console.log('NEW HASH:', newHash);
        });
    }
});
