// =============================================================================
// Payment.ts (FINAL — COMPATIBLE + DB SAFE)
// =============================================================================
// PURPOSE
// Sequelize model for payments table
//
// FIXES APPLIED
// ✅ Added default export (fixes TS2613 everywhere)
// ✅ Keeps named export for flexibility
// ✅ Correct DB column mappings
// ✅ Timestamp mapping fixed
// ✅ Strong typing added
// =============================================================================

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

// =============================================================================
// Types
// =============================================================================

export interface PaymentAttributes {
    id: number;
    transactionId?: number | null;
    bankAccountId?: number | null;
    amount: number;
    method: string;
    status: string;
    paidAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

type PaymentCreationAttributes = Optional<
    PaymentAttributes,
    "id" | "transactionId" | "bankAccountId" | "paidAt" | "createdAt" | "updatedAt"
>;

// =============================================================================
// Model
// =============================================================================

export class Payment
    extends Model<PaymentAttributes, PaymentCreationAttributes>
    implements PaymentAttributes {
    public id!: number;
    public transactionId!: number | null;
    public bankAccountId!: number | null;
    public amount!: number;
    public method!: string;
    public status!: string;
    public paidAt!: Date | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

// =============================================================================
// Init
// =============================================================================

Payment.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        // ✅ maps to: transactionid
        transactionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "transactionid",
        },

        // ✅ maps to: bank_account_id
        bankAccountId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "bank_account_id",
        },

        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },

        method: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        status: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        paidAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "paidat",
        },

        // ⭐ CRITICAL — matches your DB
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "createdat",
        },

        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "updatedat",
        },
    },
    {
        sequelize,
        tableName: "payments",
        timestamps: true,
    }
);

// =============================================================================
// EXPORTS (VERY IMPORTANT)
// =============================================================================

export default Payment; // ✅ fixes your TS errors everywhere