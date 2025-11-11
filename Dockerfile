# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy source code
COPY backend/ ./

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy the binary
COPY --from=builder /app/main .

# Copy frontend to /frontend (one level up from /app, so ../frontend resolves correctly)
COPY frontend /frontend

# Expose port (default 5555, can be overridden with PORT env var)
EXPOSE 5555

# Run the application
CMD ["./main"]

