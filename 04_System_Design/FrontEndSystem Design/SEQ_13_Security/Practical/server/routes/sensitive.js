// ─────────────────────────────────────────────────────────────────────────────
// routes/sensitive.js — Sensitive UI Data Protection
// ─────────────────────────────────────────────────────────────────────────────
// Demonstrates server-side data masking based on user role.
//
// Endpoints:
//   GET /api/sensitive/user-data          — Returns masked or raw data based on role
//   GET /api/sensitive/user-data/raw      — Always returns raw (admin only)
//   GET /api/sensitive/user-data/masked   — Always returns masked
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { verifyJWT, optionalJWT, requireRole } = require('../middleware/auth');

// Sample sensitive data
const sensitiveData = {
  users: [
    { id: 1, name: 'Alice Johnson', email: 'alice.johnson@google.com', ssn: '123-45-6789', phone: '+1-555-123-4567', creditCard: '4111-1111-1111-1234', salary: 185000, dob: '1990-03-15' },
    { id: 2, name: 'Bob Smith', email: 'bob.smith@example.com', ssn: '987-65-4321', phone: '+1-555-987-6543', creditCard: '5500-0000-0000-0004', salary: 142000, dob: '1988-07-22' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@company.com', ssn: '456-78-9012', phone: '+44-20-7946-0958', creditCard: '3782-822463-10005', salary: 167000, dob: '1992-11-08' },
  ],
};

// ── Masking Functions ────────────────────────────────────────────────────────
function maskEmail(email) {
  const [local, domain] = email.split('@');
  return local[0] + '***@' + domain;
}

function maskSSN(ssn) {
  return '***-**-' + ssn.slice(-4);
}

function maskPhone(phone) {
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

function maskCreditCard(cc) {
  return cc.slice(0, -4).replace(/\d/g, '*') + cc.slice(-4);
}

function maskData(users) {
  return users.map(user => ({
    id: user.id,
    name: user.name,
    email: maskEmail(user.email),
    ssn: maskSSN(user.ssn),
    phone: maskPhone(user.phone),
    creditCard: maskCreditCard(user.creditCard),
    salary: '***,***',
    dob: '****-**-' + user.dob.slice(-2),
  }));
}

// ── Role-Based Data Access ───────────────────────────────────────────────────
router.get('/user-data', optionalJWT, (req, res) => {
  const role = req.user?.role || 'anonymous';

  let data;
  let maskLevel;

  switch (role) {
    case 'admin':
      data = sensitiveData.users;
      maskLevel = 'none';
      break;
    case 'user':
      data = sensitiveData.users.map(u => ({
        ...u,
        ssn: maskSSN(u.ssn),
        creditCard: maskCreditCard(u.creditCard),
        salary: '***,***',
      }));
      maskLevel = 'partial';
      break;
    default:
      data = maskData(sensitiveData.users);
      maskLevel = 'full';
  }

  res.json({
    role,
    maskLevel,
    data,
    explanation: {
      admin: 'Sees all raw data',
      user: 'SSN, credit card, salary masked',
      anonymous: 'Everything except name masked',
    },
  });
});

// ── Raw Data (Admin Only) ────────────────────────────────────────────────────
router.get('/user-data/raw', verifyJWT, requireRole('admin'), (req, res) => {
  res.json({
    data: sensitiveData.users,
    warning: 'This is raw, unmasked PII. Log access for audit.',
    accessedBy: req.user.username,
    accessedAt: new Date().toISOString(),
  });
});

// ── Alias: /data → /user-data (labs use /api/sensitive/data) ─────────────────
router.get('/data', optionalJWT, (req, res, next) => {
  req.url = '/user-data';
  router.handle(req, res, next);
});

// ── Masked Data (Always) ─────────────────────────────────────────────────────
router.get('/user-data/masked', (req, res) => {
  res.json({
    data: maskData(sensitiveData.users),
    maskLevel: 'full',
    note: 'Data is always fully masked regardless of auth level',
  });
});

module.exports = router;
