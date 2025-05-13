# Utiliser une image Node.js officielle comme base
FROM node:24

# Utilisateur node
USER node
# Créer un répertoire de travail
WORKDIR /home/node/nocturna

# Ajoute le contenur du du server
COPY --chown=node:node server/ .
# Ajoute le contenu distant
COPY --chown=node:node dist/ www/

# Installer les dépendances
RUN npm install ws http express cors

# Exposer le port 5173
EXPOSE 5173

# Commande pour démarrer le service
ENTRYPOINT ["node", "index.ts"]