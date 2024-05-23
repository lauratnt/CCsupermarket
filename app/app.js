const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const multer = require('multer');  
const upload = multer({ dest: 'uploads/' }); 
const app = express();
const PORT = 3000;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const secretKey = 'uominiseksi';
const rateLimit = require('express-rate-limit');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname,  'public')));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use('/public/*.js', (req, res, next) => {
  res.type('application/javascript');
  next();
});


app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use((req, res, next) => {
  res.header('Content-Security-Policy', 'default-src http://localhost:3000 http://localhost:8080; style-src http://localhost:3000 \'unsafe-inline\'; script-src http://localhost:3000 \'unsafe-inline\' \'unsafe-eval\'');
  next();
});

//implementazione del rate limiter!!!
const registrationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // Numero massimo di richieste
  message: { error: 'Too many requests from this IP, please try again later.' },
});

//questo è il menu!
app.get('/', (req, res) => {
  const filePath = path.join(__dirname,  'HTML', 'menu.html');
  // ^ Utilizziamo '..', che ci permette di risalire di una cartella rispetto a dove si trova app.js
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).send(data);
    }
  });
});

// Route del microservizio degli user
app.get('/login', (req, res) => {
  axios.get('http://apigateaway:8080/users/login', { params: req.body })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Internal Server Error Login');
    });
});

app.post('/login', registrationLimiter, (req, res) => {
  const { username, password } = req.body;
  axios.post('http://apigateaway:8080/users/login', { username, password })
    .then(response => {
      if (response.status === 200) {
        //const userId = response.data.userId;
        const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
        // il token va nei cookie!!
        //console.log(token);
        res.cookie('token', token, { httpOnly: false, secure: true });
        const redirectUrl = response.data.redirect;
        res.redirect(redirectUrl);
      }
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

app.get('/welcome', authenticateToken, (req, res) => {
  const token = req.cookies['token'];

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    axios.get('http://apigateaway:8080/users/welcome', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        username: decoded.username,
      },
    })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Non funziona amen');
    });
  });
});

app.get('/aggiungi-al-carrello', authenticateToken, (req, res) => {
  const token = req.cookies['token'];

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    axios.get('http://apigateaway:8080/users/aggiungi-al-carrello', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        username: decoded.username,
      },
    })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Non funziona di nuovo');
    });
  });
});

app.get('/logout', (req, res) => {
res.redirect('/');
});



app.get('/register', (req, res) => {
  axios.get('http://apigateaway:8080/users/register', { params: req.body })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Internal Server Error Login');
    });
});


app.post('/register', registrationLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    const registrationEndpoint = 'http://apigateaway:8080/users/register';

    const response = await axios.post(registrationEndpoint, { username, password });

    if (response.status === 200) {
      const redirectUrl = response.data.redirect;
      res.redirect(redirectUrl);
    } else {
      
      if (response.data.errors && response.data.errors.length > 0) {
        res.status(400).json({ errors: response.data.errors });
      } else {
        
        res.status(response.status).json(response.data);
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Non funziona' });
  }
});

app.get('/carrello', authenticateToken, (req, res) => {
  const token = req.cookies['token'];

  axios.get('http://apigateaway:8080/users/carrello', {
    headers: {
      Authorization: `Bearer ${token}`
    } 
  })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Internal Server Error£££');
    });
    //console.log(username);
});

app.post('/carrello/svuota', (req, res) => {
  const token = req.cookies['token'];
  console.log("token", token);

  if (!token) {
    return res.status(401).send('<p>Error: Token mancante</p>');
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    axios.post('http://apigateaway:8080/users/carrello/svuota', {
      username: decoded.username,
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Errore durante la richiesta al microservizio');
    });
  });
});

app.post('/carrello/pagamento', (req, res) => {
  const token = req.cookies['token'];
  console.log("token", token);

  if (!token) {
    return res.status(401).send('<p>Error: Token mancante</p>');
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    axios.post('http://apigateaway:8080/users/carrello/pagamento', {
      username: decoded.username,
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Errore durante la richiesta al microservizio pagamento');
    });
  });
});


function authenticateToken(req, res, next) {
  const token = req.cookies['token'];
  //console.log(token);
  if (!token) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    req.user = decoded;
    next();
  });
}


app.get('/supermercato', authenticateToken, (req, res) => {
  const token = req.cookies['token'];

  axios.get('http://apigateaway:8080/users/supermercato', {
    headers: {
      Authorization: `Bearer ${token}`
    },
    params: req.body
  })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Internal Server Error');
    });
});


