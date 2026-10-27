import { Router } from 'express';
import { listDisputesForTransaction } from '../controllers/disputeController';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();

router.post(
    '/transactions/:transactionId/disputes',
    verifyJwtMiddleware,
    (_req, res) => {
        res.status(503).json({
            success: false,
            code: 'DISPUTE_ACTION_UNAVAILABLE',
            message: 'Dispute creation is temporarily unavailable in PayVerify.',
        });
    }
);

router.get(
    '/transactions/:transactionId/disputes',
    verifyJwtMiddleware,
    authorizeRoles(['admin']),
    listDisputesForTransaction
);

router.patch(
    '/disputes/:id',
    verifyJwtMiddleware,
    (_req, res) => {
        res.status(503).json({
            success: false,
            code: 'DISPUTE_ACTION_UNAVAILABLE',
            message: 'Dispute status changes are temporarily unavailable in PayVerify.',
        });
    }
);

export default router;
