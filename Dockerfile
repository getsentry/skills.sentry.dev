# Stage 1: Build
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

# Stage 2: Run
FROM node:24-alpine AS run
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "--import", "./dist/instrument.js", "dist/index.js"]
