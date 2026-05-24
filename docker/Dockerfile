FROM node:20-slim

WORKDIR /app

# app.tar.gz is created by pack.sh on the Linux build machine.
# It contains pre-built dist/, production node_modules/, server.js, config.js.
ADD app.tar.gz .

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server.js"]
