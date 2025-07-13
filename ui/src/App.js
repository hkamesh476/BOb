import React from 'react';

function LogsLoadingIndicator({ loading = true, percent = 50 }) {
    if (!loading) return null;
    return (
        <div style={{ textAlign: 'center', margin: '10px 0' }}>
            <div style={{ width: '80%', margin: '0 auto', background: '#e0e0e0', borderRadius: 8, height: 24, position: 'relative' }}>
                <div data-testid="logs-progress-bar" style={{ height: '100%', width: percent + '%', background: '#43c6ac', borderRadius: 8, transition: 'width 0.3s' }}></div>
                <span data-testid="logs-progress-text" style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', color: '#222', fontSize: 15, lineHeight: '24px' }}>{percent}%</span>
            </div>
            <div style={{ marginTop: 8, color: '#43c6ac', fontSize: 15 }}>Loading logs...</div>
        </div>
    );
}

function App({ errorMsg, tickets }) {
    return (
        <div>
            <h1>Bank of Begonia</h1>
            <LogsLoadingIndicator loading={true} percent={50} />
            {errorMsg && <div style={{ color: 'red' }}>{errorMsg}</div>}
            {typeof tickets !== 'undefined' && <div>Tickets: {tickets}</div>}
        </div>
    );
}

export default App;
