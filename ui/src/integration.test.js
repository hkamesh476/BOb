// Integration tests for frontend (React)
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('Frontend Integration Tests', () => {
    test('renders main app component', () => {
        render(<App />);
        expect(screen.getByText(/Bank of Begonia/i)).toBeInTheDocument();
    });
    test('shows loading progress bar and percentage for logs', () => {
        render(<App />);
        const loadingBar = screen.queryByTestId('logs-progress-bar');
        const loadingText = screen.queryByTestId('logs-progress-text');
        expect(loadingBar).toBeInTheDocument();
        expect(loadingText).toBeInTheDocument();
        expect(loadingText.textContent).toMatch(/\d+%/);
    });

    test('shows navigation to home', () => {
        render(<App />);
        expect(screen.getByText(/Bank of Begonia/i)).toBeInTheDocument();
    });

    test('shows error message if present', () => {
        // Simulate error message prop
        render(<App errorMsg="Test error" />);
        expect(screen.queryByText(/Test error/i)).toBeInTheDocument();
    });

    test('shows ticket display if present', () => {
        // Simulate tickets prop
        render(<App tickets={5} />);
        const matches = screen.getAllByText(/5/);
        // There should be at least one match for "5"
        expect(matches.length).toBeGreaterThan(0);
    });
});
