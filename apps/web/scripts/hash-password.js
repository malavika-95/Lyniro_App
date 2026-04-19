const bcrypt = require('bcrypt');

const password = 'demo1234';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
  } else {
    console.log('Hash for "demo1234":', hash);
  }
});
