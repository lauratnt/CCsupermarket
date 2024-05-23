const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('users.db');

const runSequentialQueries = (queries) => {
  if (queries.length === 0) {
    console.log('Database initialized successfully.');
    db.close();
    return;
  }

  const query = queries.shift();
  db.run(query, (err) => {
    if (err) {
      console.error('Error executing query:', err);
      db.close();
    } else {
      runSequentialQueries(queries);
    }
  });
};

const initDb = () => {
  const initDbScript = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');
  const queries = initDbScript.split(';').filter(query => query.trim() !== '');

  const trimmedQueries = queries.map(query => query.trim());

  runSequentialQueries(trimmedQueries);
};

initDb();
