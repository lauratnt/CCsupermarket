const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Percorso del database
const dbPath = path.join(__dirname, 'db', 'supermarkets.db');

// Creazione della connessione al database
const db = new sqlite3.Database(dbPath);

// Lettura dello script di inizializzazione del database dei supermercati
const initSupermarketsScript = fs.readFileSync(path.join(__dirname, 'db', 'init-supermarkets-db.sql'), 'utf8');

// Lettura dello script di inizializzazione del database dei prodotti
const initProductsScript = fs.readFileSync(path.join(__dirname, 'db', 'init-products-db.sql'), 'utf8');

// Esecuzione dello script di inizializzazione del database dei supermercati
db.exec(initSupermarketsScript, function (err) {
  if (err) {
    console.error('Errore durante l\'inizializzazione del database dei supermercati:', err);
  } else {
    console.log('Database dei supermercati inizializzato con successo.');

    // Esecuzione dello script di inizializzazione del database dei prodotti dopo che il database dei supermercati è stato inizializzato
    db.exec(initProductsScript, function (err) {
      if (err) {
        console.error('Errore durante l\'inizializzazione del database dei prodotti:', err);
      } else {
        console.log('Database dei prodotti inizializzato con successo.');
      }

      // Chiusura della connessione al database
      db.close();
    });
  }
});
