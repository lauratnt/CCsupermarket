# Usa un'immagine di base di Node.js
FROM node:latest

# Imposta la directory di lavoro nel contenitore
WORKDIR /app/supermarketsMicroservice

# Copia il codice sorgente nella directory di lavoro
COPY . .

# Copia il file del database dei supermercati nel container
COPY supermarkets.db ./supermarkets.db

RUN npm install

# Avvia il microservizio quando il contenitore viene avviato
CMD ["node", "supermarketsMicroservice.js"]
