// =============================================================================
// Invoice Model (UPDATED — PAYSTACK + EMAIL READY)
// =============================================================================
// PURPOSE:
// - Represents merchant invoices
// - Supports Paystack payment flow
// - Supports public invoice access
// - Supports automatic email receipts
//
// WHAT WAS ADDED:
// ✅ public_token (for secure public invoice links)
// ✅ customer_email (for automatic receipts)
// ✅ indexes for performance
//
// WHAT WAS PRESERVED:
// ✅ All existing fields unchanged
// ✅ Table name unchanged
// ✅ Underscored timestamps preserved
// =============================================================================

import {
    Model,
    DataTypes,
    Optional
} from "sequelize";

import { sequelize } from "../config/db";

// =============================================================================
// Attributes
// =============================================================================

export interface InvoiceAttributes {

    id: number;

    payment_intent_id: string;

    merchant_id: number;

    amount: number;

    status: string;

    issued_at: Date;

    // -------------------------------------------------------------------------
    // NEW — for public invoice payment links
    // -------------------------------------------------------------------------
    public_token?: string;

    // -------------------------------------------------------------------------
    // NEW — required for automatic email receipts
    // -------------------------------------------------------------------------
    customer_email?: string;

    created_at?: Date;

    updated_at?: Date;
}

interface InvoiceCreationAttributes
    extends Optional<
        InvoiceAttributes,
        | "id"
        | "created_at"
        | "updated_at"
        | "public_token"
        | "customer_email"
    > { }

// =============================================================================
// Model
// =============================================================================

export class Invoice
    extends Model<
        InvoiceAttributes,
        InvoiceCreationAttributes
    >
    implements InvoiceAttributes {

    public id!: number;

    public payment_intent_id!: string;

    public merchant_id!: number;

    public amount!: number;

    public status!: string;

    public issued_at!: Date;

    // NEW fields
    public public_token?: string;
    public customer_email?: string;

    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

// =============================================================================
// Init
// =============================================================================

Invoice.init({

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    payment_intent_id: {
        type: DataTypes.UUID,
        allowNull: false
    },

    merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
    },

    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending"
    },

    issued_at: {
        type: DataTypes.DATE,
        allowNull: false
    },

    // -------------------------------------------------------------------------
    // NEW — secure public invoice access token
    // -------------------------------------------------------------------------
    public_token: {
        type: DataTypes.STRING(120),
        allowNull: true,
        unique: true
    },

    // -------------------------------------------------------------------------
    // NEW — used for automatic receipt emails
    // -------------------------------------------------------------------------
    customer_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
            isEmail: true
        }
    }

},
    {
        sequelize,
        tableName: "invoices",
        timestamps: true,
        underscored: true,

        // -------------------------------------------------------------------------
        // Performance indexes
        // -------------------------------------------------------------------------
        indexes: [
            {
                unique: true,
                fields: ["public_token"]
            },
            {
                fields: ["merchant_id"]
            },
            {
                fields: ["status"]
            }
        ]
    });

export default Invoice;