// Import necessary modules
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mysql = require('mysql2/promise'); // Using promise-based MySQL client
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

// Initialize Express app
const app = express();

// --- Middleware ---
app.use(cors()); // Enable CORS for all origins (for development)
app.use(express.json()); // Enable JSON body parsing for incoming requests

// --- Database Connection Pool ---
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test DB connection
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to MySQL database!');
        connection.release(); // Release the connection back to the pool
    })
    .catch(err => {
        console.error('Error connecting to MySQL database:', err.message);
        process.exit(1); // Exit process if database connection fails
    });

// --- JWT Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT verification error:", err);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user; // Attach user payload to request
        next();
    });
};

// Middleware for role-based authorization
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
        }
        next();
    };
};

// --- Routes ---

// 1. Auth Routes (Public)
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, contactNumber } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const [existingUser] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4(); // Generate a unique ID for the user

        await pool.execute(
            'INSERT INTO users (id, email, password, name, contactNumber, role) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, email, hashedPassword, name || null, contactNumber || null, 'customer']
        );

        const token = jwt.sign({ id: userId, email: email, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: userId, email, name, contactNumber, role: 'customer' }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const [rows] = await pool.execute('SELECT id, email, password, name, contactNumber, role FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Logged in successfully',
            token,
            user: { id: user.id, email: user.email, name: user.name, contactNumber: user.contactNumber, role: user.role }
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// 2. User Profile Route (Protected)
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, email, name, contactNumber, role FROM users WHERE id = ?', [req.user.id]);
        const userProfile = rows[0];

        if (!userProfile) {
            return res.status(404).json({ message: 'User profile not found' });
        }
        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});

// 3. Service Request Routes (Protected)

// Customer: Create a new service request
app.post('/api/service-requests', authenticateToken, authorizeRole(['customer']), async (req, res) => {
    const { make, model, year, vin, licensePlate, requestedServices, serviceDate } = req.body;
    const userId = req.user.id;

    if (!make || !model || !year || !licensePlate || !requestedServices || !serviceDate) {
        return res.status(400).json({ message: 'Missing required fields for service request' });
    }

    try {
        const requestId = uuidv4();
        const serviceDateObj = new Date(serviceDate); // Ensure it's a valid date object

        await pool.execute(
            `INSERT INTO service_requests (id, userId, make, model, year, vin, licensePlate, requestedServices, serviceDate, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                requestId,
                userId,
                make,
                model,
                year,
                vin || null,
                licensePlate,
                JSON.stringify(requestedServices), // Store array as JSON string
                serviceDateObj,
                'Pending'
            ]
        );
        res.status(201).json({ message: 'Service request created successfully', requestId });
    } catch (error) {
        console.error('Error creating service request:', error);
        res.status(500).json({ message: 'Server error creating service request' });
    }
});

// Customer: Get their own service requests
app.get('/api/service-requests/my', authenticateToken, authorizeRole(['customer']), async (req, res) => {
    const userId = req.user.id;
    try {
        const [requests] = await pool.execute(
            `SELECT id, userId, make, model, year, vin, licensePlate, requestedServices, serviceDate, status, assignedMechanicId, estimatedCost, actualCost, invoiceDetails, createdAt, updatedAt
             FROM service_requests
             WHERE userId = ?
             ORDER BY createdAt DESC`,
            [userId]
        );

        // Parse JSON fields
        const parsedRequests = requests.map(req => ({
            ...req,
            requestedServices: JSON.parse(req.requestedServices),
            invoiceDetails: req.invoiceDetails ? JSON.parse(req.invoiceDetails) : null,
            serviceDate: req.serviceDate ? new Date(req.serviceDate) : null,
            createdAt: req.createdAt ? new Date(req.createdAt) : null,
            updatedAt: req.updatedAt ? new Date(req.updatedAt) : null,
        }));
        res.status(200).json(parsedRequests);
    } catch (error) {
        console.error('Error fetching customer service requests:', error);
        res.status(500).json({ message: 'Server error fetching service requests' });
    }
});

// Admin/Mechanic: Get all service requests
app.get('/api/service-requests/all', authenticateToken, authorizeRole(['admin', 'mechanic']), async (req, res) => {
    try {
        const [requests] = await pool.execute(
            `SELECT id, userId, make, model, year, vin, licensePlate, requestedServices, serviceDate, status, assignedMechanicId, estimatedCost, actualCost, invoiceDetails, createdAt, updatedAt
             FROM service_requests
             ORDER BY createdAt DESC`
        );

        // Fetch all users to get names/contacts for display
        const [users] = await pool.execute('SELECT id, name, contactNumber, role FROM users');
        const usersMap = users.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {});

        // Parse JSON fields and attach user info
        const parsedRequests = requests.map(req => ({
            ...req,
            requestedServices: JSON.parse(req.requestedServices),
            invoiceDetails: req.invoiceDetails ? JSON.parse(req.invoiceDetails) : null,
            serviceDate: req.serviceDate ? new Date(req.serviceDate) : null,
            createdAt: req.createdAt ? new Date(req.createdAt) : null,
            updatedAt: req.updatedAt ? new Date(req.updatedAt) : null,
            customer: usersMap[req.userId] || null, // Attach customer info
            assignedMechanic: usersMap[req.assignedMechanicId] || null // Attach mechanic info
        }));
        res.status(200).json(parsedRequests);
    } catch (error) {
        console.error('Error fetching all service requests:', error);
        res.status(500).json({ message: 'Server error fetching all service requests' });
    }
});

// Admin/Mechanic: Update a service request
app.put('/api/service-requests/:id', authenticateToken, authorizeRole(['admin', 'mechanic']), async (req, res) => {
    const requestId = req.params.id;
    const { status, assignedMechanicId, estimatedCost, invoiceDetails, actualCost } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (assignedMechanicId !== undefined) updates.assignedMechanicId = assignedMechanicId === '' ? null : assignedMechanicId; // Allow setting to null
    if (estimatedCost !== undefined) updates.estimatedCost = estimatedCost;
    if (invoiceDetails !== undefined) updates.invoiceDetails = JSON.stringify(invoiceDetails);
    if (actualCost !== undefined) updates.actualCost = actualCost;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update' });
    }

    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    try {
        await pool.execute(
            `UPDATE service_requests SET ${setClauses}, updatedAt = NOW() WHERE id = ?`,
            [...values, requestId]
        );
        res.status(200).json({ message: 'Service request updated successfully' });
    } catch (error) {
        console.error('Error updating service request:', error);
        res.status(500).json({ message: 'Server error updating service request' });
    }
});

// Admin: Get all mechanics (for assignment dropdown)
app.get('/api/users/mechanics', authenticateToken, authorizeRole(['admin', 'mechanic']), async (req, res) => {
    try {
        const [mechanics] = await pool.execute(
            `SELECT id, email, name, contactNumber, role FROM users WHERE role IN ('mechanic', 'admin')`
        );
        res.status(200).json(mechanics);
    } catch (error) {
        console.error('Error fetching mechanics:', error);
        res.status(500).json({ message: 'Server error fetching mechanics' });
    }
});

// Admin: Get all users (for customer details on admin dashboard)
app.get('/api/users/all', authenticateToken, authorizeRole(['admin', 'mechanic']), async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT id, email, name, contactNumber, role FROM users`
        );
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Server error fetching all users' });
    }
});


// ***** Start Server *****
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



