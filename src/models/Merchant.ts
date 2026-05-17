

//// src/models/Merchants.ts
//// -----------------------------------------------------------------------------
//// What changed & why
//// - ❌ Removed `field: 'bankid'` on `bankId`. Your DB has "bankId" (camelCase).
////   Keeping that mapping made Sequelize query "bankid" AS "bankId" and Postgres
////   threw 42703 (column does not exist).
//// - ✅ status is a strict union type everywhere to prevent invalid strings.
//// - ✅ bankId remains INTEGER NULL with FK semantics (safe for existing rows).
//// -----------------------------------------------------------------------------

//import { Model, DataTypes, Optional, Association } from 'sequelize';
//import { sequelize } from '../config/db';
//import { User } from './User';

//export interface MerchantAttributes {
//    id: number;
//    name: string;
//    userId: number;
//    cac_number: string;
//    tin_number?: string | null;
//    bvn?: string | null;
//    account_number: string;
//    bank_name: string;
//    qrToken?: string | null;
//    qrUrl?: string | null;
//    qrGeneratedAt?: Date | null;
//    createdAt: Date;
//    updatedAt: Date;
//    email?: string | null;

//    // Normalized approval/ownership fields
//    bankId?: number | null; // FK -> banks.id, nullable until assigned
//    status: 'pending' | 'approved' | 'rejected';
//}

//export interface MerchantCreationAttributes
//    extends Optional<
//        MerchantAttributes,
//        | 'id'
//        | 'tin_number'
//        | 'bvn'
//        | 'qrToken'
//        | 'qrUrl'
//        | 'qrGeneratedAt'
//        | 'createdAt'
//        | 'updatedAt'
//        | 'email'
//        | 'bankId' // may be null at create
//        | 'status' // DB/model default
//    > { }

//export class Merchant
//    extends Model<MerchantAttributes, MerchantCreationAttributes>
//    implements MerchantAttributes {
//    static create(arg0: { name: string; userId: any; }) {
//        throw new Error('Method not implemented.');
//    }
//    public id!: number;
//    public name!: string;
//    public userId!: number;
//    public cac_number!: string;
//    public tin_number!: string | null;
//    public bvn!: string | null;
//    public account_number!: string;
//    public bank_name!: string;
//    public qrToken!: string | null;
//    public qrUrl!: string | null;
//    public qrGeneratedAt!: Date | null;
//    public createdAt!: Date;
//    public updatedAt!: Date;
//    public email?: string | null;

//    public bankId?: number | null;
//    public status!: 'pending' | 'approved' | 'rejected';

//    // typed for eager loads (e.g., include: [{ model: User, as: 'user' }])
//    public user?: User;

//    public static associations: {
//        user: Association<Merchant, User>;
//    };
//}

//Merchant.init(
//    {
//        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
//        name: { type: DataTypes.STRING, allowNull: false },
//        userId: {
//            type: DataTypes.INTEGER,
//            allowNull: false,
//            references: { model: User, key: 'id' },
//            onDelete: 'CASCADE',
//        },
//        cac_number: { type: DataTypes.STRING, allowNull: false, unique: true },
//        tin_number: { type: DataTypes.STRING, allowNull: true },
//        bvn: { type: DataTypes.STRING, allowNull: true },
//        account_number: { type: DataTypes.STRING, allowNull: false },
//        bank_name: { type: DataTypes.STRING, allowNull: false },
//        qrToken: { type: DataTypes.TEXT, allowNull: true, comment: 'JWT payload encoded for QR code' },
//        qrUrl: { type: DataTypes.STRING, allowNull: true, comment: 'Cloudinary image URL of QR code' },
//        qrGeneratedAt: { type: DataTypes.DATE, allowNull: true, comment: 'When the QR code was generated' },
//        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
//        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
//        email: { type: DataTypes.STRING, allowNull: true },

//        // ✅ Map directly to the DB column "bankId" (no field override)
//        bankId: {
//            type: DataTypes.INTEGER,
//            allowNull: true,
//            references: { model: 'banks', key: 'id' },
//            onUpdate: 'CASCADE',
//            onDelete: 'SET NULL',
//        },

