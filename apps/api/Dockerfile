FROM node:22.23.1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
USER node
EXPOSE 8787
CMD ["node", "apps/api/src/server.js"]
