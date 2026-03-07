import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) return (
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '60vh',
        gap:            12,
      }}>
        <p style={{ color: 'var(--text1)', fontSize: 16, fontWeight: 700 }}>
          Something went wrong
        </p>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>
          {this.state.error?.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding:      '8px 20px',
            borderRadius: 8,
            border:       'none',
            background:   'var(--blue)',
            color:        '#fff',
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
          }}
        >
          Reload Page
        </button>
      </div>
    )
    return this.props.children
  }
}