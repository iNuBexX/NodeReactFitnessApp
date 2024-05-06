# Use an official Node.js runtime (Latest LTS version recommended)
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy all necessary files to the container at once
COPY . .

RUN rm -rf node_modules package-lock.json
# Install dependencies (bcrypt will be installed correctly)
RUN npm install && npm rebuild bcrypt --build-from-source
#RUN npm install -g nodemon
# Expose the application port
EXPOSE 3000

# Start the application
#CMD ["npm", "start"]
#CMD ["node", "index.js"]