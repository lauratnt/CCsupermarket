const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const usersMicroservice = require('./usersMicroservice/usersMicroservice');
const supermarketsMicroservice = require('./supermarketsMicroservice/supermarketsMicroservice');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(bodyParser.json());

// route microservizio utenti
app.use('/users', usersMicroservice);

// route microservizio supermercati
app.use('/supermarkets', supermarketsMicroservice);

app.listen(PORT, () => {
  console.log(`API Gateway running at http://localhost:${PORT}/`);
});
