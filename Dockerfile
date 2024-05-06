# Use an official Node.js runtime (Latest LTS version recommended)
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies (bcrypt will be built properly)
RUN npm install && npm rebuild bcrypt --build-from-source

# Now copy the rest of the app code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the application
#CMD ["node", "index.js"]
