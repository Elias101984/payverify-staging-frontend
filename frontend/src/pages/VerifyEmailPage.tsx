import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export default function VerifyEmailPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { setSession } = useAuth();

    const [email, setEmail] = useState(params.get('email') || '');
    const [otp, setOtp] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    async function request(path: string, body: object) {
        if (!API_BASE) {
            throw new Error('API address is not configured.');
        }

        const response = await fetch(`${API_BASE}/auth/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed.');
        }

        return data;
    }

    async function verify(event: React.FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError('');
        setMessage('');

        try {
            const data = await request('verify-email', {
                email: email.trim().toLowerCase(),
                otp,
            });

            if (!data.token || !data.user) {
                throw new Error('The server did not return a login session.');
            }

            setSession(data.token, data.user);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed.');
        } finally {
            setBusy(false);
        }
    }

    async function resend() {
        setBusy(true);
        setError('');
        setMessage('');

        try {
            const data = await request('resend-email-otp', {
                email: email.trim().toLowerCase(),
            });
            setMessage(data.message);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to resend.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <main
            className="min-vh-100 d-flex align-items-center justify-content-center p-3"
            style={{ background: '#0d172b' }}
        >
            <div className="card p-4 shadow" style={{ maxWidth: 460, width: '100%' }}>
                <h1 className="h3">Verify your email</h1>
                <p>Enter the six-digit code from your verification email.</p>

                <form onSubmit={verify}>
                    <label htmlFor="verification-email" className="form-label">
                        Registered email
                    </label>
                    <input
                        id="verification-email"
                        className="form-control mb-3"
                        type="email"
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        disabled={busy}
                        autoComplete="email"
                        required
                    />

                    <label htmlFor="verification-code" className="form-label">
                        Verification code
                    </label>
                    <input
                        id="verification-code"
                        className="form-control mb-3"
                        value={otp}
                        onChange={event =>
                            setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        disabled={busy}
                        required
                    />

                    {error && <div className="alert alert-danger" role="alert">{error}</div>}
                    {message && <div className="alert alert-info" role="status">{message}</div>}

                    <button
                        className="btn btn-primary w-100 mb-2"
                        disabled={busy || otp.length !== 6}
                    >
                        {busy ? 'Please wait…' : 'Verify and open dashboard'}
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline-secondary w-100"
                        onClick={resend}
                        disabled={busy || !email.trim()}
                    >
                        Resend code
                    </button>
                </form>

                <Link className="mt-3" to="/login">Back to login</Link>
            </div>
        </main>
    );
}