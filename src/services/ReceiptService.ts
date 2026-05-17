import PDFDocument from "pdfkit";

export class ReceiptService {

    generateReceipt(
        invoice: any
    ): Buffer {

        const doc =
            new PDFDocument();

        const buffers: Buffer[] =
            [];

        doc.on(
            "data",
            buffers.push.bind(buffers)
        );

        doc.text(
            "PayVerify Receipt"
        );

        doc.text(
            `Invoice ID: ${invoice.id}`
        );

        doc.text(
            `Amount: ${invoice.amount}`
        );

        doc.end();

        return Buffer.concat(buffers);

    }

}
