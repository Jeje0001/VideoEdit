# Use Node base image
FROM node:20-bullseye

# Install ffmpeg (includes ffprobe too)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .

# Expose backend port
EXPOSE 8080

# Start server
CMD ["node", "main.js"]
