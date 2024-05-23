# Utilizza un'immagine base ufficiale di Node.js
FROM node:14

# Imposta la directory di lavoro nel container
WORKDIR /usr/src/app

# Copia il file package.json e package-lock.json nella directory di lavoro
COPY package*.json ./

# Installa le dipendenze del progetto
RUN npm install

# Copia il resto del codice dell'applicazione nella directory di lavoro
COPY . .

# Espone la porta su cui l'applicazione sarà in ascolto
EXPOSE 8080

# Comando per avviare l'applicazione
CMD ["node", "apiGateaway.js"]
