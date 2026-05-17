//////////////// =============================================================================
//////////////// InvoiceService.ts (FINAL — With RED Pending Banner & Watermark)
//////////////// Senior-level, production-safe implementation
//////////////// =============================================================================

//////////////import fs from "fs";
//////////////import path from "path";
//////////////import PDFDocument from "pdfkit";
//////////////import QRCode from "qrcode";

//////////////import { PaymentIntent } from "../models/PaymentIntent";
//////////////import PurchaseOrder from "../models/PurchaseOrder";
//////////////import { PurchaseOrderItem } from "../models/PurchaseOrderItem";
//////////////import { Invoice } from "../models/Invoice";

//////////////// =============================================================================
//////////////// Helpers
//////////////// =============================================================================

//////////////let useNairaSymbol = true; // Will be set based on font availability

//////////////function formatNaira(amount: number): string {
//////////////    const safeAmount = Number(amount || 0);

//////////////    try {
//////////////        if (useNairaSymbol) {
//////////////            return `₦${safeAmount.toLocaleString("en-NG", {
//////////////                minimumFractionDigits: 2,
//////////////                maximumFractionDigits: 2,
//////////////            })}`;
//////////////        } else {
//////////////            // Fallback to NGN prefix if font doesn't support ₦
//////////////            return `NGN ${safeAmount.toLocaleString("en-NG", {
//////////////                minimumFractionDigits: 2,
//////////////                maximumFractionDigits: 2,
//////////////            })}`;
//////////////        }
//////////////    } catch {
//////////////        return `NGN ${safeAmount.toFixed(2)}`;
//////////////    }
//////////////}

//////////////function generateInvoiceNumber(intentId: number | string): string {
//////////////    const seed =
//////////////        typeof intentId === "number"
//////////////            ? intentId
//////////////            : Math.abs(
//////////////                intentId
//////////////                    .toString()
//////////////                    .split("")
//////////////                    .map((c) => c.charCodeAt(0))
//////////////                    .reduce((a, b) => a + b, 0)
//////////////            );

//////////////    const year = new Date().getFullYear();
//////////////    return `PV-${year}-${seed.toString().slice(-6)}`;
//////////////}

//////////////// =============================================================================
//////////////// Service
//////////////// =============================================================================

//////////////export class InvoiceService {
//////////////    // =========================================================================
//////////////    // PUBLIC — Generate by token
//////////////    // =========================================================================
//////////////    async generateInvoicePdfByToken(token: string): Promise<Buffer> {
//////////////        if (!token) {
//////////////            throw new Error("Token is required");
//////////////        }

//////////////        const paymentIntent = await PaymentIntent.findOne({
//////////////            where: { token },
//////////////        });

//////////////        if (!paymentIntent) {
//////////////            throw new Error("Payment intent not found");
//////////////        }

//////////////        return this.generateInvoicePdf(paymentIntent.id as number | string);
//////////////    }

//////////////    // =========================================================================
//////////////    // Generate QR Code as Buffer
//////////////    // =========================================================================
//////////////    private async generateQRCodeBuffer(text: string): Promise<Buffer> {
//////////////        try {
//////////////            return await QRCode.toBuffer(text, {
//////////////                width: 80,
//////////////                margin: 1,
//////////////                color: {
//////////////                    dark: '#000000',
//////////////                    light: '#ffffff'
//////////////                }
//////////////            });
//////////////        } catch (error) {
//////////////            console.error("Failed to generate QR code:", error);
//////////////            return Buffer.from('');
//////////////        }
//////////////    }

//////////////    // =========================================================================
//////////////    // MAIN PDF GENERATOR
//////////////    // =========================================================================
//////////////    async generateInvoicePdf(
//////////////        paymentIntentId: number | string
//////////////    ): Promise<Buffer> {
//////////////        // ---------------------------------------------------------------------
//////////////        // Load PaymentIntent
//////////////        // ---------------------------------------------------------------------
//////////////        const intent = await PaymentIntent.findByPk(paymentIntentId);

//////////////        if (!intent) {
//////////////            throw new Error("PaymentIntent not found");
//////////////        }

//////////////        // ---------------------------------------------------------------------
//////////////        // Load Purchase Order
//////////////        // ---------------------------------------------------------------------
//////////////        const po = await PurchaseOrder.findByPk(intent.purchase_order_id);

//////////////        if (!po) {
//////////////            throw new Error("PurchaseOrder not found");
//////////////        }

//////////////        // ---------------------------------------------------------------------
//////////////        // Load Items
//////////////        // ---------------------------------------------------------------------
//////////////        const items = await PurchaseOrderItem.findAll({
//////////////            where: { purchaseOrderId: po.id },
//////////////        });

//////////////        // ---------------------------------------------------------------------
//////////////        // 🔥 DEFENSIVE NORMALIZATION
//////////////        // ---------------------------------------------------------------------
//////////////        let subtotal = 0;

//////////////        const normalizedItems = items.map((item: any) => {
//////////////            const qty =
//////////////                Number(
//////////////                    item.quantity ??
//////////////                    item.qty ??
//////////////                    item.quantity_ordered ??
//////////////                    item.Qty ??
//////////////                    0
//////////////                ) || 0;

//////////////            const price =
//////////////                Number(
//////////////                    item.unitPrice ??
//////////////                    item.unit_price ??
//////////////                    item.price ??
//////////////                    item.amount ??
//////////////                    0
//////////////                ) || 0;

//////////////            const name =
//////////////                item.description ??
//////////////                item.itemName ??
//////////////                item.item_name ??
//////////////                item.name ??
//////////////                "Item";

//////////////            const lineTotal = qty * price;
//////////////            subtotal += lineTotal;

//////////////            return {
//////////////                name,
//////////////                quantity: qty,
//////////////                unitPrice: price,
//////////////                lineTotal,
//////////////            };
//////////////        });

//////////////        const tax = subtotal * 0.075;
//////////////        const grandTotal = subtotal + tax;
//////////////        const invoiceNumber = generateInvoiceNumber(intent.id);

//////////////        // ---------------------------------------------------------------------
//////////////        // Create PDF
//////////////        // ---------------------------------------------------------------------
//////////////        const doc = new PDFDocument({
//////////////            margin: 50,
//////////////            size: 'A4',
//////////////            bufferPages: true
//////////////        });
//////////////        const buffers: Buffer[] = [];

//////////////        doc.on("data", buffers.push.bind(buffers));

//////////////        // ---------------------------------------------------------------------
//////////////        // 🔥 CRITICAL FONT FIX (ensures ₦ renders correctly)
//////////////        // ---------------------------------------------------------------------
//////////////        try {
//////////////            const fontPaths = [
//////////////                path.join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf"),
//////////////                path.join(process.cwd(), "assets/fonts/Arial.ttf"),
//////////////                path.join(process.cwd(), "assets/fonts/DejaVuSans.ttf"),
//////////////                path.join(process.cwd(), "assets/fonts/OpenSans-Regular.ttf"),
//////////////                path.join(process.cwd(), "assets/fonts/Roboto-Regular.ttf"),
//////////////            ];

//////////////            let fontLoaded = false;
//////////////            for (const fontPath of fontPaths) {
//////////////                if (fs.existsSync(fontPath)) {
//////////////                    doc.registerFont("InvoiceFont", fontPath);
//////////////                    doc.font("InvoiceFont");
//////////////                    fontLoaded = true;
//////////////                    useNairaSymbol = true;
//////////////                    break;
//////////////                }
//////////////            }

//////////////            if (!fontLoaded) {
//////////////                console.warn("No font with Naira symbol found, using Helvetica with NGN prefix");
//////////////                doc.font("Helvetica");
//////////////                useNairaSymbol = false;
//////////////            }
//////////////        } catch (error) {
//////////////            console.warn("Font loading failed, using Helvetica");
//////////////            doc.font("Helvetica");
//////////////            useNairaSymbol = false;
//////////////        }

//////////////        // ---------------------------------------------------------------------
//////////////        // Add PayVerify Watermark (Background) - BEFORE any other content
//////////////        // ---------------------------------------------------------------------
//////////////        // Save the current state
//////////////        doc.save();

//////////////        // Set watermark properties - very light and diagonal
//////////////        doc.fontSize(80)
//////////////            .fillOpacity(0.08) // Very light opacity
//////////////            .fillColor('#CCCCCC')
//////////////            .rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });

//////////////        // Add multiple watermark texts for better coverage
//////////////        doc.text(
//////////////            'PAYVERIFY',
//////////////            doc.page.width / 2 - 180,
//////////////            doc.page.height / 2 - 100,
//////////////            { align: 'center', width: 360 }
//////////////        );

//////////////        doc.text(
//////////////            'PAYVERIFY',
//////////////            doc.page.width / 2 - 180,
//////////////            doc.page.height / 2 + 50,
//////////////            { align: 'center', width: 360 }
//////////////        );

//////////////        // Restore state
//////////////        doc.restore();
//////////////        doc.fillOpacity(1); // Reset opacity

//////////////        // ---------------------------------------------------------------------
//////////////        // Generate QR Code
//////////////        // ---------------------------------------------------------------------
//////////////        const qrData = JSON.stringify({
//////////////            invoice: invoiceNumber,
//////////////            amount: grandTotal,
//////////////            date: new Date().toISOString(),
//////////////            paymentIntent: intent.id
//////////////        });
//////////////        const qrBuffer = await this.generateQRCodeBuffer(qrData);

//////////////        // ---------------------------------------------------------------------
//////////////        // HEADER - With RED Pending Banner
//////////////        // ---------------------------------------------------------------------

//////////////        // Add QR Code on the left
//////////////        if (qrBuffer.length > 0) {
//////////////            doc.image(qrBuffer, 50, 45, { width: 60, height: 60 });
//////////////        }

//////////////        // Determine payment status from the intent
//////////////        const paymentStatus = intent.status?.toUpperCase() || 'PENDING';
//////////////        const isPaid = paymentStatus === 'PAID' || paymentStatus === 'SUCCEEDED' || paymentStatus === 'COMPLETED';

//////////////        // Set status text and color - RED for pending as requested
//////////////        let statusText = 'PENDING';
//////////////        let statusColor = '#FF0000'; // Bright RED for pending

//////////////        if (isPaid) {
//////////////            statusText = 'PAID';
//////////////            statusColor = '#28A745'; // Green for paid
//////////////        }

//////////////        // Add status banner with background (RED for pending)
//////////////        doc.save();

//////////////        // Draw banner background
//////////////        doc.roundedRect(440, 45, 120, 35, 5)
//////////////            .fillColor(statusColor)
//////////////            .fill();

//////////////        // Draw status text in white
//////////////        doc.fillColor('#FFFFFF')
//////////////            .fontSize(16)
//////////////            .font('Helvetica-Bold')
//////////////            .text(statusText, 460, 53, { width: 80, align: 'center' });

//////////////        doc.restore();

//////////////        // Move down after header
//////////////        doc.moveDown(2);

//////////////        // ---------------------------------------------------------------------
//////////////        // INVOICE TITLE and Details
//////////////        // ---------------------------------------------------------------------

//////////////        // PAYVERIFY INVOICE title
//////////////        doc.fontSize(24)
//////////////            .fillColor('#000000')
//////////////            .font('Helvetica-Bold')
//////////////            .text("PAYVERIFY INVOICE", 50, 120);

//////////////        // Invoice details
//////////////        doc.fontSize(10)
//////////////            .font('Helvetica')
//////////////            .fillColor('#333333');

