FROM node:18-bullseye-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

# Generate Prisma client (uses the schema to generate, no DB connection needed)
COPY prisma ./prisma
RUN npx prisma generate

COPY . ./

EXPOSE 3001

# Apply schema then start the server
CMD ["sh", "-c", "if echo \"$DATABASE_URL\" | grep -q 'schema='; then export DATABASE_URL=\"$DATABASE_URL\"; else if echo \"$DATABASE_URL\" | grep -q '\\?'; then export DATABASE_URL=\"${DATABASE_URL}&schema=recommendation\"; else export DATABASE_URL=\"${DATABASE_URL}?schema=recommendation\"; fi; fi; if [ -d prisma/migrations ] && [ \"$(ls -A prisma/migrations)\" ]; then npx prisma migrate deploy; else npx prisma db push; fi; node server.js"]
