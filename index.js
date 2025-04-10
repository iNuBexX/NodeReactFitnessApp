const http = require('http');
const express = require('express');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const app = express();
const { passport, authenticateJwt } = require('./auth/passport');  
const cors = require('cors');

app.use(passport.initialize());

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
  }));
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

    const query = 'SELECT * FROM users WHERE username = $1 AND password = $2';
    client.query(query, [username, password])
        .then((result) => {
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

                // Send token in the response body
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

app.get('/logout', (req, res)=>{ 

});

app.get('/profile',authenticateJwt, (req, res) => {
    res.json({ message: 'This is your profile data', user: req.user });
});


// Create the server
const server = http.createServer(app);

// Start the server
server.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
});
