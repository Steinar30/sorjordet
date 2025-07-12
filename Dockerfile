FROM rust:1.88.0 as builder
WORKDIR /usr/src/Sorjordet

RUN echo "fn main() {}" > dummy.rs
COPY ./Server/Cargo.toml .
RUN sed -i 's#src/main.rs#dummy.rs#' Cargo.toml
RUN cargo build --release
RUN sed -i 's#dummy.rs#src/main.rs#' Cargo.toml
COPY ./Server .
RUN cargo install --path .


FROM node:19-buster-slim as nodebuilder
WORKDIR /usr/local/bin/Sorjordet

COPY . .
WORKDIR /usr/local/bin/Sorjordet/Client

RUN npm install -g pnpm
RUN pnpm install
RUN npm run build

FROM debian:bookworm-slim
WORKDIR /usr/local/bin/Sorjordet
ENV SPA_DIR=/local/bin/Sorjordet/dist

COPY --from=nodebuilder /usr/local/bin/Sorjordet/Client/dist/ /usr/local/bin/Sorjordet/dist/

COPY --from=builder /usr/local/cargo/bin/sorjordet /usr/local/bin/Sorjordet/sorjordet

ARG Port
ARG DATABASE_URL
ARG JWT_SECRET
ARG PW_SECRET
CMD ["./sorjordet"]

