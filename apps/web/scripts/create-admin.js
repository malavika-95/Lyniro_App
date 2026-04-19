const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash:', hash);
  return hash;
}

hashPassword('LyniroAdmin2026!');
