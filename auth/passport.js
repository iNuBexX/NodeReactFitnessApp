const passport = require('passport');
const { Strategy: JwtStrategy } = require('passport-jwt');
const { Client } = require('pg');


// PostgreSQL client setup
const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
});

// Connect to the database
client.connect();

// Passport JWT strategy options
const opts = {
    jwtFromRequest: (req) => req?.cookies?.token || null,  // ONLY from cookies
    secretOrKey: process.env.JWT_SECRET
};

// Setup JWT authentication strategy
passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
        const result = await client.query('SELECT * FROM users WHERE id = $1', [jwt_payload.id]);
        if (result.rows.length > 0) {
            console.log(`User found: ${result.rows[0].username}`);
            return done(null, result.rows[0]);  // Attach user to req.user
        } else {
            return done(null, false);           // No user found
        }
    } catch (err) {
        return done(err, false);                // Error during lookup
    }
}));

// Middleware to protect routes
const authenticateJwt = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info?.message || 'Unauthorized' });

        req.user = user;
        next();
    })(req, res, next);
};

module.exports = {
    passport,
    authenticateJwt
};
