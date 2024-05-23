# Usa un'immagine di base di Node.js
FROM node:latest

# Imposta la directory di lavoro nel contenitore
WORKDIR /app/usersMicroservice

# Copia il codice sorgente nella directory di lavoro
COPY . .

# Copia il file del database degli utenti nel container
COPY users.db ./users.db

# Installa le dipendenze
RUN npm install

# Avvia il microservizio quando il contenitore viene avviato
CMD ["node", "usersMicroservice.js"]
