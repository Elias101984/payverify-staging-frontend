// src/pages/LoginPage.tsx
// -----------------------------------------------------------------------------
// PayVerify Merchant Login (glossy + dark theme, NO NAVBAR)
//
// What this does:
// - Keeps the exact glossy look & feel (inline <StyleBlock/> so styles never go missing)
// - Does NOT import or render <Navbar />, so the top nav is hidden on login
// - Preserves your original UX: forgot password link and password visibility toggle,
//   password visibility toggle, and a placeholder for your Turnstile captcha
// -----------------------------------------------------------------------------

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from?.pathname || '/dashboard';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [show, setShow] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            setSubmitting(true);
            // The current auth context accepts the captcha field; the server
            // still owns the actual verification policy.
            await login(email, password, '');
            navigate(from, { replace: true });
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || 'Login failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* No Navbar on this page */}
            <div className="pv-auth-bg d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: 520 }}>
                    <div className="card pv-glass shadow-lg">
                        <div className="card-body p-4 p-md-5">
                            {/* Title */}
                            <h1 className="pv-glossy-title text-center mb-2">PayVerify Merchant Login</h1>
                            <p className="text-light-50 text-center mb-4">Access your dashboard and tools.</p>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="row g-3">
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
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@company.com"
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
                                            type={show ? 'text' : 'password'}
                                            className="form-control"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            required
                                        />
                                        {/* Show/Hide toggle */}
                                        <button
                                            className="btn btn-outline-secondary"
                                            type="button"
                                            onClick={() => setShow((s) => !s)}
                                            title={show ? 'Hide password' : 'Show password'}
                                        >
                                            <FontAwesomeIcon icon={show ? faEyeSlash : faEye} />
                                        </button>
                                    </div>
                                </div>

                                {/* Forgot Password */}
                                <div className="col-12 d-flex justify-content-end mt-n2">
                                    <Link to="/forgot-password" className="text-decoration-none">
                                        Forgot Password?
                                    </Link>
                                </div>

                                {/* ✅ Captcha (Turnstile) placeholder — keep your existing component here */}
                                {/* Example: <Turnstile sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY} /> */}
                                <div className="col-12">
                                    <div id="pv-captcha-slot" className="d-flex justify-content-center" />
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="col-12">
                                        <div className="alert alert-danger mb-0">{error}</div>
                                    </div>
                                )}

                                {/* Submit */}
                                <div className="col-12 d-grid">
                                    <button type="submit" className="btn btn-primary fw-bold" disabled={submitting}>
                                        {submitting ? 'Signing in…' : 'Login'}
                                    </button>
                                </div>

                                {/* Bank Logos */}
                                <div className="col-12 text-center mt-2">
                                    <p className="text-light-50" style={{ fontSize: '0.85rem' }}>
                                        Trusted by top banks
                                    </p>
                                    <div className="d-flex justify-content-center flex-wrap gap-4 align-items-center">
                                        <div className="text-center">
                                            <img src="https://logo.clearbit.com/gtbank.com" alt="GTBank" height="28" />
                                            <div className="logo-label">GTBank</div>
                                        </div>
                                        <div className="text-center">
                                            <img src="https://logo.clearbit.com/accessbankplc.com" alt="Access Bank" height="28" />
                                            <div className="logo-label">Access Bank</div>
                                        </div>
                                        <div className="text-center">
                                            <img src="https://logo.clearbit.com/ubagroup.com" alt="UBA" height="28" />
                                            <div className="logo-label">UBA</div>
                                        </div>
                                        <div className="text-center">
                                            <img src="https://logo.clearbit.com/zenithbank.com" alt="Zenith Bank" height="28" />
                                            <div className="logo-label">Zenith Bank</div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inline CSS for the glossy theme (so styles never "go missing") */}
            <StyleBlock />
        </>
    );
};

/**
 * Inline style block
 * - Darker page background & vignette for high contrast
 * - Glass card with dark tint + highlight strip
 * - Glossy animated title
 * - Heavier fonts for readability on dark surfaces
 */
const StyleBlock = () => (
    <style>{`
    /* --- Background: darker navy with a subtle blue glow --- */
    .pv-auth-bg {
      background:
        radial-gradient(1200px 420px at 50% 0%, rgba(35, 105, 255, 0.20), rgba(0,0,0,0) 55%),
        linear-gradient(180deg, #05070b 0%, #0a0f19 40%, #0e1a2d 68%, #0f2138 85%, #0f243f 100%);
      box-shadow: inset 0 0 240px rgba(0,0,0,0.70);
    }

    /* --- Glassy card with subtle dark underlay --- */
    .pv-glass {
      border: 1px solid rgba(255,255,255,0.16);
      background:
        linear-gradient(180deg, rgba(5, 10, 20, 0.35), rgba(5, 10, 20, 0.35)),
        linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
      backdrop-filter: blur(10px) saturate(140%);
      -webkit-backdrop-filter: blur(10px) saturate(140%);
      position: relative;
      border-radius: 18px;
      overflow: hidden;
      color: #eef5ff;
    }
    .pv-glass::before {
      content:"";
      position:absolute; inset:0;
      background: linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(255,255,255,0) 36%);
      pointer-events:none; mix-blend-mode:screen;
    }

    /* --- Glossy, shiny title with animated sheen --- */
    .pv-glossy-title {
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.05;
      font-size: clamp(1.75rem, 2.2vw + 1rem, 2.4rem);
      background: linear-gradient(180deg, #ffffff 0%, #d7e7ff 58%, #7fb4ff 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      filter: drop-shadow(0 2px 10px rgba(0,0,0,.55));
      position: relative;
      overflow: hidden;
      text-align: center;
    }
    .pv-glossy-title::after {
      content: "";
      position: absolute;
      top: 0;
      left: -120%;
      height: 100%;
      width: 55%;
      transform: skewX(-20deg);
      background: linear-gradient(
        75deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,.75) 10%,
        rgba(255,255,255,0) 20%
      );
      animation: pvTitleShine 3.2s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes pvTitleShine {
      0% { left: -120%; }
      55% { left: 130%; }
      100% { left: 130%; }
    }

    /* --- Form polish: heavier weights & brighter surfaces --- */
    .form-label { font-weight: 800; color: #e9f2ff; }
    .form-control, .form-select {
      font-weight: 700;
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(255,255,255,0.35);
    }
    .input-group-text {
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(255,255,255,0.35);
      font-weight: 700;
    }

    .text-light-50 { color: rgba(233,242,255,.80) !important; }

    .btn-outline-light {
      border-color: rgba(255,255,255,.45);
      color: #f0f6ff;
      font-weight: 800;
    }
    .btn-outline-light:hover {
      background: rgba(255,255,255,.10);
      border-color: rgba(255,255,255,.65);
      color: #ffffff;
    }
    .btn.btn-primary {
      font-weight: 900;
    }

    .logo-label {
      font-size: .75rem;
      color: rgba(233,242,255,.9);
      font-weight: 800;
      margin-top: 2px;
    }
  `}</style>
);

export default LoginPage;
