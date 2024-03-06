const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Client } = require('pg');

// PostgreSQL setup
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
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
};

// Custom JWT authentication strategy
passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
        const result = await client.query('SELECT * FROM users WHERE id = $1', [jwt_payload.id]);

        if (result.rows.length > 0) {
            return done(null, result.rows[0]);  // User found, attaching to req.user
        } else {
            return done(null, false);           // User not found
        }
    } catch (err) {
        return done(err, false);               // Error occurred
    }
}));

// Custom authentication callback function
const authenticateJwt = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) return next(err);  // Pass any errors to Express error handler
        if (!user) {
            return res.status(401).json({ message: info?.message || 'Unauthorized' });
        }

        req.user = user;  // Attach user info to req
        next();  // Continue to the next middleware or route handler
    })(req, res, next);  // Execute passport.authenticate with the request, response, and next parameters
};

module.exports = {
    passport,
    authenticateJwt
};
