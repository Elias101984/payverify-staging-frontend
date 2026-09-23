import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEnvelope,
    faLock,
    faEye,
    faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';

const TURNSTILE_SITE_KEY =
    (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '') as string;

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from =
        (location.state as { from?: { pathname?: string } })?.from?.pathname ??
        '/dashboard';

    const captchaRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<any>(null);
    const pollerRef = useRef<number | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [captchaToken, setCaptchaToken] = useState('');
    const [turnstileReady, setTurnstileReady] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!TURNSTILE_SITE_KEY) {
            setError('Security verification is not configured.');
            return;
        }

        if (!document.querySelector('script[data-payverify-turnstile]')) {
            const script = document.createElement('script');

            script.src =
                'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.dataset.payverifyTurnstile = 'true';

            document.head.appendChild(script);
        }

        pollerRef.current = window.setInterval(() => {
            if (window.turnstile) {
                setTurnstileReady(true);

                if (pollerRef.current) {
                    window.clearInterval(pollerRef.current);
                    pollerRef.current = null;
                }
            }
        }, 200);

        return () => {
            if (pollerRef.current) {
                window.clearInterval(pollerRef.current);
                pollerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (
            !turnstileReady ||
            !TURNSTILE_SITE_KEY ||
            !window.turnstile ||
            !captchaRef.current ||
            widgetIdRef.current
        ) {
            return;
        }

        widgetIdRef.current = window.turnstile.render(captchaRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: 'dark',

            callback: (token: string) => {
                setCaptchaToken(token);
                setError(null);
            },

            'expired-callback': () => {
                setCaptchaToken('');
            },

            'error-callback': () => {
                setCaptchaToken('');
                setError('Security verification failed. Please try again.');
            },
        });

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove?.(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [turnstileReady]);

    const resetCaptcha = () => {
        setCaptchaToken('');

        if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        if (!captchaToken) {
            setError('Please complete the security verification.');
            return;
        }

        try {
            setSubmitting(true);

            await login(email.trim(), password, captchaToken);

            navigate(from, { replace: true });
        } catch (err: any) {
            console.error(err);

            setError(
                err?.response?.data?.message ||
                err?.message ||
                'Login failed. Please check your credentials.',
            );

            resetCaptcha();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="pv-login-page">
                <div className="pv-login-card">
                    <h1>PayVerify Merchant Login</h1>
                    <p>Access your dashboard and tools.</p>

                    <form onSubmit={handleSubmit}>
                        <label htmlFor="email">Email</label>

                        <div className="pv-input">
                            <FontAwesomeIcon icon={faEnvelope} />

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="you@company.com"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <label htmlFor="password">Password</label>

                        <div className="pv-input">
                            <FontAwesomeIcon icon={faLock} />

                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                            />

                            <button
                                type="button"
                                className="pv-eye-button"
                                onClick={() => setShowPassword((value) => !value)}
                            >
                                <FontAwesomeIcon
                                    icon={showPassword ? faEyeSlash : faEye}
                                />
                            </button>
                        </div>

                        <div className="pv-forgot">
                            <Link to="/forgot-password">Forgot Password?</Link>
                        </div>

                        <div
                            ref={captchaRef}
                            className="pv-turnstile"
                        />

                        {error && <div className="pv-error">{error}</div>}

                        <button
                            type="submit"
                            className="pv-login-button"
                            disabled={submitting || !captchaToken}
                        >
                            {submitting ? 'Signing in…' : 'Login'}
                        </button>
                    </form>

                    <div className="pv-trusted">Trusted by top banks</div>
                </div>
            </div>

            <style>{`
        .pv-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          background:
            radial-gradient(circle at top, rgba(45,110,255,.25), transparent 45%),
            linear-gradient(160deg, #050914, #0c1930 60%, #102d55);
        }

        .pv-login-card {
          width: 100%;
          max-width: 540px;
          padding: 42px;
          color: white;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 22px;
          background: rgba(25,34,52,.86);
          box-shadow: 0 25px 80px rgba(0,0,0,.45);
          backdrop-filter: blur(16px);
        }

        .pv-login-card h1 {
          margin: 0;
          text-align: center;
          font-size: 2.25rem;
          font-weight: 800;
        }

        .pv-login-card p {
          margin: 10px 0 30px;
          text-align: center;
          color: #b9c5d9;
        }

        .pv-login-card label {
          display: block;
          margin: 18px 0 7px;
          font-weight: 700;
        }

        .pv-input {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 14px;
          background: #f5f6f8;
          border-radius: 8px;
          color: #182235;
        }

        .pv-input input {
          width: 100%;
          padding: 14px 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #182235;
          font-size: 1rem;
        }

        .pv-eye-button {
          border: 0;
          background: transparent;
          color: #667085;
          cursor: pointer;
        }

        .pv-forgot {
          margin: 14px 0 20px;
          text-align: right;
        }

        .pv-forgot a {
          color: #65a3ff;
          text-decoration: none;
        }

        .pv-turnstile {
          min-height: 70px;
          display: flex;
          justify-content: center;
          margin: 14px 0;
        }

        .pv-error {
          margin: 14px 0;
          padding: 12px;
          border-radius: 8px;
          background: #ffd6da;
          color: #842029;
        }

        .pv-login-button {
          width: 100%;
          margin-top: 12px;
          padding: 14px;
          border: 0;
          border-radius: 8px;
          background: #2875f5;
          color: white;
          font-size: 1.05rem;
          font-weight: 800;
          cursor: pointer;
        }

        .pv-login-button:disabled {
          cursor: not-allowed;
          opacity: .55;
        }

        .pv-trusted {
          margin-top: 25px;
          text-align: center;
          color: #aebbd0;
          font-size: .9rem;
        }
      `}</style>
        </>
    );
};

export default LoginPage;