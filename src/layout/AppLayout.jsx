import { Outlet } from 'react-router-dom'
import Header from './Header'
import { C } from '../utils/theme'

export default function AppLayout() {
  return (
    <div style={{ minHeight: '100vh', background: C.bgBase }}>
      <Header />
      <main style={{
        maxWidth: 1400,
        margin:   '0 auto',
        padding:  '72px 20px 40px', // 72px top = 52px header + 20px breathing room
      }}>
        <Outlet />
      </main>
    </div>
  )
}