FROM node:22.23.1-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/user-web/package.json ./apps/user-web/package.json
COPY apps/admin-web/package.json ./apps/admin-web/package.json
COPY packages ./packages
RUN npm ci --ignore-scripts
COPY apps/user-web ./apps/user-web
ARG VITE_API_BASE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_SUPABASE_URL=$VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build:user
FROM nginx:1.27-alpine AS runtime
COPY infra/nginx/user.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/user-web/dist /usr/share/nginx/html
COPY --from=build /app/apps/user-web/src/assets/images /usr/share/nginx/html/src/assets/images
EXPOSE 80
