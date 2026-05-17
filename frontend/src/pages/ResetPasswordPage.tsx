import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import { resetPassword as resetPasswordApi } from '../services/api';

export default function ResetPasswordPage() {
    const [sp] = useSearchParams();
    const presetToken = sp.get('token') || '';
    const [token, setToken] = useState(presetToken);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const strength = useMemo(() => {
        let s = 0;
        if (password.length >= 8) s++;
        if (/[A-Z]/.test(password)) s++;
        if (/[a-z]/.test(password)) s++;
        if (/\d/.test(password)) s++;
        if (/[^A-Za-z0-9]/.test(password)) s++;
        return s; // 0..5
    }, [password]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim()) return toast.error('Missing reset token.');
        if (password.length < 8) return toast.error('Password must be at least 8 characters.');
        if (password !== confirm) return toast.error('Passwords do not match.');

        try {
            setSubmitting(true);
            await resetPasswordApi(token.trim(), password); // ✅ FIXED
                        toast.success('Password reset successful. Please log in.');
            navigate('/login', { replace: true });
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message ?? 'Reset failed. The link may be invalid or expired.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Navbar />

            <div className="pv-auth-bg d-flex align-items-center justify-content-center py-5">
                <div className="container" style={{ maxWidth: 560 }}>
                    <div className="card pv-glass shadow-lg">
                        <div className="card-body p-4 p-md-5">
                            <h3 className="text-light fw-bold mb-2">Reset your password</h3>
                            <p className="text-light-50 mb-4">
                                Choose a strong password you don’t use elsewhere.
                            </p>

                            <form onSubmit={onSubmit} className="row g-3">
                                {/* Token (prefilled from query param) */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Reset token</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        placeholder="Paste token here if the link didn’t open directly"
                                        required
                                    />
                                </div>

                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">New password</label>
                                    <div className="input-group">
                                        <input
                                            type={show ? 'text' : 'password'}
                                            className="form-control"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Minimum 8 characters"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShow((s) => !s)}
                                        >
                                            {show ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    {/* Strength bar */}
                                    <div className="progress mt-2" style={{ height: 6 }}>
                                        <div
                                            className={`progress-bar ${strength <= 2 ? 'bg-danger' : strength === 3 ? 'bg-warning' : 'bg-success'
                                                }`}
                                            role="progressbar"
                                            style={{ width: `${(strength / 5) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Confirm password</label>
                                    <input
                                        type={show ? 'text' : 'password'}
                                        className="form-control"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="col-12 d-grid">
                                    <button className="btn btn-primary fw-bold" type="submit" disabled={submitting}>
                                        {submitting ? 'Resetting…' : 'Reset password'}
                                    </button>
                                </div>

                                <div className="col-12">
                                    <Link to="/login" className="text-decoration-none">
                                        ← Back to login
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
}

const StyleBlock = () => (
    <style>{`
    .pv-auth-bg {
      min-height: calc(100vh - 56px);
      background:
        radial-gradient(1100px 220px at 50% 100%, rgba(0,0,0,.35), rgba(0,0,0,0) 60%),
        linear-gradient(180deg, #0c0f13 0%, #151c23 40%, #22303a 68%, #3e4e5a 80%, #aeb8c1 100%);
      box-shadow: inset 0 0 160px rgba(0,0,0,.55);
    }
    .pv-glass {
      border: 1px solid rgba(255,255,255,.20);
      background:
        radial-gradient(120% 160% at 100% 0, rgba(255,255,255,.14), rgba(255,255,255,.06) 60%),
        linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,.08));
      backdrop-filter: blur(10px) saturate(140%);
      -webkit-backdrop-filter: blur(10px) saturate(140%);
      position: relative;
      border-radius: 18px;
      overflow: hidden;
      color: #e9f2ff;
    }
    .pv-glass::before{
      content:""; position:absolute; inset:0;
      background: linear-gradient(to bottom, rgba(255,255,255,.28), rgba(255,255,255,0) 38%);
      pointer-events:none; mix-blend-mode:screen;
    }
    .text-light-50 { color: rgba(233,242,255,.75); }
    .form-control, .form-select { font-weight: 600; }
  `}</style>
);
