//// src/models/PurchaseOrderItem.ts
//// ------------------------------------------------------------------------------------
//// FINAL VERSION MATCHING ACTUAL DATABASE SCHEMA EXACTLY
////
//// This version maps ALL fields correctly using `field`
//// so Sequelize aligns perfectly with PostgreSQL.
////
//// This prevents:
////
//// ✔ column does not exist errors
//// ✔ index creation failures
//// ✔ sync crashes
//// ------------------------------------------------------------------------------------

//import {
//    Model,
//    DataTypes,
//    Optional
//} from 'sequelize';

//import { sequelize } from '../config/db';

//// ------------------------------------------------------------------------------------
//// ATTRIBUTES INTERFACE
//// ------------------------------------------------------------------------------------

//export interface PurchaseOrderItemAttributes {

//    id: string;

//    purchaseOrderId: string;

//    inventoryItemId?: string;

//    itemName: string;

//    quantity: number;

//    unitPrice: number;

//    lineTotal: number;

//    description?: string;

//    createdAt?: Date;

//    updatedAt?: Date;
//}

//export interface PurchaseOrderItemCreationAttributes
//    extends Optional<
//        PurchaseOrderItemAttributes,
//        'id'
//    > { }

//// ------------------------------------------------------------------------------------
//// MODEL CLASS
//// ------------------------------------------------------------------------------------

//export class PurchaseOrderItem extends Model<
//    PurchaseOrderItemAttributes,
//    PurchaseOrderItemCreationAttributes
//>
//    implements PurchaseOrderItemAttributes {

//    public id!: string;

//    public purchaseOrderId!: string;

//    public inventoryItemId?: string;

//    public itemName!: string;

//    public quantity!: number;

//    public unitPrice!: number;

//    public lineTotal!: number;

//    public description?: string;

//    public readonly createdAt!: Date;

//    public readonly updatedAt!: Date;
//}

//// ------------------------------------------------------------------------------------
//// INIT MODEL
//// ------------------------------------------------------------------------------------

//PurchaseOrderItem.init({

//    id: {
//        type: DataTypes.UUID,
//        defaultValue: DataTypes.UUIDV4,
//        primaryKey: true,
//    },

//    purchaseOrderId: {
//        type: DataTypes.UUID,
//        allowNull: false,
//        field: 'purchase_order_id', // exact DB column
//    },

//    inventoryItemId: {
//        type: DataTypes.UUID,
//        allowNull: true,
//        field: 'inventory_item_id',
//    },

//    itemName: {
//        type: DataTypes.STRING(255),
//        allowNull: false,
//        field: 'item_name',
//    },

//    quantity: {
//        type: DataTypes.INTEGER,
//        allowNull: false,
//    },

//    unitPrice: {
//        type: DataTypes.DECIMAL(10, 2),
//        allowNull: false,
//        field: 'unit_price',
//    },

//    lineTotal: {
//        type: DataTypes.DECIMAL(15, 2),
//        allowNull: false,
//        field: 'line_total',
//    },

//    description: {
//        type: DataTypes.TEXT,
//        allowNull: true,
//        field: 'description',
//    },

//    createdAt: {
//        type: DataTypes.DATE,
//        field: 'created_at',
//    },

//    updatedAt: {
//        type: DataTypes.DATE,
//        field: 'updated_at',
//    },

//},
//    {
//        sequelize,

//        tableName: 'purchase_order_items',

//        modelName: 'PurchaseOrderItem',

//        timestamps: true,

//        underscored: true,

//        indexes: [

//            {
//                name: 'idx_purchase_order_items_purchase_order_id',
//                fields: ['purchase_order_id'],
//            },

//            {
//                name: 'idx_purchase_order_items_inventory_item_id',
//                fields: ['inventory_item_id'],
//            }

//        ]
//    });


// src/models/PurchaseOrderItem.ts

import {
    Model,
    DataTypes,
    Optional
} from 'sequelize';

import { sequelize } from '../config/db';

// ------------------------------------------------------------------------------------
// ATTRIBUTES INTERFACE — MUST MATCH DATABASE EXACTLY
// ------------------------------------------------------------------------------------

export interface PurchaseOrderItemAttributes {

    id: number; // FIXED: integer in DB

    purchaseOrderId: number; // FIXED: integer in DB

    inventoryItemId?: number;

    itemName: string;

    quantity: number;

    unitPrice: string; // DECIMAL → string in Sequelize

    lineTotal: string; // DECIMAL → string

    description?: string;

    createdAt?: Date;

    updatedAt?: Date;
}

export interface PurchaseOrderItemCreationAttributes
    extends Optional<
        PurchaseOrderItemAttributes,
        'id'
    > { }

// ------------------------------------------------------------------------------------
// MODEL CLASS
// ------------------------------------------------------------------------------------

export class PurchaseOrderItem extends Model<
    PurchaseOrderItemAttributes,
    PurchaseOrderItemCreationAttributes
>
    implements PurchaseOrderItemAttributes {

    public id!: number;

    public purchaseOrderId!: number;

    public inventoryItemId?: number;

    public itemName!: string;

    public quantity!: number;

    public unitPrice!: string;

    public lineTotal!: string;

    public totalamount!: string;

    public description?: string;

    public readonly createdAt!: Date;

    public readonly updatedAt!: Date;
}

// ------------------------------------------------------------------------------------
// INIT MODEL
// ------------------------------------------------------------------------------------

PurchaseOrderItem.init({

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },

    purchaseOrderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'purchase_order_id',
    },

    inventoryItemId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'inventory_item_id',
    },

    itemName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'item_name',
    },

    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    unitPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'unit_price',
    },

    lineTotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'line_total',
    },

    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'description',
    },

    createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
    },

    updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at',
    },

},
    {
        sequelize,
        tableName: 'purchase_order_items',
        modelName: 'PurchaseOrderItem',
        timestamps: true,
        underscored: true,
    });

