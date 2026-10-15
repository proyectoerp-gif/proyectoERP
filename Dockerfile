FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY apps/web/package*.json ./apps/web/
COPY apps/mobile/package*.json ./apps/mobile/
COPY shared/package*.json ./shared/
COPY scripts/metro-image-size-compat.cjs ./scripts/

RUN npm install --global npm@10.9.8 && npm ci

COPY . .

WORKDIR /app/backend
RUN npm run build

EXPOSE 4000

CMD ["npm", "run", "start"]
