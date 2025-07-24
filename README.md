Garage Management Web Application
This is a full-stack web application designed to streamline operations for small to medium-sized garages and service centers. It enables customers to book service requests, track vehicle status, and view invoices, while providing administrators and mechanics with tools for efficient management.
Table of Contents
Features
Tech Stack
Setup Instructions
Prerequisites
Backend Setup (Node.js & MySQL)
Frontend Setup (React)
How to Run the Application
Usage

1. Features
The application provides the following key functionalities:
Service Request Booking: Customers can easily submit service requests, providing details such as vehicle make, model, year, VIN, and license plate, along with a list of requested services and a preferred service date.
Real-Time Status Tracking: Customers can track the real-time status of their service requests (e.g., Pending, In Progress, Completed, Cancelled) through a dedicated dashboard.
Mechanic Assignment & Contact Info: Administrators can assign mechanics to service requests. Customers can view the assigned mechanic's contact information.
Service Cost Estimation & Invoicing: Admins/mechanics can set estimated service costs. Upon completion, detailed invoices can be generated, including parts and labor costs.
Schedule Management for Admin: Administrators and mechanics have a dashboard to oversee and manage all incoming service requests.
Service History: A detailed service history is maintained for each vehicle, enhancing customer service and vehicle management.
User Authentication: Secure login and registration for different user roles (customer, mechanic, admin).
2. Tech Stack
The application is built using a modern full-stack architecture:
Frontend
React: A JavaScript library for building user interfaces.
Tailwind CSS: A utility-first CSS framework for rapidly styling the application with a focus on responsiveness.
JavaScript (ES6+): For client-side logic and interactivity.
Backend
Node.js: A JavaScript runtime environment for server-side logic.
Express.js: A minimalist web framework for Node.js, used to build the RESTful API endpoints.
MySQL: A relational database management system for persistent data storage.
mysql2/promise: A Node.js MySQL client with promise-based API for asynchronous database interactions.
bcryptjs: For secure password hashing.
jsonwebtoken (JWT): For stateless user authentication and authorization.
dotenv: To manage environment variables securely.
cors: Middleware for enabling Cross-Origin Resource Sharing.
uuid: For generating unique IDs.
3. Setup Instructions
Follow these steps to set up and run the application on your local machine.
Prerequisites
Before you begin, ensure you have the following installed:
Node.js (LTS version recommended)
npm (Node Package Manager, comes with Node.js) or Yarn
MySQL Server (version 8.0.x is assumed for full compatibility with JSON data types and DATETIME defaults)
MySQL Workbench or another MySQL client for database management.
Backend Setup (Node.js & MySQL)
Clone the Backend Repository:
git clone <your-backend-repo-url> garage-backend
cd garage-backend


Install Backend Dependencies:
npm install
# or
yarn install


Create .env File:
Create a file named .env in the garage-backend directory and add your MySQL database credentials and a JWT secret:
DB_HOST=localhost
DB_USER=garage_user # Or 'root' if you prefer (less secure)
DB_PASSWORD=YOUR_APP_USER_PASSWORD # Use a strong, unique password
DB_DATABASE=garage_db
JWT_SECRET=supersecretjwtkey_replace_with_a_long_random_string
PORT=5000

Important: Replace placeholder values with your actual credentials and a strong, random string for JWT_SECRET.
MySQL Database and User Setup:
Open MySQL Workbench and connect to your MySQL server as root.
Execute the following SQL commands to create the database and a dedicated user for your application. This user (garage_user) is configured with mysql_native_password for broader compatibility with Node.js drivers in MySQL 8.0.x.
-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS garage_db;

-- Use the mysql database to manage users
USE mysql;

-- Drop the user if it already exists from previous attempts to ensure a clean slate
DROP USER IF EXISTS 'garage_user'@'localhost';

-- Create a new user 'garage_user' with the 'mysql_native_password' plugin
CREATE USER 'garage_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YOUR_SUPER_STRONG_APP_PASSWORD';

-- Grant all privileges on your 'garage_db' database to this new user
GRANT ALL PRIVILEGES ON garage_db.* TO 'garage_user'@'localhost';

-- Also grant privileges to connect from '%' (any host) for flexibility,
-- though 'localhost' is primary for local development.
GRANT ALL PRIVILEGES ON garage_db.* TO 'garage_user'@'%';

-- Apply the changes immediately
FLUSH PRIVILEGES;


Remember to use the same YOUR_SUPER_STRONG_APP_PASSWORD here as in your .env file.
Create Database Tables:
In MySQL Workbench, with garage_db selected, execute the following SQL commands to create the users and service_requests tables:
USE garage_db;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    contactNumber VARCHAR(20),
    role ENUM('customer', 'mechanic', 'admin') DEFAULT 'customer',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    make VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    vin VARCHAR(225),
    licensePlate VARCHAR(255) NOT NULL,
    requestedServices JSON NOT NULL,
    serviceDate DATETIME,
    status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending',
    assignedMechanicId VARCHAR(255),
    estimatedCost DECIMAL(10, 2),
    actualCost DECIMAL(10, 2),
    invoiceDetails JSON,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignedMechanicId) REFERENCES users(id) ON DELETE SET NULL
);


Frontend Setup (React)
Clone the Frontend Repository:
git clone <your-frontend-repo-url> garage-frontend
cd garage-frontend


Install Frontend Dependencies:
npm install
# or
yarn install


Configure API Base URL:
Open src/App.js (or your main React component file) and ensure the API_BASE_URL constant matches your backend's port:
const API_BASE_URL = 'http://localhost:5000/api'; // Ensure this matches your Node.js backend port


4. How to Run the Application
Start the Backend Server:
Open a terminal, navigate to the garage-backend directory, and run:
node server.js

You should see messages indicating successful database connection and server startup.
Start the Frontend Development Server:
Open a new terminal, navigate to the garage-frontend directory, and run:
npm start
# or
yarn start

This will open the React application in your default web browser (usually at http://localhost:3000).
5. Usage
Registration: On the login screen, click "Register" to create a new customer account.
Customer Dashboard: After logging in as a customer, you can book new service requests and view the status of your submitted requests.
Admin/Mechanic Accounts: To create an admin or mechanic account, first register a new user through the application. Then, in MySQL Workbench, manually update the role field for that user in the garage_db.users table to 'admin' or 'mechanic'. Log in with this updated account to access the administrative dashboard.
Admin/Mechanic Dashboard: From here, you can view all service requests, update their status, assign mechanics, set estimated costs, and generate invoices.
