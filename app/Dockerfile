# Usa un'immagine di base di Node.js
FROM node:latest

# Imposta la directory di lavoro nel contenitore
WORKDIR /app

# Copia il file package.json e package-lock.json nella directory di lavoro
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il codice sorgente nella directory di lavoro
COPY . .

# Espone la porta su cui il server deve ascoltare
EXPOSE 3000
# Avvia l'applicazione quando il contenitore avviato
CMD ["node", "app.js"]
