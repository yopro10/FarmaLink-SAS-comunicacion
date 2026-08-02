const { Client } = require('pg');

const client = new Client({
  host: 'ep-royal-mountain-ada5k735-pooler.c-2.us-east-1.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_ZUg7Q2bGNoar',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT * FROM medicamentos ORDER BY id ASC');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(console.error);