//        status: {
//            type: DataTypes.STRING,
//            allowNull: false,
//            defaultValue: 'pending',
//            validate: { isIn: [['pending', 'approved', 'rejected']] },
//        },
//    },
//    {
//        sequelize,
//        tableName: 'merchants',
//        timestamps: true,
//    }
//);

//// (Optional) If you maintain associations elsewhere, keep them there.
//// Merchant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

//export default Merchant;





























// src/models/Merchant.ts
// -----------------------------------------------------------------------------
// Why this rewrite?
// - Removed the custom `static create(...)` (it was overriding Sequelize's
//   built-in signature and caused static-side type errors).
// - Switched to Sequelize's typing helpers (`InferAttributes`,
//   `InferCreationAttributes`, `CreationOptional`, `ForeignKey`) so creation vs.
//   persisted attributes are inferred correctly (e.g., `id`, timestamps).
// - Kept `bankId` as a nullable FK (no `field` remapping) to match the actual
//   DB column name and avoid 42703 "column does not exist" issues.
// - Narrowed `status` to a string union and validated at the DB level as well.
// - Left associations to be wired in your central `applyAssociations()` to avoid
//   import-order problems.
// -----------------------------------------------------------------------------

import {
    Model,
    DataTypes,
    CreationOptional,
    InferAttributes,
    InferCreationAttributes,
    ForeignKey,
} from 'sequelize';
import { sequelize } from '../config/db';
import { User } from './User';

// Tip: if you have a Banks model, you can import its type to strongly type bankId
// import Bank from './Bank';

export type MerchantStatus = 'pending' | 'approved' | 'rejected';

export class Merchant extends Model<
    // Attributes that exist on an instance at runtime
    InferAttributes<Merchant>,
    // Attributes accepted on creation (created via Merchant.create / build)
    InferCreationAttributes<Merchant>
> {
    // ---- Columns (runtime attributes) ----
    declare id: CreationOptional<number>;

    declare name: string;

    // Foreign keys
    declare userId: ForeignKey<User['id']>;
    declare bankId: number | null; // nullable until assigned; references banks.id

    // Core business fields
    declare cac_number: string;
    declare tin_number: string | null;
    declare bvn: string | null;
    declare account_number: string;
    declare bank_name: string;

    // QR metadata
    declare qrToken: string | null;       // JWT or payload used to render/verify QR
    declare qrUrl: string | null;         // Cloudinary (or other) URL for the QR image
    declare qrGeneratedAt: Date | null;   // when QR was generated

    // Contact
    declare email: string | null;

    // Workflow
    declare status: MerchantStatus;

    // Sequelize-managed timestamps
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    // ---- Associations (optional typed props for eager loads) ----
    // declare user?: User;

    // Prefer wiring associations in a central `applyAssociations()` to avoid
    // circular import timing. Example (elsewhere):
    // Merchant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}

Merchant.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            // Using table name avoids class import order issues
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },

        // Business identifiers
        cac_number: { type: DataTypes.STRING, allowNull: false, unique: true },
        tin_number: { type: DataTypes.STRING, allowNull: true },
        bvn: { type: DataTypes.STRING, allowNull: true },

        // Banking / settlement
        account_number: { type: DataTypes.STRING, allowNull: false },
        bank_name: { type: DataTypes.STRING, allowNull: false },

        // QR-related fields
        qrToken: { type: DataTypes.TEXT, allowNull: true },
        qrUrl: { type: DataTypes.STRING, allowNull: true },
        qrGeneratedAt: { type: DataTypes.DATE, allowNull: true },

        // Contact
        email: { type: DataTypes.STRING, allowNull: true },

        // Nullable FK to banks.id (column name is exactly "bankId" in DB)
        bankId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'banks', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
        },

        // Workflow / approval status
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'pending',
            validate: { isIn: [['pending', 'approved', 'rejected']] },
            comment: 'Approval state for the merchant onboarding workflow',
        },
        createdAt: '',
        updatedAt: ''
    },
    {
        sequelize,
        tableName: 'merchants',
        timestamps: true,

        // Optional: add sensible indexes for common lookups
        indexes: [
            { fields: ['userId'] },
            { fields: ['bankId'] },
            { unique: true, fields: ['cac_number'] },
            // example: { fields: ['status'] },
        ],
    }
);

export default Merchant;
