import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      '60vh',
      gap:            16,
      animation:      'fadeUp 0.25s ease-out both',
    }}>
      <div style={{
        fontSize:   72,
        fontWeight: 800,
        fontFamily: 'var(--ff-display)',
        color:      'var(--text4)',
        lineHeight: 1,
      }}>
        404
      </div>
      <p style={{ color: 'var(--text2)', fontSize: 16, fontWeight: 600 }}>
        Page not found
      </p>
      <p style={{ color: 'var(--text3)', fontSize: 13 }}>
        The page you're looking for doesn't exist.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop:    8,
          padding:      '9px 22px',
          borderRadius: 8,
          border:       'none',
          background:   'var(--blue)',
          color:        '#fff',
          fontSize:     13,
          fontWeight:   600,
          cursor:       'pointer',
        }}
      >
        Back to Markets
      </button>
    </div>
  )
}