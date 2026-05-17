## --- Build stage (TypeScript -> dist) ---
#FROM node:20-alpine AS build
#WORKDIR /app
#
#COPY package*.json ./
#RUN npm ci
#
## COPY BOTH files so "tsc -p tsconfig.build.json" works
#COPY tsconfig.json tsconfig.build.json ./
#
#COPY src ./src
#RUN npm run build   # runs: tsc -p tsconfig.build.json
#
## --- Runtime stage ---
#FROM node:20-alpine AS runtime
#WORKDIR /app
#
#ENV NODE_ENV=production
#ENV PORT=80
#EXPOSE 80
#
#COPY package*.json ./
#RUN npm ci --omit=dev
#COPY --from=build /app/dist ./dist
#
#USER node
#CMD ["node", "dist/server.js"]
#


## ---------- Build stage ----------
#FROM node:20-alpine AS build
#WORKDIR /app
#
## Copy only manifests first for better cache hits
#COPY package*.json ./
#
## Install exact deps (includes "pg" you just added)
#RUN npm ci
#
## Copy source and build
#COPY . .
#RUN npm run build   # produces /app/dist
#
## ---------- Runtime stage ----------
#FROM node:20-alpine
#WORKDIR /app
#
## Copy only the bits needed to run
#COPY package*.json ./
#RUN npm ci --omit=dev
#
#COPY --from=build /app/dist ./dist
#
## Ensure the same PORT Azure injects is used
#ENV NODE_ENV=production
#ENV PORT=5000
#
## Expose for local clarity (ACA ignores EXPOSE but it’s fine)
#EXPOSE 5000
#
## Start the compiled app
#CMD ["node", "dist/server.js"]



# ---------- Build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:openapi && npm run build

# ---------- Runtime ----------
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production PORT=5000
EXPOSE 5000
CMD ["node", "dist/server.js"]

# Run DB migration before starting the app
CMD npx sequelize-cli db:migrate && npm start