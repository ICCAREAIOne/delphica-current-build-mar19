import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const tables = ['causal_analyses', 'safety_reviews', 'clinical_sessions', 'dao_protocol_entries', 'causal_graphs', 'clinical_outcomes'];
for (const t of tables) {
  const [cols] = await conn.execute(`DESCRIBE ${t}`);
  console.log(`\n${t}:`, cols.map(c => c.Field).join(', '));
}

// Check if clinical_sessions has any data
const [sess] = await conn.execute('SELECT id FROM clinical_sessions LIMIT 3');
console.log('\nclinical_sessions count:', sess.length, 'ids:', sess.map(s => s.id));

// Check dao_protocol_entries
const [dao] = await conn.execute('SELECT id FROM dao_protocol_entries LIMIT 3');
console.log('dao_protocol_entries count:', dao.length);

// Check causal_graphs
const [cg] = await conn.execute('SELECT id FROM causal_graphs LIMIT 3');
console.log('causal_graphs count:', cg.length, 'ids:', cg.map(g => g.id));

await conn.end();
