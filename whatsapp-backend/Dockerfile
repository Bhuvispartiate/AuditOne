FROM golang:1.25-alpine AS build

RUN apk update && apk add --no-cache git build-base libjpeg-turbo-dev libwebp-dev

WORKDIR /build

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

ARG VERSION=2.0.0-custom
RUN CGO_ENABLED=0 go build -ldflags "-s -w" -o server ./oxis_backend/server.go


FROM alpine:3.19 AS final

# Install TLS certificates, timezone data, and media tools
RUN apk update && apk add --no-cache ca-certificates tzdata ffmpeg libjpeg-turbo libwebp poppler-utils

WORKDIR /app

# Copy binary and dashboard assets
COPY --from=build /build/server .
COPY --from=build /build/public ./public
COPY --from=build /build/manager/dist ./manager/dist
COPY --from=build /build/VERSION ./VERSION

# Create database directory for SQLite session persistence
RUN mkdir -p /app/dbdata /app/logs

ENV TZ=UTC
ENV ENVIRONMENT=production
ENV SERVER_PORT=8080

EXPOSE 8080

ENTRYPOINT ["/app/server"]
