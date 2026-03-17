import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [cols] = await conn.execute('DESCRIBE causal_analyses');
const colNames = cols.map(c => c.Field);
console.log('Current columns:', colNames.join(', '));

const toAdd = [
  { name: 'sampleSize', sql: 'ADD COLUMN sampleSize INT NULL' },
  { name: 'methodology', sql: 'ADD COLUMN methodology VARCHAR(128) NULL' },
  { name: 'analysisNotes', sql: 'ADD COLUMN analysisNotes TEXT NULL' },
  { name: 'outcomeValue', sql: 'ADD COLUMN outcomeValue DECIMAL(10,4) NULL' },
  { name: 'lastUpdated', sql: 'ADD COLUMN lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
];

for (const col of toAdd) {
  if (colNames.includes(col.name)) {
    console.log('Column already exists:', col.name);
  } else {
    await conn.execute('ALTER TABLE causal_analyses ' + col.sql);
    console.log('Added column:', col.name);
  }
}

await conn.end();
console.log('Done');
