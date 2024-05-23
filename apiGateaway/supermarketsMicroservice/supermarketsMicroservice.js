const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
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
const { createSecretKey } = require('crypto');

const dbFilePath = path.join(__dirname, 'supermarkets.db');

const dbSupermarkets = new sqlite3.Database(dbFilePath);
const dbFolderPath = path.dirname(dbFilePath);
const spmDbPath = dbFilePath;
const secretKey = 'uominiseksi';

const initSupermarketsDb = () => {
const initSupermarketsDbScript = fs.readFileSync(path.join(__dirname,  'db', 'init-supermarkets-db.sql'), 'utf8');

  dbSupermarkets.run(initSupermarketsDbScript, function (err) {
    if (err) {
      console.error('Error initializing supermarkets database:', err);
    } else {
      console.log('Supermarkets database initialized successfully.');
    }
  });
};

initSupermarketsDb();

const initProductsDb = () => {
  const initProductsDbScript = fs.readFileSync(path.join(__dirname,  'db', 'init-products-db.sql'), 'utf8');

  dbSupermarkets.run(initProductsDbScript, function (err) {
    if (err) {
      console.error('Error initializing products database:', err);
    } else {
      console.log('Products database initialized successfully.');
    }
  });
};
initProductsDb();



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
], (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    const checkSupermarketQuery = 'SELECT * FROM supermarkets WHERE username = ?';

    dbSupermarkets.get(checkSupermarketQuery, [username], (err, existingSupermarket) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Internal Server Error');
      } else if (existingSupermarket) {
        return res.status(400).send('Supermarket already exists');
      } else {
        const insertSupermarketQuery = 'INSERT INTO supermarkets (username, password) VALUES (?, ?)';
        const hash = bcrypt.hashSync(password, 10);

        dbSupermarkets.run(insertSupermarketQuery, [username, hash], insertErr => {
          if (insertErr) {
            console.error(insertErr);
            return res.status(500).send('Internal Server Error');
          } else {
            const redirectUrl = '/login-supermarket';
            res.status(200).json({ message: 'Registration successful', redirect: redirectUrl });
          }
        });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/login-supermarket', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM supermarkets WHERE username = ?';

  dbSupermarkets.get(query, [username], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }

    if (!row) {
      return res.status(401).send('Authentication Failed: Supermarket not found');
    }

    bcrypt.compare(password, row.password, (bcryptErr, bcryptResult) => {
      if (bcryptErr) {
        console.error(bcryptErr);
        return res.status(500).send('Internal Server Error');
      }

      if (bcryptResult) {
        const username = req.body.username;
        //const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful', redirect: '/supermarket-welcome', username });
      } else {
        res.status(401).send('Authentication Failed');
      }
    });
  });
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

    const filePath = path.join(__dirname, 'HTML', 'supermarket-welcome.html');
    fs.readFile(filePath, 'utf8', (readErr, data) => {
      if (readErr) {
        console.error(readErr);
        return res.status(500).send('Internal Server Error');
      }

      const welcomeMessage = `Welcome, ${decoded.username || 'Guest'}!`; // Modifica qui
      const renderedHTML = data.replace('<!--#welcome-message-->', welcomeMessage);

      const spmWelcomeMessage = decoded.username // Modifica qui
        ? `Welcome, ${decoded.username}! What products do you want to add?`
        : 'Welcome, Guest!';
      const spmRenderedHTML = renderedHTML.replace('<!--#welcome-user-->', spmWelcomeMessage);
      

      res.status(200).send(spmRenderedHTML);
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

    const username = decoded.username; // Accedi all'username dai parametri dell'URL
    console.log("aggiungi", username);
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
  const { productName, productCategory, productPrice, productDescription, username } = req.body;
  console.log("router-save", username);
  const insertProductQuery = 'INSERT INTO supermarket_products (name, category, price, description, supermarket_name) VALUES (?, ?, ?, ?, ?)';

  dbSupermarkets.run('BEGIN TRANSACTION');

  dbSupermarkets.run(insertProductQuery, [productName, productCategory, productPrice, productDescription, username], insertErr => {
    if (insertErr) {
      console.error(insertErr);

      dbSupermarkets.run('ROLLBACK', rollbackErr => {
        if (rollbackErr) {
          console.error(rollbackErr);
          return res.status(500).json({ error: 'Internal Server Error', details: rollbackErr.message });
        }
        return res.status(500).json({ error: 'Internal Server Error', details: insertErr.message });
      });
    } else {
      dbSupermarkets.run('COMMIT', commitErr => {
        if (commitErr) {
          console.error(commitErr);
          return res.status(500).json({ error: 'Internal Server Error', details: commitErr.message });
        }
        const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' }); // Generiamo il token con il nome del supermercato
        console.log("saveproducts", username);
        res.status(200).json({ message: 'OK!!', redirect: '/aggiungiprodotti', token, username});
       });
    }
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

    const username = decoded.username; // Accedi all'username dal payload del token decodificato

    console.log("gets", username);
  
    const getProductsQuery = 'SELECT * FROM supermarket_products WHERE supermarket_name = ?';

    dbSupermarkets.all(getProductsQuery, [username], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error', details: err.message });
      } else {
        return res.status(200).json(rows);
      }
    });
  });
});


router.get('/get-products-user', (req, res) => {
  const getProductsQuery = 'SELECT * FROM supermarket_products';

  dbSupermarkets.all(getProductsQuery, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error', details: err.message });
    } else {
      return res.status(200).json(rows);
    }
  });
});



module.exports = router;