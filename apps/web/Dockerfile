FROM node:22-alpine

WORKDIR /app

COPY package.json package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/i18n/package.json packages/i18n/package.json

RUN npm install

COPY . .

WORKDIR /app/apps/web

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
