# Student Admission and Management Portal

A full-stack, responsive web application for managing student admissions, applicant verification, administrative reviews, automated email notifications, and directory pagination.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
  - [Student Application and Self-Service](#student-application-and-self-service)
  - [Administrative Dashboard](#administrative-dashboard)
  - [Automated Email Notification System](#automated-email-notification-system)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [Default Admin Credentials](#default-admin-credentials)
- [Mock Data Generation](#mock-data-generation)
- [API Documentation](#api-documentation)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Student Endpoints](#student-endpoints)
- [Security Features](#security-features)
- [License](#license)

---

## Overview

The Student Admission Portal provides an automated workflow for student applications and admissions management:
1. Applicants submit their biodata, academic records (including JAMB scores), and optional passport photos. An account is automatically provisioned, and login credentials are sent via email.
2. Admissions Officers and Administrators review applicants through a centralized dashboard with real-time statistics, search, status filtering, and 20-per-page pagination.

---

## Key Features

### Student Application and Self-Service
- Comprehensive Registration Form (`/form`): Captures full name, email, date of birth, gender, phone number, address, state of origin, local government area, next of kin, and JAMB score (validated between 0 and 400).
- Dynamic State and LGA Selection: Local Government Areas update automatically based on the selected Nigerian state using local dataset mapping.
- Passport Photo Upload with Default Avatar: Supports JPG, JPEG, and PNG image uploads up to 5MB. If omitted, the portal automatically assigns a default system avatar.
- Automated Credential Delivery: Generates a temporary password upon form submission and sends it directly to the applicant's email address.
- Unified Authentication (`/login`): Single sign-in portal for both administrators and students.
- Forgot Password Functionality: Modal on the login page allowing users to request a password reset; a temporary password is sent to their registered email.
- Student Application Review (`/details`): Authenticated students can view their submission status, verify application details, and update their password.

### Administrative Dashboard
- Real-Time Summary Cards: Live counters displaying total applicants, approved applications, pending reviews, and rejected submissions.
- High-Performance Pagination: Displays 20 applicants per page with dynamic page numbers and Previous/Next navigation controls.
- Search and Filtering: Real-time search across applicant names and email addresses, with status filtering (All, Pending, Approved, Rejected).
- Application Review and Actions:
  - Update status directly from the table or from the detailed review page.
  - Delete applicant records with a confirmation modal.
  - Easy navigation back to the dashboard from the review page.
- Clean Navigation State: Automatically adapts the navigation bar based on authentication status (hides login and register buttons; displays dashboard and logout links).

### Automated Email Notification System
Powered by Nodemailer with support for Gmail and custom SMTP servers. In development without SMTP credentials, notifications automatically fall back to formatted console output.
- Registration Email: Sends welcome confirmation with temporary login credentials.
- Admission Status Updates: Notifies applicants when their admission status changes to Approved or Rejected.
- Security Alerts: Notifies account holders with a timestamp whenever a login occurs.
- Password Reset: Delivers temporary credentials when a password reset is requested.

---

## Tech Stack

### Backend
- Node.js and Express.js: RESTful API server and static asset delivery.
- MongoDB and Mongoose: Document storage, schema enforcement, and indexing.
- JSON Web Tokens (JWT): Stateless authentication and role-based access control.
- BcryptJS: Password hashing with salt rounds.
- Multer: Multipart form and image upload handling.
- Nodemailer: Transactional email notifications with console logging fallback.
- @faker-js/faker: Generation of realistic mock student datasets.

### Frontend
- HTML5 and Vanilla JavaScript (ES6+): Lightweight, responsive client-side logic.
- Bootstrap 5: Responsive grid system, modal dialogs, and UI components.
- CSS3: Custom styles and dashboard enhancements.

---

## Project Architecture

```plaintext
Student-portal/
|-- Client/
|   |-- public/
|   |   |-- css/
|   |   |   |-- form.css                  # Form styling
|   |   |   `-- styles.css                # Global and dashboard styling
|   |   |-- images/
|   |   |   |-- avatar.png                # Default avatar (PNG)
|   |   |   |-- avatar.svg                # Default avatar (SVG)
|   |   |   |-- homepage.svg              # Landing page illustration
|   |   |   `-- logo.svg                  # Brand logo
|   |   |-- js/
|   |   |   |-- api.js                    # Fetch wrapper for API calls
|   |   |   |-- details.js                # Detail view and status update handler
|   |   |   |-- form.js                   # Application form validation and LGA logic
|   |   |   |-- login.js                  # Authentication and forgot-password modal
|   |   |   |-- main.js                   # Navigation and layout utilities
|   |   |   |-- states-localgovts.json    # State and LGA mapping data
|   |   |   `-- students.js               # Admin dashboard and pagination logic
|   |   `-- states-localgovts.json
|   `-- views/
|       |-- details.html                  # Application detail and review page
|       |-- form.html                     # Student admission application page
|       |-- index.html                    # Homepage and landing page
|       |-- login.html                    # Login and password reset page
|       `-- student.html                  # Admin applicants directory dashboard
|-- Server/
|   |-- config/
|   |   |-- config.js                     # Application settings and limits
|   |   |-- db.js                         # MongoDB connection configuration
|   |   `-- multer.js                     # File upload storage configuration
|   |-- controllers/
|   |   |-- authcontroller.js             # Authentication, admin seed, and password reset
|   |   `-- studentController.js          # Student CRUD, pagination, and status logic
|   |-- data/
|   |   `-- states-localgovts.json        # Server-side states and LGAs dataset
|   |-- middleware/
|   |   |-- auth.js                       # JWT verification and role authorization
|   |   `-- errorHandler.js               # Central error handling middleware
|   |-- models/
|   |   |-- Student.js                    # Mongoose student schema
|   |   |-- User.js                       # Mongoose administrator schema
|   |   `-- state.js                      # State schema
|   |-- routes/
|   |   |-- api/
|   |   |   |-- auth.js                   # Authentication routes
|   |   |   `-- students.js               # Student management routes
|   |   `-- index.js                      # Root router configuration
|   |-- uploads/
|   |   |-- avatar.png                    # Upload directory default avatar
|   |   `-- avatar.svg                    # Upload directory default SVG
|   |-- utils/
|   |   |-- apiFeatures.js                # Query filtering and pagination utility
|   |   `-- emailService.js               # Email dispatching and templates
|   |-- package.json                      # Server dependencies and scripts
|   |-- package-lock.json
|   `-- server.js                         # Application entrypoint
|-- partials/
|   |-- footer.html                       # Reusable footer component
|   `-- navbar.html                       # Reusable navigation component
|-- .gitignore                            # Excluded files and directories
|-- .hintrc                               # Code quality configuration
|-- mockdatascript.js                     # Mock data generator (500 records)
`-- README.md                             # Project documentation
```

---

## Getting Started

### Prerequisites
- Node.js (version 16 or newer)
- MongoDB instance (local or MongoDB Atlas connection URI)

### Installation

1. Clone the repository:
   ```bash
   git clone <REMOTE_REPOSITORY_URL>
   cd Student-portal
   ```

2. Install backend dependencies:
   ```bash
   cd Server
   npm install
   cd ..
   ```

### Environment Variables

Create a `.env` file inside the `Server/` directory:

```ini
# Server Configuration
PORT=8000
NODE_ENV=development

# Database Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/test?retryWrites=true&w=majority

# CORS Configuration
CLIENT_URL=http://localhost:8000,http://127.0.0.1:8000,http://localhost:5500

# Administrator Credentials
ADMIN_EMAIL=admin@portal.edu
ADMIN_PASSWORD=Admin@12345

# JWT Secret
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email Notification Settings (Optional)
# If not configured, emails will be output to the server console
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM="Student Admission Portal" <no-reply@portal.edu>
```

### Running the Application

1. Start the server:
   ```bash
   cd Server
   npm start
   ```

   For development with automatic reload:
   ```bash
   npm run dev
   ```

2. Open the portal in your browser:
   - Landing Page: http://localhost:8000/
   - Admission Application: http://localhost:8000/form
   - Login: http://localhost:8000/login
   - Admin Dashboard: http://localhost:8000/students

---

## Default Admin Credentials

If no admin account exists in the database on startup, the system automatically creates the default administrator account:

- Email: `admin@portal.edu` (or the value set in `ADMIN_EMAIL`)
- Password: `Admin@12345` (or the value set in `ADMIN_PASSWORD`)
- Role: `admin`

For production environments, ensure you change `ADMIN_PASSWORD` in your `.env` file before initial deployment.

---

## Mock Data Generation

To populate the database with test records and verify features like the 20-records-per-page pagination, run the mock generator:

```bash
node mockdatascript.js
```

What the script does:
- Generates 500 unique student records using `@faker-js/faker`.
- Assigns randomized Nigerian names, contacts, and valid JAMB scores (130 to 370).
- Distributes admission statuses across Pending, Approved, and Rejected.
- Sets a pre-hashed default password (`Student@123`) so all mock students can sign in.
- Points each mock record to the default avatar to prevent missing image references.

---

## API Documentation

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Authenticates user or administrator and returns JWT token. |
| POST | `/api/auth/forgot-password` | Public | Sends a temporary password to the user's email. |
| POST | `/api/auth/change-password` | Authenticated | Updates the password for the current authenticated user. |
| GET | `/api/auth/profile` | Authenticated | Returns current authenticated user details. |

### Student Endpoints (`/api`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/states` | Public | Returns Nigerian states and local government areas. |
| POST | `/api/students` | Public | Submits a new admission application (supports file upload). |
| GET | `/api/students` | Admin | Retrieves paginated applicants (page, limit=20, search, status). |
| GET | `/api/students/:id` | Authenticated | Retrieves details of a specific applicant. |
| PATCH | `/api/students/:id` | Admin | Updates admission status (Pending, Approved, Rejected). |
| DELETE | `/api/students/:id` | Admin | Deletes an applicant record. |

---

## Security Features

- Password Hashing: Bcrypt is used to hash all passwords before storage in MongoDB.
- JWT Authentication: Sensitive admin routes and student data are guarded by token validation and role checks.
- Upload Restrictions: Multer validates file types and enforces a 5MB size limit on uploads.
- Environment Protection: Sensitive secrets and binary upload directories are excluded from version control via `.gitignore`.
- Data Validation: Mongoose schemas enforce data types, email formats, and numerical bounds on scores.

---

## License

This project is licensed under the ISC License.
