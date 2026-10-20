import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'

export default function DashboardLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Navbar onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