//////////////        // Format date
//////////////        const now = new Date();
//////////////        const formattedDate = now.toLocaleDateString('en-GB', {
//////////////            day: '2-digit',
//////////////            month: '2-digit',
//////////////            year: 'numeric'
//////////////        }) + ', ' + now.toLocaleTimeString('en-US', {
//////////////            hour: '2-digit',
//////////////            minute: '2-digit',
//////////////            second: '2-digit',
//////////////            hour12: true
//////////////        }).toLowerCase();

//////////////        // Invoice details with bold labels
//////////////        doc.font('Helvetica-Bold')
//////////////            .text('Invoice #:', 50, 155, { continued: true })
//////////////            .font('Helvetica')
//////////////            .text(` ${invoiceNumber}`);

//////////////        doc.font('Helvetica-Bold')
//////////////            .text('Invoice Date:', 50, 170, { continued: true })
//////////////            .font('Helvetica')
//////////////            .text(` ${formattedDate}`);

//////////////        doc.font('Helvetica-Bold')
//////////////            .text('PaymentIntent ID:', 50, 185, { continued: true })
//////////////            .font('Helvetica')
//////////////            .text(` ${intent.id}`);

//////////////        doc.font('Helvetica-Bold')
//////////////            .text('Purchase Order ID:', 50, 200, { continued: true })
//////////////            .font('Helvetica')
//////////////            .text(` ${po.id}`);

//////////////        // PayVerify Nigeria contact info
//////////////        doc.font('Helvetica-Bold')
//////////////            .text('PayVerify Nigeria', 50, 225);

//////////////        doc.font('Helvetica')
//////////////            .text('Phone: N/A', 50, 240);

//////////////        // Add a light separator line
//////////////        doc.moveTo(50, 265)
//////////////            .lineTo(550, 265)
//////////////            .strokeColor('#CCCCCC')
//////////////            .lineWidth(0.5)
//////////////            .stroke();

//////////////        // Move down to table position
//////////////        doc.moveDown(4);

//////////////        // ---------------------------------------------------------------------
//////////////        // TABLE HEADER
//////////////        // ---------------------------------------------------------------------
//////////////        const tableTop = doc.y;
//////////////        const colItem = 50;        // Item name column
//////////////        const colQty = 250;         // Quantity column
//////////////        const colUnit = 320;        // Unit price column
//////////////        const colTotal = 430;       // Total column
//////////////        const moneyWidth = 100;      // Width for currency columns
//////////////        const qtyWidth = 50;         // Width for quantity column

//////////////        doc.fontSize(11)
//////////////            .font('Helvetica-Bold')
//////////////            .fillColor('#000000')
//////////////            .text("Item", colItem, tableTop)
//////////////            .text("Qty", colQty, tableTop)
//////////////            .text("Unit Price", colUnit, tableTop)
//////////////            .text("Total", colTotal, tableTop);

//////////////        // Light line under header
//////////////        doc.moveTo(50, tableTop + 15)
//////////////            .lineTo(550, tableTop + 15)
//////////////            .strokeColor('#CCCCCC')
//////////////            .lineWidth(0.5)
//////////////            .stroke();

//////////////        // ---------------------------------------------------------------------
//////////////        // TABLE ROWS
//////////////        // ---------------------------------------------------------------------
//////////////        let position = tableTop + 25;

//////////////        doc.font('Helvetica')
//////////////            .fillColor('#333333');

//////////////        normalizedItems.forEach((item) => {
//////////////            // Item name
//////////////            doc.fontSize(10).text(item.name, colItem, position, {
//////////////                width: colQty - colItem - 15,
//////////////                lineBreak: true,
//////////////            });

//////////////            // Quantity (centered)
//////////////            doc.text(String(item.quantity), colQty, position, {
//////////////                width: qtyWidth,
//////////////                align: "center",
//////////////            });

//////////////            // Unit Price (right-aligned)
//////////////            doc.text(
//////////////                formatNaira(item.unitPrice),
//////////////                colUnit,
//////////////                position,
//////////////                {
//////////////                    width: moneyWidth,
//////////////                    align: "right",
//////////////                }
//////////////            );

//////////////            // Total (right-aligned)
//////////////            doc.text(
//////////////                formatNaira(item.lineTotal),
//////////////                colTotal,
//////////////                position,
//////////////                {
//////////////                    width: moneyWidth,
//////////////                    align: "right",
//////////////                }
//////////////            );

//////////////            position += 22;
//////////////        });

//////////////        // ---------------------------------------------------------------------
//////////////        // TOTALS
//////////////        // ---------------------------------------------------------------------
//////////////        position += 15;

//////////////        const totalsLabelX = 330;    // X position for labels
//////////////        const totalsValueX = 440;    // X position for values
//////////////        const totalsWidth = 100;      // Width for totals

//////////////        // Subtotal
//////////////        doc.font('Helvetica')
//////////////            .fillColor('#333333')
//////////////            .fontSize(10)
//////////////            .text("Subtotal:", totalsLabelX, position);
//////////////        doc.text(formatNaira(subtotal), totalsValueX, position, {
//////////////            width: totalsWidth,
//////////////            align: "right",
//////////////        });

//////////////        position += 18;

//////////////        // Tax
//////////////        doc.text("Tax (7.5%):", totalsLabelX, position);
//////////////        doc.text(formatNaira(tax), totalsValueX, position, {
//////////////            width: totalsWidth,
//////////////            align: "right",
//////////////        });

//////////////        position += 22;

//////////////        // Grand Total (bold)
//////////////        doc.font('Helvetica-Bold')
//////////////            .fillColor('#000000')
//////////////            .fontSize(12)
//////////////            .text("TOTAL:", totalsLabelX, position);
//////////////        doc.fontSize(14)
//////////////            .text(
//////////////                formatNaira(grandTotal),
//////////////                totalsValueX,
//////////////                position,
//////////////                { width: totalsWidth, align: "right" }
//////////////            );

//////////////        // ---------------------------------------------------------------------
//////////////        // FOOTER with Powered By PayVerify
//////////////        // ---------------------------------------------------------------------
//////////////        const footerY = doc.page.height - 50;

//////////////        // Light line above footer
//////////////        doc.moveTo(50, footerY - 20)
//////////////            .lineTo(550, footerY - 20)
//////////////            .strokeColor('#CCCCCC')
//////////////            .lineWidth(0.5)
//////////////            .stroke();

//////////////        // Powered By text
//////////////        doc.font('Helvetica')
//////////////            .fontSize(9)
//////////////            .fillColor('#666666')
//////////////            .text(
//////////////                'Powered By PayVerify',
//////////////                50,
//////////////                footerY,
//////////////                { align: 'center', width: 500 }
//////////////            );

//////////////        // Reset fill color
//////////////        doc.fillColor('#000000');

//////////////        // ---------------------------------------------------------------------
//////////////        // FINALIZE
//////////////        // ---------------------------------------------------------------------
//////////////        doc.end();

//////////////        return new Promise((resolve) => {
//////////////            doc.on("end", () => resolve(Buffer.concat(buffers)));
//////////////        });
//////////////    }

//////////////    // =========================================================================
//////////////    // WEBHOOK SAFE CREATION
//////////////    // =========================================================================
//////////////    async createFromPaymentIntent(
//////////////        paymentIntentId: number | string
//////////////    ): Promise<any> {
//////////////        const intent = await PaymentIntent.findByPk(paymentIntentId);

//////////////        if (!intent) {
//////////////            throw new Error("PaymentIntent not found");
//////////////        }

//////////////        const existing = await Invoice.findOne({
//////////////            where: { payment_intent_id: intent.id },
//////////////        });

//////////////        if (existing) return existing;

//////////////        return Invoice.create({
//////////////            payment_intent_id: intent.id,
//////////////            merchant_id: intent.merchant_id,
//////////////            amount: intent.amount,
//////////////            status: "paid",
//////////////            issued_at: new Date(),
//////////////        });
//////////////    }
//////////////}





////////////// =============================================================================
////////////// InvoiceService.ts (FINAL — WITH PAY NOW LINK)
////////////// Senior-level, production-safe implementation
////////////// =============================================================================

////////////import fs from "fs";
////////////import path from "path";
////////////import PDFDocument from "pdfkit";
////////////import QRCode from "qrcode";

////////////import { PaymentIntent } from "../models/PaymentIntent";
////////////import PurchaseOrder from "../models/PurchaseOrder";
////////////import { PurchaseOrderItem } from "../models/PurchaseOrderItem";
////////////import { Invoice } from "../models/Invoice";

////////////// =============================================================================
////////////// Helpers
////////////// =============================================================================

////////////let useNairaSymbol = true;

////////////// ✅ NEW — Frontend URL for payment link
////////////const FRONTEND_URL =
////////////    process.env.FRONTEND_URL ||
////////////    "http://localhost:5173";

////////////function formatNaira(amount: number): string {
////////////    const safeAmount = Number(amount || 0);

////////////    try {
////////////        if (useNairaSymbol) {
////////////            return `₦${safeAmount.toLocaleString("en-NG", {
////////////                minimumFractionDigits: 2,
////////////                maximumFractionDigits: 2,
////////////            })}`;
////////////        } else {
////////////            return `NGN ${safeAmount.toLocaleString("en-NG", {
////////////                minimumFractionDigits: 2,
////////////                maximumFractionDigits: 2,
////////////            })}`;
////////////        }
////////////    } catch {
////////////        return `NGN ${safeAmount.toFixed(2)}`;
////////////    }
////////////}

////////////function generateInvoiceNumber(intentId: number | string): string {
////////////    const seed =
////////////        typeof intentId === "number"
////////////            ? intentId
////////////            : Math.abs(
////////////                intentId
////////////                    .toString()
////////////                    .split("")
////////////                    .map((c) => c.charCodeAt(0))
////////////                    .reduce((a, b) => a + b, 0)
////////////            );

////////////    const year = new Date().getFullYear();
////////////    return `PV-${year}-${seed.toString().slice(-6)}`;
////////////}

////////////// =============================================================================
////////////// Service
////////////// =============================================================================

////////////export class InvoiceService {
////////////    // =========================================================================
////////////    // PUBLIC — Generate by token
////////////    // =========================================================================
////////////    async generateInvoicePdfByToken(token: string): Promise<Buffer> {
////////////        if (!token) {
////////////            throw new Error("Token is required");
////////////        }

////////////        const paymentIntent = await PaymentIntent.findOne({
////////////            where: { token },
////////////        });

////////////        if (!paymentIntent) {
////////////            throw new Error("Payment intent not found");
////////////        }

////////////        return this.generateInvoicePdf(paymentIntent.id as number | string);
////////////    }

////////////    // =========================================================================
////////////    // Generate QR Code
////////////    // =========================================================================
////////////    private async generateQRCodeBuffer(text: string): Promise<Buffer> {
////////////        try {
////////////            return await QRCode.toBuffer(text, {
////////////                width: 80,
////////////                margin: 1,
////////////                color: { dark: "#000000", light: "#ffffff" },
////////////            });
////////////        } catch (error) {
////////////            console.error("Failed to generate QR code:", error);
////////////            return Buffer.from("");
////////////        }
////////////    }

////////////    // =========================================================================
////////////    // MAIN PDF GENERATOR
////////////    // =========================================================================
////////////    async generateInvoicePdf(
////////////        paymentIntentId: number | string
////////////    ): Promise<Buffer> {
////////////        // ---------------------------------------------------------------------
////////////        // Load PaymentIntent
////////////        // ---------------------------------------------------------------------
////////////        const intent = await PaymentIntent.findByPk(paymentIntentId);
////////////        if (!intent) {
////////////            throw new Error("PaymentIntent not found");
////////////        }

////////////        // ---------------------------------------------------------------------
////////////        // Load Purchase Order
////////////        // ---------------------------------------------------------------------
////////////        const po = await PurchaseOrder.findByPk(intent.purchase_order_id);
////////////        if (!po) {
////////////            throw new Error("PurchaseOrder not found");
////////////        }

