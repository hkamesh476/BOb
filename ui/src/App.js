import React, { useState, useEffect } from 'react';
import './App.css';
import { io } from 'socket.io-client';
import SellerEarningsByName from './SellerEarningsByName';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate
} from 'react-router-dom';

const API = 'http://localhost:3000/api';
const socket = io('http://localhost:3000', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Color palette
const BEGONIA = '#f7786b'; // begonia pink
const MARIGOLD = '#ffc300'; // marigold yellow
const LARKSPUR = '#7366bd'; // larkspur purple
const SKY_BLUE = '#87CEEB'; // sky blue color

function AppContent() {
  const [view, setView] = useState('welcome');
  const [form, setForm] = useState({
    firstName: '', lastName: '', contact: '', password: '', // contact can be email or phone
  });
  const [login, setLogin] = useState({ contact: '', password: '' });
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [spend, setSpend] = useState({ code: '', amount: '' });
  const [pendingSpend, setPendingSpend] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [buyerPassword, setBuyerPassword] = useState(''); // New state for buyer's password
  const [sellerPassword, setSellerPassword] = useState(''); // New state for seller's password
  const [selectedCode, setSelectedCode] = useState(''); // Default to empty string to show all
  const [phoneInput, setPhoneInput] = useState('');
  const [amountPhone, setAmountPhone] = useState('');
  const [newSellerCode, setNewSellerCode] = useState('');
  const [newSellerName, setNewSellerName] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  // Persist user and password in sessionStorage (not localStorage)
  React.useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    const savedLogin = sessionStorage.getItem('login');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedLogin) setLogin(JSON.parse(savedLogin));
  }, []);

  React.useEffect(() => {
    if (user) sessionStorage.setItem('user', JSON.stringify(user));
    if (login) sessionStorage.setItem('login', JSON.stringify(login));
  }, [user, login]);

  // Set document title
  useEffect(() => {
    document.title = 'Bank of Begonia';
  }, []);

  // Registration
  const handleRegister = async e => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password,
          email: form.contact.includes('@') ? form.contact : undefined,
          phone: form.contact.match(/^\d{10}$/) ? form.contact : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        navigate('/login');
      } else {
        setMessage(data.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setMessage('Cannot connect to server. Please check if the server is running.');
    }
  };

  // Login
  const handleLogin = async e => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: login.contact.includes('@') ? login.contact : undefined,
          phone: login.contact.match(/^[0-9]{10}$/) ? login.contact : undefined,
          password: login.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        sessionStorage.setItem('user', JSON.stringify(data.user)); // Save immediately
        sessionStorage.setItem('login', JSON.stringify(login));
        // If login is successful and user is a buyer, store the password
        if (data.user.role === 'buyer') setBuyerPassword(login.password);
        // If login is successful and user is a seller, store the password
        if (data.user.role === 'seller') setSellerPassword(login.password);
        navigate('/dashboard');
        setMessage('');
      } else {
        setMessage(data.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      setMessage('Cannot connect to server. Please check if the server is running.');
    }
  };

  // Admin: Generate ticket code (now grants tickets directly)
  const handleGrantTickets = async e => {
    e.preventDefault();
    setMessage('');
    const res = await fetch(`${API}/admin/generate-tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerEmail: login.email, amount: Number(amount) }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Tickets granted!');
      // If the admin is granting tickets to the currently logged-in buyer, update their ticket count
      if (user && user.email === login.email && user.role === 'buyer') {
        setUser({ ...user, tickets: data.tickets });
      }
    } else {
      setMessage(data.error);
    }
  };

  // Buyer: Spend tickets
  const handleSpend = async e => {
    e.preventDefault();
    setMessage('');
    setPendingSpend({
      code: spend.code.toUpperCase().trim(), // always send code in correct field, uppercased and trimmed
      amount: spend.amount
    });
  };

  const confirmSpend = async (confirm) => {
    if (!confirm) {
      setPendingSpend(null);
      return;
    }
    try {
      const res = await fetch(`${API}/buyer/spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          buyerId: user.email || user.phone, // use buyerId to match backend
          code: pendingSpend.code.toUpperCase().trim(), // always send code uppercased and trimmed
          amount: Number(pendingSpend.amount) 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Purchase successful!');
        setUser({ ...user, tickets: data.buyerTickets });
      } else {
        setMessage(data.error || 'Failed to spend tickets.');
      }
    } catch (error) {
      console.error('Error spending tickets:', error);
      setMessage('Failed to process transaction. Please try again.');
    }
    setPendingSpend(null);
  };

  // Update fetchUser to use stored password for buyers and sellers
  const fetchUser = async () => {
    if (!user) return;
    let password = '';
    if (user.role === 'buyer') password = buyerPassword;
    if (user.role === 'seller') password = sellerPassword;
    if (!password) {
      setMessage('Cannot refresh: password missing. Please log in again.');
      return;
    }
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          phone: user.phone,
          password
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setMessage('Balance updated!');
        setTimeout(() => setMessage(''), 2000); // Clear message after 2 seconds
      } else {
        setMessage(data.error || 'Failed to refresh.');
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setMessage('Failed to refresh. Please try again.');
    }
  };

  React.useEffect(() => {
    // Removed fetchSellers logic since sellers/admin is not used
  }, [view]);

  React.useEffect(() => {
    socket.on('user-update', () => {
      // Removed fetchSellers logic since sellers/admin is not used
      if (view === 'dashboard' && user) {
        fetchUser(user.email, buyerPassword);
      }
    });

    return () => {
      socket.off('user-update');
    };
  }, [view, user]);

  // Add socket connection status handling
  React.useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setMessage('Lost connection to server. Attempting to reconnect...');
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  // Fetch recent transactions
  const [transactions, setTransactions] = useState([]);
  const fetchTransactions = React.useCallback(() => {
    fetch(`${API}/admin/logs`)
      .then(res => res.json())
      .then(data => {
        let filtered = data.filter(l => l.action === 'spend-tickets');
        // Always filter by code if selectedCode is set (case-insensitive)
        if (selectedCode) {
          filtered = filtered.filter(t => t.code && t.code.toUpperCase() === selectedCode.toUpperCase());
        }
        setTransactions(filtered.reverse());
      })
      .catch(() => setTransactions([]));
  }, [selectedCode]);

  // Auto-fetch transactions when selectedCode changes (no need for manual refresh)
  React.useEffect(() => {
    if (view === 'transaction') {
      fetchTransactions();
    }
  }, [selectedCode, view, fetchTransactions]);

  React.useEffect(() => {
    let interval;
    if (view === 'transaction') {
      interval = setInterval(fetchTransactions, 10000); // 10 seconds
    }
    return () => clearInterval(interval);
  }, [view, fetchTransactions]);

  // Fetch predetermined codes for dropdown
  const [codes, setCodes] = useState([]);
  React.useEffect(() => {
    fetch('/data/predeterminedCodes.json')
      .then(res => res.json())
      .then(setCodes)
      .catch(() => setCodes([]));
  }, []);

  // Admin: Seller earnings state
  const [sellerEarnings, setSellerEarnings] = useState([]);
  const [allCodes, setAllCodes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sellerMap, setSellerMap] = useState({});
  React.useEffect(() => {
    if (user && user.role === 'admin' && view === 'dashboard') {
      fetch(`${API}/admin/sellers`).then(res => res.json()).then(sellers => {
        // Exclude test sellers
        const filtered = sellers.filter(s => !/test/i.test(s.firstName + ' ' + s.lastName + ' ' + s.email));
        setSellerEarnings(filtered);
        // Map code to seller
        const map = {};
        filtered.forEach(s => { if (s.code) map[s.code.toUpperCase()] = s; });
        setSellerMap(map);
        // Set allCodes from seller codes if not empty
        const codesFromSellers = filtered.map(s => s.code).filter(Boolean);
        setAllCodes(codesFromSellers.length > 0 ? codesFromSellers : []);
      }).catch(() => { setSellerEarnings([]); setSellerMap({}); setAllCodes([]); });
      // Also try to load from predeterminedCodes.json as fallback ONLY if sellers fetch fails
      fetch('/data/predeterminedCodes.json').then(res => res.json()).then(codes => {
        if (codes && codes.length > 0) setAllCodes(prev => (prev.length === 0 ? codes : prev));
      }).catch(() => {});
      fetch(`${API}/admin/logs`).then(res => res.json()).then(setLogs).catch(() => setLogs([]));
    }
  }, [user, view]);

  // Admin: Seller names state for code naming
  const [sellerNames, setSellerNames] = useState({});
  const [sellerNamesLoading, setSellerNamesLoading] = useState(false);
  const [sellerNamesSaved, setSellerNamesSaved] = useState({});
  // Always fetch seller names on dashboard view for admin
  React.useEffect(() => {
    if (user && user.role === 'admin' && view === 'dashboard') {
      fetch(`${API}/admin/seller-names`).then(res => res.json()).then(data => {
        setSellerNames(data || {});
      }).catch(() => setSellerNames({}));
    }
  }, [user, view]);
  const fetchSellerNames = () => {
    setSellerNamesLoading(true);
    fetch(`${API}/admin/seller-names`).then(res => res.json()).then(data => {
      setSellerNames(data);
      setSellerNamesLoading(false);
    }).catch(() => setSellerNames({}));
  };
  React.useEffect(() => {
    if (user && user.role === 'admin' && view === 'dashboard') {
      fetchSellerNames();
    }
  }, [user, view]);
  const handleSellerNameChange = (code, name) => {
    setSellerNames({ ...sellerNames, [code]: name });
    setSellerNamesSaved({ ...sellerNamesSaved, [code]: false });
  };
  const saveSellerName = (code, nameOverride) => {
    fetch(`${API}/admin/seller-names`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name: nameOverride !== undefined ? nameOverride : sellerNames[code] })
    }).then(() => {
      setSellerNamesSaved({ ...sellerNamesSaved, [code]: true });
      fetchSellerNames();
    });
  };

  // Save seller's real name (first and last) from admin panel
  const saveSellerRealName = (seller) => {
    fetch(`${API}/admin/update-seller-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: seller.code, firstName: seller.firstName, lastName: seller.lastName })
    })
      .then(() => {
        setMessage('Seller name updated!');
        setTimeout(() => setMessage(''), 2000);
      })
      .catch(() => setMessage('Failed to update seller name.'));
  };

  // Map code to seller name for buyer view (use sellerNames)
  const [codeToSeller, setCodeToSeller] = useState({});
  React.useEffect(() => {
    fetch(`${API}/admin/seller-names`).then(res => res.json()).then(data => {
      setCodeToSeller(data);
    }).catch(() => setCodeToSeller({}));
  }, []);

  // Place all hooks here, before any return or conditional
  const fetchTransactionPageData = React.useCallback((e) => {
    if (e) e.preventDefault();
    fetch('/data/predeterminedCodes.json').then(res => res.json()).then(setAllCodes).catch(() => setAllCodes([]));
    fetch(`${API}/admin/seller-names`).then(res => res.json()).then(setSellerNames).catch(() => setSellerNames({}));
    fetch(`${API}/admin/logs`).then(res => res.json()).then(setLogs).catch(() => setLogs([]));
  }, []);

  // Add this function to refresh all transaction page data, including transactions
  const refreshTransactionPage = React.useCallback(() => {
    fetchTransactionPageData();
    fetchTransactions();
  }, [fetchTransactionPageData, fetchTransactions]);

  // Define page components for routing
  const welcomePage = (
    <div className="App" style={{ 
      background: SKY_BLUE,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <h1 style={{ color: 'white', marginBottom: '30px', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
        Welcome to Bank of Begonia
      </h1>
      <div style={{ 
        display: 'flex', 
        gap: '20px'
      }}>
        <button 
          onClick={() => navigate('/login')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: 'white',
            color: SKY_BLUE,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          Login
        </button>
        <button 
          onClick={() => navigate('/register')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            border: '2px solid white',
            borderRadius: '5px',
            backgroundColor: 'transparent',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Register
        </button>
        <button 
          onClick={() => navigate('/transaction')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            border: '2px solid white',
            borderRadius: '5px',
            backgroundColor: 'maroon',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Transaction
        </button>
      </div>
    </div>
  );

  // Login View
  const loginPage = (
    <div className="App" style={{ 
      background: SKY_BLUE,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ color: SKY_BLUE, marginBottom: '20px', textAlign: 'center' }}>Login</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="Email or Phone"
            value={login.contact}
            onChange={e => setLogin({ ...login, contact: e.target.value })}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={login.password}
            onChange={e => setLogin({ ...login, password: e.target.value })}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
            required
          />
          <button type="submit" style={{
            padding: '12px',
            backgroundColor: SKY_BLUE,
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer'
          }}>
            Login
          </button>
        </form>
        {message && <p style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>{message}</p>}
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          Don't have an account?{' '}
          <span 
            onClick={() => navigate('/register')} 
            style={{ color: SKY_BLUE, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Register here
          </span>
        </p>
        <p style={{ textAlign: 'center', marginTop: '10px' }}>
          <span 
            onClick={() => navigate('/')} 
            style={{ color: SKY_BLUE, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Back to Welcome
          </span>
        </p>
      </div>
    </div>
  );

  // Register View
  const registerPage = (
    <div className="App" style={{ 
      background: SKY_BLUE,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ color: SKY_BLUE, marginBottom: '20px', textAlign: 'center' }}>Register</h2>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="First Name"
            value={form.firstName}
            onChange={e => setForm({ ...form, firstName: e.target.value })}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={form.lastName}
            onChange={e => setForm({ ...form, lastName: e.target.value })}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
            required
          />
          <input
            type="text"
            placeholder="Email or Phone"
            value={form.contact}
            onChange={e => setForm({ ...form, contact: e.target.value })}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
            required
          />
          <button type="submit" style={{
            padding: '12px',
            backgroundColor: SKY_BLUE,
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer'
          }}>
            Register
          </button>
        </form>
        {message && <p style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>{message}</p>}
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          Already have an account?{' '}
          <span 
            onClick={() => navigate('/login')} 
            style={{ color: SKY_BLUE, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Login here
          </span>
        </p>
        <p style={{ textAlign: 'center', marginTop: '10px' }}>
          <span 
            onClick={() => navigate('/')} 
            style={{ color: SKY_BLUE, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Back to Welcome
          </span>
        </p>
      </div>
    </div>
  );

  // Dashboard View
  const dashboardPage = (
    <div className="App" style={{ background: MARIGOLD, minHeight: '100vh', padding: 32 }}>
      {!user ? (
        <div>Please log in.</div>
      ) : (
        <>
          <h2 style={{ color: LARKSPUR }}>
            Welcome, {user.firstName} ({user.role})
          </h2>
          <button style={{ background: BEGONIA, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', marginBottom: 16 }} onClick={() => { setUser(null); sessionStorage.removeItem('user'); sessionStorage.removeItem('login'); navigate('/login'); }}>Logout</button>
          {user.role === 'buyer' && (
            <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 18, boxShadow: '0 4px 16px #43c6ac55', padding: 40, maxWidth: 600, minWidth: 350, margin: '0 auto' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#43c6ac', marginBottom: 18 }}>🎟️ Tickets: <span style={{ color: '#ff6f61' }}>{user.tickets || 0}</span></div>
              <button style={{ marginBottom: 24, background: LARKSPUR, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 18 }} onClick={fetchUser}>Refresh</button>
              <form onSubmit={handleSpend} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <input 
                    list="predetermined-codes"
                    style={{ padding: 12, borderRadius: 8, border: '1px solid #43c6ac', marginRight: 12, fontSize: 18, width: 180 }} 
                    placeholder="Enter 2-character code (letters or numbers)" 
                    value={spend.code}
                    onChange={e => setSpend({ ...spend, code: e.target.value.toUpperCase().trim() })}
                    pattern="[A-Z0-9]{2}"
                    maxLength={2}
                    required 
                  />
                  <datalist id="predetermined-codes">
                    {codes.map(code => (
                      <option key={code} value={code} />
                    ))}
                  </datalist>
                  {spend.code && codeToSeller[spend.code.toUpperCase()] && codeToSeller[spend.code.toUpperCase()].trim() && (
                    <span style={{ marginLeft: 12, color: '#43c6ac', fontWeight: 600, fontSize: 16, minWidth: 120, display: 'inline-block' }}>
                      Seller: {codeToSeller[spend.code.toUpperCase()]}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 24 }}>
                  <input 
                    style={{ padding: 12, borderRadius: 8, border: '1px solid #43c6ac', fontSize: 18, width: 200 }} 
                    placeholder="Amount of tickets" 
                    type="number" 
                    min="1"
                    value={spend.amount} 
                    onChange={e => setSpend({ ...spend, amount: e.target.value })} 
                    required 
                  />
                </div>
                <div style={{ marginTop: 18, display: 'flex', alignItems: 'center' }}>
                  <button style={{ background: '#ff6f61', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 18 }} type="submit">Spend Tickets</button>
                </div>
              </form>
              {pendingSpend && (
                <div style={{ marginTop: 24, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 12, padding: 24, fontSize: 18 }}>
                  <div style={{ marginBottom: 12 }}>
                    Confirm spending <b>{pendingSpend.amount}</b> tickets using seller code <b>{pendingSpend.code}</b>
                    {pendingSpend.code && codeToSeller[pendingSpend.code.toUpperCase()] && codeToSeller[pendingSpend.code.toUpperCase()].trim() && (
                      <span style={{ marginLeft: 12, color: '#43c6ac', fontWeight: 600 }}>
                        (Seller: {codeToSeller[pendingSpend.code.toUpperCase()]})
                      </span>
                    )}
                    ?
                  </div>
                  <button style={{ marginRight: 12, background: '#43c6ac', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontSize: 16 }} onClick={() => confirmSpend(true)}>Yes</button>
                  <button style={{ background: '#ff6f61', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontSize: 16 }} onClick={() => confirmSpend(false)}>No</button>
                </div>
              )}
              {message && <div style={{ marginTop: 24, color: '#2d3a4b', fontWeight: 600, fontSize: 18 }}>{message}</div>}
            </div>
          )}
          {user.role === 'seller' && (
            <>
              <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 12, boxShadow: '0 2px 8px #43c6ac55', padding: 24, maxWidth: 400, margin: '0 auto' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#43c6ac', marginBottom: 12 }}>
                  💰 Tickets earned: <span style={{ color: '#ff6f61' }}>{user.tickets || 0}</span>
                  <button 
                    onClick={() => {
                      setMessage('Refreshing...');
                      fetchUser();
                    }} 
                    style={{ 
                      marginLeft: 16, 
                      background: LARKSPUR, 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 6, 
                      padding: '6px 16px',
                      fontSize: 14 
                    }}
                  >
                    Refresh Balance
                  </button>
                </div>
                
                <div style={{ marginTop: 16, background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h3>Your Permanent Seller Code:</h3>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: LARKSPUR }}>{user.code}</div>
                  <div style={{ marginTop: 8, color: '#666' }}>Share this code with buyers to receive tickets</div>
                </div>
                <div style={{ marginTop: 16, color: '#666' }}>Sellers cannot spend tickets.</div>
                {message && <div style={{ marginTop: 16, color: '#2d3a4b', fontWeight: 600 }}>{message}</div>}
              </div>
            </>
          )}
          {user.role === 'admin' && (
            <>
              <h3>Admin Panel (Email)</h3>
              <form onSubmit={handleGrantTickets} style={{ marginBottom: 24 }}>
                <input placeholder="Buyer Email" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} />
                <input placeholder="Amount (1-9999)" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                <button type="submit">Grant Tickets</button>
              </form>
              <h3>Admin Panel (Phone)</h3>
              <form onSubmit={e => { e.preventDefault(); setMessage(''); fetch(`${API}/admin/generate-tickets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buyerEmail: undefined, buyerPhone: phoneInput, amount: Number(amountPhone) }) }).then(res => res.json()).then(data => { if (data.message) setMessage(data.message); else setMessage(data.error); }); }}>
                <input placeholder="Buyer Phone" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} />
                <input placeholder="Amount (1-9999)" type="number" value={amountPhone} onChange={e => setAmountPhone(e.target.value)} />
                <button type="submit">Grant Tickets</button>
              </form>
              <h3>Seller Earnings</h3>
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 24 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                  <thead>
                    <tr style={{ background: SKY_BLUE, color: '#fff' }}>
                      <th style={{ padding: 8, border: '1px solid #eee' }}>Code</th>
                      <th style={{ padding: 8, border: '1px solid #eee' }}>Total Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCodes.map(code => {
                      const totalEarned = logs.filter(l => l.action === 'spend-tickets' && l.code && l.code.toUpperCase() === code.toUpperCase()).reduce((sum, l) => sum + (l.amount || 0), 0);
                      return (
                        <tr key={code}>
                          <td style={{ padding: 8, border: '1px solid #eee', textAlign: 'center' }}>{code}</td>
                          <td style={{ padding: 8, border: '1px solid #eee', textAlign: 'center', color: '#43c6ac', fontWeight: 600 }}>{totalEarned}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {allCodes.length === 0 && <div style={{ color: '#888', padding: 12 }}>No codes found.</div>}
              </div>
              <h3>Seller Code Naming</h3>
              {/* Add new seller code form */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!newSellerCode.trim() || !newSellerName.trim()) return;
                  saveSellerName(newSellerCode.trim().toUpperCase(), newSellerName.trim());
                  setNewSellerCode('');
                  setNewSellerName('');
                }}
                style={{ display: 'flex', gap: 8, marginBottom: 12 }}
              >
                <input
                  type="text"
                  placeholder="Code (e.g. A0)"
                  value={newSellerCode}
                  onChange={e => setNewSellerCode(e.target.value)}
                  maxLength={2}
                  style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                  required
                />
                <input
                  type="text"
                  placeholder="Seller Name"
                  value={newSellerName}
                  onChange={e => setNewSellerName(e.target.value)}
                  style={{ width: 200, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                  required
                />
                <button type="submit" style={{ padding: '4px 12px', borderRadius: 4, background: SKY_BLUE, color: '#fff', border: 'none' }}>Add</button>
              </form>
              {/* Refresh Seller Codes button, always visible */}
              <button
                onClick={fetchSellerNames}
                style={{ marginBottom: 12, background: MARIGOLD, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontWeight: 600, minWidth: 120 }}
                disabled={sellerNamesLoading}
              >
                {sellerNamesLoading ? 'Refreshing...' : 'Refresh Seller Codes'}
              </button>
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 24 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                  <thead>
                    <tr style={{ background: SKY_BLUE, color: '#fff' }}>
                      <th style={{ padding: 8, border: '1px solid #eee' }}>Code</th>
                      <th style={{ padding: 8, border: '1px solid #eee' }}>Custom Name</th>
                      <th style={{ padding: 8, border: '1px solid #eee' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Show all codes from sellerNames.json */}
                    {Object.keys(sellerNames).sort().map(code => (
                      <tr key={code}>
                        <td style={{ padding: 8, border: '1px solid #eee', textAlign: 'center' }}>{code}</td>
                        <td style={{ padding: 8, border: '1px solid #eee' }}>
                          <input
                            type="text"
                            value={sellerNames[code] || ''}
                            onChange={e => handleSellerNameChange(code, e.target.value)}
                            style={{ width: '80%', padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                          />
                        </td>
                        <td style={{ padding: 8, border: '1px solid #eee' }}>
                          <button onClick={() => saveSellerName(code)} style={{ padding: '4px 12px', borderRadius: 4, background: LARKSPUR, color: '#fff', border: 'none' }}>Save</button>
                          {sellerNamesSaved[code] && <span style={{ color: 'green', marginLeft: 8 }}>Saved!</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Object.keys(sellerNames).length === 0 && <div style={{ color: '#888', padding: 12 }}>No seller codes found.</div>}
              </div>
            </>
          )}
          <div>{message}</div>
        </>
      )}
    </div>
  );

  // Transaction Page
  const [filteredTicketCount, setFilteredTicketCount] = useState(null);
  // Fix: Define buyerIdToFirstName as an empty object to avoid no-undef error
  const buyerIdToFirstName = {};
  // Update ticket count when transactions or selectedCode changes
  React.useEffect(() => {
    if (selectedCode && transactions.length > 0) {
      // Sum tickets for the filtered code
      const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      setFilteredTicketCount(total);
    } else {
      setFilteredTicketCount(null);
    }
  }, [transactions, selectedCode]);

  const transactionPage = (
    <div className="App" style={{ background: SKY_BLUE, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <h2 style={{ color: 'white', marginBottom: '30px' }}>Recent Transactions</h2>
      <input
        type="text"
        placeholder="Filter by code (e.g. H0)"
        value={selectedCode}
        onChange={e => setSelectedCode(e.target.value.toUpperCase())}
        style={{ marginBottom: 16, padding: 8, borderRadius: 6, border: '1px solid #43c6ac', minWidth: 120 }}
      />
      {/* Show ticket count for filtered code */}
      {selectedCode && (
        <div style={{ marginBottom: 12, color: LARKSPUR, fontWeight: 600, fontSize: 18 }}>
          Total tickets for code {selectedCode}: {filteredTicketCount !== null ? filteredTicketCount : 0}
        </div>
      )}
      <button
        style={{ marginBottom: 16, background: MARIGOLD, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600 }}
        onClick={fetchTransactions}
      >
        Refresh Recent Transactions
      </button>
      <div style={{ marginTop: 0, width: '100%', maxWidth: 500 }}>
        <h3 style={{ color: LARKSPUR }}>Recent Transactions</h3>
        {/* Always show all transactions, regardless of selectedCode */}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {transactions.length === 0 && (
            <li style={{ color: '#888', padding: 12 }}>No transactions found.</li>
          )}
          {transactions.map((t, i) => {
            // Try to get buyer first name from log, then from users.json
            let buyerFirstName = t.buyerFirstName;
            if (!buyerFirstName && buyerIdToFirstName) {
              buyerFirstName = buyerIdToFirstName[t.buyerId] || buyerIdToFirstName[t.buyerEmail] || buyerIdToFirstName[t.buyerPhone];
            }
            return (
              <li key={i} style={{ background: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, boxShadow: '0 1px 4px #ccc' }}>
                <b>Buyer:</b> {buyerFirstName || t.buyerId} | <b>Seller Code:</b> {t.code} | <b>Amount:</b> {t.amount} | <b>Time:</b> {new Date(t.timestamp).toLocaleTimeString()}
              </li>
            );
          })}
        </ul>
      </div>
      <button style={{ marginTop: 32, background: LARKSPUR, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px' }} onClick={() => navigate('/')}>Back to Welcome</button>
    </div>
  );

  // Redirect to dashboard if user is logged in and on / or /login
  React.useEffect(() => {
    if (user && (location.pathname === '/' || location.pathname === '/login')) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Replace the view logic with routes
  return (
    <Routes>
      <Route path="/" element={welcomePage} />
      <Route path="/login" element={loginPage} />
      <Route path="/register" element={registerPage} />
      <Route path="/dashboard" element={user ? dashboardPage : <Navigate to="/login" />} />
      <Route path="/transaction" element={transactionPage} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;