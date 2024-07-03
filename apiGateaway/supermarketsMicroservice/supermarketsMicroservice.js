const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
//const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { check, validationResult } = require('express-validator');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'uominiseksi', resave: true, saveUninitialized: true }));
app.use('/public', express.static(path.join(__dirname,  'public')));
const router = express.Router();
const jwt = require('jsonwebtoken');
const sql = require('mssql'); 
const { createSecretKey } = require('crypto');
const cookieParser = require('cookie-parser');
router.use(cookieParser());
app.use(cookieParser());
const secretKey = 'uominiseksi';
app.use(express.json());

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};


let pool;

async function connectToDb() {
  try {
    pool = await sql.connect(config);
    console.log('Connessione al database riuscita');
  } catch (err) {
    console.error('Errore durante la connessione al database:', err);
    // Gestisci l'errore in base alle tue esigenze
  }
}

connectToDb(); 





router.get('/login-supermarket', (req, res) => {
  const filePath = path.join(__dirname, 'HTML', 'login-supermarket.html');
  res.sendFile(filePath);
});

router.get('/register-supermarket', (req, res) => {
  const filePath = path.join(__dirname, 'HTML', 'register-supermarket.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).send(data);
    }
  });
});

router.post('/register-supermarket', [
  check('username').notEmpty().withMessage('Username is required'),
  check('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 5 }).withMessage('Password must be at least 5 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter'),
], async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Check if supermarket already exists
    const checkSupermarketQuery = 'SELECT * FROM [user] WHERE username = @username';
    const poolRequest = pool.request();
    poolRequest.input('username', sql.VarChar, username);
    const existingSupermarket = await poolRequest.query(checkSupermarketQuery);

    if (existingSupermarket.recordset.length > 0) {
      return res.status(400).send('Supermarket already exists');
    }

    // Insert new supermarket and get the ID of the inserted row
    const insertSupermarketQuery = 'INSERT INTO [user] (username, password, dipendente) OUTPUT INSERTED.id VALUES (@username, @password, 1)';
    const hashedPassword = bcrypt.hashSync(password, 10);
    const insertRequest = pool.request();
    insertRequest.input('username', sql.VarChar, username);
    insertRequest.input('password', sql.VarChar, hashedPassword);

    const insertResult = await insertRequest.query(insertSupermarketQuery);
    const supermarketId = insertResult.recordset[0].id; // Ottieni l'ID del supermercato appena inserito

    const redirectUrl = '/login-supermarket';
    res.status(200).json({ message: 'Registration successful', redirect: redirectUrl, supermarketId });

  } catch (err) {
    console.error('Error during supermarket registration:', err);
    res.status(500).send('Internal Server Error');
  }
});




router.post('/login-supermarket', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query to fetch supermarket details by username
    const query = 'SELECT * FROM [user] WHERE username = @username AND dipendente = 1';
    const poolRequest = pool.request();
    poolRequest.input('username', sql.VarChar, username);

    const result = await poolRequest.query(query);
    const supermarket = result.recordset[0];

    if (!supermarket) {
      return res.status(401).send('Authentication Failed: Supermarket not found or not authorized');
    }

    // Compare password using bcrypt
    bcrypt.compare(password, supermarket.password, (bcryptErr, bcryptResult) => {
      if (bcryptErr) {
        console.error('Error during bcrypt comparison:', bcryptErr);
        return res.status(500).send('Internal Server Error');
      }

      if (bcryptResult) {
        const token = jwt.sign({ username, supermarketId: supermarket.id }, secretKey, { expiresIn: '1h' });
        console.log("login - username:", username);
        console.log("login - supermarketId:", supermarket.id);
        console.log("tokenspmprima ",  token);
        res.cookie('token', token, { httpOnly: true });
        console.log("tokenspmdopo ",  token);
         res.status(200).json({ 
          message: 'Login successful', 
          redirect: '/supermarket-welcome', 
          username, 
          supermarketId: supermarket.id 
        });
      } else {
        res.status(401).send('Authentication Failed');
      }
    });

  } catch (err) {
    console.error('Error during supermarket login:', err);
    res.status(500).send('Internal Server Error');
  }
});



router.get('/supermarket-welcome', (req, res) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).send('Token mancante');
  }

  jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => { 
    if (err) {
      return res.status(401).send('Token non valido');
    }

    const username = decoded.username;

    // Query per ottenere il messaggio di benvenuto (puoi personalizzarlo a tuo piacimento)
    const query = 'SELECT * FROM [user] WHERE username = @username AND dipendente = 1';

    const poolRequest = pool.request();
    poolRequest.input('username', sql.VarChar, username);

    poolRequest.query(query, (dbErr, result) => {
      if (dbErr) {
        console.error('Error retrieving supermarket details:', dbErr);
        return res.status(500).send('Internal Server Error');
      }

      if (result.recordset.length === 0) {
        return res.status(401).send('Supermarket not found or not authorized');
      }

      const supermarket = result.recordset[0];
      const filePath = path.join(__dirname, 'HTML', 'supermarket-welcome.html');

      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error('Error reading welcome file:', readErr);
          return res.status(500).send('Internal Server Error');
        }

        const welcomeMessage = `Welcome, ${supermarket.username || 'Guest'}!`;
        const renderedHTML = data.replace('<!--#welcome-message-->', welcomeMessage);

        const spmWelcomeMessage = supermarket.username
          ? `Welcome, ${supermarket.username}! What products do you want to add?`
          : 'Welcome, Guest!';

        const spmRenderedHTML = renderedHTML.replace('<!--#welcome-user-->', spmWelcomeMessage);
        res.status(200).send(spmRenderedHTML);
      });
    });
  });
});





