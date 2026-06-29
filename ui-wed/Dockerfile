# Use a lightweight Node.js LTS image
FROM node:26-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency definitions first
# This leverages Docker's layer caching so you don't reinstall node_modules 
# every time you change a single line of React code.
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of your frontend application code
COPY . .

# Expose the default Vite port so Traefik knows where to route traffic
EXPOSE 5173

# Start the Vite development server
# The --host 0.0.0.0 flag is CRITICAL. It tells Vite to listen on all network 
# interfaces, allowing Traefik to actually reach it from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