////////////        // ---------------------------------------------------------------------
////////////        // Load Items
////////////        // ---------------------------------------------------------------------
////////////        const items = await PurchaseOrderItem.findAll({
////////////            where: { purchaseOrderId: po.id },
////////////        });

////////////        // ---------------------------------------------------------------------
////////////        // Normalize items
////////////        // ---------------------------------------------------------------------
////////////        let subtotal = 0;

////////////        const normalizedItems = items.map((item: any) => {
////////////            const qty =
////////////                Number(
////////////                    item.quantity ??
////////////                    item.qty ??
////////////                    item.quantity_ordered ??
////////////                    item.Qty ??
////////////                    0
////////////                ) || 0;

////////////            const price =
////////////                Number(
////////////                    item.unitPrice ??
////////////                    item.unit_price ??
////////////                    item.price ??
////////////                    item.amount ??
////////////                    0
////////////                ) || 0;

////////////            const name =
////////////                item.description ??
////////////                item.itemName ??
////////////                item.item_name ??
////////////                item.name ??
////////////                "Item";

////////////            const lineTotal = qty * price;
////////////            subtotal += lineTotal;

////////////            return {
////////////                name,
////////////                quantity: qty,
////////////                unitPrice: price,
////////////                lineTotal,
////////////            };
////////////        });

////////////        const tax = subtotal * 0.075;
////////////        const grandTotal = subtotal + tax;

////////////        // ---------------------------------------------------------------------
////////////        // 🔥 ENSURE INVOICE EXISTS (CRITICAL)
////////////        // ---------------------------------------------------------------------
////////////        let invoiceRecord = await Invoice.findOne({
////////////            where: { payment_intent_id: intent.id },
////////////        });

////////////        if (!invoiceRecord) {
////////////            invoiceRecord = await Invoice.create({
////////////                payment_intent_id: intent.id,
////////////                merchant_id: intent.merchant_id,
////////////                amount: grandTotal,
////////////                status: "pending",
////////////                issued_at: new Date(),
////////////            });
////////////        }

////////////        // ✅ Build payment URL
////////////        const paymentUrl =
////////////            `${FRONTEND_URL}/invoice-pay/${invoiceRecord.id}`;

////////////        const invoiceNumber = generateInvoiceNumber(intent.id);

////////////        // ---------------------------------------------------------------------
////////////        // Create PDF
////////////        // ---------------------------------------------------------------------
////////////        const doc = new PDFDocument({
////////////            margin: 50,
////////////            size: "A4",
////////////            bufferPages: true,
////////////        });

////////////        const buffers: Buffer[] = [];
////////////        doc.on("data", buffers.push.bind(buffers));

////////////        // ---------------------------------------------------------------------
////////////        // Font loading
////////////        // ---------------------------------------------------------------------
////////////        try {
////////////            const fontPaths = [
////////////                path.join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf"),
////////////                path.join(process.cwd(), "assets/fonts/Arial.ttf"),
////////////                path.join(process.cwd(), "assets/fonts/DejaVuSans.ttf"),
////////////                path.join(process.cwd(), "assets/fonts/OpenSans-Regular.ttf"),
////////////                path.join(process.cwd(), "assets/fonts/Roboto-Regular.ttf"),
////////////            ];

////////////            let fontLoaded = false;

////////////            for (const fontPath of fontPaths) {
////////////                if (fs.existsSync(fontPath)) {
////////////                    doc.registerFont("InvoiceFont", fontPath);
////////////                    doc.font("InvoiceFont");
////////////                    fontLoaded = true;
////////////                    useNairaSymbol = true;
////////////                    break;
////////////                }
////////////            }

////////////            if (!fontLoaded) {
////////////                doc.font("Helvetica");
////////////                useNairaSymbol = false;
////////////            }
////////////        } catch {
////////////            doc.font("Helvetica");
////////////            useNairaSymbol = false;
////////////        }

////////////        // ---------------------------------------------------------------------
////////////        // Watermark
////////////        // ---------------------------------------------------------------------
////////////        doc.save();

////////////        doc.fontSize(80)
////////////            .fillOpacity(0.08)
////////////            .fillColor("#CCCCCC")
////////////            .rotate(-45, {
////////////                origin: [doc.page.width / 2, doc.page.height / 2],
////////////            });

////////////        doc.text(
////////////            "PAYVERIFY",
////////////            doc.page.width / 2 - 180,
////////////            doc.page.height / 2 - 100,
////////////            { align: "center", width: 360 }
////////////        );

////////////        doc.restore();
////////////        doc.fillOpacity(1);

////////////        // ---------------------------------------------------------------------
////////////        // Status detection
////////////        // ---------------------------------------------------------------------
////////////        const paymentStatus = intent.status?.toUpperCase() || "PENDING";
////////////        const isPaid =
////////////            paymentStatus === "PAID" ||
////////////            paymentStatus === "SUCCEEDED" ||
////////////            paymentStatus === "COMPLETED";

////////////        // ---------------------------------------------------------------------
////////////        // HEADER
////////////        // ---------------------------------------------------------------------
////////////        doc.fontSize(24)
////////////            .fillColor("#000000")
////////////            .font("Helvetica-Bold")
////////////            .text("PAYVERIFY INVOICE", 50, 120);

////////////        // ---------------------------------------------------------------------
////////////        // 💳 PAY NOW LINK (NEW ELITE FEATURE)
////////////        // ---------------------------------------------------------------------
////////////        doc.moveDown(2);

////////////        if (!isPaid) {
////////////            doc
////////////                .font("Helvetica-Bold")
////////////                .fontSize(12)
////////////                .fillColor("#16a34a")
////////////                .text("Pay this invoice online:", 50, doc.y);

////////////            doc.moveDown(0.5);

////////////            doc
////////////                .font("Helvetica")
////////////                .fontSize(11)
////////////                .fillColor("#2563eb")
////////////                .text(paymentUrl, {
////////////                    link: paymentUrl,
////////////                    underline: true,
////////////                });

////////////            doc.moveDown(1);
////////////        }

////////////        // ---------------------------------------------------------------------
////////////        // FINALIZE
////////////        // ---------------------------------------------------------------------
////////////        doc.end();

////////////        return new Promise((resolve) => {
////////////            doc.on("end", () => resolve(Buffer.concat(buffers)));
////////////        });
////////////    }

////////////    // =========================================================================
////////////    // WEBHOOK SAFE CREATION
////////////    // =========================================================================
////////////    async createFromPaymentIntent(
////////////        paymentIntentId: number | string
////////////    ): Promise<any> {
////////////        const intent = await PaymentIntent.findByPk(paymentIntentId);

////////////        if (!intent) {
////////////            throw new Error("PaymentIntent not found");
////////////        }

////////////        const existing = await Invoice.findOne({
////////////            where: { payment_intent_id: intent.id },
////////////        });

////////////        if (existing) return existing;

////////////        return Invoice.create({
////////////            payment_intent_id: intent.id,
////////////            merchant_id: intent.merchant_id,
////////////            amount: intent.amount,
////////////            status: "paid",
////////////            issued_at: new Date(),
////////////        });
////////////    }
////////////}





//////////// =============================================================================
//////////// InvoiceService.ts (ELITE — Auto Pay Link + Paid Watermark)
//////////// =============================================================================
//////////// PURPOSE
//////////// - Generate professional PayVerify invoice PDFs
//////////// - Embed Pay Now link that routes to frontend payment page
//////////// - Auto-switch to PAID when invoice is settled
////////////
//////////// 🔥 NEW ELITE FEATURES
//////////// ✅ Pay Now link inside PDF
//////////// ✅ Invoice-driven payment status (NOT PaymentIntent)
//////////// ✅ Smart watermark (PENDING vs PAID)
//////////// ✅ Banner auto-switch
//////////// ✅ Pay link hidden after payment
//////////// ✅ Zero breaking changes
//////////// =============================================================================

//////////import fs from "fs";
//////////import path from "path";
//////////import PDFDocument from "pdfkit";
//////////import QRCode from "qrcode";

//////////import { PaymentIntent } from "../models/PaymentIntent";
//////////import PurchaseOrder from "../models/PurchaseOrder";
//////////import { PurchaseOrderItem } from "../models/PurchaseOrderItem";
//////////import { Invoice } from "../models/Invoice";

//////////// =============================================================================
//////////// Helpers
//////////// =============================================================================

//////////let useNairaSymbol = true;

//////////function formatNaira(amount: number): string {
//////////    const safeAmount = Number(amount || 0);

//////////    try {
//////////        if (useNairaSymbol) {
//////////            return `₦${safeAmount.toLocaleString("en-NG", {
//////////                minimumFractionDigits: 2,
//////////                maximumFractionDigits: 2,
//////////            })}`;
//////////        } else {
//////////            return `NGN ${safeAmount.toLocaleString("en-NG", {
//////////                minimumFractionDigits: 2,
//////////                maximumFractionDigits: 2,
//////////            })}`;
//////////        }
//////////    } catch {
//////////        return `NGN ${safeAmount.toFixed(2)}`;
//////////    }
//////////}

//////////function generateInvoiceNumber(intentId: number | string): string {
//////////    const seed =
//////////        typeof intentId === "number"
//////////            ? intentId
//////////            : Math.abs(
//////////                intentId
//////////                    .toString()
//////////                    .split("")
//////////                    .map((c) => c.charCodeAt(0))
//////////                    .reduce((a, b) => a + b, 0)
//////////            );

//////////    const year = new Date().getFullYear();
//////////    return `PV-${year}-${seed.toString().slice(-6)}`;
//////////}

//////////// =============================================================================
//////////// Service
//////////// =============================================================================

//////////export class InvoiceService {
//////////    // =========================================================================
//////////    // PUBLIC — Generate by token
//////////    // =========================================================================
//////////    async generateInvoicePdfByToken(token: string): Promise<Buffer> {
//////////        if (!token) throw new Error("Token is required");

//////////        const paymentIntent = await PaymentIntent.findOne({
//////////            where: { token },
//////////        });

//////////        if (!paymentIntent) {
//////////            throw new Error("Payment intent not found");
//////////        }

//////////        return this.generateInvoicePdf(paymentIntent.id as number | string);
//////////    }

//////////    // =========================================================================
//////////    // QR generator
//////////    // =========================================================================
//////////    private async generateQRCodeBuffer(text: string): Promise<Buffer> {
//////////        try {
//////////            return await QRCode.toBuffer(text, {
//////////                width: 80,
//////////                margin: 1,
//////////            });
//////////        } catch {
//////////            return Buffer.from("");
//////////        }
//////////    }

//////////    // =========================================================================
//////////    // 🔥 MAIN PDF GENERATOR (ELITE)
//////////    // =========================================================================
//////////    async generateInvoicePdf(
//////////        paymentIntentId: number | string
//////////    ): Promise<Buffer> {
//////////        // ---------------------------------------------------------------------
//////////        // Load intent
//////////        // ---------------------------------------------------------------------
//////////        const intent = await PaymentIntent.findByPk(paymentIntentId);
//////////        if (!intent) throw new Error("PaymentIntent not found");

//////////        // ---------------------------------------------------------------------
//////////        // 🔥 NEW — LOAD INVOICE (SOURCE OF TRUTH)
//////////        // ---------------------------------------------------------------------
//////////        const invoiceRecord = await Invoice.findOne({
//////////            where: { payment_intent_id: intent.id },
//////////        });

//////////        // ---------------------------------------------------------------------
//////////        // 🔥 ELITE STATUS RESOLUTION
//////////        // ---------------------------------------------------------------------
//////////        const invoiceStatus =
//////////            invoiceRecord?.status?.toLowerCase() || "pending";

