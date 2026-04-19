const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'demo1234';
  const hash = await bcrypt.hash(password, 10);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
}

generateHash().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
