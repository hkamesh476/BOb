// Entry point for the Express backend
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Enable CORS for all routes
app.use(cors({
  origin: ["http://127.0.0.1:3000"],
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

// Ensure data files exist (async)
async function ensureFile(file, defaultValue) {
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify(defaultValue, null, 2));
  }
}

(async () => {
  await ensureFile(USERS_FILE, []);
  await ensureFile(TICKETS_FILE, []);
  await ensureFile(LOGS_FILE, []);
  await ensureFile(SELLER_CODES_FILE, []);
  await ensureFile(SELLER_NAMES_FILE, {});
})();

// Helper to load predetermined codes asynchronously
async function loadPredeterminedCodes() {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'predeterminedCodes.json'), 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper to read/write users (async)
async function readUsers() {
  return JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
}
async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Helper to read/write tickets (async)
async function readTickets() {
  return JSON.parse(await fs.readFile(TICKETS_FILE, 'utf-8'));
}
async function writeTickets(tickets) {
  await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

// Helper to read/write logs (async)
async function readLogs() {
  return JSON.parse(await fs.readFile(LOGS_FILE, 'utf-8'));
}
async function writeLogs(logs) {
  await fs.writeFile(LOGS_FILE, JSON.stringify(logs, null, 2));
}

// Helper to read/write seller codes (async)
async function readSellerCodes() {
  try {
    return JSON.parse(await fs.readFile(SELLER_CODES_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error reading seller codes:', error);
    return [];
  }
}

async function writeSellerCodes(codes) {
  try {
    await fs.writeFile(SELLER_CODES_FILE, JSON.stringify(codes, null, 2));
  } catch (error) {
    console.error('Error writing seller codes:', error);
    throw new Error('Failed to save seller code');
  }
}

// Helper to read/write seller names (async)
async function readSellerNames() {
  try {
    return JSON.parse(await fs.readFile(SELLER_NAMES_FILE, 'utf-8'));
  } catch (e) {
    return {};
  }
}
async function writeSellerNames(obj) {
  await fs.writeFile(SELLER_NAMES_FILE, JSON.stringify(obj, null, 2));
}

// Helper to get seller code (async)
async function getSellerCode(sellerEmail) {
  const codes = await readSellerCodes();
  const codeEntry = codes.find(c => c.sellerEmail && c.sellerEmail.toLowerCase() === sellerEmail.toLowerCase());
  return codeEntry ? codeEntry.code : null;
}

// Helper to get code info (async)
async function getCodeInfo(code) {
  const codes = await loadPredeterminedCodes();
  if (!codes.includes(code)) return null;
  return { code };
}

// --- Plaintext password system ---
function customHash(password, index) {
  return password;
}
function customVerify(password, index, hash) {
  return password === hash;
}

// Registration route
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;
  if (!firstName || !lastName || !password || (!email && !phone)) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const users = await readUsers();
  if (email && users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already registered.' });
  }
  if (phone && users.find(u => u.phone === phone)) {
    return res.status(409).json({ error: 'Phone already registered.' });
  }
  const id = Date.now().toString();
  const newUser = {
    id,
    firstName,
    lastName,
    email,
    phone,
    password: password,
    role: 'buyer',
    confirmed: true
  };
  users.push(newUser);
  await writeUsers(users);
  res.status(201).json({ message: 'Registration successful.', user: { ...newUser, password: undefined } });
});

// Login route
app.post('/api/login', async (req, res) => {
  const { email, phone, password } = req.body;
  const users = await readUsers();
  const user = users.find(u => (email && u.email === email) || (phone && u.phone === phone));
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  if (password !== user.password) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  res.json({ message: 'Login successful.', user: { ...user, password: undefined } });
});

// Admin: Approve seller
app.post('/api/admin/approve-seller', async (req, res) => {
  const { email } = req.body;
  const users = await readUsers();
  const user = users.find(u => u.email === email && u.role === 'seller');
  if (!user) return res.status(404).json({ error: 'Seller not found.' });
  user.approved = true;
  await writeUsers(users);
  // Log action
  const logs = await readLogs();
  logs.push({ action: 'approve-seller', email, timestamp: Date.now() });
  await writeLogs(logs);
  res.json({ message: 'Seller approved.' });
});

// Admin: Decline seller (remove from users)
app.post('/api/admin/decline-seller', async (req, res) => {
  const { email } = req.body;
  let users = await readUsers();
  const userIdx = users.findIndex(u => u.email === email && u.role === 'seller');
  if (userIdx === -1) return res.status(404).json({ error: 'Seller not found.' });
  users.splice(userIdx, 1);
  await writeUsers(users);
  // Log action
  const logs = await readLogs();
  logs.push({ action: 'decline-seller', email, timestamp: Date.now() });
  await writeLogs(logs);
  res.json({ message: 'Seller declined and removed.' });
});

// Admin: Generate tickets and assign directly to buyer
app.post('/api/admin/generate-tickets', async (req, res) => {
  const { buyerEmail, buyerPhone, amount } = req.body;
  if ((!buyerEmail && !buyerPhone) || typeof amount !== 'number' || amount < 1 || amount > 9999) {
    return res.status(400).json({ error: 'Invalid input.' });
  }
  // Check if buyer exists by email or phone
  const users = await readUsers();
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
  await writeUsers(users);
  // Log action for each buyer
  const logs = await readLogs();
  buyers.forEach(buyer => {
    logs.push({ action: 'admin-grant-tickets', buyerEmail: buyer.email, buyerPhone: buyer.phone, amount, timestamp: Date.now() });
  });
  await writeLogs(logs);
  // Log in tickets.json for admin view (no code/used fields)
  const tickets = await readTickets();
  buyers.forEach(buyer => {
    tickets.push({ buyerEmail: buyer.email, buyerPhone: buyer.phone, amount, granted: true, timestamp: Date.now() });
  });
  await writeTickets(tickets);
  res.json({ message: 'Tickets granted.', tickets: buyers.map(b => ({ email: b.email, phone: b.phone, tickets: b.tickets })) });
});

// Admin: Get all logs
app.get('/api/admin/logs', async (req, res) => {
  const logs = await readLogs();
  res.json(logs);
});

// Admin: Get all sellers and their ticket counts
app.get('/api/admin/sellers', async (req, res) => {
  const users = await readUsers();
  const logs = await readLogs();
  const sellers = await Promise.all(users.filter(u => u.role === 'seller').map(async u => {
    const code = await getSellerCode(u.email);
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
  }));
  res.json(sellers);
});

// Admin: Show all generated ticket codes for buyers
app.get('/api/admin/tickets', async (req, res) => {
  const tickets = await readTickets();
  res.json(tickets);
});

// Admin: Get all seller names by code
app.get('/api/admin/seller-names', async (req, res) => {
  const names = await readSellerNames();
  res.json(names);
});

// Admin: Set seller name for a code
app.post('/api/admin/seller-names', async (req, res) => {
  const { code, name } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  const names = await readSellerNames();
  if (name && name.trim()) {
    names[code.toUpperCase()] = name.trim();
  } else {
    delete names[code.toUpperCase()];
  }
  await writeSellerNames(names);
  res.json({ success: true });
});

// Buyer: Spend tickets using seller code (async)
app.post('/api/buyer/spend', async (req, res) => {
  const { buyerId, code, amount } = req.body;
  if (!buyerId || !code || typeof amount !== 'number' || amount < 1) {
    return res.status(400).json({ error: 'Invalid input.' });
  }
  // Always reload predetermined codes from file for latest changes
  let latestCodes = await loadPredeterminedCodes();
  const codeToCheck = code.trim().toUpperCase();
  // Debug logging
  console.log('Incoming code:', code, '| After trim/upper:', codeToCheck);
  console.log('Loaded codes:', latestCodes);
  if (!latestCodes.map(c => c.toUpperCase()).includes(codeToCheck)) {
    return res.status(404).json({ error: 'Invalid code.' });
  }
  const users = await readUsers();
  const buyer = users.find(u => (u.email === buyerId || u.phone === buyerId));
  if (!buyer) {
    return res.status(404).json({ error: 'Buyer not found.' });
  }
  if ((buyer.tickets || 0) < amount) {
    return res.status(400).json({ error: 'Not enough tickets.' });
  }
  buyer.tickets -= amount;
  await writeUsers(users);
  // Log the transaction
  const logs = await readLogs();
  logs.push({ action: 'spend-tickets', buyerId, code: codeToCheck, amount, timestamp: Date.now() });
  await writeLogs(logs);
  notifyUserUpdate();
  res.json({ message: 'Purchase successful.', buyerTickets: buyer.tickets });
});

// Prevent sellers from spending their own tickets
app.post('/api/seller/spend', (req, res) => {
  res.status(403).json({ error: 'Sellers cannot spend tickets.' });
});

// --- Promote user to admin ---
app.post('/api/admin/promote', async (req, res) => {
  const { email, phone } = req.body;
  // Use passwords.json for lookup
  const PASSWORDS_FILE = path.join(__dirname, '../flask_frontend/passwords.json');
  let passwordData = [];
  try {
    passwordData = JSON.parse(await fs.readFile(PASSWORDS_FILE, 'utf-8'));
  } catch (e) {
    return res.status(500).json({ error: 'Could not read passwords.json' });
  }
  let found = null;
  if (email) {
    found = passwordData.find(u => (u.email && u.email.toLowerCase() === email.toLowerCase()));
  } else if (phone) {
    found = passwordData.find(u => (u.phone && u.phone === phone));
  }
  if (!found) return res.status(404).json({ error: 'User not found in passwords.json.' });

  // Now update users.json to promote
  const users = await readUsers();
  let user = null;
  if (email) {
    user = users.find(u => (u.email && u.email.toLowerCase() === email.toLowerCase()));
  } else if (phone) {
    user = users.find(u => (u.phone && u.phone === phone));
  }
  if (!user) return res.status(404).json({ error: 'User not found in users.json.' });
  user.role = 'admin';
  await writeUsers(users);
  res.json({ message: 'User promoted to admin.' });
});

// --- Forgot password: send code to admin and allow reset ---
let resetCodes = {};
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const users = await readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  // Generate 3-digit code
  const code = Math.floor(100 + Math.random() * 900).toString();
  resetCodes[email] = code;
  // For demo: log to console, in production send to admin
  console.log(`Password reset code for ${email}: ${code}`);
  res.json({ message: 'Reset code sent to admin.' });
});
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!resetCodes[email] || resetCodes[email] !== code) {
    return res.status(400).json({ error: 'Invalid or expired code.' });
  }
  const users = await readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.password = newPassword;
  await writeUsers(users);
  delete resetCodes[email];
  res.json({ message: 'Password reset successful.' });
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
