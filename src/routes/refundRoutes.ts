import { Router } from 'express';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';
import { listRefundsForTransaction } from '../controllers/refundController';

const router = Router();

router.post(
    '/transactions/:transactionId/refunds',
    verifyJwtMiddleware,
    (_req, res) => {
        res.status(503).json({
            success: false,
            code: 'REFUND_ACTION_UNAVAILABLE',
            message: 'Refund requests are temporarily unavailable in PayVerify.',
        });
    }
);

router.get(
    '/transactions/:transactionId/refunds',
    verifyJwtMiddleware,
    authorizeRoles(['admin']),
    listRefundsForTransaction
);

export default router;