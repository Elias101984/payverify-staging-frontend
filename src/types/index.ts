import type { ModelStatic } from 'sequelize';

import type { User } from '../models/User';
import type { Merchant } from '../models/Merchant';

import type BankAccount from '../models/BankAccount';
import type Transaction from '../models/Transaction';
import type Payment from '../models/Payment';
import type AuditLog from '../models/Auditlog';
import type PaymentConfirmationReceipt from '../models/PaymentConfirmationReceipt';
import type Bank from '../models/Bank';
import type BankLoginToken from '../models/BankLoginToken';

import type PurchaseOrder from '../models/PurchaseOrder';
import type { PurchaseOrderItem } from '../models/PurchaseOrderItem';

// FIXED HERE
import type InventoryItem from '../models/InventoryItem';


export { PaymentIntent } from "../models/PaymentIntent";



export interface DatabaseModels {

    User: ModelStatic<User>;

    Merchant: ModelStatic<Merchant>;

    BankAccount: ModelStatic<BankAccount>;

    Transaction: ModelStatic<Transaction>;

    Payment: ModelStatic<Payment>;

    AuditLog: ModelStatic<AuditLog>;

    PaymentConfirmationReceipt: ModelStatic<PaymentConfirmationReceipt>;

    Bank: ModelStatic<Bank>;

    BankLoginToken: ModelStatic<BankLoginToken>;

    PurchaseOrder: ModelStatic<PurchaseOrder>;

    PurchaseOrderItem: ModelStatic<PurchaseOrderItem>;

    InventoryItem: ModelStatic<typeof InventoryItem>;

}