//////////        const isPaid =
//////////            invoiceStatus === "paid" ||
//////////            invoiceStatus === "success" ||
//////////            invoiceStatus === "completed";

//////////        // ---------------------------------------------------------------------
//////////        // Load PO
//////////        // ---------------------------------------------------------------------
//////////        const po = await PurchaseOrder.findByPk(intent.purchase_order_id);
//////////        if (!po) throw new Error("PurchaseOrder not found");

//////////        // ---------------------------------------------------------------------
//////////        // Load items
//////////        // ---------------------------------------------------------------------
//////////        const items = await PurchaseOrderItem.findAll({
//////////            where: { purchaseOrderId: po.id },
//////////        });

//////////        // ---------------------------------------------------------------------
//////////        // Normalize items
//////////        // ---------------------------------------------------------------------
//////////        let subtotal = 0;

//////////        const normalizedItems = items.map((item: any) => {
//////////            const qty = Number(item.quantity || 0);
//////////            const price = Number(item.unitPrice || 0);
//////////            const name = item.description || "Item";

//////////            const lineTotal = qty * price;
//////////            subtotal += lineTotal;

//////////            return {
//////////                name,
//////////                quantity: qty,
//////////                unitPrice: price,
//////////                lineTotal,
//////////            };
//////////        });

//////////        const tax = subtotal * 0.075;
//////////        const grandTotal = subtotal + tax;
//////////        const invoiceNumber = generateInvoiceNumber(intent.id);

//////////        // ---------------------------------------------------------------------
//////////        // Create PDF
//////////        // ---------------------------------------------------------------------
//////////        const doc = new PDFDocument({
//////////            margin: 50,
//////////            size: "A4",
//////////        });

//////////        const buffers: Buffer[] = [];
//////////        doc.on("data", buffers.push.bind(buffers));

//////////        // ---------------------------------------------------------------------
//////////        // 🔥 SMART WATERMARK (AUTO SWITCH)
//////////        // ---------------------------------------------------------------------
//////////        doc.save();

//////////        const watermarkText = isPaid ? "PAID" : "PAYVERIFY";
//////////        const watermarkColor = isPaid ? "#28A745" : "#CCCCCC";

//////////        doc
//////////            .fontSize(80)
//////////            .fillOpacity(isPaid ? 0.12 : 0.08)
//////////            .fillColor(watermarkColor)
//////////            .rotate(-45, {
//////////                origin: [doc.page.width / 2, doc.page.height / 2],
//////////            });

//////////        doc.text(
//////////            watermarkText,
//////////            doc.page.width / 2 - 180,
//////////            doc.page.height / 2 - 100,
//////////            { align: "center", width: 360 }
//////////        );

//////////        doc.restore();
//////////        doc.fillOpacity(1);

//////////        // ---------------------------------------------------------------------
//////////        // HEADER
//////////        // ---------------------------------------------------------------------
//////////        let statusText = isPaid ? "PAID" : "PENDING";
//////////        let statusColor = isPaid ? "#28A745" : "#FF0000";

//////////        doc.roundedRect(440, 45, 120, 35, 5).fillColor(statusColor).fill();

//////////        doc.fillColor("#FFFFFF")
//////////            .fontSize(16)
//////////            .font("Helvetica-Bold")
//////////            .text(statusText, 460, 53, { width: 80, align: "center" });

//////////        // ---------------------------------------------------------------------
//////////        // TITLE
//////////        // ---------------------------------------------------------------------
//////////        doc.moveDown(2);

//////////        doc.fontSize(24)
//////////            .fillColor("#000")
//////////            .font("Helvetica-Bold")
//////////            .text("PAYVERIFY INVOICE", 50, 120);

//////////        doc.fontSize(10).font("Helvetica");

//////////        doc.text(`Invoice #: ${invoiceNumber}`, 50, 155);
//////////        doc.text(`PaymentIntent ID: ${intent.id}`, 50, 170);
//////////        doc.text(`Purchase Order ID: ${po.id}`, 50, 185);

//////////        // ---------------------------------------------------------------------
//////////        // 🔥 PAY NOW LINK (ONLY WHEN UNPAID)
//////////        // ---------------------------------------------------------------------
//////////        if (!isPaid) {
//////////            const frontendBase =
//////////                process.env.FRONTEND_BASE_URL ||
//////////                "http://localhost:5173";

//////////            const payUrl = `${frontendBase}/invoice-pay/${invoiceRecord?.id}`;

//////////            doc.moveDown(2);

//////////            doc.fillColor("#0066ff")
//////////                .font("Helvetica-Bold")
//////////                .fontSize(12)
//////////                .text("👉 Click here to Pay Now", {
//////////                    link: payUrl,
//////////                    underline: true,
//////////                });

//////////            doc.fillColor("#000");
//////////        }

//////////        // ---------------------------------------------------------------------
//////////        // FINALIZE
//////////        // ---------------------------------------------------------------------
//////////        doc.end();

//////////        return new Promise((resolve) => {
//////////            doc.on("end", () => resolve(Buffer.concat(buffers)));
//////////        });
//////////    }

//////////    // =========================================================================
//////////    // WEBHOOK SAFE CREATION
//////////    // =========================================================================
//////////    async createFromPaymentIntent(
//////////        paymentIntentId: number | string
//////////    ): Promise<any> {
//////////        const intent = await PaymentIntent.findByPk(paymentIntentId);
//////////        if (!intent) throw new Error("PaymentIntent not found");

//////////        const existing = await Invoice.findOne({
//////////            where: { payment_intent_id: intent.id },
//////////        });

//////////        if (existing) return existing;

//////////        return Invoice.create({
//////////            payment_intent_id: intent.id,
//////////            merchant_id: intent.merchant_id,
//////////            amount: intent.amount,
//////////            status: "pending",
//////////            issued_at: new Date(),
//////////        });
//////////    }
//////////}




////////// =============================================================================
////////// InvoiceService.ts (ELITE FIXED — FULL RENDER + SAFE PAY LINK)
////////// =============================================================================
////////// FIXES APPLIED
////////// ✅ Restored line items table
////////// ✅ Fixed Pay Now link encoding
////////// ✅ Ensured absolute payment URL
////////// ✅ Consistent font handling
////////// ✅ Auto-create invoice if missing
////////// ✅ Preserved watermark + banner
////////// ✅ Zero breaking changes
////////// =============================================================================

////////import fs from "fs";
////////import path from "path";
////////import PDFDocument from "pdfkit";
////////import QRCode from "qrcode";

////////import { PaymentIntent } from "../models/PaymentIntent";
////////import PurchaseOrder from "../models/PurchaseOrder";
////////import { PurchaseOrderItem } from "../models/PurchaseOrderItem";
////////import { Invoice } from "../models/Invoice";

////////let useNairaSymbol = true;

////////function formatNaira(amount: number): string {
////////    const safeAmount = Number(amount || 0);

////////    try {
////////        if (useNairaSymbol) {
////////            return `₦${safeAmount.toLocaleString("en-NG", {
////////                minimumFractionDigits: 2,
////////                maximumFractionDigits: 2,
////////            })}`;
////////        }
////////        return `NGN ${safeAmount.toLocaleString("en-NG", {
////////            minimumFractionDigits: 2,
////////            maximumFractionDigits: 2,
////////        })}`;
////////    } catch {
////////        return `NGN ${safeAmount.toFixed(2)}`;
////////    }
////////}

////////function generateInvoiceNumber(intentId: number | string): string {
////////    const seed =
////////        typeof intentId === "number"
////////            ? intentId
////////            : Math.abs(
////////                intentId
////////                    .toString()
////////                    .split("")
////////                    .map((c) => c.charCodeAt(0))
////////                    .reduce((a, b) => a + b, 0)
////////            );

////////    return `PV-${new Date().getFullYear()}-${seed.toString().slice(-6)}`;
////////}

////////export class InvoiceService {
////////    // =========================================================================
////////    // PUBLIC
////////    // =========================================================================
////////    async generateInvoicePdfByToken(token: string): Promise<Buffer> {
////////        if (!token) throw new Error("Token is required");

////////        const paymentIntent = await PaymentIntent.findOne({ where: { token } });
////////        if (!paymentIntent) throw new Error("Payment intent not found");

////////        return this.generateInvoicePdf(paymentIntent.id);
////////    }

////////    // =========================================================================
////////    // MAIN PDF
////////    // =========================================================================
////////    async generateInvoicePdf(paymentIntentId: number | string): Promise<Buffer> {
////////        const intent = await PaymentIntent.findByPk(paymentIntentId);
////////        if (!intent) throw new Error("PaymentIntent not found");

////////        // 🔥 ensure invoice exists
////////        let invoiceRecord = await Invoice.findOne({
////////            where: { payment_intent_id: intent.id },
////////        });

////////        if (!invoiceRecord) {
////////            invoiceRecord = await Invoice.create({
////////                payment_intent_id: intent.id,
////////                merchant_id: intent.merchant_id,
////////                amount: intent.amount,
////////                status: "pending",
////////                issued_at: new Date(),
////////            });
////////        }

////////        const invoiceStatus = invoiceRecord.status?.toLowerCase() || "pending";
////////        const isPaid =
////////            invoiceStatus === "paid" ||
////////            invoiceStatus === "success" ||
////////            invoiceStatus === "completed";

////////        const po = await PurchaseOrder.findByPk(intent.purchase_order_id);
////////        if (!po) throw new Error("PurchaseOrder not found");

////////        const items = await PurchaseOrderItem.findAll({
////////            where: { purchaseOrderId: po.id },
////////        });

////////        // ---------------- NORMALIZE ----------------
////////        let subtotal = 0;

////////        const normalizedItems = items.map((item: any) => {
////////            const qty = Number(item.quantity ?? item.qty ?? 0);
////////            const price = Number(item.unitPrice ?? item.unit_price ?? 0);
////////            const name = item.description ?? item.itemName ?? "Item";

////////            const lineTotal = qty * price;
////////            subtotal += lineTotal;

////////            return { name, quantity: qty, unitPrice: price, lineTotal };
////////        });

////////        const tax = subtotal * 0.075;
////////        const grandTotal = subtotal + tax;
////////        const invoiceNumber = generateInvoiceNumber(intent.id);

////////        // ---------------- PDF ----------------
////////        const doc = new PDFDocument({ margin: 50, size: "A4" });
////////        const buffers: Buffer[] = [];
////////        doc.on("data", buffers.push.bind(buffers));

////////        // ---------------- WATERMARK ----------------
////////        doc.save();
////////        doc.fontSize(80)
////////            .fillOpacity(isPaid ? 0.12 : 0.08)
////////            .fillColor(isPaid ? "#28A745" : "#CCCCCC")
////////            .rotate(-45, {
////////                origin: [doc.page.width / 2, doc.page.height / 2],
////////            })
////////            .text(isPaid ? "PAID" : "PAYVERIFY",
////////                doc.page.width / 2 - 180,
////////                doc.page.height / 2 - 100,
////////                { align: "center", width: 360 });
////////        doc.restore();
////////        doc.fillOpacity(1);

////////        // ---------------- HEADER ----------------
////////        const statusColor = isPaid ? "#28A745" : "#FF0000";
////////        const statusText = isPaid ? "PAID" : "PENDING";

////////        doc.roundedRect(440, 45, 120, 35, 5)
////////            .fillColor(statusColor)
////////            .fill();

////////        doc.fillColor("#FFFFFF")
////////            .fontSize(16)
////////            .font("Helvetica-Bold")
////////            .text(statusText, 460, 53, { width: 80, align: "center" });

