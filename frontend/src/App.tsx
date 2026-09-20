// =============================================================================
// src/App.tsx
// =============================================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';

// =============================================================================
// PAGE IMPORTS
// =============================================================================

import LandingPage from './pages/LandingPage';

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

import PurchaseOrderDetailsPage from './pages/PurchaseOrderDetailsPage';



// =============================================================================
// APP
// =============================================================================

const App = () => {
    return (
        <>
            <ToastContainer
                position="top-center"
                autoClose={3000}
            />

            <Routes>

                {/* =============================================================
                   LANDING PAGE
                ============================================================= */}
                <Route
                    path="/"
                    element={<LandingPage />}
                />


                {/* =============================================================
                   PUBLIC INVOICE / PAYMENT ROUTES

                   WHY:
                   These routes must remain public because customers opening
                   an invoice payment link may not have a PayVerify account.
                ============================================================= */}

                <Route
                    path="/pay/:invoiceId"
                    element={<InvoicePayPage />}
                />

                <Route
                    path="/invoice-pay/:invoiceId"
                    element={<InvoicePayPage />}
                />


                {/* =============================================================
                   PUBLIC ROUTES
                ============================================================= */}

                <Route
                    path="/login"
                    element={<LoginPage />}
                />

                <Route
                    path="/register"
                    element={<RegisterPage />}
                />

                <Route
                    path="/register-user"
                    element={<UserRegistration />}
                />

                <Route
                    path="/register-bank"
                    element={<BankRegistrationForm />}
                />

                <Route
                    path="/bank-login"
                    element={<BankLoginPage />}
                />

                <Route
                    path="/verify/:token"
                    element={<QRVerificationPage />}
                />

                <Route
                    path="/qr-verify"
                    element={<QRPreviewPage />}
                />

                <Route
                    path="/expired"
                    element={<ExpiredSessionPage />}
                />

                <Route
                    path="/admin-transactions"
                    element={<AdminTransactionsPage />}
                />

                <Route
                    path="/transactions/:reference"
                    element={<TransactionDetailsPage />}
                />

                <Route
                    path="/forgot-password"
                    element={<ForgotPasswordPage />}
                />

                <Route
                    path="/reset-password"
                    element={<ResetPasswordPage />}
                />

                <Route
                    path="/merchant-created/:merchantId"
                    element={<MerchantCreatedPage />}
                />

                {/* =============================================================
                   PROTECTED ROUTES
                ============================================================= */}

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


                {/* =============================================================
                   PURCHASE ORDER DETAILS

                   Existing route:
                   /purchase-orders/149

                   Used when a user clicks a PO from the dashboard.
                ============================================================= */}

                <Route
                    path="/purchase-orders/:id"
                    element={
                        <ProtectedRoute>
                            <PurchaseOrderDetailsPage />
                        </ProtectedRoute>
                    }
                />


                {/* =============================================================
                   NEW: CONTINUE PURCHASE ORDER ROUTE

                   WHY:
                   PurchaseOrderDetailsPage now contains:

                       Continue Order →

                   for POs whose status is still PENDING.

                   The button navigates to:

                       /purchase-orders/:id/edit

                   Without this route, React Router would fall through to the
                   wildcard "*" route and redirect the user back to "/".

                   CURRENT IMPLEMENTATION:
                   We point this route to PurchaseOrderDetailsPage so the route
                   exists and does not redirect to the landing page.

                   NEXT STEP:
                   Once the actual Purchase Order creation/edit form component
                   is identified, replace PurchaseOrderDetailsPage below with
                   that component.

                   Example:

                       <PurchaseOrderFormPage />

                   The form page should then use the :id parameter to load the
                   existing PO and allow the user to continue the workflow.
                ============================================================= */}

                <Route
                    path="/purchase-orders/:id/edit"
                    element={
                        <ProtectedRoute>
                            <PurchaseOrderDetailsPage />
                        </ProtectedRoute>
                    }
                />


                {/* =============================================================
                   QR GENERATOR
                ============================================================= */}

                <Route
                    path="/qr-generator"
                    element={
                        <ProtectedRoute>
                            <QRCodeGeneratorPage />
                        </ProtectedRoute>
                    }
                />


                {/* =============================================================
                   USER PROFILE
                ============================================================= */}

                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <UserProfile />
                        </ProtectedRoute>
                    }
                />


                {/* =============================================================
                   BANK PROTECTED ROUTES
                ============================================================= */}

                <Route
                    path="/bank-dashboard"
                    element={
                        <BankProtectedRoute>
                            <BankDashboard />
                        </BankProtectedRoute>
                    }
                />


                {/* =============================================================
                   FALLBACK ROUTE

                   Any route that does not exist redirects to the landing page.

                   IMPORTANT:
                   All valid public and protected routes must be declared above
                   this wildcard route.
                ============================================================= */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

            </Routes>
        </>
    );
};

export default App;
