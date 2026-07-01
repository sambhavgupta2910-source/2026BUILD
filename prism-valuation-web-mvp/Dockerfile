# PRISM / Elevate Homes — zero-dependency Node server.
# Works on Railway, Render, Fly.io, or any Docker host.
FROM node:22-alpine

WORKDIR /app
COPY . .

# No npm install needed — the server has zero dependencies.
ENV NODE_ENV=production
EXPOSE 4173

CMD ["node", "server.js"]
