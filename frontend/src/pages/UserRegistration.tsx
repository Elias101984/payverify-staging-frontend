// src/pages/UserRegistration.tsx
// -----------------------------------------------------------------------------
// Register New User — glossy dark theme (presentation only)
//
//  IMPORTANT FIX (PRODUCTION BUG):
// -  Removed direct fetch() + API_URL usage (which caused localhost in prod)
// - Now uses shared Axios client via registerUser() from services/api
//
// WHY THIS MATTERS:
// - Ensures VITE_API_BASE from .env.production is used
// - Prevents hardcoded localhost calls
// - Centralizes auth + error handling
// -----------------------------------------------------------------------------


import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

// ✅ NEW: use shared API helper (single source of truth)
import { registerUser } from '../services/api';

const UserRegistration: React.FC = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');

    const [showPwd, setShowPwd] = useState(false);
    const [showPwd2, setShowPwd2] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState(false);

    const validate = (): string | null => {
        if (!email.trim()) return 'Email is required.';
        if (!password) return 'Password is required.';
        if (password.length < 8) return 'Password should be at least 8 characters.';
        if (password !== confirm) return 'Passwords do not match.';
        return null;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setOk(false);

        const v = validate();
        if (v) {
            setError(v);
            return;
        }

        try {
            setSubmitting(true);

            // ✅ FIX: use centralized API helper instead of fetch()
            await registerUser({
                email,
                password,
                name: email.split('@')[0], // backend expects name
                cac_number: 'N/A',
                account_number: '0000000000',
                bank_name: 'N/A',
            });

            setOk(true);

            // Gentle redirect after success
            setTimeout(() => navigate('/login'), 1200);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Could not register user.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* No Navbar here for a focused form */}
            <div className="pv-auth-bg d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: 560 }}>
                    <div className="card pv-glass shadow-lg">
                        <div className="card-body p-4 p-md-5">
                            <h1 className="pv-glossy-title text-center mb-2">Register New User</h1>
                            <p className="text-light-50 text-center mb-4">
                                Create your account to access PayVerify tools.
                            </p>

                            <form className="row g-3" onSubmit={onSubmit}>
                                {/* Email */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Email</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faEnvelope} />
                                        </span>
                                        <input
                                            type="email"
                                            className="form-control"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Password</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faLock} />
                                        </span>
                                        <input
                                            type={showPwd ? 'text' : 'password'}
                                            className="form-control"
                                            placeholder="Create password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowPwd((s) => !s)}
                                        >
                                            <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Confirm Password</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faLock} />
                                        </span>
                                        <input
                                            type={showPwd2 ? 'text' : 'password'}
                                            className="form-control"
                                            placeholder="Re-enter password"
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowPwd2((s) => !s)}
                                        >
                                            <FontAwesomeIcon icon={showPwd2 ? faEyeSlash : faEye} />
                                        </button>
                                    </div>
                                </div>

                                {/* Feedback */}
                                {error && (
                                    <div className="col-12">
                                        <div className="alert alert-danger mb-0">{error}</div>
                                    </div>
                                )}
                                {ok && (
                                    <div className="col-12">
                                        <div className="alert alert-success mb-0">
                                            Account created! Redirecting to login…
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="col-6 d-grid">
                                    <button type="submit" className="btn btn-primary fw-bold" disabled={submitting}>
                                        {submitting ? 'Registering…' : 'Register'}
                                    </button>
                                </div>
                                <div className="col-6 d-grid">
                                    <button type="button" className="btn btn-outline-secondary fw-bold" onClick={() => navigate('/login')}>
                                        Cancel
                                    </button>
                                </div>

                                <div className="col-12 text-center mt-1">
                                    <Link to="/forgot-password" className="text-decoration-none">
                                        Forgot Password?
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <StyleBlock />
        </>
    );
};

const StyleBlock = () => (
    <style>{`
      /* styles unchanged — visual only */
    `}</style>
);

export default UserRegistration;
