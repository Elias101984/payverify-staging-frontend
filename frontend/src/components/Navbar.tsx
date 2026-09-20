// src/components/Navbar.tsx

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Responsive Navbar with active link highlighting and logout modal
 */
const Navbar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // 🚀 Get current path for active highlighting
    const [showModal, setShowModal] = useState(false);


    // 🚪 Logout and redirect
    const handleLogout = async () => {
        try {
            await logout();
            setShowModal(false);
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            alert('Logout failed. Please try again.');
        }
    };

    // 🧠 Utility to highlight active link
    const isActive = (path: string) => location.pathname === path ? 'nav-link active' : 'nav-link';

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container-fluid">
                <Link className="navbar-brand" to="/dashboard">PayVerify</Link>

                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                            <Link className={isActive('/dashboard')} to="/dashboard">Dashboard</Link>
                        </li>
                        <li className="nav-item">
                            <Link className={isActive('/transactions')} to="/transactions">Transactions</Link>
                        </li>
                        {user?.role === 'admin' && (
                            <li className="nav-item">
                                <Link className={isActive('/admin-transactions')} to="/admin-transactions">Admin Transactions</Link>
                            </li>
                        )}
                        {/*<li className="nav-item">*/}
                        {/*    <Link className={isActive('/qr-generator')} to="/qr-generator">QR Generator</Link>*/}
                        {/*</li>*/}
                        {/*<li className="nav-item">*/}
                        {/*    <Link className={isActive('/qr-verify')} to="/qr-verify">QR Verification</Link>*/}
                        {/*</li>*/}
                        {/* Merchant onboarding is public. Once signed in, keep the
                            nav focused on the current account; only admins need the
                            internal "Register merchant" workflow. */}
                        {user?.role === 'admin' && (
                            <li className="nav-item">
                                <Link className={isActive('/register')} to="/register">Register merchant</Link>
                            </li>
                        )}
                    </ul>

                    <span className="navbar-text text-white me-3">{user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={() => setShowModal(true)}>
                        Logout
                    </button>
                </div>
            </div>

            {/* 🔒 Logout Confirmation Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-content">
                            <h5>Confirm Logout</h5>
                            <p>Are you sure you want to log out?</p>
                            <div className="modal-actions">
                                <button className="btn btn-secondary me-2" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button className="btn btn-danger" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