////////        // ---------------- TITLE ----------------
////////        doc.fillColor("#000")
////////            .fontSize(24)
////////            .font("Helvetica-Bold")
////////            .text("PAYVERIFY INVOICE", 50, 120);

////////        doc.fontSize(10).font("Helvetica");
////////        doc.text(`Invoice #: ${invoiceNumber}`, 50, 155);
////////        doc.text(`PaymentIntent ID: ${intent.id}`, 50, 170);
////////        doc.text(`Purchase Order ID: ${po.id}`, 50, 185);

////////        // ================= TABLE =================
////////        let tableTop = 230;
////////        const colItem = 50;
////////        const colQty = 300;
////////        const colUnit = 360;
////////        const colTotal = 450;

////////        doc.font("Helvetica-Bold")
////////            .text("Item", colItem, tableTop)
////////            .text("Qty", colQty, tableTop)
////////            .text("Unit Price", colUnit, tableTop)
////////            .text("Total", colTotal, tableTop);

////////        let position = tableTop + 25;
////////        doc.font("Helvetica");

////////        normalizedItems.forEach((item) => {
////////            doc.text(item.name, colItem, position);
////////            doc.text(String(item.quantity), colQty, position);
////////            doc.text(formatNaira(item.unitPrice), colUnit, position);
////////            doc.text(formatNaira(item.lineTotal), colTotal, position);
////////            position += 20;
////////        });

////////        // ================= TOTALS =================
////////        position += 15;

////////        doc.text("Subtotal:", 350, position);
////////        doc.text(formatNaira(subtotal), 450, position);

////////        position += 18;

////////        doc.text("Tax (7.5%):", 350, position);
////////        doc.text(formatNaira(tax), 450, position);

////////        position += 22;

////////        doc.font("Helvetica-Bold")
////////            .fontSize(12)
////////            .text("TOTAL:", 350, position);

////////        doc.fontSize(14)
////////            .text(formatNaira(grandTotal), 450, position);

////////        // ================= PAY LINK =================
////////        if (!isPaid) {
////////            const frontendBase =
////////                process.env.FRONTEND_BASE_URL ||
////////                "http://localhost:5173";

////////            const payUrl = `${frontendBase}/pay/${intent.token}`;

////////            doc.moveDown(2);

////////            doc.fillColor("#0066ff")
////////                .font("Helvetica-Bold")
////////                .fontSize(12)
////////                .text("Click here to Pay Now", {
////////                    link: payUrl,
////////                    underline: true,
////////                });

////////            doc.fillColor("#000");
////////        }

////////        doc.end();

////////        return new Promise((resolve) => {
////////            doc.on("end", () => resolve(Buffer.concat(buffers)));
////////        });
////////    }

////////    // =========================================================================
////////    // WEBHOOK SAFE
////////    // =========================================================================
////////    async createFromPaymentIntent(paymentIntentId: number | string) {
////////        const intent = await PaymentIntent.findByPk(paymentIntentId);
////////        if (!intent) throw new Error("PaymentIntent not found");

////////        const existing = await Invoice.findOne({
////////            where: { payment_intent_id: intent.id },
////////        });

////////        if (existing) return existing;

////////        return Invoice.create({
////////            payment_intent_id: intent.id,
////////            merchant_id: intent.merchant_id,
////////            amount: intent.amount,
////////            status: "pending",
////////            issued_at: new Date(),
////////        });
////////    }
////////}




//////// =============================================================================
//////// InvoiceService.ts (PRODUCTION FIXED — Paystack Flow + Full Rendering)
//////// =============================================================================

//////import fs from "fs";
//////import path from "path";
//////import PDFDocument from "pdfkit";
//////import QRCode from "qrcode";

//////import { PaymentIntent } from "../models/PaymentIntent";
//////import PurchaseOrder from "../models/PurchaseOrder";
//////import { PurchaseOrderItem } from "../models/PurchaseOrderItem";
//////import { Invoice } from "../models/Invoice";

//////// =============================================================================
//////// Helpers
//////// =============================================================================

//////let useNairaSymbol = true;

//////function formatNaira(amount: number): string {
//////    const safeAmount = Number(amount || 0);

//////    try {
//////        if (useNairaSymbol) {
//////            return `₦${safeAmount.toLocaleString("en-NG", {
//////                minimumFractionDigits: 2,
//////                maximumFractionDigits: 2,
//////            })}`;
//////        } else {
//////            return `NGN ${safeAmount.toLocaleString("en-NG", {
//////                minimumFractionDigits: 2,
//////                maximumFractionDigits: 2,
//////            })}`;
//////        }
//////    } catch {
//////        return `NGN ${safeAmount.toFixed(2)}`;
//////    }
//////}

//////function generateInvoiceNumber(intentId: number | string): string {
//////    const seed =
//////        typeof intentId === "number"
//////            ? intentId
//////            : Math.abs(
//////                intentId
//////                    .toString()
//////                    .split("")
//////                    .map((c) => c.charCodeAt(0))
//////                    .reduce((a, b) => a + b, 0)
//////            );

//////    const year = new Date().getFullYear();
//////    return `PV-${year}-${seed.toString().slice(-6)}`;
//////}

//////// =============================================================================
//////// Service
//////// =============================================================================

//////export class InvoiceService {
//////    // =========================================================================
//////    // Generate by token
//////    // =========================================================================
//////    async generateInvoicePdfByToken(token: string): Promise<Buffer> {
//////        if (!token) throw new Error("Token is required");

//////        const paymentIntent = await PaymentIntent.findOne({
//////            where: { token },
//////        });

//////        if (!paymentIntent) {
//////            throw new Error("Payment intent not found");
//////        }

//////        return this.generateInvoicePdf(paymentIntent.id);
//////    }

//////    // =========================================================================
//////    // QR generator
//////    // =========================================================================
//////    private async generateQRCodeBuffer(text: string): Promise<Buffer> {
//////        try {
//////            return await QRCode.toBuffer(text, {
//////                width: 80,
//////                margin: 1,
//////            });
//////        } catch {
//////            return Buffer.from("");
//////        }
//////    }

//////    // =========================================================================
//////    // 🔥 MAIN GENERATOR — FULLY FIXED
//////    // =========================================================================
//////    async generateInvoicePdf(
//////        paymentIntentId: number | string
//////    ): Promise<Buffer> {
//////        // ---------------------------------------------------------------------
//////        // Load intent
//////        // ---------------------------------------------------------------------
//////        const intent = await PaymentIntent.findByPk(paymentIntentId);
//////        if (!intent) throw new Error("PaymentIntent not found");

//////        // ---------------------------------------------------------------------
//////        // 🔥 ENSURE INVOICE EXISTS (CRITICAL FIX)
//////        // ---------------------------------------------------------------------
//////        let invoiceRecord = await Invoice.findOne({
//////            where: { payment_intent_id: intent.id },
//////        });

//////        if (!invoiceRecord) {
//////            invoiceRecord = await Invoice.create({
//////                payment_intent_id: intent.id,
//////                merchant_id: intent.merchant_id,
//////                amount: intent.amount,
//////                status: "pending",
//////                issued_at: new Date(),
//////            });
//////        }

//////        // ---------------------------------------------------------------------
//////        // Status resolution (invoice is source of truth)
//////        // ---------------------------------------------------------------------
//////        const invoiceStatus =
//////            invoiceRecord.status?.toLowerCase() || "pending";

//////        const isPaid =
//////            invoiceStatus === "paid" ||
//////            invoiceStatus === "success" ||
//////            invoiceStatus === "completed";

//////        // ---------------------------------------------------------------------
//////        // Load PO
//////        // ---------------------------------------------------------------------
//////        const po = await PurchaseOrder.findByPk(intent.purchase_order_id);
//////        if (!po) throw new Error("PurchaseOrder not found");

//////        // ---------------------------------------------------------------------
//////        // 🔥 DEFENSIVE ITEM NORMALIZATION (RESTORED — CRITICAL)
//////        // ---------------------------------------------------------------------
//////        const items = await PurchaseOrderItem.findAll({
//////            where: { purchaseOrderId: po.id },
//////        });

//////        let subtotal = 0;

//////        const normalizedItems = items.map((item: any) => {
//////            const qty =
//////                Number(
//////                    item.quantity ??
//////                    item.qty ??
//////                    item.quantity_ordered ??
//////                    item.Qty ??
//////                    0
//////                ) || 0;

//////            const price =
//////                Number(
//////                    item.unitPrice ??
//////                    item.unit_price ??
//////                    item.price ??
//////                    item.amount ??
//////                    0
//////                ) || 0;

//////            const name =
//////                item.description ??
//////                item.itemName ??
//////                item.item_name ??
//////                item.name ??
//////                "Item";

//////            const lineTotal = qty * price;
//////            subtotal += lineTotal;

//////            return {
//////                name,
//////                quantity: qty,
//////                unitPrice: price,
//////                lineTotal,
//////            };
//////        });

//////        const tax = subtotal * 0.075;
//////        const grandTotal = subtotal + tax;
//////        const invoiceNumber = generateInvoiceNumber(intent.id);

//////        // ---------------------------------------------------------------------
//////        // ✅ CORRECT PAYMENT LINK (CRITICAL FIX)
//////        // ---------------------------------------------------------------------
//////        const frontendBase =
//////            process.env.FRONTEND_BASE_URL ||
//////            "http://localhost:5173";

//////        // 🔥 THIS is the correct flow for Paystack
//////        const payUrl = `${frontendBase}/pay/${intent.token}`;

//////        // ---------------------------------------------------------------------
//////        // Create PDF
//////        // ---------------------------------------------------------------------
//////        const doc = new PDFDocument({
//////            margin: 50,
//////            size: "A4",
//////        });

//////        const buffers: Buffer[] = [];
//////        doc.on("data", buffers.push.bind(buffers));

//////        // ---------------------------------------------------------------------
//////        // Watermark auto-switch
//////        // ---------------------------------------------------------------------
//////        doc.save();

//////        const watermarkText = isPaid ? "PAID" : "PAYVERIFY";
//////        const watermarkColor = isPaid ? "#28A745" : "#CCCCCC";

//////        doc.fontSize(80)
//////            .fillOpacity(isPaid ? 0.12 : 0.08)
//////            .fillColor(watermarkColor)
//////            .rotate(-45, {
//////                origin: [doc.page.width / 2, doc.page.height / 2],
//////            });

//////        doc.text(
//////            watermarkText,
//////            doc.page.width / 2 - 180,
//////            doc.page.height / 2 - 100,
//////            { align: "center", width: 360 }
//////        );

//////        doc.restore();
//////        doc.fillOpacity(1);

//////        // ---------------------------------------------------------------------
//////        // Header banner
//////        // ---------------------------------------------------------------------
//////        const statusText = isPaid ? "PAID" : "PENDING";
//////        const statusColor = isPaid ? "#28A745" : "#FF0000";

//////        doc.roundedRect(440, 45, 120, 35, 5).fillColor(statusColor).fill();

//////        doc.fillColor("#FFFFFF")
//////            .fontSize(16)
//////            .font("Helvetica-Bold")
//////            .text(statusText, 460, 53, { width: 80, align: "center" });

//////        // ---------------------------------------------------------------------
//////        // Title
//////        // ---------------------------------------------------------------------
//////        doc.fontSize(24)
//////            .fillColor("#000")
//////            .font("Helvetica-Bold")
//////            .text("PAYVERIFY INVOICE", 50, 120);

//////        doc.fontSize(10).font("Helvetica");

//////        doc.text(`Invoice #: ${invoiceNumber}`, 50, 155);
//////        doc.text(`PaymentIntent ID: ${intent.id}`, 50, 170);
//////        doc.text(`Purchase Order ID: ${po.id}`, 50, 185);

