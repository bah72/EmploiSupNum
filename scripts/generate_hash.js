const bcrypt = require('bcryptjs');

const password = '12345678';
const saltRounds = 12;

bcrypt.hash(password, saltRounds).then(hash => {
    console.log('HASH:', hash);
});
