import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

export interface SettlementCelebrationOrder {
    id: string | number;
    poNumber?: string;
    customerName?: string;
    amount?: number;
    totalAmount?: number;
    settlementId?: number | string | null;
    settlementDate?: string | null;
}

interface SettlementCelebrationProps {
    open: boolean;
    order: SettlementCelebrationOrder | null;
    onClose: () => void;
}

const confettiColors = [
    '#62d9ff',
    '#8d7bff',
    '#ffd166',
    '#70f0b0',
    '#ff7eb6',
];

const formatAmount = (value: number | undefined) =>
    `₦${Number(value || 0).toLocaleString('en-NG')}`;

const formatDate = (value?: string | null) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Just now'
        : date.toLocaleString('en-NG');
};

/**
 * A small synthesized coin-credit sound keeps the celebration self-contained (no audio
 * asset or network request). Browsers may block autoplay; the replay button in
 * the celebration card gives the user an explicit gesture to start it.
 */
const playSettlementChime = () => {
    if (typeof window === 'undefined') return;

    try {
        const AudioContextConstructor =
            window.AudioContext ||
            (window as Window & { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;

        if (!AudioContextConstructor) return;

        const context = new AudioContextConstructor();
        const master = context.createGain();
        const now = context.currentTime;

        // A new context may start suspended on mobile until the browser has a
        // user gesture. The explicit Replay sound button handles that case.
        void context.resume().catch(() => undefined);

        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
        master.connect(context.destination);

        // Two bright, short pings give the familiar "coin credited" cue
        // without shipping an audio asset or delaying the dashboard refresh.
        [
            { frequency: 987.77, offset: 0 },
            { frequency: 1567.98, offset: 0.11 },
            { frequency: 1318.51, offset: 0.24 },
        ].forEach(({ frequency, offset }) => {
            const oscillator = context.createOscillator();
            const noteGain = context.createGain();
            const start = now + offset;

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(frequency, start);
            noteGain.gain.setValueAtTime(0.0001, start);
            noteGain.gain.exponentialRampToValueAtTime(0.7, start + 0.025);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);

            oscillator.connect(noteGain);
            noteGain.connect(master);
            oscillator.start(start);
            oscillator.stop(start + 0.3);
        });

        window.setTimeout(() => {
            void context.close().catch(() => undefined);
        }, 1200);
    } catch {
        // Audio is an enhancement. A blocked/unsupported audio context must
        // never interfere with the settlement state or dashboard refresh.
    }
};

const triggerVibration = () => {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([90, 45, 120, 45, 220]);
        }
    } catch {
        // iOS Safari and some desktop browsers do not expose vibration.
    }
};

const getConfettiStyle = (index: number): CSSProperties => {
    const angle = (index / 16) * Math.PI * 2;
    const distance = 100 + (index % 4) * 22;

    return {
        '--confetti-x': `${Math.cos(angle) * distance}px`,
        '--confetti-y': `${Math.sin(angle) * distance - 30}px`,
        '--confetti-r': `${(index * 47) % 360}deg`,
        '--confetti-delay': `${(index % 5) * 35}ms`,
        background: confettiColors[index % confettiColors.length],
    } as CSSProperties;
};

// NEW: Controls each firework spark's angle, staggered timing, and color.
const getFireworkStyle = (index: number): CSSProperties => ({
    '--firework-angle': `${(index / 24) * 360}deg`,
    '--firework-delay': `${(index % 6) * 45}ms`,
    background: confettiColors[index % confettiColors.length],
    color: confettiColors[index % confettiColors.length],
} as CSSProperties);

// NEW: Controls full-screen confetti rain placement, drift, rotation, and speed.
const getRainStyle = (index: number): CSSProperties => ({
    '--rain-left': `${(index * 37) % 101}%`,
    '--rain-delay': `${(index % 18) * 90}ms`,
    '--rain-duration': `${2.8 + (index % 7) * 0.35}s`,
    '--rain-drift': `${((index * 19) % 100) - 50}px`,
    '--rain-rotation': `${(index * 43) % 360}deg`,
    background: confettiColors[index % confettiColors.length],
} as CSSProperties);