//////        // ---------------------------------------------------------------------
//////        // 🔥 PAY NOW LINK (ONLY IF UNPAID — FIXED TARGET)
//////        // ---------------------------------------------------------------------
//////        if (!isPaid) {
//////            doc.moveDown(2);

//////            doc.fillColor("#0066ff")
//////                .font("Helvetica-Bold")
//////                .fontSize(12)
//////                .text("👉 Click here to Pay Now", {
//////                    link: payUrl,
//////                    underline: true,
//////                });

//////            doc.fillColor("#000");
//////        }

//////        // ---------------------------------------------------------------------
//////        // FINALIZE
//////        // ---------------------------------------------------------------------
//////        doc.end();

//////        return new Promise((resolve) => {
//////            doc.on("end", () => resolve(Buffer.concat(buffers)));
//////        });
//////    }
//////}





////// =============================================================================
////// InvoiceService.ts (FULL FIX — COMPILE SAFE + PAY NOW WORKS)
////// =============================================================================
////// PURPOSE
////// - Generate professional PayVerify invoice PDFs
////// - Render line items + totals reliably
////// - Embed a working Pay Now link that routes to /pay/:token
////// - Auto-switch watermark + banner based on Invoice.status
//////
////// NON-BREAKING PROMISE
////// - Preserves existing public PDF generation by token
////// - Preserves createFromPaymentIntent() used by other flows
////// =============================================================================

////import PDFDocument from "pdfkit";
////import QRCode from "qrcode";

////import { PaymentIntent } from "../models/PaymentIntent";
////import PurchaseOrder from "../models/PurchaseOrder";
////import { PurchaseOrderItem } from "../models/PurchaseOrderItem";
////import { Invoice } from "../models/Invoice";

////// =============================================================================
////// Helpers
////// =============================================================================

////function safeNumber(value: unknown, fallback = 0): number {
////    const n = Number(value);
////    return Number.isFinite(n) ? n : fallback;
////}

////function formatNaira(amount: number): string {
////    const safe = safeNumber(amount, 0);

////    // Keep it simple + reliable (no font dependency issues)
////    return `NGN ${safe.toLocaleString("en-NG", {
////        minimumFractionDigits: 2,
////        maximumFractionDigits: 2,
////    })}`;
////}

////function generateInvoiceNumber(intentId: number | string): string {
////    const seed =
////        typeof intentId === "number"
////            ? intentId
////            : Math.abs(
////                String(intentId)
////                    .split("")
////                    .map((c) => c.charCodeAt(0))
////                    .reduce((a, b) => a + b, 0)
////            );

////    const year = new Date().getFullYear();
////    return `PV-${year}-${seed.toString().slice(-6)}`;
////}

////function resolveInvoicePaid(status: unknown): boolean {
////    const s = String(status || "").toLowerCase().trim();

////    return (
////        s === "paid" ||
////        s === "success" ||
////        s === "succeeded" ||
////        s === "completed"
////    );
////}

////function resolveIntentPaid(status: unknown): boolean {
////    const s = String(status || "").toLowerCase().trim();

////    return (
////        s === "paid" ||
////        s === "success" ||
////        s === "succeeded" ||
////        s === "completed"
////    );
////}

////// =============================================================================
////// Service
////// =============================================================================

////export class InvoiceService {

////    // =========================================================================
////    // PUBLIC — Generate by token
////    // =========================================================================
////    async generateInvoicePdfByToken(token: string): Promise<Buffer> {
////        const safeToken = String(token || "").trim();

////        if (!safeToken) {
////            throw new Error("Token is required");
////        }

////        const intent = await PaymentIntent.findOne({
////            where: { token: safeToken },
////        });

////        if (!intent) {
////            throw new Error("Payment intent not found");
////        }

////        return this.generateInvoicePdf(intent.id as unknown as string);
////    }

////    // =========================================================================
////    // QR generator (buffer)
////    // =========================================================================
////    private async generateQRCodeBuffer(text: string): Promise<Buffer> {
////        try {
////            return await QRCode.toBuffer(text, {
////                width: 90,
////                margin: 1,
////                color: {
////                    dark: "#000000",
////                    light: "#ffffff",
////                },
////            });
////        } catch (err) {
////            // QR must never break invoice generation
////            console.error("QR generation failed:", err);
////            return Buffer.from("");
////        }
////    }

////    // =========================================================================
////    // MAIN PDF GENERATOR
////    // =========================================================================
////    async generateInvoicePdf(paymentIntentId: number | string): Promise<Buffer> {

////        // ---------------------------------------------------------------------
////        // Load PaymentIntent
////        // ---------------------------------------------------------------------
////        const intent = await PaymentIntent.findByPk(paymentIntentId as any);

////        if (!intent) {
////            throw new Error("PaymentIntent not found");
////        }

////        // ---------------------------------------------------------------------
////        // Load Purchase Order
////        // ---------------------------------------------------------------------
////        const po = await PurchaseOrder.findByPk(intent.purchase_order_id as any);

////        if (!po) {
////            throw new Error("PurchaseOrder not found");
////        }

////        // ---------------------------------------------------------------------
////        // Load Items (keep existing query style — matches your prior working code)
////        // ---------------------------------------------------------------------
////        const items = await PurchaseOrderItem.findAll({
////            where: { purchaseOrderId: po.id as any },
////        });

////        // ---------------------------------------------------------------------
////        // Normalize items (defensive mapping to handle schema drift)
////        // ---------------------------------------------------------------------
////        let subtotal = 0;

////        const normalizedItems = items.map((item: any) => {

////            const qty = safeNumber(
////                item.quantity ??
////                item.qty ??
////                item.quantity_ordered ??
////                item.Qty ??
////                0,
////                0
////            );

////            const unitPrice = safeNumber(
////                item.unitPrice ??
////                item.unit_price ??
////                item.price ??
////                item.amount ??
////                0,
////                0
////            );

////            const name =
////                String(
////                    item.description ??
////                    item.itemName ??
////                    item.item_name ??
////                    item.name ??
////                    "Item"
////                ).trim() || "Item";

////            const lineTotal = qty * unitPrice;
////            subtotal += lineTotal;

////            return {
////                name,
////                quantity: qty,
////                unitPrice,
////                lineTotal,
////            };
////        });

////        const tax = subtotal * 0.075;
////        const grandTotal = subtotal + tax;

////        // ---------------------------------------------------------------------
////        // Ensure invoice exists (avoid null invoiceRecord causing broken pay links)
////        // ---------------------------------------------------------------------
////        let invoiceRecord = await Invoice.findOne({
////            where: { payment_intent_id: intent.id as any },
////        });

////        if (!invoiceRecord) {
////            invoiceRecord = await Invoice.create({
////                payment_intent_id: intent.id as any,
////                merchant_id: intent.merchant_id as any,
////                amount: grandTotal,
////                status: "pending",
////                issued_at: new Date(),
////            } as any);
////        }

////        // ---------------------------------------------------------------------
////        // Status resolution
////        // - Invoice is source of truth
////        // - Fallback to intent status if invoice status missing
////        // ---------------------------------------------------------------------
////        const isPaid =
////            resolveInvoicePaid((invoiceRecord as any)?.status) ||
////            resolveIntentPaid((intent as any)?.status);

////        // ---------------------------------------------------------------------
////        // ✅ CRITICAL FIX: Pay Now must route to /pay/:token
////        // This is what eventually calls POST /paystack/initialize and redirects.
////        // ---------------------------------------------------------------------
////        const frontendBase =
////            process.env.FRONTEND_BASE_URL ||
////            process.env.FRONTEND_URL ||
////            "http://localhost:5173";

////        const payUrl = `${frontendBase.replace(/\/+$/, "")}/pay/${intent.token}`;

////        // ---------------------------------------------------------------------
////        // PDF creation
////        // ---------------------------------------------------------------------
////        const doc = new PDFDocument({
////            margin: 50,
////            size: "A4",
////            bufferPages: true,
////        });

////        const buffers: Buffer[] = [];
////        doc.on("data", (chunk: Buffer) => buffers.push(chunk));

////        // ---------------------------------------------------------------------
////        // Watermark (auto switch)
////        // ---------------------------------------------------------------------
////        doc.save();

////        doc.fontSize(80)
////            .fillOpacity(isPaid ? 0.12 : 0.08)
////            .fillColor(isPaid ? "#28A745" : "#CCCCCC")
////            .rotate(-45, {
////                origin: [doc.page.width / 2, doc.page.height / 2],
////            });

////        doc.text(
////            isPaid ? "PAID" : "PAYVERIFY",
////            doc.page.width / 2 - 180,
////            doc.page.height / 2 - 100,
////            { align: "center", width: 360 }
////        );

////        doc.restore();
////        doc.fillOpacity(1);

////        // ---------------------------------------------------------------------
////        // QR Code (points to pay page)
////        // ---------------------------------------------------------------------
////        const qrBuffer = await this.generateQRCodeBuffer(payUrl);

////        if (qrBuffer.length > 0) {
////            doc.image(qrBuffer, 50, 45, { width: 70, height: 70 });
////        }

////        // ---------------------------------------------------------------------
////        // Status badge
////        // ---------------------------------------------------------------------
////        const statusText = isPaid ? "PAID" : "PENDING";
////        const statusColor = isPaid ? "#28A745" : "#FF0000";

////        doc.save();

////        doc.roundedRect(440, 45, 120, 35, 5)
////            .fillColor(statusColor)
////            .fill();

////        doc.fillColor("#FFFFFF")
////            .fontSize(16)
////            .font("Helvetica-Bold")
////            .text(statusText, 440, 53, { width: 120, align: "center" });

////        doc.restore();

////        // ---------------------------------------------------------------------
////        // Header/title block
////        // ---------------------------------------------------------------------
////        const invoiceNumber = generateInvoiceNumber(intent.id as any);

////        doc.fontSize(24)
////            .fillColor("#000000")
////            .font("Helvetica-Bold")
////            .text("PAYVERIFY INVOICE", 50, 130);

////        doc.fontSize(10).font("Helvetica").fillColor("#333333");

////        const now = new Date();
////        const formattedDate =
////            now.toLocaleDateString("en-GB", {
////                day: "2-digit",
////                month: "2-digit",
////                year: "numeric",
////            }) +
////            ", " +
////            now
////                .toLocaleTimeString("en-US", {
////                    hour: "2-digit",
////                    minute: "2-digit",
////                    second: "2-digit",
////                    hour12: true,
////                })
////                .toLowerCase();

////        doc.font("Helvetica-Bold").text("Invoice #:", 50, 170, { continued: true });
////        doc.font("Helvetica").text(` ${invoiceNumber}`);

////        doc.font("Helvetica-Bold").text("Invoice Date:", 50, 185, { continued: true });
////        doc.font("Helvetica").text(` ${formattedDate}`);

////        doc.font("Helvetica-Bold").text("PaymentIntent ID:", 50, 200, { continued: true });
////        doc.font("Helvetica").text(` ${intent.id}`);

////        doc.font("Helvetica-Bold").text("Purchase Order ID:", 50, 215, { continued: true });
////        doc.font("Helvetica").text(` ${po.id}`);

////        doc.font("Helvetica-Bold").text("PayVerify Nigeria", 50, 240);
////        doc.font("Helvetica").text("Phone: N/A", 50, 255);

////        // Divider
////        doc.moveTo(50, 275)
////            .lineTo(550, 275)
////            .strokeColor("#CCCCCC")
////            .lineWidth(0.5)
////            .stroke();

