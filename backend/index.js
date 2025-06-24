// Entry point for the Express backend
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Enable CORS for all routes
app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true
}));

app.use(express.json());

// Data folder paths
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const SELLER_CODES_FILE = path.join(DATA_DIR, 'sellerCodes.json');
const SELLER_NAMES_FILE = path.join(DATA_DIR, 'sellerNames.json');

// Ensure data files exist
function ensureFile(file, defaultValue) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  }
}

ensureFile(USERS_FILE, []);
ensureFile(TICKETS_FILE, []);
ensureFile(LOGS_FILE, []);
ensureFile(SELLER_CODES_FILE, []);
ensureFile(SELLER_NAMES_FILE, {});

// Load predetermined codes from file
const PREDETERMINED_CODES = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'predeterminedCodes.json'), 'utf-8'));

// Helper to read/write users
function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Helper to read/write tickets
function readTickets() {
  return JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf-8'));
}
function writeTickets(tickets) {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

// Helper to read/write logs
function readLogs() {
  return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
}
function writeLogs(logs) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

// Helper to read/write seller codes
function readSellerCodes() {
  try {
    return JSON.parse(fs.readFileSync(SELLER_CODES_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error reading seller codes:', error);
    return [];
  }
}

function writeSellerCodes(codes) {
  try {
    fs.writeFileSync(SELLER_CODES_FILE, JSON.stringify(codes, null, 2));
  } catch (error) {
    console.error('Error writing seller codes:', error);
    throw new Error('Failed to save seller code');
  }
}

// Helper to read/write seller names
function readSellerNames() {
  try {
    return JSON.parse(fs.readFileSync(SELLER_NAMES_FILE, 'utf-8'));
  } catch (e) {
    return {};
  }
}
function writeSellerNames(obj) {
  fs.writeFileSync(SELLER_NAMES_FILE, JSON.stringify(obj, null, 2));
}

// Helper to get seller code
function getSellerCode(sellerEmail) {
  const codes = readSellerCodes();
  const codeEntry = codes.find(c => c.sellerEmail.toLowerCase() === sellerEmail.toLowerCase());
  return codeEntry ? codeEntry.code : null;
}

// Helper to get code info
function getCodeInfo(code) {
  if (!PREDETERMINED_CODES.includes(code)) return null;
  return { code };
}

// Registration route
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;
  if (!firstName || !lastName || !password || (!email && !phone)) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const users = readUsers();
  if (email && users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already registered.' });
  }
  if (phone && users.find(u => u.phone === phone)) {
    return res.status(409).json({ error: 'Phone already registered.' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    firstName,
    lastName,
    email,
    phone,
    password: hashedPassword,
    role: 'buyer',
    confirmed: true
  };
  users.push(newUser);
  writeUsers(users);
  res.status(201).json({ message: 'Registration successful.', user: { ...newUser, password: undefined } });
});

// Login route
app.post('/api/login', async (req, res) => {
  const { email, phone, password } = req.body;
  const users = readUsers();
  const user = users.find(u => (email && u.email === email) || (phone && u.phone === phone));
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  res.json({ message: 'Login successful.', user: { ...user, password: undefined } });
});

// Admin: Approve seller
app.post('/api/admin/approve-seller', (req, res) => {
  const { email } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email && u.role === 'seller');
  if (!user) return res.status(404).json({ error: 'Seller not found.' });
  user.approved = true;
  writeUsers(users);
  // Log action
  const logs = readLogs();
  logs.push({ action: 'approve-seller', email, timestamp: Date.now() });
  writeLogs(logs);
  res.json({ message: 'Seller approved.' });
});

// Admin: Decline seller (remove from users)
app.post('/api/admin/decline-seller', (req, res) => {
  const { email } = req.body;
  let users = readUsers();
  const userIdx = users.findIndex(u => u.email === email && u.role === 'seller');
  if (userIdx === -1) return res.status(404).json({ error: 'Seller not found.' });
  users.splice(userIdx, 1);
  writeUsers(users);
  // Log action
  const logs = readLogs();
  logs.push({ action: 'decline-seller', email, timestamp: Date.now() });
  writeLogs(logs);
  res.json({ message: 'Seller declined and removed.' });
});

// Admin: Generate tickets and assign directly to buyer
app.post('/api/admin/generate-tickets', (req, res) => {
  const { buyerEmail, buyerPhone, amount } = req.body;
  if ((!buyerEmail && !buyerPhone) || typeof amount !== 'number' || amount < 1 || amount > 9999) {
    return res.status(400).json({ error: 'Invalid input.' });
  }
  // Check if buyer exists by email or phone
  const users = readUsers();
  let buyers = [];
  if (buyerEmail) {
    const byEmail = users.find(u => u.email === buyerEmail && u.role === 'buyer');
    if (byEmail) buyers.push(byEmail);
  }
  if (buyerPhone) {
    const byPhone = users.find(u => u.phone === buyerPhone && u.role === 'buyer');
    if (byPhone && !buyers.includes(byPhone)) buyers.push(byPhone);
  }
  if (buyers.length === 0) {
    return res.status(404).json({ error: 'Buyer not found.' });
  }
  buyers.forEach(buyer => {
    if (typeof buyer.tickets !== 'number') buyer.tickets = 0;
    buyer.tickets += amount;
    console.log('DEBUG: Granting tickets. Buyer:', buyer.email || buyer.phone, 'New ticket count:', buyer.tickets);
  });
  writeUsers(users);
  // Log action for each buyer
  const logs = readLogs();
  buyers.forEach(buyer => {
    logs.push({ action: 'admin-grant-tickets', buyerEmail: buyer.email, buyerPhone: buyer.phone, amount, timestamp: Date.now() });
  });
  writeLogs(logs);
  // Log in tickets.json for admin view (no code/used fields)
  const tickets = readTickets();
  buyers.forEach(buyer => {
    tickets.push({ buyerEmail: buyer.email, buyerPhone: buyer.phone, amount, granted: true, timestamp: Date.now() });
  });
  writeTickets(tickets);
  res.json({ message: 'Tickets granted.', tickets: buyers.map(b => ({ email: b.email, phone: b.phone, tickets: b.tickets })) });
});

// Admin: Get all logs
app.get('/api/admin/logs', (req, res) => {
  res.json(readLogs());
});

// Admin: Get all sellers and their ticket counts
app.get('/api/admin/sellers', (req, res) => {
  const users = readUsers();
  const logs = readLogs();
  const sellers = users.filter(u => u.role === 'seller').map(u => {
    const code = getSellerCode(u.email);
    // Sum all spend-tickets logs for this seller's code
    const totalEarned = logs
      .filter(l => l.action === 'spend-tickets' && l.code && l.code.toUpperCase() === (code || '').toUpperCase())
      .reduce((sum, l) => sum + (l.amount || 0), 0);
    return {
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      approved: u.approved || false,
      tickets: u.tickets || 0,
      code,
      totalEarned
    };
  });
  res.json(sellers);
});

// Admin: Show all generated ticket codes for buyers
app.get('/api/admin/tickets', (req, res) => {
  const tickets = readTickets();
  res.json(tickets);
});

// Admin: Get all seller names by code
app.get('/api/admin/seller-names', (req, res) => {
  res.json(readSellerNames());
});

// Admin: Set seller name for a code
app.post('/api/admin/seller-names', (req, res) => {
  const { code, name } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  const names = readSellerNames();
  if (name && name.trim()) {
    names[code.toUpperCase()] = name.trim();
  } else {
    delete names[code.toUpperCase()];
  }
  writeSellerNames(names);
  res.json({ success: true });
});

// Buyer: Spend tickets using seller code
app.post('/api/buyer/spend', (req, res) => {
  const { buyerId, code, amount } = req.body;
  if (!buyerId || !code || typeof amount !== 'number' || amount < 1) {
    return res.status(400).json({ error: 'Invalid input.' });
  }
  // Always reload predetermined codes from file for latest changes
  const predeterminedCodesPath = path.join(DATA_DIR, 'predeterminedCodes.json');
  let latestCodes = [];
  try {
    latestCodes = JSON.parse(fs.readFileSync(predeterminedCodesPath, 'utf-8'));
  } catch (e) {
    return res.status(500).json({ error: 'Could not load predetermined codes.' });
  }
  const codeToCheck = code.trim().toUpperCase();
  // Debug logging
  console.log('Incoming code:', code, '| After trim/upper:', codeToCheck);
  console.log('Loaded codes:', latestCodes);
  if (!latestCodes.map(c => c.toUpperCase()).includes(codeToCheck)) {
    return res.status(404).json({ error: 'Invalid code.' });
  }
  const users = readUsers();
  const buyer = users.find(u => (u.email === buyerId || u.phone === buyerId));
  if (!buyer) {
    return res.status(404).json({ error: 'Buyer not found.' });
  }
  if ((buyer.tickets || 0) < amount) {
    return res.status(400).json({ error: 'Not enough tickets.' });
  }
  buyer.tickets -= amount;
  writeUsers(users);
  // Log the transaction
  const logs = readLogs();
  logs.push({ action: 'spend-tickets', buyerId, code: codeToCheck, amount, timestamp: Date.now() });
  writeLogs(logs);
  notifyUserUpdate();
  res.json({ message: 'Purchase successful.', buyerTickets: buyer.tickets });
});

// Prevent sellers from spending their own tickets
app.post('/api/seller/spend', (req, res) => {
  res.status(403).json({ error: 'Sellers cannot spend tickets.' });
});

// Placeholder: Add routes for admin actions, ticket generation, etc.
app.get('/', (req, res) => {
  res.send('Bank of Begonia backend is running.');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Function to notify clients of updates
function notifyUserUpdate() {
  io.emit('user-update');
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
