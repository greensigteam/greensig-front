# =============================================================================
# Dockerfile Frontend - GreenSIG (React + Vite + Nginx)
# Multi-stage build pour une image optimisee
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 1: Build de l'application React
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Variables de build
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Repertoire de travail
WORKDIR /app

# Copier les fichiers de dependances
COPY package*.json ./

# Installer les dependances
RUN npm ci --silent

# Copier le code source
COPY . .

# Build de production
RUN npm run build

# -----------------------------------------------------------------------------
# STAGE 2: Serveur Nginx avec les fichiers statiques
# -----------------------------------------------------------------------------
FROM nginx:alpine AS production

# Copier les fichiers buildes depuis le stage precedent
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier une configuration nginx par defaut (sera ecrasee par docker-compose)
RUN rm /etc/nginx/conf.d/default.conf

# Creer une config minimale pour le container standalone
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Exposer le port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Commande de demarrage
CMD ["nginx", "-g", "daemon off;"]
