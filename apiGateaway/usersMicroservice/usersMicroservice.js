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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'uominiseksi', resave: true, saveUninitialized: true }));
const jwt = require('jsonwebtoken');
const { createSecretKey } = require('crypto');
const sql = require('mssql'); 
const secretKey = 'uominiseksi';
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(express.json());


const router = express.Router();
router.use(cookieParser());
router.use(express.json());

// Configurazione della connessione al database
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



app.use('/public', express.static(path.join(__dirname,  'public')));


router.get('/login', (req, res) => {
  const filePath = path.join(__dirname, 'HTML', 'index.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      console.log('Sending registration form');
      res.status(200).send(data);
    }
  });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = 'SELECT * FROM [user] WHERE username = @username AND dipendente = 0';
    const poolRequest = pool.request();
    poolRequest.input('username', sql.VarChar, username);

    const result = await poolRequest.query(query);
    const user = result.recordset[0];

    if (!user) {
      return res.status(401).send('Authentication Failed: User not found');
    }

  bcrypt.compare(password, user.password, (bcryptErr, bcryptResult) => {
  if (bcryptErr) {
    console.error('Error during bcrypt comparison:', bcryptErr);
    return res.status(500).send('Internal Server Error');
  }

  if (bcryptResult) {
    const token = jwt.sign({ username, userId: user.id }, secretKey, { expiresIn: '1h' });
    console.log("login - username:", username);
    console.log("login - user:", user.id);
    console.log("token: ", token);
    res.cookie('token', token, { httpOnly: true });
     res.status(200).json({ 
      message: 'Login successful', 
      redirect: '/welcome', 
      username, 
      userId: user.id 
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


router.get('/register', (req, res) => {
  const filePath = path.join(__dirname, 'HTML', 'register.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).send(data);
    }
  });
});

router.post('/register', [
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

    // Verifica se l'utente esiste già nel database
    const checkUserQuery = 'SELECT * FROM [user] WHERE username = @username';

    const poolRequest = pool.request();
    poolRequest.input('username', sql.VarChar, username);

    const result = await poolRequest.query(checkUserQuery);
    const existingUser = result.recordset[0];

    if (existingUser) {
      return res.status(400).send('Username already exists');
    }

    // Se l'utente non esiste, procedi con l'inserimento nel database
    const insertUserQuery = 'INSERT INTO [user] (username, password, dipendente) VALUES (@username, @password, 0)';
    const hashedPassword = bcrypt.hashSync(password, 10);

    const insertRequest = pool.request();
    insertRequest.input('username', sql.VarChar, username);
    insertRequest.input('password', sql.VarChar, hashedPassword);

    const insertResult = await insertRequest.query(insertUserQuery);
    console.log(`Inserted user: ${username}`);

    const redirectUrl = '/login';
    res.status(200).json({ message: 'Registration successful', redirect: redirectUrl });

  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/welcome', (req, res) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).send('Token mancante');
  }

  jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => { 
    if (err) {
      return res.status(401).send('Token non valido');
    }

    const filePath = path.join(__dirname, 'HTML', 'welcome.html');
    fs.readFile(filePath, 'utf8', (readErr, data) => {
      if (readErr) {
        console.error(readErr);
        return res.status(500).send('Internal Server Error');
      }

      const welcomeMessage = `Welcome, ${decoded.username || 'Guest'}!`;
      const renderedHTML = data.replace('<!--#welcome-message-->', welcomeMessage);

      const userWelcomeMessage = decoded.username
        ? `Welcome, ${decoded.username}! What we are doing today?`
        : 'Welcome, Guest!';
      const userRenderedHTML = renderedHTML.replace('<!--#welcome-user-->', userWelcomeMessage);

      res.status(200).send(userRenderedHTML);
    });
  });
});

router.get('/carrello', async (req, res) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).send('<p>Error: Token mancante</p>');
  }

  try {
    const decoded = jwt.verify(token.split(' ')[1], secretKey);
    const userId = decoded.userId;
    console.log("Id carrello", decoded.userId);

    const query = `
      SELECT external_product_id, quantity, productName
      FROM user_cart
      WHERE user_id = @userId
    `;

    const poolRequest = pool.request();
    poolRequest.input('userId', sql.Int, userId);

    const result = await poolRequest.query(query);
    const rows = result.recordset;

    const userMessage = `Welcome to your cart!`;
    const productListHTML = generateProductListHTML(rows);

    const html = `
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #DFD5A5;
          }
          #cartContainer {
            border: 1px solid #ccc;
            padding: 10px;
            margin: 20px;
            background-color: #fff;
          }
          .product {
            border-bottom: 1px solid #eee;
            padding: 10px;
            margin-bottom: 10px;
            background-color: #fff;
            color: #000;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          div {
            color: #000;
            font-size: 20px;
            text-align: center;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 8px;
            font-family: "Times New Roman", Times, serif;
          }
          #userMessage {
            color: #000;
            font-size: 30px;
            text-align: center;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 8px;
            font-family: "Times New Roman", Times, serif;
          }
          button, .button {
            margin-top: 20px;
            padding: 10px 20px;
            font-size: 16px;
            color: #fff;
            border: none;
            cursor: pointer;
            transition: background-color 0.3s;
            width: 100%;
            outline: none;
          }
          button:hover, .button:hover {
            background-color: #FF9897;
          }
          .button-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 20px;
          }
          .link-buttons, .form-buttons {
            display: flex;
            justify-content: space-around;
            width: 100%;
            margin-top: 10px;
          }
          .link-buttons a {
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            transition: background-color 0.3s;
          }
          .link-buttons .welcome {
            background-color: #F4AA15;
          }
          .link-buttons .supermercato {
            background-color: #547035;
          }
          .link-buttons .logout {
            background-color: #CC4A18;
          }
          .link-buttons a:hover {
            background-color: #FFD700; /* Cambia il colore al passaggio del mouse */
          }
          .form-buttons button {
            border: none;
            color: #fff;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
            width: 100%; /* Fai sì che il pulsante occupi tutta la larghezza */
            display: block; /* Assicurati che il pulsante sia visualizzato come blocco */
            margin-top: 10px; /* Aggiungi un margine superiore per separare i pulsanti */
          }
          .form-buttons .svuota-carrello {
            background-color: #5D2CA2;
          }
          .form-buttons .pagamento {
            background-color: #00416A;
          }
          .form-buttons button:hover {
            background-color: #6B8E23; /* Cambia il colore al passaggio del mouse */
          }
        </style>
      </head>
      <body>
        <div>${userMessage}</div>
        <div class="button-container">
          <div class="link-buttons">
            <a class="button welcome" href="/welcome">Go Back</a>
            <a class="button supermercato" href="/supermercato">SuperMarket</a>
            <a class="button logout" href="logout">Logout</a>
          </div>
          <div class="form-buttons">
            <form action="/carrello/pagamento" method="POST">
              <button class="button svuota-carrello" type="submit">Pagamento</button>
            </form>
            <form action="/carrello/svuota" method="POST">
              <button class="button pagamento" type="submit">Svuota Carrello</button>
            </form>
          </div>
        </div>
        ${productListHTML}
      </body>
      </html>
    `;

    res.status(200).send(html);
  } catch (err) {
    console.error('Error retrieving user cart:', err);
    res.status(500).send('<p>Error: Internal Server Error!!!</p>');
  }
});


