# Use an official Node.js runtime
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json first
COPY . .
RUN rm node_modules -rf
COPY package.json ./
# Install dependencies and rebuild bcrypt from source
RUN npm install && npm rebuild bcrypt --build-from-source

# Copy the rest of the app code

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
