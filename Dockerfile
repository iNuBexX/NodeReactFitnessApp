# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json to the container
COPY package*.json ./

# Install the dependencies defined in package.json
RUN npm install

# Copy the rest of your app's code into the container
COPY . .

# Expose the port the app will run on (same as in docker-compose)
EXPOSE 3000

# Define the command to run your app
CMD ["npm", "start"]
