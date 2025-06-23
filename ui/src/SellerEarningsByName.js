import React from 'react';

export default function SellerEarningsByName({ allCodes, sellerNames, logs }) {
  // Defensive checks for prop types
  if (!Array.isArray(allCodes) || !Array.isArray(logs) || typeof sellerNames !== 'object' || sellerNames === null) {
    return <div style={{ color: 'red', padding: 12 }}>Loading or invalid data. Please refresh or check data source.</div>;
  }

  // Calculate earnings by code
  return (
    <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 24 }}>
      <h3 style={{ color: '#7366bd' }}>Seller Earnings (by Seller Name)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr style={{ background: '#87CEEB', color: '#fff' }}>
            <th style={{ padding: 8, border: '1px solid #eee' }}>Code</th>
            <th style={{ padding: 8, border: '1px solid #eee' }}>Seller Name</th>
            <th style={{ padding: 8, border: '1px solid #eee' }}>Total Earned</th>
          </tr>
        </thead>
        <tbody>
          {allCodes.map(code => {
            const name = sellerNames[code] || 'Unassigned';
            const totalEarned = logs.filter(l => l.action === 'spend-tickets' && l.code && typeof l.code === 'string' && l.code.toUpperCase() === code.toUpperCase()).reduce((sum, l) => sum + (l.amount || 0), 0);
            return (
              <tr key={code}>
                <td style={{ padding: 8, border: '1px solid #eee', textAlign: 'center' }}>{code}</td>
                <td style={{ padding: 8, border: '1px solid #eee', fontWeight: 600, color: '#2d3a4b' }}>{name}</td>
                <td style={{ padding: 8, border: '1px solid #eee', textAlign: 'center', color: '#43c6ac', fontWeight: 600 }}>{totalEarned}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {allCodes.length === 0 && <div style={{ color: '#888', padding: 12 }}>No codes found.</div>}
    </div>
  );
}
