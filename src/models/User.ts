// src/models/User.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/db';
import bcrypt from 'bcryptjs';

/**
 * Structure of user object in the database.
 * 🔧 Changes:
 * - Added optional fields: resetTokenHash, resetTokenExpires (used by forgot/reset password flow).
 * - Kept VIRTUAL `password` so controllers can set plain password.
 * - Hashing moved to beforeValidate so password_hash exists before notNull validation.
 */
export interface UserAttributes {
    id: number;
    email: string;
    password_hash: string;
    role: string;
    createdAt?: Date;
    updatedAt?: Date;

    // virtual (not persisted)
    password?: string;

    // ✅ new optional fields for password reset
    resetTokenHash?: string | null;
    resetTokenExpires?: Date | null;
}

export interface UserCreationAttributes
    extends Optional<UserAttributes, 'id' | 'password_hash' | 'resetTokenHash' | 'resetTokenExpires'> { }

export class User
    extends Model<UserAttributes, UserCreationAttributes>
    implements UserAttributes {
    public id!: number;
    public email!: string;
    public password_hash!: string;
    public role!: string;
    public password?: string;

    public resetTokenHash?: string | null;
    public resetTokenExpires?: Date | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Convenience helper for login checks
    public async comparePassword(plain: string): Promise<boolean> {
        return bcrypt.compare(plain, this.password_hash);
    }

    // Helper to clear reset fields after successful reset
    public clearResetToken() {
        this.resetTokenHash = null;
        this.resetTokenExpires = null;
    }
}

export const UserModel = User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        password_hash: {
            type: DataTypes.TEXT,
            allowNull: false, // ensure hooks set this before validate
        },
        role: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'merchant',
        },

        // ✅ NEW columns for forgot/reset flow
        resetTokenHash: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        resetTokenExpires: {
            type: DataTypes.DATE,
            allowNull: true,
        },

        // VIRTUAL plain-text password input (never stored)
        password: {
            type: DataTypes.VIRTUAL,
            set(value: string) {
                this.setDataValue('password', value);
            },
            get() {
                return this.getDataValue('password');
            },
        } as any,
    },
    {
        sequelize,
        tableName: 'users',
        timestamps: true,
        hooks: {
            /**
             * ✅ Hash before validation so password_hash is present for notNull checks.
             */
            beforeValidate: async (user: User) => {
                if (user.password) {
                    const saltRounds = 10;
                    user.password_hash = await bcrypt.hash(user.password, saltRounds);
                }
            },

            /**
             * Also hash on updates if a new password was set.
             */
            beforeUpdate: async (user: User) => {
                if (user.password) {
                    const saltRounds = 10;
                    user.password_hash = await bcrypt.hash(user.password, saltRounds);
                }
            },
        },
    }
);

export default User;
