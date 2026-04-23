FROM oven/bun:1.2.22 AS build
WORKDIR /app

COPY package.json bun.lock tsconfig.json tsconfig.build.json ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY README.md ./README.md
RUN bun run build

FROM oven/bun:1.2.22 AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=9987
ENV HOST=0.0.0.0

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/dist ./dist

EXPOSE 9987

CMD ["node", "dist/cli.js"]
