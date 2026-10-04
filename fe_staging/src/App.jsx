import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/buyer/CartDrawer';
import { CheckoutModal } from './components/buyer/CheckoutModal';
import { CultivatorDashboard } from './components/cultivator/CultivatorDashboard';
import { BatchManagement } from './components/cultivator/BatchManagement';
import { TaskManager } from './components/cultivator/TaskManager';
import { ProductManager } from './components/cultivator/ProductManager';
import { CultivatorOrders } from './components/cultivator/CultivatorOrders';
import { BuyerMarketplace } from './components/buyer/BuyerMarketplace';
import { BuyerOrders } from './components/buyer/BuyerOrders';
import { Sprout, CheckCircle2 } from 'lucide-react';

const AppContent = () => {
  const { activeTab, setActiveTab, isCultivator, isBuyer } = useAuth();
  const { toastMessage } = useCart();

  const renderContent = () => {
    // Cultivator routing
    if (isCultivator) {
      switch (activeTab) {
        case 'dashboard':
          return <CultivatorDashboard onNavigate={setActiveTab} />;
        case 'batches':
          return <BatchManagement />;
        case 'tasks':
          return <TaskManager />;
        case 'products':
          return <ProductManager />;
        case 'orders':
          return <CultivatorOrders />;
        case 'marketplace':
          return <BuyerMarketplace />;
        default:
          return <CultivatorDashboard onNavigate={setActiveTab} />;
      }
    }

    // Buyer routing
    if (isBuyer) {
      switch (activeTab) {
        case 'marketplace':
          return <BuyerMarketplace />;
        case 'buyer_orders':
          return <BuyerOrders />;
        default:
          return <BuyerMarketplace />;
      }
    }

    // Guest routing
    return <BuyerMarketplace />;
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        {renderContent()}
      </main>

      {/* Global Modals & Drawers */}
      <AuthModal />
      <CartDrawer />
      <CheckoutModal />

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <CheckCircle2 size={18} color="#10b981" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '32px 24px', borderTop: '1px solid #1e293b', fontSize: '0.85rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Sprout size={16} />
            </div>
            <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>
              Smart Lettuce Cultivation Management System
            </span>
          </div>

          <div>
            Built with Laravel 11 &bull; React &bull; Midtrans Payment Gateway &bull; Hydroponics IoT Architecture
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
