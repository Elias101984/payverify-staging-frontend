// src/models/associations.ts
// ------------------------------------------------------------------------------------
// PAYVERIFY ASSOCIATION REGISTRY
//
// PURPOSE:
// Registers ALL Sequelize model relationships.
//
// CRITICAL:
// Must be called once at application startup.
//
// Example:
// import { applyAssociations } from './models/associations';
// applyAssociations();
//
// ------------------------------------------------------------------------------------

import { User } from './User';
import { Merchant } from './Merchant';
import BankAccount from './BankAccount';
import Transaction from './Transaction';
import Payment from './Payment';
import AuditLog from './Auditlog';
import PaymentConfirmationReceipt from './PaymentConfirmationReceipt';
import Bank from './Bank';
import BankLoginToken from './BankLoginToken';

import PurchaseOrder from './PurchaseOrder';
import { PurchaseOrderItem } from './PurchaseOrderItem';
import InventoryItem from './InventoryItem';

// Prevent duplicate execution
let applied = false;

/**
 * Apply all Sequelize model associations safely.
 */
export function applyAssociations(): void {

    if (applied) {
        console.log('Associations already applied.');
        return;
    }

    applied = true;

    console.log('Applying Sequelize associations...');

    // --------------------------------------------------------------------------------
    // USER ↔ MERCHANT
    // --------------------------------------------------------------------------------

    User.hasOne(Merchant, {
        foreignKey: 'userId',
        as: 'merchant',
        onDelete: 'CASCADE'
    });

    Merchant.belongsTo(User, {
        foreignKey: 'userId',
        as: 'user'
    });

    // --------------------------------------------------------------------------------
    // MERCHANT ↔ BANK ACCOUNT
    // --------------------------------------------------------------------------------

    Merchant.hasMany(BankAccount, {
        foreignKey: 'merchantId',
        as: 'bankAccounts',
        onDelete: 'CASCADE'
    });

    BankAccount.belongsTo(Merchant, {
        foreignKey: 'merchantId',
        as: 'merchant'
    });

    // --------------------------------------------------------------------------------
    // MERCHANT ↔ TRANSACTION
    // --------------------------------------------------------------------------------

    Merchant.hasMany(Transaction, {
        foreignKey: 'merchantId',
        as: 'transactions',
        onDelete: 'CASCADE'
    });

    Transaction.belongsTo(Merchant, {
        foreignKey: 'merchantId',
        as: 'merchant'
    });

    // --------------------------------------------------------------------------------
    // TRANSACTION ↔ PAYMENT
    // --------------------------------------------------------------------------------

    Transaction.hasOne(Payment, {
        foreignKey: 'transactionId',
        as: 'payment',
        onDelete: 'CASCADE'
    });

    Payment.belongsTo(Transaction, {
        foreignKey: 'transactionId',
        as: 'transaction'
    });

    // --------------------------------------------------------------------------------
    // PAYMENT ↔ AUDIT LOG
    // --------------------------------------------------------------------------------

    Payment.hasMany(AuditLog, {
        foreignKey: 'paymentId',
        as: 'auditLogs',
        onDelete: 'CASCADE'
    });

    AuditLog.belongsTo(Payment, {
        foreignKey: 'paymentId',
        as: 'payment'
    });

    // --------------------------------------------------------------------------------
    // PAYMENT ↔ CONFIRMATION RECEIPT
    // --------------------------------------------------------------------------------

    Payment.hasOne(PaymentConfirmationReceipt, {
        foreignKey: 'paymentId',
        as: 'confirmationReceipt',
        onDelete: 'CASCADE'
    });

    PaymentConfirmationReceipt.belongsTo(Payment, {
        foreignKey: 'paymentId',
        as: 'payment'
    });

    // --------------------------------------------------------------------------------
    // BANK ↔ LOGIN TOKEN
    // --------------------------------------------------------------------------------

    Bank.hasMany(BankLoginToken, {
        foreignKey: 'bankId',
        as: 'loginTokens',
        onDelete: 'CASCADE'
    });

    BankLoginToken.belongsTo(Bank, {
        foreignKey: 'bankId',
        as: 'bank'
    });

    // --------------------------------------------------------------------------------
    // MERCHANT ↔ PURCHASE ORDER
    // --------------------------------------------------------------------------------

    Merchant.hasMany(PurchaseOrder, {
        foreignKey: 'merchantId',
        as: 'purchaseOrders',
        onDelete: 'CASCADE'
    });

    PurchaseOrder.belongsTo(Merchant, {
        foreignKey: 'merchantId',
        as: 'merchant'
    });

    // --------------------------------------------------------------------------------
    // PURCHASE ORDER ↔ PURCHASE ORDER ITEMS
    // --------------------------------------------------------------------------------

    PurchaseOrder.hasMany(PurchaseOrderItem, {
        foreignKey: 'purchaseOrderId',
        as: 'items',
        onDelete: 'CASCADE'
    });

    PurchaseOrderItem.belongsTo(PurchaseOrder, {
        foreignKey: 'purchaseOrderId',
        as: 'purchaseOrder'
    });

    // --------------------------------------------------------------------------------
    // INVENTORY ITEM ↔ PURCHASE ORDER ITEMS
    // --------------------------------------------------------------------------------

    InventoryItem.hasMany(PurchaseOrderItem, {
        foreignKey: 'inventoryItemId',
        as: 'orderItems'
    });

    PurchaseOrderItem.belongsTo(InventoryItem, {
        foreignKey: 'inventoryItemId',
        as: 'inventoryItem'
    });

    console.log('All Sequelize associations successfully applied.');
}
