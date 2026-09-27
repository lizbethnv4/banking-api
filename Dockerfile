# ---------- Build ----------
    FROM node:24-alpine AS builder

    WORKDIR /app
    
    COPY package*.json ./

    RUN npm install -g npm@11.9.0
    
    RUN npm ci
    
    COPY . .
    
    RUN npm run build
    
    
    # ---------- Production ----------
    FROM node:24-alpine AS production
    
    WORKDIR /app
    
    ENV NODE_ENV=production
    
    COPY package*.json ./

    RUN npm install -g npm@11.9.0
    
    RUN npm ci --omit=dev
    
    COPY --from=builder /app/dist ./dist
    
    EXPOSE 3001
    
    CMD ["node", "dist/main.js"]