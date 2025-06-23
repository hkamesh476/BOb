const fs = require('fs');
const path = require('path');

// Define paths
const DATA_DIR = path.join(__dirname, '../../data');
const SAMPLE_DIR = path.join(DATA_DIR, 'sample');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files with sample data or empty arrays
const files = {
    'users.json': path.join(SAMPLE_DIR, 'users.json'),
    'tickets.json': '[]',
    'logs.json': '[]',
    'sellerCodes.json': '[{"sellerEmail":"seller@example.com","code":"KARW2Z","timestamp":1749401314143}]'
};

Object.entries(files).forEach(([filename, content]) => {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
        if (typeof content === 'string') {
            fs.writeFileSync(filepath, content);
        } else {
            // If content is a path, copy from sample
            fs.copyFileSync(content, filepath);
        }
        console.log(`✓ Created ${filename}`);
    } else {
        console.log(`! Skipped ${filename} (already exists)`);
    }
});

console.log('\n✨ Data directory initialized successfully!\n');
console.log('You can now start the application with:');
console.log('1. cd backend && npm start');
console.log('2. cd ui && npm start');
