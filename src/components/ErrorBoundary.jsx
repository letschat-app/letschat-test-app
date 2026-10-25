import React from 'react';
import { AlertTriangle, ArrowLeft, MessageSquare } from 'lucide-react';

/**
 * ErrorBoundary Component
 * Catches uncaught runtime errors (ReferenceErrors, NullPointer, render failures)
 * and displays a graceful fallback screen with a "Go Back to Previous Page" button.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an uncaught error]:", error, errorInfo);
    try {
      const splash = document.getElementById('pwa-splash-loader');
      if (splash) splash.remove();
    } catch (_) {}
  }

  handleGoBack = () => {
    this.setState({ hasError: false, error: null });
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = '#/chats';
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/chats';
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || String(this.state.error || "Unknown Error");

      return (
        <div style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          padding: '24px',
          boxSizing: 'border-box',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: 'var(--danger-tint)',
            border: '2px solid var(--danger-tint-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={36} color="var(--danger-color)" />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
            This Page is Currently Down
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 0 24px 0', lineHeight: '1.6' }}>
            An unexpected error occurred while rendering this page. You can safely go back to your previous page or return to your chats.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '20px' }}>
            <button
              onClick={this.handleGoBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-color)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px color-mix(in srgb, var(--accent-solid) 45%, transparent)'
              }}
            >
              <ArrowLeft size={18} /> Go Back to Previous Page
            </button>

            <button
              onClick={this.handleGoHome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={18} /> Go to Chats
            </button>
          </div>

          <button
            onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {this.state.showDetails ? 'Hide technical details' : 'Show technical details'}
          </button>

          {this.state.showDetails && (
            <div style={{
              marginTop: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--border-color)',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: 'var(--danger-color)',
              maxWidth: '500px',
              wordBreak: 'break-all',
              textAlign: 'left'
            }}>
              {errorMsg}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
