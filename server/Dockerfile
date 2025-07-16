# Use an official Node image with ffmpeg support
FROM jrottenberg/ffmpeg:6.0-bookworm as ffmpeg

# Base Node image
FROM node:20-bullseye

# Install ffmpeg/ffprobe from previous image
COPY --from=ffmpeg /usr/local/bin/ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /usr/local/bin/ffprobe /usr/local/bin/ffprobe

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port (match your Express server)
EXPOSE 8080

# Start the server
CMD ["node", "main.js"]
