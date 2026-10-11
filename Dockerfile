# Test-runner image (no browsers — they live in a playwright run-server, PLAYWRIGHT_SERVER_URL).
FROM node:24-slim
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV RUNNER=server CI=true
ENTRYPOINT ["npx", "playwright", "test"]