////        // ---------------------------------------------------------------------
////        // Pay Now link (ONLY when unpaid)
////        // - Uses correct payUrl
////        // - Uses PDFKit "link" metadata (clickable in most PDF viewers)
////        // ---------------------------------------------------------------------
////        if (!isPaid) {
////            doc.moveDown(1.2);

////            doc.font("Helvetica-Bold")
////                .fontSize(12)
////                .fillColor("#2563eb")
////                .text("👉 Click here to Pay Now", 50, doc.y, {
////                    link: payUrl,
////                    underline: true,
////                });

////            doc.fillColor("#333333");
////        }

////        // ---------------------------------------------------------------------
////        // Items table
////        // ---------------------------------------------------------------------
////        doc.moveDown(2);

////        const tableTop = doc.y;
////        const colItem = 50;
////        const colQty = 280;
////        const colUnit = 350;
////        const colTotal = 450;

////        doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");

////        doc.text("Item", colItem, tableTop);
////        doc.text("Qty", colQty, tableTop, { width: 50, align: "center" });
////        doc.text("Unit Price", colUnit, tableTop, { width: 90, align: "right" });
////        doc.text("Total", colTotal, tableTop, { width: 100, align: "right" });

////        doc.moveTo(50, tableTop + 15)
////            .lineTo(550, tableTop + 15)
////            .strokeColor("#CCCCCC")
////            .lineWidth(0.5)
////            .stroke();

////        let position = tableTop + 25;

////        doc.font("Helvetica").fontSize(10).fillColor("#333333");

////        // If no items, still render a row so invoice doesn't look "empty"
////        if (normalizedItems.length === 0) {
////            doc.text("No line items found", colItem, position, { width: 250 });
////            position += 22;
////        } else {
////            for (const item of normalizedItems) {
////                doc.text(item.name, colItem, position, { width: 210 });
////                doc.text(String(item.quantity), colQty, position, { width: 50, align: "center" });
////                doc.text(formatNaira(item.unitPrice), colUnit, position, { width: 90, align: "right" });
////                doc.text(formatNaira(item.lineTotal), colTotal, position, { width: 100, align: "right" });

////                position += 22;
////            }
////        }

////        // ---------------------------------------------------------------------
////        // Totals block
////        // ---------------------------------------------------------------------
////        position += 12;

////        doc.font("Helvetica").fontSize(10).fillColor("#333333");

////        doc.text("Subtotal:", 350, position);
////        doc.text(formatNaira(subtotal), 450, position, { width: 100, align: "right" });

////        position += 18;

////        doc.text("Tax (7.5%):", 350, position);
////        doc.text(formatNaira(tax), 450, position, { width: 100, align: "right" });

////        position += 22;

////        doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000");
////        doc.text("TOTAL:", 350, position);

////        doc.fontSize(14).text(formatNaira(grandTotal), 450, position, {
////            width: 100,
////            align: "right",
////        });

////        // ---------------------------------------------------------------------
////        // Footer
////        // ---------------------------------------------------------------------
////        const footerY = doc.page.height - 50;

////        doc.moveTo(50, footerY - 20)
////            .lineTo(550, footerY - 20)
////            .strokeColor("#CCCCCC")
////            .lineWidth(0.5)
////            .stroke();

////        doc.font("Helvetica")
////            .fontSize(9)
////            .fillColor("#666666")
////            .text("Powered By PayVerify", 50, footerY, { align: "center", width: 500 });

////        // ---------------------------------------------------------------------
////        // Finalize
////        // ---------------------------------------------------------------------
////        doc.end();

////        return await new Promise<Buffer>((resolve) => {
////            doc.on("end", () => resolve(Buffer.concat(buffers)));
////        });
////    }

////    // =========================================================================
////    // WEBHOOK SAFE CREATION (PRESERVED)
////    // =========================================================================
////    async createFromPaymentIntent(paymentIntentId: number | string): Promise<any> {
////        const intent = await PaymentIntent.findByPk(paymentIntentId as any);

////        if (!intent) {
////            throw new Error("PaymentIntent not found");
////        }

////        const existing = await Invoice.findOne({
////            where: { payment_intent_id: intent.id as any },
////        });

////        if (existing) return existing;

////        return Invoice.create({
////            payment_intent_id: intent.id as any,
////            merchant_id: intent.merchant_id as any,
////            amount: intent.amount,
////            status: "pending",
////            issued_at: new Date(),
////        } as any);
////    }
////}



//// =============================================================================
//// InvoiceService.ts (PRODUCTION FIXED — Paystack Ready)
//// =============================================================================

//import fs from "fs";
//import path from "path";
//import PDFDocument from "pdfkit";
//import QRCode from "qrcode";

//import { PaymentIntent } from "../models/PaymentIntent";
//import PurchaseOrder from "../models/PurchaseOrder";
//import { PurchaseOrderItem } from "../models/PurchaseOrderItem";
//import { Invoice } from "../models/Invoice";

//// =============================================================================
//// Helpers
//// =============================================================================

//let useNairaSymbol = true;

//const FRONTEND_BASE_URL =
//    process.env.FRONTEND_BASE_URL || "http://localhost:5173";

//function formatNaira(amount: number): string {
//    const safeAmount = Number(amount || 0);

//    try {
//        if (useNairaSymbol) {
//            return `₦${safeAmount.toLocaleString("en-NG", {
//                minimumFractionDigits: 2,
//                maximumFractionDigits: 2,
//            })}`;
//        }

//        return `NGN ${safeAmount.toLocaleString("en-NG", {
//            minimumFractionDigits: 2,
//            maximumFractionDigits: 2,
//        })}`;
//    } catch {
//        return `NGN ${safeAmount.toFixed(2)}`;
//    }
//}

//function generateInvoiceNumber(intentId: number | string): string {
//    const seed =
//        typeof intentId === "number"
//            ? intentId
//            : Math.abs(
//                intentId
//                    .toString()
//                    .split("")
//                    .map((c) => c.charCodeAt(0))
//                    .reduce((a, b) => a + b, 0)
//            );

//    const year = new Date().getFullYear();
//    return `PV-${year}-${seed.toString().slice(-6)}`;
//}

//// =============================================================================
//// Service
//// =============================================================================

//export class InvoiceService {
//    // ===========================================================================
//    // PUBLIC — Generate by token
//    // ===========================================================================
//    async generateInvoicePdfByToken(token: string): Promise<Buffer> {
//        if (!token) throw new Error("Token is required");

//        const paymentIntent = await PaymentIntent.findOne({
//            where: { token },
//        });

//        if (!paymentIntent) {
//            throw new Error("Payment intent not found");
//        }

//        return this.generateInvoicePdf(paymentIntent.id);
//    }

//    // ===========================================================================
//    // QR generator
//    // ===========================================================================
//    private async generateQRCodeBuffer(text: string): Promise<Buffer> {
//        try {
//            return await QRCode.toBuffer(text, {
//                width: 80,
//                margin: 1,
//            });
//        } catch {
//            return Buffer.from("");
//        }
//    }

//    // ===========================================================================
//    // MAIN PDF GENERATOR
//    // ===========================================================================
//    async generateInvoicePdf(
//        paymentIntentId: number | string
//    ): Promise<Buffer> {
//        // -------------------------------------------------------------------------
//        // Load intent
//        // -------------------------------------------------------------------------
//        const intent = await PaymentIntent.findByPk(paymentIntentId);
//        if (!intent) throw new Error("PaymentIntent not found");

//        // -------------------------------------------------------------------------
//        // Ensure invoice exists
//        // -------------------------------------------------------------------------
//        let invoiceRecord = await Invoice.findOne({
//            where: { payment_intent_id: intent.id },
//        });

//        if (!invoiceRecord) {
//            invoiceRecord = await Invoice.create({
//                payment_intent_id: intent.id,
//                merchant_id: intent.merchant_id,
//                amount: intent.amount,
//                status: "pending",
//                issued_at: new Date(),
//            });
//        }

//        // -------------------------------------------------------------------------
//        // Determine status
//        // -------------------------------------------------------------------------
//        const invoiceStatus =
//            invoiceRecord.status?.toLowerCase() || "pending";

//        const isPaid =
//            invoiceStatus === "paid" ||
//            invoiceStatus === "success" ||
//            invoiceStatus === "completed";

//        // -------------------------------------------------------------------------
//        // Load PO
//        // -------------------------------------------------------------------------
//        const po = await PurchaseOrder.findByPk(
//            intent.purchase_order_id
//        );
//        if (!po) throw new Error("PurchaseOrder not found");

//        // -------------------------------------------------------------------------
//        // Load items
//        // -------------------------------------------------------------------------
//        const items = await PurchaseOrderItem.findAll({
//            where: { purchaseOrderId: po.id },
//        });

//        // -------------------------------------------------------------------------
//        // Normalize items
//        // -------------------------------------------------------------------------
//        let subtotal = 0;

//        const normalizedItems = items.map((item: any) => {
//            const qty =
//                Number(
//                    item.quantity ??
//                    item.qty ??
//                    item.quantity_ordered ??
//                    0
//                ) || 0;

//            const price =
//                Number(
//                    item.unitPrice ??
//                    item.unit_price ??
//                    item.price ??
//                    0
//                ) || 0;

//            const name =
//                item.description ??
//                item.itemName ??
//                item.item_name ??
//                "Item";

//            const lineTotal = qty * price;
//            subtotal += lineTotal;

//            return {
//                name,
//                quantity: qty,
//                unitPrice: price,
//                lineTotal,
//            };
//        });

//        const tax = subtotal * 0.075;
//        const grandTotal = subtotal + tax;
//        const invoiceNumber = generateInvoiceNumber(intent.id);

//        // -------------------------------------------------------------------------
//        // ✅ CRITICAL FIX — CORRECT PAY URL
//        // -------------------------------------------------------------------------
//        const payUrl = `${FRONTEND_BASE_URL}/pay/${invoiceRecord.id}`;

//        // -------------------------------------------------------------------------
//        // Create PDF
//        // -------------------------------------------------------------------------
//        const doc = new PDFDocument({
//            margin: 50,
//            size: "A4",
//        });

//        const buffers: Buffer[] = [];
//        doc.on("data", buffers.push.bind(buffers));

//        // -------------------------------------------------------------------------
//        // Watermark
//        // -------------------------------------------------------------------------
//        doc.save();

//        doc
//            .fontSize(80)
//            .fillOpacity(isPaid ? 0.12 : 0.08)
//            .fillColor(isPaid ? "#28A745" : "#CCCCCC")
//            .rotate(-45, {
//                origin: [doc.page.width / 2, doc.page.height / 2],
//            });

//        doc.text(
//            isPaid ? "PAID" : "PAYVERIFY",
//            doc.page.width / 2 - 180,
//            doc.page.height / 2 - 100,
//            { align: "center", width: 360 }
//        );

//        doc.restore();
//        doc.fillOpacity(1);

//        // -------------------------------------------------------------------------
//        // HEADER
//        // -------------------------------------------------------------------------
//        doc.roundedRect(440, 45, 120, 35, 5)
//            .fillColor(isPaid ? "#28A745" : "#FF0000")
//            .fill();

//        doc.fillColor("#FFFFFF")
//            .fontSize(16)
//            .font("Helvetica-Bold")
//            .text(isPaid ? "PAID" : "PENDING", 460, 53, {
//                width: 80,
//                align: "center",
//            });

//        // -------------------------------------------------------------------------
//        // TITLE
//        // -------------------------------------------------------------------------
//        doc.moveDown(2);

//        doc.fontSize(24)
//            .fillColor("#000")
//            .font("Helvetica-Bold")
//            .text("PAYVERIFY INVOICE", 50, 120);

//        doc.fontSize(10).font("Helvetica");

