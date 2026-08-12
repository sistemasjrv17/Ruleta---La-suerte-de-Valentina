import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminGate } from './components/AdminGate'
import { Layout } from './components/Layout'
import { AdminPage } from './pages/AdminPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { HomePage } from './pages/HomePage'
import { OrderPage } from './pages/OrderPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { RulesPage } from './pages/RulesPage'
import { TicketsPage } from './pages/TicketsPage'
import { VerifyPage } from './pages/VerifyPage'
import { StoreProvider } from './store/Store'

/** Ruta secreta del panel. Cámbiala en .env → VITE_ADMIN_PATH */
const ADMIN_PATH = (import.meta.env.VITE_ADMIN_PATH as string | undefined)?.replace(/^\/+|\/+$/g, '') || 'panel-valentina'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="boletos" element={<TicketsPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orden/:orderId" element={<OrderPage />} />
            <Route path="pagos" element={<PaymentsPage />} />
            <Route path="reglas" element={<RulesPage />} />
            <Route path="verificar" element={<VerifyPage />} />
            <Route
              path={ADMIN_PATH}
              element={
                <AdminGate>
                  <AdminPage />
                </AdminGate>
              }
            />
            {/* Rutas obvias redirigen al inicio */}
            <Route path="admin" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
