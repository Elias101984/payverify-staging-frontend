const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InventoryItem = sequelize.define('InventoryItem', {
    merchantId: {
        type: DataTypes.INTEGER,
        field: 'merchant_id',
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    stockQuantity: {
        type: DataTypes.INTEGER,
        field: 'stock_quantity',
        defaultValue: 0,
    },
    unitPrice: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'unit_price',
    },
}, {
    tableName: 'inventory_items',
    timestamps: true,
    underscored: true,
});

export default InventoryItem;