function generateProductListHTML(products) {
  let html = '<div id="cartContainer">';

  if (Array.isArray(products) && products.length > 0) {
    products.forEach(product => {
      html += `
        <div class="product">
          <h2>${product.productName}</h2>
          <p>Id del Prodotto: ${product.external_product_id}</p>
          <p>Quantità: ${product.quantity}</p>
        </div>
      `;
    });
  } else {
    html += '<p>Nessun prodotto nel carrello.</p>';
  }

  html += '</div>';
  return html;
}


router.post('/carrello/svuota', async (req, res) => {
  const userId = req.body.userId;
  
  try {
    console.log('UserID da eliminare:', userId); // Verifica il valore di userId

    const query = 'DELETE FROM [user_cart] WHERE user_id = @userId';

    const poolRequest = pool.request();
    poolRequest.input('userId', sql.Int, userId);

    const result = await poolRequest.query(query);
    console.log('Numero di righe eliminate:', result.rowsAffected); // Verifica quante righe sono state eliminate


    const modalHTML = `
      <div id="modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <p id="modalMessage">Il carrello è stato svuotato con successo!</p>
          <a href="/carrello" class="button">Torna al Carrello</a>
        </div>
      </div>
    `;

    const htmlResponse = `
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #DFD5A5;
          text-align: center;
        }
        .modal {
          display: none; 
          position: fixed; 
          z-index: 1; 
          left: 0;
          top: 0;
          width: 100%; 
          height: 100%; 
          overflow: auto; 
          background-color: rgb(0,0,0); 
          background-color: rgba(0,0,0,0.4); 
        }
        .modal-content {
          background-color: #fefefe;
          margin: 15% auto; 
          padding: 20px;
          border: 1px solid #888;
          width: 80%; 
        }
        .close {
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
        }
        .close:hover,
        .close:focus {
          color: black;
          text-decoration: none;
          cursor: pointer;
        }
        .button {
          display: inline-block;
          text-decoration: none;
          background-color: #547035;
          color: #fff;
          padding: 10px 20px;
          border-radius: 5px;
          transition: background-color 0.3s;
        }
        .button:hover {
          background-color: #3c5221;
        }
      </style>
    </head>
    <body>
      ${modalHTML}
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const modal = document.getElementById('modal');
          const closeButton = document.querySelector('.close');

          // Apri la modal quando la pagina è caricata
          modal.style.display = 'block';

          // Chiudi la modal quando si clicca sul pulsante di chiusura
          closeButton.addEventListener('click', function() {
            modal.style.display = 'none';
          });

          // Chiudi la modal quando si clicca al di fuori di essa
          window.onclick = function(event) {
            if (event.target == modal) {
              modal.style.display = 'none';
            }
          };
        });
      </script>
    </body>
    </html>
  `;

    res.status(200).send(htmlResponse);
  } catch (err) {
    console.error('Errore durante la cancellazione del carrello:', err);
    res.status(500).send('Errore durante la cancellazione del carrello');
  }
});


