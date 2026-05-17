//import React, { useEffect, useState } from 'react';
//import QRCode from 'qrcode';
//import { saveAs } from 'file-saver';

///**
// * Props expected from the transaction context
// */
//export interface QRCodeDisplayProps {
//    businessName: string;
//    accountNumber: string;
//    bankName: string;
//    amount: number;
//    description: string;
//}

///**
// * QRCodeDisplay
// * ---------------------------------------------------------
// * SRP: Generates and displays a downloadable QR code image.
// * DRY: QR content generation and image blob logic are centralized.
// * Loose Coupling: Receives all props externally (no global state).
// */
//const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
//    businessName,
//    accountNumber,
//    bankName,
//    amount,
//    description
//}) => {
//    const [qrUrl, setQrUrl] = useState<string>('');
//    const [qrBlob, setQrBlob] = useState<Blob | null>(null);

//    /**
//     * Generate QR code when input values change
//     */
//    useEffect(() => {
//        const generateQR = async () => {
//            const qrPayload = {
//                businessName,
//                accountNumber: '****' + accountNumber.slice(-4),
//                bankName,
//                amount,
//                description
//            };

//            const qrString = JSON.stringify(qrPayload);

//            try {
//                // Generate data URL for on-screen display
//                const url = await QRCode.toDataURL(qrString);
//                setQrUrl(url);

//                // Generate binary blob for file download
//                const buffer = await QRCode.toBuffer(qrString);
//                const blob = new Blob([buffer], { type: 'image/png' });
//                setQrBlob(blob);
//            } catch (err) {
//                console.error('QR generation error', err);
//            }
//        };

//        generateQR();
//    }, [businessName, accountNumber, bankName, amount, description]);

//    /**
//     * Download the QR code as PNG
//     */
//    const handleDownload = () => {
//        if (qrBlob) {
//            saveAs(qrBlob, `PayVerify-QR-${Date.now()}.png`);
//        }
//    };

//    return (
//        <div className="mt-4 p-3 border rounded shadow-sm text-center">
//            <h5>Generated QR Code</h5>
//            {qrUrl && (
//                <>
//                    <img src={qrUrl} alt="QR Code" className="img-fluid my-3" />
//                    <button className="btn btn-outline-primary" onClick={handleDownload}>
//                        Download QR Code
//                    </button>
//                </>
//            )}
//        </div>
//    );
//};

//export default QRCodeDisplay;


// src/components/QrDisplay.tsx
// -------------------------------------------------------------
// What changed & why
// - ❌ REMOVED: QRCode.toBuffer(...) — returns a Node Buffer, which
//   isn't a valid BlobPart in the browser (caused the TS error).
// - ✅ NOW: Generate a data URL with QRCode.toDataURL(...), then
//   convert that data URL to a Blob using fetch(...).blob() — this
//   is browser-safe and typed correctly.
// - ✅ Added small guards and error handling to keep UX smooth.
// - ✅ Kept API surface (props + save button) the same.
// -------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver'; // make sure @types/file-saver is installed

/**
 * Props expected from the transaction context
 */
export interface QRCodeDisplayProps {
    businessName: string;
    accountNumber: string;
    bankName: string;
    amount: number;
    description: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
    businessName,
    accountNumber,
    bankName,
    amount,
    description,
}) => {
    const [qrUrl, setQrUrl] = useState<string>('');   // Data URL for onscreen display
    const [qrBlob, setQrBlob] = useState<Blob | null>(null); // Blob for download
    const [loading, setLoading] = useState<boolean>(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const generateQR = async () => {
            setLoading(true);
            setErr(null);

            try {
                // Build a minimal payload to encode
                const payload = {
                    businessName,
                    // Mask most of the account number for display/safety
                    accountNumber: accountNumber ? '****' + accountNumber.slice(-4) : '',
                    bankName,
                    amount,
                    description,
                };

                const qrString = JSON.stringify(payload);

                // ✅ Browser-safe generation for display
                const dataUrl = await QRCode.toDataURL(qrString);

                if (cancelled) return;
                setQrUrl(dataUrl);

                // ✅ Convert the data URL to a Blob (works in browsers)
                //    We cannot rely on Node Buffer in a browser; this avoids the TS error.
                const blob = await (await fetch(dataUrl)).blob();

                if (cancelled) return;
                setQrBlob(blob);
            } catch (e) {
                console.error('QR generation error', e);
                if (!cancelled) setErr('Failed to generate QR code.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        generateQR();
        return () => {
            cancelled = true;
        };
        // Recompute whenever inputs change
    }, [businessName, accountNumber, bankName, amount, description]);

    const handleDownload = () => {
        if (!qrBlob) return;
        // Save as PNG using file-saver
        saveAs(qrBlob, `PayVerify-QR-${Date.now()}.png`);
    };

    return (
        <div className="mt-4 p-3 border rounded shadow-sm text-center">
            <h5>Generated QR Code</h5>

            {loading && <p className="text-muted">Generating…</p>}
            {err && <p className="text-danger">{err}</p>}

            {/* Show QR image once ready */}
            {qrUrl && !loading && !err && (
                <>
                    <img
                        src={qrUrl}
                        alt="QR Code"
                        className="img-fluid my-3"
                        style={{ maxWidth: 280 }}
                    />

                    <div className="d-flex gap-2 justify-content-center">
                        <button
                            className="btn btn-outline-primary"
                            onClick={handleDownload}
                            disabled={!qrBlob}
                            title={!qrBlob ? 'Please wait for the QR to finish rendering' : 'Download PNG'}
                        >
                            Download QR Code
                        </button>

                        {/* Optional: Copy raw payload URL to clipboard for quick sharing/debug */}
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => qrUrl && navigator.clipboard.writeText(qrUrl)}
                            disabled={!qrUrl}
                            title={!qrUrl ? 'Please wait for the QR to finish rendering' : 'Copy Data URL to clipboard'}
                        >
                            Copy Data URL
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default QRCodeDisplay;