export default function SettlementCelebration({
    open,
    order,
    onClose,
}: SettlementCelebrationProps) {
    const playedForOrderRef = useRef<string | null>(null);

    useEffect(() => {
        if (!open || !order) {
            playedForOrderRef.current = null;
            return;
        }

        const orderKey = String(order.id);
        if (playedForOrderRef.current === orderKey) return;

        playedForOrderRef.current = orderKey;
        playSettlementChime();
        triggerVibration();
    }, [open, order?.id]);

    if (!open || !order) return null;

    return (
        <>
            <div
                className="pv-settlement-celebration"
                role="status"
                aria-live="assertive"
                aria-label="Payment settled"
            >
                <div className="pv-settlement-backdrop" onClick={onClose} />

                {/* NEW: Full-viewport celebration layer: falling confetti + fireworks. */}
                <div className="pv-fireworks" aria-hidden="true">
                    {/* NEW: 80 pieces continuously fall from the top across the page. */}
                    <div className="pv-confetti-rain">
                        {Array.from({ length: 80 }, (_, index) => (
                            <i key={index} style={getRainStyle(index)} />
                        ))}
                    </div>
                    {/* NEW: Three large fireworks bursts positioned left, right, and center. */}
                    {[0, 1, 2].map((burst) => (
                        <div key={burst} className={`pv-firework pv-firework-${burst}`}>
                            {Array.from({ length: 24 }, (_, index) => (
                                <i key={index} style={getFireworkStyle(index)} />
                            ))}
                        </div>
                    ))}
                </div>

                <section className="pv-settlement-card" aria-modal="true">
                    <button
                        type="button"
                        className="pv-settlement-close"
                        onClick={onClose}
                        aria-label="Close settlement celebration"
                    >
                        ×
                    </button>

                    <div className="pv-gift-scene" aria-hidden="true">
                        {Array.from({ length: 16 }, (_, index) => (
                            <span
                                key={index}
                                className="pv-settlement-confetti"
                                style={getConfettiStyle(index)}
                            />
                        ))}
                        <div className="pv-gift-glow" />
                        <div className="pv-gift-lid">
                            <span className="pv-gift-ribbon" />
                        </div>
                        <div className="pv-gift-box">
                            <span className="pv-gift-ribbon" />
                            <span className="pv-gift-bow pv-gift-bow-left" />
                            <span className="pv-gift-bow pv-gift-bow-right" />
                        </div>
                    </div>

                    <p className="pv-settlement-eyebrow">Payment settled</p>
                    <h2>Money received 🎉</h2>
                    <p className="pv-settlement-message">
                        {order.poNumber ? `PO-${order.poNumber}` : 'This order'} is now
                        settled into the merchant account.
                    </p>

                    <div className="pv-settlement-summary">
                        <strong>{formatAmount(order.amount ?? order.totalAmount)}</strong>
                        <span>{order.customerName || 'Walk-in customer'}</span>
                        <small>
                            {order.settlementId
                                ? `Settlement #${order.settlementId}`
                                : 'Paystack settlement confirmed'}
                            {' · '}
                            {formatDate(order.settlementDate)}
                        </small>
                    </div>

                    <div className="pv-settlement-actions">
                        <button
                            type="button"
                            className="pv-settlement-replay"
                            onClick={() => {
                                playSettlementChime();
                                triggerVibration();
                            }}
                        >
                            🔊 Replay sound
                        </button>
                        <button
                            type="button"
                            className="pv-settlement-continue"
                            onClick={onClose}
                        >
                            Continue
                        </button>
                    </div>
                    <small className="pv-settlement-support-note">
                        Sound and vibration depend on your device and browser.
                    </small>
                </section>
            </div>

            <style>{`
                .pv-settlement-celebration {
                    position: fixed;
                    inset: 0;
                    z-index: 2000;
                    display: grid;
                    place-items: center;
                    padding: 22px;
                }

                .pv-settlement-backdrop {
                    position: absolute;
                    inset: 0;
                    background: rgba(2, 8, 24, .76);
                    backdrop-filter: blur(9px);
                    -webkit-backdrop-filter: blur(9px);
                    animation: pv-settlement-fade-in 220ms ease both;
                }

                /* NEW: Layer spans the entire viewport above the backdrop. */
                .pv-fireworks { position: absolute; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
                .pv-confetti-rain { position: absolute; inset: 0; overflow: hidden; }
                .pv-confetti-rain i {
                    position: absolute; left: var(--rain-left); top: -24px;
                    width: 8px; height: 15px; border-radius: 2px; opacity: 0;
                    transform: rotate(var(--rain-rotation));
                    box-shadow: 0 0 7px rgba(255,255,255,.22);
                    animation: pv-confetti-rain var(--rain-duration) linear var(--rain-delay) infinite;
                }
                /* NEW: Makes confetti fall from the top to the bottom of the page. */
                @keyframes pv-confetti-rain {
                    0% { opacity: 0; transform: translate3d(0,-30px,0) rotate(0deg); }
                    8% { opacity: .95; }
                    88% { opacity: .9; }
                    100% { opacity: 0; transform: translate3d(var(--rain-drift), calc(100vh + 40px), 0) rotate(720deg); }
                }
                .pv-firework { position: absolute; width: 8px; height: 8px; border-radius: 50%; }
                .pv-firework-0 { left: 17%; top: 24%; }
                .pv-firework-1 { left: 82%; top: 27%; animation-delay: 180ms; }
                .pv-firework-2 { left: 50%; top: 13%; animation-delay: 360ms; }
                .pv-firework i {
                    position: absolute; left: 0; top: 0; width: 5px; height: 34px;
                    border-radius: 999px; opacity: 0;
                    transform-origin: 50% 100%;
                    transform: rotate(var(--firework-angle)) translateY(0) scaleY(.15);
                    box-shadow: 0 0 9px currentColor, 0 0 18px currentColor;
                    animation: pv-firework-burst 1.35s cubic-bezier(.15,.75,.3,1) var(--firework-delay) both;
                }
                /* NEW: Expands each firework spark outward before fading. */
                @keyframes pv-firework-burst {
                    0% { opacity: 0; transform: rotate(var(--firework-angle)) translateY(0) scaleY(.1); }
                    12% { opacity: 1; }
                    78% { opacity: 1; transform: rotate(var(--firework-angle)) translateY(-125px) scaleY(1); }
                    100% { opacity: 0; transform: rotate(var(--firework-angle)) translateY(-165px) scaleY(.45); }
                }

                .pv-settlement-card {
                    position: relative;
                    z-index: 2;
                    width: min(100%, 430px);
                    overflow: hidden;
                    padding: 24px 24px 20px;
                    text-align: center;
                    color: #eff7ff;
                    border: 1px solid rgba(141, 206, 255, .44);
                    border-radius: 26px;
                    background:
                        radial-gradient(140% 100% at 50% -20%, rgba(69, 152, 255, .32), transparent 55%),
                        linear-gradient(155deg, rgba(31, 58, 103, .97), rgba(7, 18, 43, .98));
                    box-shadow:
                        0 26px 90px rgba(0, 0, 0, .62),
                        0 0 0 1px rgba(255,255,255,.05) inset,
                        0 0 42px rgba(45, 142, 255, .26);
                    animation: pv-gift-card-in 560ms cubic-bezier(.2, 1.25, .35, 1) both;
                }

                .pv-settlement-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background: linear-gradient(115deg, rgba(255,255,255,.18), transparent 24%, transparent 72%, rgba(89, 175, 255, .1));
                }

                .pv-settlement-close {
                    position: absolute;
                    top: 10px;
                    right: 13px;
                    z-index: 4;
                    width: 33px;
                    height: 33px;
                    border: 1px solid rgba(255,255,255,.20);
                    border-radius: 50%;
                    color: #e4f1ff;
                    background: rgba(0,0,0,.18);
                    font-size: 1.45rem;
                    line-height: 1;
                    cursor: pointer;
                }

                .pv-settlement-close:hover { background: rgba(255,255,255,.14); }

                .pv-gift-scene {
                    position: relative;
                    width: 220px;
                    height: 178px;
                    margin: 0 auto 2px;
                }

                .pv-gift-glow {
                    position: absolute;
                    left: 50%;
                    bottom: 14px;
                    width: 150px;
                    height: 48px;
                    transform: translateX(-50%);
                    border-radius: 50%;
                    background: rgba(58, 153, 255, .46);
                    filter: blur(18px);
                    animation: pv-gift-glow 1.7s ease-in-out infinite alternate;
                }

                .pv-gift-box {
                    position: absolute;
                    left: 50%;
                    bottom: 22px;
                    width: 126px;
                    height: 88px;
                    transform: translateX(-50%);
                    border: 2px solid rgba(180, 225, 255, .72);
                    border-radius: 10px 10px 14px 14px;
                    background: linear-gradient(135deg, #2e9bff 0%, #1461dc 52%, #073a9e 100%);
                    box-shadow: inset 0 2px rgba(255,255,255,.28), 0 16px 28px rgba(0,0,0,.34);
                    animation: pv-gift-box-pop 700ms cubic-bezier(.14, 1.3, .3, 1) both;
                }

                .pv-gift-lid {
                    position: absolute;
                    left: 50%;
                    top: 58px;
                    z-index: 2;
                    width: 142px;
                    height: 27px;
                    transform: translateX(-50%);
                    border: 2px solid rgba(206, 239, 255, .78);
                    border-radius: 9px;
                    background: linear-gradient(135deg, #49b6ff, #1263dd 70%);
                    box-shadow: inset 0 2px rgba(255,255,255,.32), 0 10px 22px rgba(0,0,0,.3);
                    animation: pv-gift-lid-pop 850ms cubic-bezier(.18, 1.35, .28, 1) 90ms both;
                }

                .pv-gift-ribbon {
                    position: absolute;
                    left: 50%;
                    top: 0;
                    width: 20px;
                    height: 100%;
                    transform: translateX(-50%);
                    border-left: 2px solid rgba(255,255,255,.34);
                    border-right: 2px solid rgba(0, 39, 117, .35);
                    background: linear-gradient(90deg, #ffd86b, #fff1a7, #e8ac39);
                }

                .pv-gift-bow {
                    position: absolute;
                    top: -22px;
                    width: 35px;
                    height: 25px;
                    border: 6px solid #ffe18a;
                    background: rgba(255, 195, 61, .25);
                    box-shadow: 0 2px 6px rgba(0,0,0,.26);
                }

                .pv-gift-bow-left {
                    left: 50%;
                    transform: translateX(-100%) rotate(22deg);
                    border-radius: 80% 20% 70% 30%;
                }

                .pv-gift-bow-right {
                    right: 50%;
                    transform: translateX(100%) rotate(-22deg);
                    border-radius: 20% 80% 30% 70%;
                }

                .pv-settlement-confetti {
                    position: absolute;
                    left: 50%;
                    top: 86px;
                    width: 9px;
                    height: 17px;
                    border-radius: 3px;
                    opacity: 0;
                    transform: translate(-50%, -50%);
                    animation: pv-confetti-burst 920ms cubic-bezier(.12, .76, .32, 1) var(--confetti-delay) both;
                }

                .pv-settlement-eyebrow {
                    position: relative;
                    margin: 0 0 4px;
                    color: #8fecc4;
                    font-size: .76rem;
                    font-weight: 950;
                    letter-spacing: .14em;
                    text-transform: uppercase;
                }

                .pv-settlement-card h2 {
                    position: relative;
                    margin: 0;
                    color: #fff;
                    font-size: clamp(1.65rem, 7vw, 2.1rem);
                    font-weight: 950;
                    letter-spacing: -.03em;
                }

                .pv-settlement-message {
                    position: relative;
                    margin: 8px auto 16px;
                    max-width: 330px;
                    color: rgba(231, 243, 255, .78);
                    line-height: 1.45;
                }

                .pv-settlement-summary {
                    position: relative;
                    display: grid;
                    gap: 4px;
                    padding: 13px;
                    border: 1px solid rgba(255,255,255,.14);
                    border-radius: 16px;
                    background: rgba(0, 11, 34, .32);
                    box-shadow: inset 0 1px rgba(255,255,255,.09);
                }

                .pv-settlement-summary strong {
                    color: #fff;
                    font-size: 1.65rem;
                    font-weight: 950;
                }

                .pv-settlement-summary span { color: #dcecff; font-weight: 800; }
                .pv-settlement-summary small { color: rgba(220, 236, 255, .64); }

                .pv-settlement-actions {
                    position: relative;
                    display: flex;
                    justify-content: center;
                    gap: 9px;
                    flex-wrap: wrap;
                    margin-top: 16px;
                }

                .pv-settlement-actions button {
                    min-height: 42px;
                    padding: 9px 14px;
                    border-radius: 12px;
                    font-weight: 850;
                    cursor: pointer;
                }

                .pv-settlement-replay {
                    border: 1px solid rgba(146, 205, 255, .4);
                    color: #e7f4ff;
                    background: rgba(255,255,255,.08);
                }

                .pv-settlement-continue {
                    border: 1px solid rgba(133, 239, 191, .68);
                    color: #062a22;
                    background: linear-gradient(135deg, #9dffd0, #48dca2);
                    box-shadow: 0 8px 20px rgba(49, 219, 153, .2);
                }

                .pv-settlement-support-note {
                    position: relative;
                    display: block;
                    margin-top: 12px;
                    color: rgba(220, 236, 255, .5);
                }

                @keyframes pv-settlement-fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes pv-gift-card-in {
                    from { opacity: 0; transform: translateY(22px) scale(.84); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes pv-gift-box-pop {
                    0% { opacity: 0; transform: translateX(-50%) scale(.45); }
                    65% { opacity: 1; transform: translateX(-50%) scale(1.08); }
                    100% { opacity: 1; transform: translateX(-50%) scale(1); }
                }
                @keyframes pv-gift-lid-pop {
                    0% { opacity: 0; transform: translate(-50%, 26px) rotate(0); }
                    35% { opacity: 1; }
                    100% { opacity: 1; transform: translate(-58%, -64px) rotate(-17deg); }
                }
                @keyframes pv-gift-glow {
                    from { opacity: .45; transform: translateX(-50%) scale(.85); }
                    to { opacity: .9; transform: translateX(-50%) scale(1.1); }
                }
                @keyframes pv-confetti-burst {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(.35) rotate(0); }
                    12% { opacity: 1; }
                    100% { opacity: 0; transform: translate(var(--confetti-x), var(--confetti-y)) scale(1) rotate(var(--confetti-r)); }
                }

                @media (prefers-reduced-motion: reduce) {
                    .pv-settlement-backdrop,
                    .pv-settlement-card,
                    .pv-gift-box,
                    .pv-gift-lid,
                    .pv-gift-glow,
                    .pv-settlement-confetti { animation: none; }
                    .pv-settlement-card,
                    .pv-gift-box { opacity: 1; }
                    .pv-gift-lid { opacity: 1; transform: translateX(-50%); }
                }

                @media (max-width: 420px) {
                    .pv-settlement-card { padding: 20px 16px 17px; border-radius: 22px; }
                    .pv-gift-scene { height: 166px; transform: scale(.92); margin-bottom: -7px; }
                    .pv-settlement-actions button { flex: 1 1 145px; }
                }
            `}</style>
        </>
    );
}
