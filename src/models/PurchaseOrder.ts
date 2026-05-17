import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/db';

/**
 * =============================================================================
 * PurchaseOrderAttributes
 * =============================================================================
 *
 * Defines TypeScript interface aligned with database schema.
 *
 * IMPORTANT:
 * JS naming must be camelCase
 * DB naming handled via `field`
 *
 * totalAmount → maps to total_amount
 *
 * =============================================================================
 */

interface PurchaseOrderAttributes {
    id: number;
    poReference: string;
    merchantId: number;
    customerEmail?: string;
    status: string;
    totalAmount: string; // DECIMAL stored as string in Sequelize
    description?: string;
    dueDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * =============================================================================
 * PurchaseOrder Sequelize Model
 * =============================================================================
 */

class PurchaseOrder
    extends Model<PurchaseOrderAttributes>
    implements PurchaseOrderAttributes {

    public id!: number;
    public poReference!: string;
    public merchantId!: number;
    public customerEmail?: string;
    public status!: string;

    /**
     * CRITICAL FIX:
     * Must be totalAmount NOT totalamount
     */
    public totalAmount!: string;

    public description?: string;
    public dueDate?: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

PurchaseOrder.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        poReference: {
            type: DataTypes.STRING(50),
            field: 'po_reference',
            unique: true,
            allowNull: false
        },

        merchantId: {
            type: DataTypes.INTEGER,
            field: 'merchant_id',
            allowNull: false,
        },

        customerEmail: {
            type: DataTypes.STRING(255),
            field: 'customer_email',
            allowNull: true
        },

        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'pending',
            allowNull: false
        },

        /**
         * CRITICAL FIX
         *
         * JS property: totalAmount
         * DB column: total_amount
         */
        totalAmount: {
            type: DataTypes.DECIMAL(12, 2),
            field: 'total_amount',
            allowNull: false,
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        dueDate: {
            type: DataTypes.DATEONLY,
            field: 'due_date',
            allowNull: true,
        },

        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at',
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },

        updatedAt: {
            type: DataTypes.DATE,
            field: 'updated_at',
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'purchase_orders',
        timestamps: true,
        underscored: true,
    }
);

export default PurchaseOrder;