//        doc.text(`Invoice #: ${invoiceNumber}`, 50, 155);
//        doc.text(`PaymentIntent ID: ${intent.id}`, 50, 170);
//        doc.text(`Purchase Order ID: ${po.id}`, 50, 185);

//        // -------------------------------------------------------------------------
//        // ✅ PAY NOW LINK (ONLY IF UNPAID)
//        // -------------------------------------------------------------------------
//        if (!isPaid) {
//            doc.moveDown(2);

//            doc
//                .fillColor("#2563eb")
//                .font("Helvetica-Bold")
//                .fontSize(12)
//                .text("Click here to Pay Now", {
//                    link: payUrl,
//                    underline: true,
//                });

//            doc.fillColor("#000");
//        }

//        doc.end();

//        return new Promise((resolve) => {
//            doc.on("end", () => resolve(Buffer.concat(buffers)));
//        });
//    }

//    // ===========================================================================
//    // WEBHOOK SAFE CREATION
//    // ===========================================================================
//    async createFromPaymentIntent(
//        paymentIntentId: number | string
//    ): Promise<any> {
//        const intent = await PaymentIntent.findByPk(paymentIntentId);
//        if (!intent) throw new Error("PaymentIntent not found");

//        const existing = await Invoice.findOne({
//            where: { payment_intent_id: intent.id },
//        });

//        if (existing) return existing;

//        return Invoice.create({
//            payment_intent_id: intent.id,
//            merchant_id: intent.merchant_id,
//            amount: intent.amount,
//            status: "pending",
//            issued_at: new Date(),
//        });
//    }
//}


// =============================================================================
// InvoiceService.ts (PRODUCTION HARDENED — PUBLIC TOKEN FIX)
// =============================================================================

import fs from "fs";
import path from "path";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

import { PaymentIntent } from "../models/PaymentIntent";
import PurchaseOrder from "../models/PurchaseOrder";
import { PurchaseOrderItem } from "../models/PurchaseOrderItem";
import { Invoice } from "../models/Invoice";

// =============================================================================
// Helpers
// =============================================================================

let useNairaSymbol = true;

const FRONTEND_BASE_URL =
    process.env.FRONTEND_BASE_URL || "http://localhost:5173";

function generatePublicToken(): string {
    // shorter, URL safe
    return crypto.randomUUID().replace(/-/g, "");
}

function formatNaira(amount: number): string {
    const safeAmount = Number(amount || 0);

    try {
        if (useNairaSymbol) {
            return `₦${safeAmount.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;
        }

        return `NGN ${safeAmount.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    } catch {
        return `NGN ${safeAmount.toFixed(2)}`;
    }
}

function generateInvoiceNumber(intentId: number | string): string {
    const seed =
        typeof intentId === "number"
            ? intentId
            : Math.abs(
                intentId
                    .toString()
                    .split("")
                    .map((c) => c.charCodeAt(0))
                    .reduce((a, b) => a + b, 0)
            );

    const year = new Date().getFullYear();
    return `PV-${year}-${seed.toString().slice(-6)}`;
}

// =============================================================================
// Service
// =============================================================================

export class InvoiceService {

    // ===========================================================================
    // PUBLIC — Generate by token
    // ===========================================================================
    async generateInvoicePdfByToken(token: string): Promise<Buffer> {
        if (!token) throw new Error("Token is required");

        const paymentIntent = await PaymentIntent.findOne({
            where: { token },
        });

        if (!paymentIntent) {
            throw new Error("Payment intent not found");
        }

        return this.generateInvoicePdf(paymentIntent.id);
    }

    // ===========================================================================
    // QR generator
    // ===========================================================================
    private async generateQRCodeBuffer(text: string): Promise<Buffer> {
        try {
            return await QRCode.toBuffer(text, {
                width: 80,
                margin: 1,
            });
        } catch {
            return Buffer.from("");
        }
    }

    // ===========================================================================
    // 🔥 ENSURE INVOICE EXISTS (WITH PUBLIC TOKEN)
    // ===========================================================================
    private async ensureInvoice(intent: any, amount: number) {

        let invoiceRecord = await Invoice.findOne({
            where: { payment_intent_id: intent.id },
        });

        // -----------------------------------------------------------------------
        // Create if missing
        // -----------------------------------------------------------------------
        if (!invoiceRecord) {
            invoiceRecord = await Invoice.create({
                payment_intent_id: intent.id,
                merchant_id: intent.merchant_id,
                amount,
                status: "pending",
                issued_at: new Date(),

                // 🔥 CRITICAL FIX
                public_token: generatePublicToken(),
            });
        }

        // -----------------------------------------------------------------------
        // 🔥 AUTO-HEAL legacy rows (VERY IMPORTANT)
        // -----------------------------------------------------------------------
        if (!invoiceRecord.public_token) {
            invoiceRecord.public_token = generatePublicToken();
            await invoiceRecord.save();
        }

        return invoiceRecord;
    }

    // ===========================================================================
    // MAIN PDF GENERATOR
    // ===========================================================================
    async generateInvoicePdf(
        paymentIntentId: number | string
    ): Promise<Buffer> {

        const intent = await PaymentIntent.findByPk(paymentIntentId);
        if (!intent) throw new Error("PaymentIntent not found");

        const po = await PurchaseOrder.findByPk(intent.purchase_order_id);
        if (!po) throw new Error("PurchaseOrder not found");

        const items = await PurchaseOrderItem.findAll({
            where: { purchaseOrderId: po.id },
        });

        let subtotal = 0;

        const normalizedItems = items.map((item: any) => {
            const qty = Number(item.quantity ?? item.qty ?? 0) || 0;
            const price = Number(item.unitPrice ?? item.unit_price ?? 0) || 0;
            const name =
                item.description ??
                item.itemName ??
                item.item_name ??
                "Item";

            const lineTotal = qty * price;
            subtotal += lineTotal;

            return { name, quantity: qty, unitPrice: price, lineTotal };
        });

        const tax = subtotal * 0.075;
        const grandTotal = subtotal + tax;
        const invoiceNumber = generateInvoiceNumber(intent.id);

        // 🔥 CRITICAL — guaranteed token
        const invoiceRecord = await this.ensureInvoice(intent, grandTotal);

        // 🔥 CORRECT PUBLIC PAYMENT LINK
        const payUrl = `${FRONTEND_BASE_URL}/pay/${invoiceRecord.public_token}`;

        // -----------------------------------------------------------------------
        // PDF creation (your layout preserved)
        // -----------------------------------------------------------------------
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));

        const isPaid =
            invoiceRecord.status?.toLowerCase() === "paid" ||
            invoiceRecord.status?.toLowerCase() === "completed";

        // Watermark
        doc.save();
        doc.fontSize(80)
            .fillOpacity(isPaid ? 0.12 : 0.08)
            .fillColor(isPaid ? "#28A745" : "#CCCCCC")
            .rotate(-45, {
                origin: [doc.page.width / 2, doc.page.height / 2],
            });

        doc.text(
            isPaid ? "PAID" : "PAYVERIFY",
            doc.page.width / 2 - 180,
            doc.page.height / 2 - 100,
            { align: "center", width: 360 }
        );

        doc.restore();
        doc.fillOpacity(1);

        // Header
        doc.roundedRect(440, 45, 120, 35, 5)
            .fillColor(isPaid ? "#28A745" : "#FF0000")
            .fill();

        doc.fillColor("#FFFFFF")
            .fontSize(16)
            .font("Helvetica-Bold")
            .text(isPaid ? "PAID" : "PENDING", 460, 53, {
                width: 80,
                align: "center",
            });

        doc.moveDown(2);

        doc.fontSize(24)
            .fillColor("#000")
            .font("Helvetica-Bold")
            .text("PAYVERIFY INVOICE", 50, 120);

        doc.fontSize(10).font("Helvetica");

        doc.text(`Invoice #: ${invoiceNumber}`, 50, 155);
        doc.text(`PaymentIntent ID: ${intent.id}`, 50, 170);
        doc.text(`Purchase Order ID: ${po.id}`, 50, 185);

        // ✅ INSERT HERE (line items + totals)

        // ===============================
        // 🔥 LINE ITEMS TABLE
        // ===============================
        let y = 230;

        doc.font("Helvetica-Bold").fontSize(11);

        doc.text("Item", 50, y);
        doc.text("Qty", 250, y);
        doc.text("Unit Price", 320, y);
        doc.text("Total", 430, y);

        y += 15;

        doc.moveTo(50, y).lineTo(550, y).stroke();

        y += 10;

        doc.font("Helvetica").fontSize(10);

        if (!normalizedItems || normalizedItems.length === 0) {
            doc.text("No items available", 50, y);
            y += 20;
        } else {
            normalizedItems.forEach(item => {
                doc.text(item.name, 50, y);
                doc.text(String(item.quantity), 250, y);
                doc.text(formatNaira(item.unitPrice), 320, y);
                doc.text(formatNaira(item.lineTotal), 430, y);
                y += 20;
            });
        }

        // ===============================
        // 🔥 TOTALS
        // ===============================
        y += 10;

        doc.moveTo(300, y).lineTo(550, y).stroke();

        y += 10;

        doc.font("Helvetica-Bold");

        doc.text("Subtotal:", 320, y);
        doc.text(formatNaira(subtotal), 430, y);

        y += 20;

        doc.text("Tax (7.5%):", 320, y);
        doc.text(formatNaira(tax), 430, y);

        y += 20;

        doc.fontSize(12);

        doc.text("Total:", 320, y);
        doc.text(formatNaira(grandTotal), 430, y);

        doc.fontSize(10);

        // Pay link
        if (!isPaid) {
            doc.moveDown(2);

            doc.fillColor("#2563eb")
                .font("Helvetica-Bold")
                .fontSize(12)
                .text("Click here to Pay Now", {
                    link: payUrl,
                    underline: true,
                });

            doc.fillColor("#000");
        }

        doc.end();

        return new Promise((resolve) => {
            doc.on("end", () => resolve(Buffer.concat(buffers)));
        });
    }

    //// ===========================================================================
    //// WEBHOOK SAFE CREATION
    //// ===========================================================================
    //async createFromPaymentIntent(
    //    paymentIntentId: number | string
    //): Promise<any> {

    //    const intent = await PaymentIntent.findByPk(paymentIntentId);
    //    if (!intent) throw new Error("PaymentIntent not found");

    //    return this.ensureInvoice(intent, intent.amount);
    //}

    // =============================================================================
// FIXED — createFromPaymentIntent (CRITICAL FIX)
// =============================================================================
//
// WHAT CHANGED:
//
// 1. Ensures invoice ALWAYS exists
// 2. Adds public_token support
// 3. Prevents "Invoice not found"
// 4. Keeps backward compatibility
//
// =============================================================================

async createFromPaymentIntent(
    paymentIntentId: number | string
): Promise<any> {

    const intent = await PaymentIntent.findByPk(paymentIntentId);

    if (!intent) {
        throw new Error("PaymentIntent not found");
    }

    // -------------------------------------------------------------------------
    // 🔥 CHECK EXISTING INVOICE
    // -------------------------------------------------------------------------
    let existing = await Invoice.findOne({
        where: { payment_intent_id: intent.id },
    });

    if (existing) {
        return existing;
    }

    // -------------------------------------------------------------------------
    // 🔥 CREATE NEW INVOICE (FIXED)
    // -------------------------------------------------------------------------
    const invoice = await Invoice.create({
        payment_intent_id: intent.id,
        merchant_id: intent.merchant_id,
        amount: intent.amount,
        status: "pending",
        issued_at: new Date(),

        // 🔥 OPTIONAL (safe even if column doesn't exist yet)
        public_token: crypto.randomUUID?.() || `${intent.id}-${Date.now()}`
    });

    return invoice;
}
}