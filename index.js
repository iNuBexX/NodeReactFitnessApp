const http = require('http');
const express = require('express');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');
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
                username VARCHAR(255) NOT NULL UNIQUE,
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

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
}

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

            // Insert the new user into the database if the username is unique
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

// API to authenticate a user (login)
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
                // If the user exists, issue a JWT token
                const user = result.rows[0];
                const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
                
                res.status(200).json({
                    message: 'Login successful',
                    token: token  // Send the token back to the client
                });
            } else {
                res.status(401).json({ error: 'Invalid username or password. Please register first.' });
            }
        })
        .catch((err) => {
            console.error('Error authenticating user:', err.stack);
            res.status(500).json({ error: 'Error authenticating user' });
        });
});

// Example of a protected route
app.get('/profile', authenticateToken, (req, res) => {
    // Access the authenticated user information from the token
    res.json({ message: 'This is your profile data', user: req.user });
});

// Create the server
const server = http.createServer(app);

// Start the server
server.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
});