router.post('/carrello/pagamento', async (req, res) => {
  const userId = req.body.userId;
  
  try {
    console.log('UserID da eliminare:', userId); // Verifica il valore di userId

    const query = 'DELETE FROM [user_cart] WHERE user_id = @userId';

    const poolRequest = pool.request();
    poolRequest.input('userId', sql.Int, userId);

    const result = await poolRequest.query(query);
    console.log('Numero di righe eliminate:', result.rowsAffected); // Verifica quante righe sono state eliminate


    const paymentOptionsHTML = `
      <div id="paymentOptions">
        <h2>Scegli il metodo di pagamento:</h2>
        <form id="paymentForm" action="/carrello/conferma-pagamento" method="POST">
          <input type="radio" id="creditCard" name="paymentMethod" value="creditCard">
          <label for="creditCard">Carta di Credito</label><br>
          <input type="radio" id="paypal" name="paymentMethod" value="paypal">
          <label for="paypal">PayPal</label><br>
          <input type="radio" id="applePay" name="paymentMethod" value="applePay">
          <label for="applePay">Apple Pay</label><br>
          <button id="confermaPagamento" type="button">Conferma Pagamento</button>
        </form>
      </div>
      <div id="modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <p id="modalMessage">Pagamento effettuato con successo!</p>
          <a href="/carrello" class="button">Torna al Carrello</a>
        </div>
      </div>
    `;

    const htmlResponse = `
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #DFD5A5;
            text-align: center;
          }
          #paymentOptions {
            margin-top: 20px;
          }
          #paymentOptions h2 {
            margin-bottom: 10px;
          }
          #paymentOptions form {
            display: inline-block;
          }
          #paymentOptions input[type="radio"] {
            margin-right: 10px;
          }
          #paymentOptions button {
            background-color: #547035;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
          }
          #paymentOptions button:hover {
            background-color: #3c5221;
          }
          .modal {
            display: none; 
            position: fixed; 
            z-index: 1; 
            left: 0;
            top: 0;
            width: 100%; 
            height: 100%; 
            overflow: auto; 
            background-color: rgb(0,0,0); 
            background-color: rgba(0,0,0,0.4); 
          }
          .modal-content {
            background-color: #fefefe;
            margin: 15% auto; 
            padding: 20px;
            border: 1px solid #888;
            width: 80%; 
          }
          .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
          }
          .close:hover,
          .close:focus {
            color: black;
            text-decoration: none;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div>Pagamento in corso...</div>
        ${paymentOptionsHTML}
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            const modal = document.getElementById('modal');
            const confermaPagamentoButton = document.getElementById('confermaPagamento');
            const closeButton = document.querySelector('.close');

            // Apri la modal quando si clicca su "Conferma Pagamento"
            confermaPagamentoButton.addEventListener('click', function() {
              modal.style.display = 'block';
            });

            // Chiudi la modal quando si clicca sul pulsante di chiusura
            closeButton.addEventListener('click', function() {
              modal.style.display = 'none';
            });

            // Chiudi la modal quando si clicca al di fuori di essa
            window.onclick = function(event) {
              if (event.target == modal) {
                modal.style.display = 'none';
              }
            };
          });
        </script>
      </body>
      </html>
    `;

    res.status(200).send(htmlResponse);
  } catch (err) {
    console.error('Errore durante la cancellazione del carrello:', err);
    res.status(500).send('Errore durante la cancellazione del carrello');
  }
});





router.post('/aggiungi-al-carrello', async (req, res) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).send('Token mancante');
  }

  try {
    const decoded = jwt.verify(token.split(' ')[1], secretKey);
    const userId = decoded.userId; // Utilizza userId invece di username
    const { productId, name } = req.body;
    console.log("prodcutNAME", name);

    const pool = await sql.connect(config);
    const request = pool.request();

    // Esegui l'inserimento nel database
    const query = `
      INSERT INTO user_cart (user_id, external_product_id, quantity, productName)
      VALUES (@userId, @productId, 1, @name)
    `;

    request.input('userId', sql.Int, userId);
    request.input('productId', sql.Int, productId);
    request.input('name', sql.NVarChar, name);

    const result = await request.query(query);

    res.status(200).json({ message: 'Prodotto aggiunto al carrello con successo' });
  } catch (err) {
    console.error('Errore durante l\'aggiunta al carrello:', err);
    res.status(500).json({ error: 'Errore durante l\'aggiunta al carrello' });
  }
});

router.get('/supermercato', (req, res) => {
  const filePath = path.join(__dirname, 'HTML', 'supermercato.html');
  res.sendFile(filePath);
});




router.get('/logout', (req, res) => {
  try {
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error!!' });
  }
});

module.exports = router;
