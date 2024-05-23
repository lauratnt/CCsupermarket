const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

const secretKey = 'mysecretkey';

const users = [
  { id: 1, username: 'admin', password: 'adminpassword' },
];

const generateToken = (user) => {
  return jwt.sign({ userId: user.id, username: user.username }, secretKey, { expiresIn: '1h' });
};

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const token = generateToken(user);
  res.json({ token });
});

app.get('/lista_spesa', (req, res) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ error: 'Token non fornito' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token non valido' });
    }

    const listaSpesa = ['Pane', 'Latte', 'Frutta', 'Verdura'];
    res.json(listaSpesa);
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
