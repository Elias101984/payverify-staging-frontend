import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/PurchaseOrderController';
import { PurchaseOrderService } from '../services/PurchaseOrderService';
import { body, param, query } from 'express-validator';
import { DatabaseModels } from '../../models';
import { Sequelize } from 'sequelize';

export const createPurchaseOrderRoutes = (models: DatabaseModels, sequelize: Sequelize): Router => {
    const router = Router();
    const purchaseOrderService = new PurchaseOrderService(models, sequelize);
    const purchaseOrderController = new PurchaseOrderController(purchaseOrderService);

    // Validation middleware
    const validatePurchaseOrder = [
        body('merchantId').isUUID().withMessage('Valid merchant ID is required'),
        body('supplierName').notEmpty().withMessage('Supplier name is required'),
        body('orderDate').isISO8601().withMessage('Valid order date is required'),
        body('totalAmount').isDecimal().withMessage('Valid total amount is required'),
        body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
        body('status').optional().isIn(['draft', 'pending', 'approved', 'ordered', 'shipped', 'delivered', 'cancelled', 'paid'])
    ];

    const validatePurchaseOrderItem = [
        body('itemName').notEmpty().withMessage('Item name is required'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('unitPrice').isDecimal({ decimal_digits: '2' }).withMessage('Valid unit price is required'),
        body('unitOfMeasure').optional().isString(),
        body('inventoryItemId').optional().isUUID()
    ];

    // Routes
    router.post('/', validatePurchaseOrder, purchaseOrderController.createPurchaseOrder);

    router.get('/', [
        query('merchantId').optional().isUUID(),
        query('status').optional().isString(),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ], purchaseOrderController.getAllPurchaseOrders);

    router.get('/:id', [
        param('id').isUUID().withMessage('Valid purchase order ID is required')
    ], purchaseOrderController.getPurchaseOrderById);

    router.put('/:id', [
        param('id').isUUID().withMessage('Valid purchase order ID is required'),
        ...validatePurchaseOrder
    ], purchaseOrderController.updatePurchaseOrder);

    router.delete('/:id', [
        param('id').isUUID().withMessage('Valid purchase order ID is required')
    ], purchaseOrderController.deletePurchaseOrder);

    router.post('/:id/items', [
        param('id').isUUID().withMessage('Valid purchase order ID is required'),
        ...validatePurchaseOrderItem
    ], purchaseOrderController.addItemToPurchaseOrder);

    router.patch('/:id/status', [
        param('id').isUUID().withMessage('Valid purchase order ID is required'),
        body('status').isIn(['draft', 'pending', 'approved', 'ordered', 'shipped', 'delivered', 'cancelled', 'paid'])
    ], purchaseOrderController.updatePurchaseOrderStatus);

    return router;
};