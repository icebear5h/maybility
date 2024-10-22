// testEnv.js
require('dotenv').config({ path: '.env.local' });

console.log(process.env.POSTGRES_PRISMA_URL);
