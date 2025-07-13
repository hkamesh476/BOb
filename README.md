<p align="center">
  <img src="flask_frontend/static/BOB picture.png" alt="Bank of Begonia Logo" width="180" />
</p>


# Bank of Begonia

A ticket-based mini banking system for carnivals and events. Built with Node.js, Express, and Flask (UI).


![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node->=14.0.0-green.svg)
![npm](https://img.shields.io/badge/npm->=6.0.0-red.svg)

## Features

 🚀 Lazy loading and async data fetching for faster performance

## Demo Accounts
 Use async file operations in backend for non-blocking I/O
 Use lazy loading and async fetch for logs, transactions, and images in the frontend for speed
 Add input validation and sanitization for all API endpoints
 Replace JSON file storage with a database for scalability
 Implement password hashing for security
 Use HTTPS and proper session management in production

### Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0
- Python 3.8+


All AI/chatbot and unnecessary scripts have been deleted for a clean workspace.

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/bank-of-begonia.git
   cd bank-of-begonia
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install Flask UI dependencies:
   ```bash
   cd ../flask_frontend
   pip install -r requirements.txt  # or pip install flask requests
   ```

*

1. Start the backend server (in the backend directory):
   ```bash
   npm start
   ```
   Server will run on http://127.0.0.1:3001

2. Start the Flask UI (in the flask_frontend directory):
   ```bash
   python app.py
   ```
   Flask UI will run on http://127.0.0.1:3000



## Usage Guide

### For Admins
- Grant tickets to buyers (by email or phone)
- Monitor all transactions and logs
- Assign and edit seller codes and names
- View seller earnings

### For Sellers
- Admin will add you name to a list
- Receive a unique 2-character seller code
- Accept tickets from buyers
- Monitor earned tickets

### For Buyers
- Register and receive tickets
- Spend tickets using seller codes
- Monitor ticket balance
- Transfer tickets to sellers



## Directory Structure

```
bank-of-begonia/
├── backend/             # Express server (Node.js backend)
│   ├── index.js        # Server entry point
│   └── package.json    # Backend dependencies
├── flask_frontend/     # Flask UI (main user interface)
│   ├── app.py          # Flask app
│   └── static/         # Static files (images, etc.)
│   └── templates/      # HTML templates
└── data/               # JSON data storage
    ├── users.json      # User accounts
    ├── tickets.json    # Ticket grants
    ├── logs.json       # Activity logs
    ├── sellerCodes.json # Seller codes
    └── sellerNames.json # Seller code display names
```


All backup and deleted folders have been removed for a clean workspace.
## Troubleshooting

- If you see CORS errors or cannot connect, make sure you are using `http://127.0.0.1` (not `localhost`) in both backend and frontend.
- Only one frontend (React or Flask) can run on port 3000 at a time.
- If you get an error about a port being in use, stop the other server or change the port.




## Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend/UI**: Flask
- **Storage**: JSON files (easily replaceable with a database)
- **Real-time**: WebSocket for live updates

**No AI/chatbot or LLM features included.**


## Optimization & Recommendations

4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Integration Tests

### Flask (Python)
To run integration tests for the Flask backend:
```bash
cd flask_frontend
python testing.py
```

### React (Frontend)
To run integration tests for the React frontend:
```bash
cd ui
npm test
```

Integration tests cover key user flows and loading indicators for both backend and frontend.





Refer to this checklist before deploying or updating your application.
## Support

For support, please open an issue in the GitHub repository.