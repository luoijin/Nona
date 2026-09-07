FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package.json apps/backend/
RUN npm ci
COPY apps/backend apps/backend
RUN npm --workspace apps/backend run prisma:generate && npm --workspace apps/backend run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
EXPOSE 3000
CMD ["node", "apps/backend/dist/server.js"]