router.get('/supermercatoS', (req, res) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).send('Token mancante');
  }

  jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).send('Token non valido');
    }
    const filePath = path.join(__dirname,  'HTML', 'supermercatoS.html');
    fs.readFile(filePath, 'utf8', (readErr, data) => {
      if (readErr) {
        console.error(readErr);
        return res.status(500).send('Internal Server Error');
      }

      res.status(200).send(data);
    });
  });
});

router.get('/aggiungiprodotti', (req, res) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).send('Token mancante');
  }

  jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).send('Token non valido');
    }

    const username = decoded.username; // Accedi all'username dal token decodificato
    const supermarketId = decoded.supermarketId; // Accedi al supermarketId dal token decodificato
    console.log("aggiungi - username:", username);
    console.log("aggiungi - supermarketId:", supermarketId);

    const filePath = path.join(__dirname, 'HTML', 'aggiungiprodotti.html');
    fs.readFile(filePath, 'utf8', (readErr, data) => {
      if (readErr) {
        console.error(readErr);
        return res.status(500).send('Internal Server Error');
      }

      res.status(200).send(data);
    });
  });
});


router.post('/save-product', (req, res) => {
  const { productName, productCategory, productPrice, productDescription, supermarketId } = req.body;
  console.log("router-save", productName);

  const pool = new sql.ConnectionPool(config);
  pool.connect().then(() => {
    const transaction = new sql.Transaction(pool);
    transaction.begin(err => {
      if (err) {
        console.error('Errore durante l\'inizio della transazione:', err);
        return res.status(500).json({ error: 'Internal Server Error', details: err.message });
      }

      // Verifica che supermarketId sia un numero intero valido
      if (!Number.isInteger(supermarketId)) {
        return res.status(400).json({ error: 'Invalid supermarketId', details: 'supermarketId must be a valid integer.' });
      }

      const request = new sql.Request(transaction);
      request.input('productName', sql.VarChar, productName);
      request.input('productCategory', sql.VarChar, productCategory);
      request.input('productPrice', sql.Decimal(10, 2), productPrice);
      request.input('productDescription', sql.VarChar, productDescription);
      request.input('supermarketId', sql.Int, supermarketId);

      const insertProductQuery = `
        INSERT INTO [prodotti] (name, category, price, description, supermarket_id) 
        VALUES (@productName, @productCategory, @productPrice, @productDescription, @supermarketId);
      `;

      request.query(insertProductQuery, (err, result) => {
        if (err) {
          console.error('Errore durante l\'esecuzione della query di inserimento:', err);
          transaction.rollback(rollbackErr => {
            if (rollbackErr) {
              console.error('Errore durante il rollback della transazione:', rollbackErr);
              return res.status(500).json({ error: 'Internal Server Error', details: rollbackErr.message });
            }
            return res.status(500).json({ error: 'Internal Server Error', details: err.message });
          });
        } else {
          transaction.commit(commitErr => {
            if (commitErr) {
              console.error('Errore durante il commit della transazione:', commitErr);
              return res.status(500).json({ error: 'Internal Server Error', details: commitErr.message });
            }
            console.log("Prodotto salvato con successo:", productName);
            
          });
        }
      });
    });
  }).catch(err => {
    console.error('Errore durante la connessione al database:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });
});


router.get('/get-products', (req, res) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).send('Token mancante');
  }

  jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).send('Token non valido');
    }

    const supermarketId = req.query.supermarketId; // Retrieve supermarketId from query parameters
    console.log("supermarketID", supermarketId);
    const username = req.query.username; // Retrieve supermarketId from query parameters
    console.log("supermarketID", username);
    
    // Validate if supermarketId is present
    if (!supermarketId) {
      return res.status(400).json({ error: 'Parametro supermarketId mancante' });
    }

    // Query to get products for the specified supermarketId
    const getProductsQuery = 'SELECT * FROM [prodotti] WHERE supermarket_id = @supermarketId';

    const poolRequest = pool.request();
    poolRequest.input('supermarketId', sql.VarChar, supermarketId);

    poolRequest.query(getProductsQuery, (dbErr, result) => {
      if (dbErr) {
        console.error('Error retrieving products:', dbErr);
        return res.status(500).json({ error: 'Internal Server Error', details: dbErr.message });
      }

      // Return the products as JSON response
      return res.status(200).json(result.recordset);
    });
  });
});




router.get('/get-products-user', (req, res) => {
  const getProductsQuery = 'SELECT * FROM [prodotti]';

  pool.request().query(getProductsQuery, (err, result) => {
    if (err) {
      console.error('Error retrieving products:', err);
      return res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
    return res.status(200).json(result.recordset);
  });
});



module.exports = router;