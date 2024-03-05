const http = require('http');
const express = require('express');
const { Client } = require('pg');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// PostgreSQL database connection configuration
const client = new Client({
    host: process.env.DB_HOST,  // 'db' (service name defined in Docker Compose)
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
});

// Connect to the database
client.connect()
    .then(() => {
        console.log('Connected to the PostgreSQL database.');

        // Create the 'users' table if it doesn't exist
        const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,  -- Add UNIQUE constraint
    password VARCHAR(255) NOT NULL
    );
    `;
        return client.query(createTableQuery);
    })
    .then(() => {
        console.log('Users table created or already exists.');
    })
    .catch((err) => {
        console.error('Error connecting to the database:', err.stack);
    });

// API to register a new user
// API to register a new user
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Check if the username already exists
    const checkUserQuery = 'SELECT * FROM users WHERE username = $1';
    client.query(checkUserQuery, [username])
        .then((result) => {
            if (result.rows.length > 0) {
                return res.status(400).json({ error: 'Username already exists.' });
            }

            // Insert the new user into the database if username is unique
            const query = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *';
            return client.query(query, [username, password]);
        })
        .then((result) => {
            res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
        })
        .catch((err) => {
            console.error('Error registering user:', err.stack);
            res.status(500).json({ error: 'Error registering user' });
        });
});

// API to authenticate a user
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Authenticate the user
    const query = 'SELECT * FROM users WHERE username = $1 AND password = $2';
    client.query(query, [username, password])
        .then((result) => {
            if (result.rows.length > 0) {
                res.status(200).json({ message: 'Login successful' });
            } else {
                res.status(401).json({ error: 'Invalid username or password' });
            }
        })
        .catch((err) => {
            console.error('Error authenticating user:', err.stack);
            res.status(500).json({ error: 'Error authenticating user' });
        });
});

// Create the server
const server = http.createServer(app);

// Start the server
server.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
});
