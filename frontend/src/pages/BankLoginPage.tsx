// frontend/src/pages/BankLoginPage.tsx

import React, {
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    Link,
    useNavigate,
    useSearchParams,
} from 'react-router-dom';

import axios from 'axios';

const TURNSTILE_SITE_KEY =
    (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '') as string;

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5000/api';

/**
 * IMPORTANT:
 * Keep this declaration identical to LoginPage.tsx.
 */
declare global {
    interface Window {
        turnstile?: {
            render: (
                element: HTMLElement,
                options: Record<string, any>
            ) => any;

            reset: (
                widgetId?: any
            ) => void;

            remove?: (
                widgetId: any
            ) => void;
        };

        __pvTurnstileLoaded?: () => void;
    }
}

const BankLoginPage: React.FC = () => {
    const navigate = useNavigate();

    const [searchParams] =
        useSearchParams();

    const [email, setEmail] =
        useState('');

    const [captchaToken, setCaptchaToken] =
        useState<string | null>(null);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [success, setSuccess] =
        useState<string | null>(null);

    const [turnstileReady, setTurnstileReady] =
        useState(false);

    const widgetContainerRef =
        useRef<HTMLDivElement | null>(null);

    const widgetIdRef =
        useRef<any>(null);

    // -------------------------------------------------------------------------
    // Handle magic-link token if present
    // -------------------------------------------------------------------------

    useEffect(() => {
        const token =
            searchParams.get('token');

        if (!token) {
            return;
        }

        const verifyMagicLink =
            async () => {
                try {
                    setSubmitting(true);
                    setError(null);

                    const response =
                        await axios.post(
                            `${API_BASE_URL}/bank-auth/login/verify`,
                            {
                                token,
                            }
                        );

                    const jwt =
                        response?.data?.token;

                    const user =
                        response?.data?.user;

                    if (!jwt) {
                        throw new Error(
                            'Bank authentication token was not returned.'
                        );
                    }

                    localStorage.setItem(
                        'token',
                        jwt
                    );

                    if (user) {
                        localStorage.setItem(
                            'user',
                            JSON.stringify(
                                user
                            )
                        );
                    }

                    navigate(
                        '/dashboard',
                        {
                            replace: true,
                        }
                    );
                } catch (err: any) {
                    console.error(
                        '[Bank Login] Magic-link verification failed',
                        err
                    );

                    setError(
                        err?.response
                            ?.data
                            ?.message ||
                        err?.message ||
                        'The bank login link is invalid or has expired.'
                    );
                } finally {
                    setSubmitting(false);
                }
            };

        void verifyMagicLink();
    }, [
        navigate,
        searchParams,
    ]);

    // -------------------------------------------------------------------------
    // Load Turnstile
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!TURNSTILE_SITE_KEY) {
            console.warn(
                '[Turnstile] Missing VITE_TURNSTILE_SITE_KEY.'
            );

            return;
        }

        if (window.turnstile) {
            setTurnstileReady(true);
            return;
        }

        window.__pvTurnstileLoaded = () => {
            setTurnstileReady(true);
        };

        const existingScript =
            document.querySelector<HTMLScriptElement>(
                'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
            );

        if (existingScript) {
            const interval =
                window.setInterval(() => {
                    if (window.turnstile) {
                        window.clearInterval(
                            interval
                        );

                        setTurnstileReady(
                            true
                        );
                    }
                }, 100);

            const timeout =
                window.setTimeout(() => {
                    window.clearInterval(
                        interval
                    );
                }, 10000);

            return () => {
                window.clearInterval(
                    interval
                );

                window.clearTimeout(
                    timeout
                );

                delete window.__pvTurnstileLoaded;
            };
        }

        const script =
            document.createElement(
                'script'
            );

        script.src =
            'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__pvTurnstileLoaded&render=explicit';

        script.async = true;
        script.defer = true;

        document.head.appendChild(
            script
        );

        return () => {
            delete window.__pvTurnstileLoaded;
        };
    }, []);

    // -------------------------------------------------------------------------
    // Render Turnstile
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!turnstileReady) return;

        if (!TURNSTILE_SITE_KEY) {
            return;
        }

        if (!window.turnstile) {
            return;
        }

        if (!widgetContainerRef.current) {
            return;
        }

        if (
            widgetIdRef.current !== null
        ) {
            return;
        }

        widgetIdRef.current =
            window.turnstile.render(
                widgetContainerRef.current,
                {
                    sitekey:
                        TURNSTILE_SITE_KEY,

                    theme: 'dark',

                    appearance: 'always',

                    callback: (
                        token: string
                    ) => {
                        setCaptchaToken(
                            token
                        );

                        setError(null);
                    },

                    'expired-callback':
                        () => {
                            setCaptchaToken(
                                null
                            );
                        },

                    'error-callback':
                        () => {
                            setCaptchaToken(
                                null
                            );

                            setError(
                                'Security verification failed. Please try again.'
                            );
                        },
                }
            );

        return () => {
            if (
                widgetIdRef.current !== null &&
                window.turnstile?.remove
            ) {
                try {
                    window.turnstile.remove(
                        widgetIdRef.current
                    );
                } catch {
                    // Ignore cleanup failure.
                }
            }

            widgetIdRef.current = null;
        };
    }, [turnstileReady]);

    // -------------------------------------------------------------------------
    // Reset Turnstile
    // -------------------------------------------------------------------------

    const resetTurnstile = () => {
        setCaptchaToken(null);

        if (
            window.turnstile &&
            widgetIdRef.current !== null
        ) {
            try {
                window.turnstile.reset(
                    widgetIdRef.current
                );
            } catch {
                // Ignore reset errors.
            }
        }
    };

    // -------------------------------------------------------------------------
    // Request magic link
    // -------------------------------------------------------------------------

    const handleSubmit = async (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        setError(null);
        setSuccess(null);

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();

        if (!normalizedEmail) {
            setError(
                'Email is required.'
            );

            return;
        }

        if (!TURNSTILE_SITE_KEY) {
            setError(
                'Security verification is not configured.'
            );

            return;
        }

        if (!captchaToken) {
            setError(
                'Please complete the security verification.'
            );

            return;
        }

        try {
            setSubmitting(true);

            await axios.post(
                `${API_BASE_URL}/bank-auth/login/request`,
                {
                    email:
                        normalizedEmail,

                    captchaToken,

                    // Keep compatibility with the
                    // existing bank-auth validator.
                    turnstileToken:
                        captchaToken,

                    token:
                        captchaToken,
                },
                {
                    headers: {
                        'Content-Type':
                            'application/json',

                        'cf-turnstile-response':
                            captchaToken,
                    },
                }
            );

            setSuccess(
                'If this email is authorized for bank access, a secure login link has been sent.'
            );

            resetTurnstile();
        } catch (err: any) {
            console.error(
                '[Bank Login] Request failed',
                err
            );

            setError(
                err?.response
                    ?.data
                    ?.message ||
                err?.message ||
                'Unable to request bank login.'
            );

            resetTurnstile();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div
                className="bank-login-page"
            >
                <div
                    className="bank-login-card"
                >
                    <div
                        className="bank-login-header"
                    >
                        <div
                            className="bank-login-badge"
                        >
                            BANK PORTAL
                        </div>

                        <h1>
                            Secure Bank Login
                        </h1>

                        <p>
                            Request a secure,
                            time-limited login
                            link to access the
                            PayVerify bank portal.
                        </p>
                    </div>

                    <form
                        onSubmit={
                            handleSubmit
                        }
                    >
                        <label
                            htmlFor="bank-email"
                            className="bank-label"
                        >
                            Authorized Email
                        </label>

                        <input
                            id="bank-email"
                            type="email"
                            value={email}
                            onChange={(
                                event
                            ) =>
                                setEmail(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="name@bank.com"
                            autoComplete="email"
                            disabled={
                                submitting
                            }
                            className="bank-input"
                            required
                        />

                        <div
                            className="turnstile-wrapper"
                        >
                            {!TURNSTILE_SITE_KEY ? (
                                <div
                                    className="bank-alert bank-alert-error"
                                >
                                    Security
                                    verification
                                    is currently
                                    unavailable.
                                </div>
                            ) : (
                                <div
                                    ref={
                                        widgetContainerRef
                                    }
                                />
                            )}
                        </div>

                        {error && (
                            <div
                                className="bank-alert bank-alert-error"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        {success && (
                            <div
                                className="bank-alert bank-alert-success"
                                role="status"
                            >
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="bank-submit"
                            disabled={
                                submitting ||
                                !captchaToken ||
                                !TURNSTILE_SITE_KEY
                            }
                        >
                            {submitting
                                ? 'Processing…'
                                : 'Send Secure Login Link'}
                        </button>
                    </form>

                    <div
                        className="bank-login-footer"
                    >
                        <Link
                            to="/login"
                        >
                            ← Merchant Login
                        </Link>
                    </div>
                </div>
            </div>

            <style>{`
                .bank-login-page {
                    min-height: 100vh;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    padding: 24px;

                    background:
                        radial-gradient(
                            900px 420px
                            at 50% 0%,
                            rgba(
                                36,
                                112,
                                255,
                                .20
                            ),
                            transparent
                            60%
                        ),
                        linear-gradient(
                            180deg,
                            #05070b,
                            #0a101b,
                            #0f2138
                        );

                    color: #eef5ff;
                }

                .bank-login-card {
                    width:
                        min(
                            480px,
                            100%
                        );

                    padding:
                        clamp(
                            22px,
                            5vw,
                            36px
                        );

                    border-radius:
                        18px;

                    border:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .14
                        );

                    background:
                        linear-gradient(
                            180deg,
                            rgba(
                                255,
                                255,
                                255,
                                .10
                            ),
                            rgba(
                                255,
                                255,
                                255,
                                .05
                            )
                        );

                    backdrop-filter:
                        blur(12px);

                    box-shadow:
                        0 24px 70px
                        rgba(
                            0,
                            0,
                            0,
                            .45
                        );
                }

                .bank-login-header {
                    text-align:
                        center;

                    margin-bottom:
                        24px;
                }

                .bank-login-header h1 {
                    margin:
                        10px 0 8px;

                    font-size:
                        clamp(
                            26px,
                            5vw,
                            36px
                        );

                    font-weight:
                        900;
                }

                .bank-login-header p {
                    margin: 0;

                    color:
                        rgba(
                            238,
                            245,
                            255,
                            .72
                        );

                    line-height:
                        1.6;
                }

                .bank-login-badge {
                    display:
                        inline-block;

                    padding:
                        6px 12px;

                    border-radius:
                        999px;

                    background:
                        rgba(
                            42,
                            123,
                            255,
                            .18
                        );

                    border:
                        1px solid
                        rgba(
                            90,
                            155,
                            255,
                            .40
                        );

                    color:
                        #a9ccff;

                    font-size:
                        12px;

                    font-weight:
                        900;

                    letter-spacing:
                        .12em;
                }

                .bank-label {
                    display:
                        block;

                    margin-bottom:
                        7px;

                    font-weight:
                        800;
                }

                .bank-input {
                    width: 100%;

                    padding:
                        13px 14px;

                    border-radius:
                        10px;

                    border:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .25
                        );

                    background:
                        rgba(
                            255,
                            255,
                            255,
                            .95
                        );

                    color:
                        #08111f;

                    font-weight:
                        700;

                    outline: none;
                }

                .bank-input:focus {
                    border-color:
                        #5a9bff;

                    box-shadow:
                        0 0 0 3px
                        rgba(
                            42,
                            123,
                            255,
                            .18
                        );
                }

                .turnstile-wrapper {
                    display:
                        flex;

                    justify-content:
                        center;

                    margin:
                        22px 0;
                }

                .bank-alert {
                    margin:
                        14px 0;

                    padding:
                        11px 13px;

                    border-radius:
                        10px;

                    font-weight:
                        700;
                }

                .bank-alert-error {
                    background:
                        rgba(
                            255,
                            80,
                            80,
                            .14
                        );

                    border:
                        1px solid
                        rgba(
                            255,
                            100,
                            100,
                            .35
                        );

                    color:
                        #ffd4d4;
                }

                .bank-alert-success {
                    background:
                        rgba(
                            0,
                            195,
                            137,
                            .14
                        );

                    border:
                        1px solid
                        rgba(
                            0,
                            195,
                            137,
                            .35
                        );

                    color:
                        #baf5df;
                }

                .bank-submit {
                    width: 100%;

                    padding:
                        13px 16px;

                    border: 0;

                    border-radius:
                        11px;

                    background:
                        linear-gradient(
                            180deg,
                            #3c89ff,
                            #216cf0
                        );

                    color: #fff;

                    font-weight:
                        900;

                    cursor:
                        pointer;
                }

                .bank-submit:disabled {
                    opacity: .55;

                    cursor:
                        not-allowed;
                }

                .bank-login-footer {
                    text-align:
                        center;

                    margin-top:
                        22px;
                }

                .bank-login-footer a {
                    color:
                        #8dbaff;

                    font-weight:
                        700;

                    text-decoration:
                        none;
                }

                .bank-login-footer a:hover {
                    text-decoration:
                        underline;
                }
            `}</style>
        </>
    );
};

export default BankLoginPage;