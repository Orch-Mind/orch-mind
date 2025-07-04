# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install minimal dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY src/ ./src/
COPY adapters/ ./adapters/

# Create necessary directories
RUN mkdir -p /app/logs /app/data /app/downloads

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose ports
EXPOSE 3001 49737

# Start the application
CMD ["npm", "start"] 