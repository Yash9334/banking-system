import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Accounts from './pages/Accounts.jsx'
import Transactions from './pages/Transactions.jsx'
import FraudMonitoring from './pages/FraudMonitoring.jsx'
import Payments from './pages/Payments.jsx'
import Notifications from './pages/Notifications.jsx'
import Architecture from './pages/Architecture.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="fraud" element={<FraudMonitoring />} />
        <Route path="payments" element={<Payments />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="architecture" element={<Architecture />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
