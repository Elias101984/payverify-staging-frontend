// src/models/index.ts
// ------------------------------------------------------------------------------------
// PAYVERIFY CENTRAL MODEL REGISTRY
//
// PURPOSE:
// Provides a single source of truth for ALL Sequelize models.
//
// DESIGN:
// ✔ Uses CLASS-BASED Sequelize models
// ✔ No factory initialization required
// ✔ Safe for use across services, controllers, and associations
//
// CRITICAL:
// These models already executed Model.init() internally.
// This file ONLY exports them.
//
// ------------------------------------------------------------------------------------

import { Sequelize } from 'sequelize';
import { sequelize } from '../config/db';

// ------------------------------------------------------------------------------------
// CORE DOMAIN MODELS
// ------------------------------------------------------------------------------------

export { User } from './User';

export { Merchant } from './Merchant';

export { default as BankAccount } from './BankAccount';

export { default as Transaction } from './Transaction';

export { default as Payment } from './Payment';

export { default as AuditLog } from './Auditlog';

export { default as PaymentConfirmationReceipt }
    from './PaymentConfirmationReceipt';

export { default as Bank }
    from './Bank';

export { default as BankLoginToken }
    from './BankLoginToken';

// ------------------------------------------------------------------------------------
// PURCHASE ORDER DOMAIN MODELS
// ------------------------------------------------------------------------------------

export { default as PurchaseOrder }
    from './PurchaseOrder';

export { PurchaseOrderItem }
    from './PurchaseOrderItem';

export { default as InventoryItem }
    from './InventoryItem';

// ------------------------------------------------------------------------------------
// EXPORT SEQUELIZE CORE
// ------------------------------------------------------------------------------------

export {
    sequelize,
    Sequelize
};

// ------------------------------------------------------------------------------------
// EXPORT TYPES
// ------------------------------------------------------------------------------------

export type { DatabaseModels } from '../types';
