# Stage 1: Get ffmpeg and ffprobe from a prebuilt image
FROM jrottenberg/ffmpeg:5.1-alpine as ffmpeg

# Stage 2: Use Node.js base image
FROM node:18-alpine

# Copy ffmpeg binaries from stage 1
COPY --from=ffmpeg /usr/local/bin/ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /usr/local/bin/ffprobe /usr/local/bin/ffprobe

# Set working directory
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy the rest of the server code
COPY . .

# Expose the port your app uses
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
