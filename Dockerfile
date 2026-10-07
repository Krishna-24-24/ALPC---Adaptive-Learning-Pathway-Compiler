FROM ubuntu:24.04 AS compiler
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ make flex bison llvm-18-dev llvm-18 python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV PATH="/usr/lib/llvm-18/bin:${PATH}"
WORKDIR /build
COPY Makefile ./
COPY src ./src
COPY tests ./tests
COPY examples ./examples
RUN make -j2 && make check && make demo
RUN ldd ./alpc && ! ldd ./alpc | grep 'not found'

FROM node:22-bookworm-slim AS dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM ubuntu:24.04 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    llvm-18 ca-certificates libstdc++6 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=dependencies /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=production PORT=10000 \
    ALPC_BIN=/app/alpc LLI_BIN=/usr/lib/llvm-18/bin/lli OPT_BIN=/usr/lib/llvm-18/bin/opt
WORKDIR /app
COPY --from=compiler /build/alpc ./alpc
COPY --from=dependencies /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/package.json
COPY backend/src ./backend/src
RUN ldd ./alpc && ! ldd ./alpc | grep 'not found' && node --version
USER 10001:10001
EXPOSE 10000
CMD ["node", "backend/src/index.js"]
