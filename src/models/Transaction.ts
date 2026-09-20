// src/models/Transaction.ts
// -----------------------------------------------------------------------------
// Why changes:
// - File name now matches the model (prevents import confusion).
// - Keeps your helpers (createForMerchant, findByMerchant).
// - Explicit enum types for status.
// -----------------------------------------------------------------------------

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/db';
import type Merchant from './Merchant';

export type TxStatus = 'pending' | 'completed' | 'failed';

export interface TransactionAttributes {
    id: number;
    amount: number;
    status: TxStatus;
    merchantId: number;
    reference: string;
    qrUrl?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export type TransactionCreationAttributes = Optional<
    TransactionAttributes,
    'id' | 'qrUrl' | 'createdAt' | 'updatedAt'
>;

export default class Transaction
    extends Model<TransactionAttributes, TransactionCreationAttributes>
    implements TransactionAttributes {
    public id!: number;
    public amount!: number;
    public status!: TxStatus;
    public merchantId!: number;
    public reference!: string;
    public qrUrl?: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public merchant?: Merchant;

    // Helper: create a transaction for a merchant
    static async createForMerchant(
        merchantId: number,
        amount: number,
        status: TxStatus,
        reference: string,
        qrUrl?: string | null
    ) {
        return this.create({ merchantId, amount, status, reference, qrUrl });
    }

    // Helper: list transactions by merchant
    static async findByMerchant(merchantId: number, limit = 10, offset = 0) {
        return this.findAndCountAll({
            where: { merchantId },
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });
    }
}

Transaction.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        amount: { type: DataTypes.FLOAT, allowNull: false },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'failed'),
            allowNull: false,
            defaultValue: 'pending',
        },
        merchantId: { type: DataTypes.INTEGER, allowNull: false },
        reference: { type: DataTypes.STRING, allowNull: false, unique: true },
        qrUrl: { type: DataTypes.STRING, allowNull: true },
    },
    {
        sequelize,
        tableName: 'transactions',
        modelName: 'Transaction',
        timestamps: true,
    }
);












