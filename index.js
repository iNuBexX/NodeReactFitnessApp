const http = require('http');
const express = require('express');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

const { passport, authenticateJwt } = require('./auth/passport');

console.log(`done generatiung jwt secret`);
// Middlewares
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500','*'],
    credentials: true   // Important: allow sending cookies from frontend
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// PostgreSQL client setup
const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
});

// Connect to database and ensure users table
client.connect()
    .then(() => {
        console.log('Connected to PostgreSQL');
        return client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);
    })
    .then(() => {
        console.log('Users table ready.');
    })
    .catch((err) => {
        console.error('Database connection error:', err.stack);
    });

// Register new user
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    try {
        const userExists = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await client.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
            [username, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully', user: newUser.rows[0] });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    try {
        const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Generate JWT and store it in cookie
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true,
            //secure: false, //process.env.NODE_ENV === 'production', // Only over HTTPS in production
            //sameSite: 'none',
            //maxAge: 3600000 // 1 hour
        });

        res.status(200).json({ message: 'Login successful' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout user (clear cookie)
app.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        //secure: process.env.NODE_ENV === 'production',
        //sameSite: 'Strict'
    });
    res.status(200).json({ message: 'Logged out successfully' });
});

// Protected route
app.get('/profile', authenticateJwt, (req, res) => {
    res.json({ message: 'This is your profile data', user: req.user });
});

// Create and start server
const server = http.createServer(app);

server.listen(3000, () => {
    console.log('Server runaning at http://localhost:3000/');
});
