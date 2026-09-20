// src/controllers/bankController.ts
// -----------------------------------------------------------------------------
// What changed & why
//
// EXISTING CHANGES:
// - ❌ Removed Turnstile verification: no token reading, no /siteverify call.
// - ✅ Still sends the registration email to the bank with admin BCC.
// - 🔁 Registration, approval, and rejection behavior remains unchanged.
//
// NEW TYPESCRIPT / RENDER BUILD FIX:
// - ✅ Normalized req.params.id before passing it to Bank.findByPk().
// - WHY:
//   With the current Express type definitions, req.params.id may be inferred as:
//       string | string[]
//
//   Sequelize's findByPk() expects a single valid identifier, not string[].
//   This caused the Render production TypeScript build error:
//
//       TS2345: Argument of type 'string | string[]'
//       is not assignable to parameter of type 'Identifier'
//
// - FIX:
//   If the route parameter is an array, use the first value.
//   Otherwise, use the string value directly.
//
// - This fix was applied to:
//     1. approveBank()
//     2. rejectBank()
//
// - No API route behavior or business logic was changed.
// -----------------------------------------------------------------------------

import { Request, Response } from 'express';
import Bank from '../models/Bank';
import {
    sendConfirmationEmail,
    sendConfirmationEmailWithAdminBcc,
} from '../services/emailService';
import { getApprovalEmailTemplate } from '../templates/getApprovalEmailTemplate';


// =============================================================================
// REGISTER BANK
// =============================================================================

export const registerBank = async (req: Request, res: Response) => {
    try {
        const {
            bankName,
            contactEmail,
            contactPhone,
            contactPerson,
        } = req.body;

        if (
            !bankName ||
            !contactEmail ||
            !contactPhone ||
            !contactPerson
        ) {
            return res.status(400).json({
                error: 'Missing required fields',
            });
        }

        const bank = await Bank.create({
            bankName,
            contactEmail,
            contactPhone,
            contactPerson,
            status: 'Pending',
        });

        // ---------------------------------------------------------------------
        // Email bank + silently BCC admins
        // ---------------------------------------------------------------------
        await sendConfirmationEmailWithAdminBcc({
            to: bank.contactEmail,

            subject:
                `PayVerify • Registration received for ${bank.bankName}`,

            title:
                `Thanks, ${bank.contactPerson || 'there'}!`,

            body:
                `We’ve received your bank registration for ` +
                `<strong>${bank.bankName}</strong>.<br/>` +
                `Status: <strong>Pending approval</strong>. ` +
                `Our team will review and notify you once approved.` +
                `<br/><br/>` +
                `<small>` +
                `Ref: Bank #${bank.id} • Submitted ${new Date(
                    bank.createdAt!
                ).toLocaleString()}` +
                `</small>`,

            ctaUrl:
                `${process.env.APP_BASE_URL || ''}/bank-login`,

            ctaLabel:
                'Bank Login',
        });

        return res.status(201).json({
            message: 'Bank registration submitted',
            bank,
        });

    } catch (error) {

        console.error(
            'Error in registerBank:',
            error
        );

        return res.status(500).json({
            error: 'Failed to register bank',
        });
    }
};


// =============================================================================
// GET PENDING BANKS
// =============================================================================

export const getPendingBanks = async (
    _req: Request,
    res: Response
) => {
    try {

        const banks = await Bank.findAll({
            where: {
                status: 'Pending',
            },
        });

        return res.status(200).json(banks);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: 'Failed to fetch pending banks',
        });
    }
};


// =============================================================================
// APPROVE BANK
// =============================================================================

export const approveBank = async (
    req: Request,
    res: Response
) => {
    try {

        // ---------------------------------------------------------------------
        // NEW FIX:
        //
        // Express typings may represent a route parameter as:
        //
        //     string | string[]
        //
        // Sequelize findByPk() requires one identifier.
        //
        // Therefore:
        // - If id is an array, use the first value.
        // - Otherwise, use the string value directly.
        //
        // This fixes:
        //
        // TS2345:
        // Argument of type 'string | string[]'
        // is not assignable to parameter of type 'Identifier'.
        // ---------------------------------------------------------------------

        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const bank = await Bank.findByPk(id);

        if (!bank) {
            return res.status(404).json({
                message: 'Bank not found',
            });
        }

        bank.status = 'Active';

        await bank.save();

        await sendConfirmationEmail(
            bank.contactEmail,
            'Your Bank Has Been Approved',
            getApprovalEmailTemplate(
                bank.bankName,
                bank.contactPerson
            )
        );

        return res.status(200).json({
            message: 'Bank approved and notified',
            bank,
        });

    } catch (error) {

        console.error(
            'Error in approveBank:',
            error
        );

        return res.status(500).json({
            error: 'Error approving bank',
        });
    }
};


// =============================================================================
// REJECT BANK
// =============================================================================

export const rejectBank = async (
    req: Request,
    res: Response
) => {
    try {

        // ---------------------------------------------------------------------
        // NEW FIX:
        //
        // Normalize the Express route parameter before passing it to Sequelize.
        //
        // req.params.id:
        //     string | string[]
        //
        // normalized id:
        //     string
        //
        // This resolves the Render TypeScript production build error.
        // ---------------------------------------------------------------------

        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const bank = await Bank.findByPk(id);

        if (!bank) {
            return res.status(404).json({
                message: 'Bank not found',
            });
        }

        bank.status = 'Rejected';

        await bank.save();

        const subject =
            'Your Bank Registration was not Approved';

        const html = `
            <p>Hello ${bank.contactPerson},</p>

            <p>
                Thank you for applying to PayVerify on behalf of
                <strong>${bank.bankName}</strong>.
                After review, we’re unable to approve this registration
                at this time.
            </p>

            <p>
                If you have additional documents or questions,
                please reply to this email and our team will assist.
            </p>

            <p>— PayVerify Team</p>
        `;

        await sendConfirmationEmail(
            bank.contactEmail,
            subject,
            html
        );

        return res.status(200).json({
            message: 'Bank rejected and notified',
            bank,
        });

    } catch (error) {

        console.error(
            'Error in rejectBank:',
            error
        );

        return res.status(500).json({
            error: 'Error rejecting bank',
        });
    }
};