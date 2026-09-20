// src/pages/UserRegistration.tsx

import React, {
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    Link,
    useNavigate,
} from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
    faBuilding,
    faEnvelope,
    faLock,
    faEye,
    faEyeSlash,
    faLandmark,
    faHashtag,
} from '@fortawesome/free-solid-svg-icons';

import { registerUser } from '../services/api';

const TURNSTILE_SITE_KEY =
    (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '') as string;

/**
 * IMPORTANT:
 * Keep this declaration identical to LoginPage.tsx
 * and BankLoginPage.tsx.
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

const UserRegistration: React.FC = () => {
    const navigate = useNavigate();

    // -------------------------------------------------------------------------
    // Merchant / account fields
    // -------------------------------------------------------------------------

    const [businessName, setBusinessName] =
        useState('');

    const [cacNumber, setCacNumber] =
        useState('');

    const [bankName, setBankName] =
        useState('');

    const [accountNumber, setAccountNumber] =
        useState('');

    const [email, setEmail] =
        useState('');

    const [password, setPassword] =
        useState('');

    const [confirm, setConfirm] =
        useState('');

    // -------------------------------------------------------------------------
    // UI state
    // -------------------------------------------------------------------------

    const [showPwd, setShowPwd] =
        useState(false);

    const [showPwd2, setShowPwd2] =
        useState(false);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [ok, setOk] =
        useState(false);

    // -------------------------------------------------------------------------
    // Turnstile state
    // -------------------------------------------------------------------------

    const [captchaToken, setCaptchaToken] =
        useState<string | null>(null);

    const [turnstileReady, setTurnstileReady] =
        useState(false);

    const widgetContainerRef =
        useRef<HTMLDivElement | null>(null);

    const widgetIdRef =
        useRef<any>(null);

    // -------------------------------------------------------------------------
    // Load Cloudflare Turnstile
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!TURNSTILE_SITE_KEY) {
            console.error(
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
    // Render Cloudflare Turnstile
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!turnstileReady) return;
        if (!TURNSTILE_SITE_KEY) return;
        if (!window.turnstile) return;
        if (!widgetContainerRef.current) return;

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
                    // Widget may already be removed.
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
                // Ignore widget reset errors.
            }
        }
    };

    // -------------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------------

    const validate =
        (): string | null => {
            if (!businessName.trim()) {
                return 'Business name is required.';
            }

            if (!cacNumber.trim()) {
                return 'CAC / RC number is required.';
            }

            if (!bankName.trim()) {
                return 'Bank name is required.';
            }

            const normalizedAccountNumber =
                accountNumber.replace(
                    /\s/g,
                    ''
                );

            if (!normalizedAccountNumber) {
                return 'Account number is required.';
            }

            if (
                !/^\d{10}$/.test(
                    normalizedAccountNumber
                )
            ) {
                return 'Please enter a valid 10-digit Nigerian bank account number.';
            }

            if (!email.trim()) {
                return 'Email is required.';
            }

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    email.trim()
                )
            ) {
                return 'Please enter a valid email address.';
            }

            if (!password) {
                return 'Password is required.';
            }

            if (password.length < 8) {
                return 'Password should be at least 8 characters.';
            }

            if (
                password !== confirm
            ) {
                return 'Passwords do not match.';
            }

            if (!TURNSTILE_SITE_KEY) {
                return 'Security verification is not configured.';
            }

            if (!captchaToken) {
                return 'Please complete the security verification.';
            }

            return null;
        };

    // -------------------------------------------------------------------------
    // Registration
    // -------------------------------------------------------------------------

    const onSubmit = async (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        setError(null);
        setOk(false);

        const validationError =
            validate();

        if (validationError) {
            setError(
                validationError
            );

            return;
        }

        // Already checked by validate().
        if (!captchaToken) {
            return;
        }

        try {
            setSubmitting(true);

            await registerUser({
                name:
                    businessName.trim(),

                email:
                    email
                        .trim()
                        .toLowerCase(),

                password,

                cac_number:
                    cacNumber.trim(),

                bank_name:
                    bankName.trim(),

                account_number:
                    accountNumber.replace(
                        /\s/g,
                        ''
                    ),

                captchaToken,
            });

            setOk(true);

            window.setTimeout(
                () => {
                    navigate(
                        '/login'
                    );
                },
                1200
            );
        } catch (err: any) {
            console.error(
                '[Registration] Registration failed',
                err
            );

            setError(
                err?.response
                    ?.data
                    ?.message ||
                err?.message ||
                'Could not register your account.'
            );

            // Turnstile tokens are single-use.
            resetTurnstile();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div
                className="pv-auth-bg d-flex align-items-center justify-content-center py-5"
                style={{
                    minHeight: '100vh',
                }}
            >
                <div
                    className="container"
                    style={{
                        maxWidth: 640,
                    }}
                >
                    <div className="card pv-glass shadow-lg">

                        <div className="card-body p-4 p-md-5">

                            <h1 className="pv-glossy-title text-center mb-2">
                                Create Merchant Account
                            </h1>

                            <p className="text-light-50 text-center mb-4">
                                Register your business to access PayVerify.
                            </p>

                            <form
                                className="row g-3"
                                onSubmit={
                                    onSubmit
                                }
                                noValidate
                            >
                                {/* BUSINESS NAME */}

                                <div className="col-12">
                                    <label
                                        htmlFor="business-name"
                                        className="form-label text-light fw-semibold"
                                    >
                                        Business Name
                                    </label>

                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon
                                                icon={
                                                    faBuilding
                                                }
                                            />
                                        </span>

                                        <input
                                            id="business-name"
                                            type="text"
                                            className="form-control"
                                            placeholder="LB Vision Services"
                                            value={
                                                businessName
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setBusinessName(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            autoComplete="organization"
                                            disabled={
                                                submitting
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                {/* CAC */}

                                <div className="col-12 col-md-6">
                                    <label
                                        htmlFor="cac-number"
                                        className="form-label text-light fw-semibold"
                                    >
                                        CAC / RC Number
                                    </label>

                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon
                                                icon={
                                                    faHashtag
                                                }
                                            />
                                        </span>

                                        <input
                                            id="cac-number"
                                            type="text"
                                            className="form-control"
                                            placeholder="RC1234567"
                                            value={
                                                cacNumber
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setCacNumber(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            disabled={
                                                submitting
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                {/* BANK */}

                                <div className="col-12 col-md-6">
                                    <label
                                        htmlFor="bank-name"
                                        className="form-label text-light fw-semibold"
                                    >
                                        Bank Name
                                    </label>

                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon
                                                icon={
                                                    faLandmark
                                                }
                                            />
                                        </span>

                                        <input
                                            id="bank-name"
                                            type="text"
                                            className="form-control"
                                            placeholder="Bank name"
                                            value={
                                                bankName
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setBankName(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            disabled={
                                                submitting
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                {/* ACCOUNT NUMBER */}

                                <div className="col-12">
                                    <label
                                        htmlFor="account-number"
                                        className="form-label text-light fw-semibold"
                                    >
                                        Business Bank Account Number
                                    </label>

                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon
                                                icon={
                                                    faHashtag
                                                }
                                            />
                                        </span>

                                        <input
                                            id="account-number"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={
                                                10
                                            }
                                            className="form-control"
                                            placeholder="10-digit account number"
                                            value={
                                                accountNumber
                                            }
                                            onChange={(
                                                event
                                            ) => {
                                                const value =
                                                    event
                                                        .target
                                                        .value
                                                        .replace(
                                                            /\D/g,
                                                            ''
                                                        )
                                                        .slice(
                                                            0,
                                                            10
                                                        );

                                                setAccountNumber(
                                                    value
                                                );
                                            }}
                                            autoComplete="off"
                                            disabled={
                                                submitting
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                {/* EMAIL */}

                                <div className="col-12">
                                    <label
                                        htmlFor="registration-email"
                                        className="form-label text-light fw-semibold"
                                    >
                                        Email
                                    </label>

                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon
                                                icon={
                                                    faEnvelope
                                                }
                                            />
                                        </span>

                                        <input
                                            id="registration-email"
                                            type="email"
                                            className="form-control"
                                            placeholder="you@company.com"
                                            value={
                                                email
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setEmail(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            autoComplete="email"
                                            disabled={
                                                submitting
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                {/* PASSWORD */}

                                <div className="col-12">
                                    <label
                                        htmlFor="registration-password"
                                        className="form-label text-light fw-semibold"
                                    >
                                        Password
                                    </label>

                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon
                                                icon={
                                                    faLock
                                                }
                                            />
                                        </span>

                                        <input
                                            id="registration-password"
                                            type={
                                                showPwd
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            className="form-control"
                                            placeholder="Create password"
                                            value={
                                                password
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setPassword(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            autoComplete="new-password"
                                            disabled={
                                                submitting
                                            }
                                            required
                                        />

                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() =>
                                                setShowPwd(
                                                    (
                                                        current
                                                    ) =>
                                                        !current
                                                )
                                            }
                                            disabled={
                                                submitting
                                            }
                                            aria-label={
                                                showPwd
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
                                        >
                                            <FontAwesomeIcon
                                                icon={
                                                    showPwd
                                                        ? faEyeSlash
                                                        : faEye
                                                }
                                            />
                                        </button>
                                    </div>

                                    <small className="text-light-50">
                                        Minimum 8 characters.
                                    </small>
                                </div>

                                {/* CONFIRM PASSWORD */}

                                <div className="col-12">
                                    <label
                                        htmlFor="registration-confirm-password"
                                        className="form-label text-light fw-semibold"
                                    >
                                        Confirm Password
                                    </label>

                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon
                                                icon={
                                                    faLock
                                                }
                                            />
                                        </span>

                                        <input
                                            id="registration-confirm-password"
                                            type={
                                                showPwd2
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            className="form-control"
                                            placeholder="Re-enter password"
                                            value={
                                                confirm
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setConfirm(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            autoComplete="new-password"
                                            disabled={
                                                submitting
                                            }
                                            required
                                        />

                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() =>
                                                setShowPwd2(
                                                    (
                                                        current
                                                    ) =>
                                                        !current
                                                )
                                            }
                                            disabled={
                                                submitting
                                            }
                                            aria-label={
                                                showPwd2
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
                                        >
                                            <FontAwesomeIcon
                                                icon={
                                                    showPwd2
                                                        ? faEyeSlash
                                                        : faEye
                                                }
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* TURNSTILE */}

                                <div className="col-12">
                                    {!TURNSTILE_SITE_KEY ? (
                                        <div
                                            className="alert alert-danger mb-0"
                                            role="alert"
                                        >
                                            Security verification is currently unavailable.
                                        </div>
                                    ) : (
                                        <div
                                            ref={
                                                widgetContainerRef
                                            }
                                            className="d-flex justify-content-center"
                                        />
                                    )}
                                </div>

                                {/* ERROR */}

                                {error && (
                                    <div className="col-12">
                                        <div
                                            className="alert alert-danger mb-0"
                                            role="alert"
                                        >
                                            {error}
                                        </div>
                                    </div>
                                )}

                                {/* SUCCESS */}

                                {ok && (
                                    <div className="col-12">
                                        <div
                                            className="alert alert-success mb-0"
                                            role="status"
                                        >
                                            Account created! Redirecting to login…
                                        </div>
                                    </div>
                                )}

                                {/* ACTIONS */}

                                <div className="col-12 col-sm-6 d-grid">
                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-bold"
                                        disabled={
                                            submitting ||
                                            ok ||
                                            !captchaToken ||
                                            !TURNSTILE_SITE_KEY
                                        }
                                    >
                                        {submitting
                                            ? 'Creating Account…'
                                            : 'Create Account'}
                                    </button>
                                </div>

                                <div className="col-12 col-sm-6 d-grid">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary fw-bold"
                                        onClick={() =>
                                            navigate(
                                                '/login'
                                            )
                                        }
                                        disabled={
                                            submitting
                                        }
                                    >
                                        Cancel
                                    </button>
                                </div>

                                <div className="col-12 text-center mt-2">
                                    <span className="text-light-50">
                                        Already have an account?{' '}
                                    </span>

                                    <Link
                                        to="/login"
                                        className="text-decoration-none fw-semibold"
                                    >
                                        Login
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
        .pv-auth-bg {
            background:
                radial-gradient(
                    1200px 420px at 50% 0%,
                    rgba(35,105,255,.20),
                    rgba(0,0,0,0) 55%
                ),
                linear-gradient(
                    180deg,
                    #05070b 0%,
                    #0a0f19 40%,
                    #0e1a2d 68%,
                    #0f2138 85%,
                    #0f243f 100%
                );

            box-shadow:
                inset 0 0 240px
                rgba(0,0,0,.70);
        }

        .pv-glass {
            border:
                1px solid
                rgba(255,255,255,.16);

            background:
                linear-gradient(
                    180deg,
                    rgba(5,10,20,.35),
                    rgba(5,10,20,.35)
                ),
                linear-gradient(
                    180deg,
                    rgba(255,255,255,.16),
                    rgba(255,255,255,.06)
                );

            backdrop-filter:
                blur(10px)
                saturate(140%);

            -webkit-backdrop-filter:
                blur(10px)
                saturate(140%);

            position: relative;

            border-radius: 18px;

            overflow: hidden;

            color: #eef5ff;
        }

        .pv-glass::before {
            content: "";

            position: absolute;

            inset: 0;

            background:
                linear-gradient(
                    to bottom,
                    rgba(255,255,255,.18),
                    rgba(255,255,255,0)
                    36%
                );

            pointer-events: none;

            mix-blend-mode: screen;
        }

        .pv-glossy-title {
            font-weight: 900;

            letter-spacing: -0.02em;

            line-height: 1.05;

            font-size:
                clamp(
                    1.75rem,
                    2.2vw + 1rem,
                    2.4rem
                );

            background:
                linear-gradient(
                    180deg,
                    #ffffff 0%,
                    #d7e7ff 58%,
                    #7fb4ff 100%
                );

            -webkit-background-clip:
                text;

            background-clip:
                text;

            color: transparent;
        }

        .form-label {
            font-weight: 800;

            color: #e9f2ff;
        }

        .form-control {
            font-weight: 700;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .92
                );

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .35
                );
        }

        .input-group-text {
            background:
                rgba(
                    255,
                    255,
                    255,
                    .92
                );

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .35
                );

            font-weight: 700;
        }

        .text-light-50 {
            color:
                rgba(
                    233,
                    242,
                    255,
                    .80
                ) !important;
        }

        .btn.btn-primary {
            font-weight: 900;
        }

        @media (max-width: 576px) {
            .pv-auth-bg {
                padding-left: 12px;
                padding-right: 12px;
            }

            .pv-glass {
                border-radius: 14px;
            }
        }
    `}</style>
);

export default UserRegistration;