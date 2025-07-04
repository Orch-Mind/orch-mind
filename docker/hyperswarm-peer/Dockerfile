# Use full Node.js image with better native module support
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies
RUN npm install

# Copy source files
COPY mock-swarm.js .

# Expose ports
EXPOSE 3001 4001

# Run the mock Hyperswarm peer
CMD ["node", "mock-swarm.js"] 