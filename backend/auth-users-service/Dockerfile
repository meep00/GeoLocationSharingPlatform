FROM node:20-alpine

WORKDIR /app

COPY backend/shared/package*.json backend/shared/
COPY backend/auth-users-service/package*.json backend/auth-users-service/

WORKDIR /app/backend/auth-users-service

RUN npm install

WORKDIR /app
COPY backend/shared backend/shared
COPY backend/auth-users-service backend/auth-users-service

WORKDIR /app/backend/auth-users-service

EXPOSE 3001

CMD ["npm", "run", "start:dev"]