app.post('/aggiungi-al-carrello', authenticateToken, (req, res) => {
  const token = req.cookies['token'];
  const productId = req.body.productId;
  const productName = req.body.name;
  //console.log(productId, productName);

  axios.post(
    'http://apigateaway:8080/users/aggiungi-al-carrello',
    { productId, productName }, 
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Perché non funzionaaaa');
    });
});


app.get('/login-supermarket', (req, res) => {
  axios.get('http://apigateaway:8080/supermarkets/login-supermarket', {params: req.body})
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Login fallito');
    });
});

app.post('/login-supermarket', (req, res) => {
  const { username, password } = req.body;

  axios.post('http://apigateaway:8080/supermarkets/login-supermarket', { username, password })
    .then(response => {
      if (response.status === 200) {
        const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
        // il token va nei cookie!!
        res.cookie('token', token, { httpOnly: false, secure: true });
        const redirectUrl = response.data.redirect;
        res.redirect(redirectUrl);
      }
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

app.get('/supermarket-welcome', authenticateToken, (req, res) => {
  const token = req.cookies['token'];

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    axios.get('http://apigateaway:8080/supermarkets/supermarket-welcome', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        username: decoded.username,
      },
    })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Non funziona amen');
    });
  });
});


app.get('/register-supermarket', (req, res) => {
  axios.get('http://apigateaway:8080/supermarkets/register-supermarket')
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Internal Server Error');
    });
});

app.post('/register-supermarket', registrationLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const registrationEndpoint = 'http://apigateaway:8080/supermarkets/register-supermarket';

    const response = await axios.post(registrationEndpoint, { username, password });

    if (response.status === 200) {
      
      const redirectUrl = response.data.redirect;
      res.redirect(redirectUrl);
    } else {
      
      if (response.data.errors && response.data.errors.length > 0) {
        res.status(400).json({ errors: response.data.errors });
      } else {
        
        res.status(response.status).json(response.data);
      }
    }
  } catch (error) {
    
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error1' });
  }
});

app.get('/supermercatoS', (req, res) => {
  const token = req.cookies['token'];

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }
     console.log("superSdeco", decoded.username);
    axios.get('http://apigateaway:8080/supermarkets/supermercatoS', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        username: decoded.username // Passa direttamente l'username decodificato
      }
    })
      .then(response => {
        res.status(response.status).send(response.data);
      })
      .catch(error => {
        console.error(error);
        res.status(500).send('Internal Server Error');
      });
  });
});



app.get('/register-supermarket', (req, res) => {
  axios.get('http://apigateaway:8080/supermarkets/register-supermarket')
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Internal Server Error');
    });
});


//route miste che servono per i prodotti

app.post('/save-product', async (req, res) => {
  try {
    const { productName, productCategory, productPrice, productDescription } = req.body;
  
    // Estrai il token dai cookie
    const token = req.cookies['token'];
    // Verifica il token per ottenere il payload, che include il nome utente
    const decodedToken = jwt.verify(token, secretKey);
    // Ottieni il nome utente dal payload
    const username = decodedToken.username;
    console.log("save", username);

    const productsMicroserviceEndpoint = 'http://apigateaway:8080/supermarkets/save-product';
const response = await axios.post(
  productsMicroserviceEndpoint,
  {
    productName,
    productCategory,
    productPrice,
    productDescription,
    username
  },
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

    if (response.status === 200) {
      
      const userId = response.data.userId; 
      const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
      //console.log(token);
      res.cookie('token', token, { httpOnly: false, secure: true }); 
      const redirectUrl = response.data.redirect;
      res.redirect(redirectUrl);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/get-products-user', authenticateToken, (req, res) => {
  const token = req.cookies['token'];
  console.log("tk", token);

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    console.log("Username decodificato:", decoded.username); //dice undefined

    axios.get('http://apigateaway:8080/supermarkets/get-products-user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        username: decoded.username,
      },
    })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Non funziona amen');
    });
  });
});

app.get('/get-products', authenticateToken, (req, res) => {
  const token = req.cookies['token'];
  console.log("tkPordcc", token);

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    console.log("Username decodificato:", decoded.username); //dice undefined

    axios.get('http://apigateaway:8080/supermarkets/get-products', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        username: decoded.username,
      },
    })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Non funziona amen');
    });
  });
});



app.get('/aggiungiprodotti', authenticateToken, (req, res) => {
  const token = req.cookies['token'];
 
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    axios.get('http://apigateaway:8080/supermarkets/aggiungiprodotti', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        username: decoded.username,
      },
    })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Non funziona amen');
    });
  });
});

app.listen(PORT, () => {
  console.log(`Main app running at http://localhost:${PORT}/`);
});