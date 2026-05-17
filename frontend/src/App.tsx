// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';

import LandingPage from './pages/LandingPage';

// =============================================================================
// IMPORT PAYMENT PAGE (NEW)
// REQUIRED FOR PUBLIC INVOICE ACCESS
// =============================================================================
import PaymentPage from './pages/PaymentPage';


// existing imports…
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import ProtectedRoute from './components/ProtectedRoute';
import QRCodeGeneratorPage from './pages/QRCodeGeneratorPage';
import QRVerificationPage from './pages/QrVerificationPages';
import ExpiredSessionPage from './pages/ExpiredSessionPage';
import QRPreviewPage from './pages/QRPreviewPage';
import AdminTransactionsPage from './pages/adminTransactionPage';
import BankLoginPage from './pages/BankLoginPage';
import UserRegistration from './pages/UserRegistration';
import BankRegistrationForm from './pages/BankRegistrationForm';
import MerchantCreatedPage from './pages/MerchantCreatedPage';
import UserProfile from './pages/UserProfile';
import TransactionDetailsPage from './pages/TransactionDetailsPage';
import BankDashboard from './pages/BankDashboard';
import BankProtectedRoute from './components/BankProtectedRoute';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import InvoicePayPage from './pages/InvoicePayPage';


const App = () => {
    return (
        <>
            <ToastContainer position="top-center" autoClose={3000} />

            <Routes>

                {/* =============================================================================
                   LANDING PAGE
                ============================================================================= */}
                <Route path="/" element={<LandingPage />} />



                {/* =============================================================================
                   NEW PUBLIC PAYMENT ROUTE (FIX)
                   
                   THIS IS THE CRITICAL FIX
                   
                   Allows:
                   http://localhost:5173/pay/{token}
                   
                   WITHOUT authentication
                   
                   Prevents redirect to home page
                ============================================================================= */}
                {/*<Route path="/pay/:token" element={<PaymentPage />} />*/}

                <Route
                    path="/pay/:invoiceId"
                    element={<InvoicePayPage />}
                />

                // NEW — Invoice Paystack public page
                <Route path="/invoice-pay/:invoiceId" element={<InvoicePayPage />} />

                {/* =============================================================================
                   PUBLIC ROUTES
                ============================================================================= */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/register-user" element={<UserRegistration />} />
                <Route path="/register-bank" element={<BankRegistrationForm />} />
                <Route path="/bank-login" element={<BankLoginPage />} />
                <Route path="/verify/:token" element={<QRVerificationPage />} />
                <Route path="/qr-verify" element={<QRPreviewPage />} />
                <Route path="/expired" element={<ExpiredSessionPage />} />
                <Route path="/admin-transactions" element={<AdminTransactionsPage />} />
                <Route path="/transactions/:reference" element={<TransactionDetailsPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/merchant-created/:merchantId" element={<MerchantCreatedPage />} />



                {/* =============================================================================
                   PROTECTED ROUTES
                ============================================================================= */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/transactions"
                    element={
                        <ProtectedRoute>
                            <TransactionsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/qr-generator"
                    element={
                        <ProtectedRoute>
                            <QRCodeGeneratorPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <UserProfile />
                        </ProtectedRoute>
                    }
                />



                {/* =============================================================================
                   BANK PROTECTED ROUTES
                ============================================================================= */}
                <Route
                    path="/bank-dashboard"
                    element={
                        <BankProtectedRoute>
                            <BankDashboard />
                        </BankProtectedRoute>
                    }
                />



                {/* =============================================================================
                   FALLBACK ROUTE
                   
                   If route not found → redirect to landing page
                   
                   NOW SAFE because /pay/:token exists above
                ============================================================================= */}
                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>

        </>
    );
};

export default App;
