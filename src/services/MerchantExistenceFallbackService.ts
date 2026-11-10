import Merchant from "../models/Merchant";

export interface MerchantExistenceResult {
    verified: boolean;
    merchantId: number;
    merchantName: string;
}

export class MerchantExistenceFallbackService {
    async verifyMerchant(merchantId: number): Promise<MerchantExistenceResult> {
        const merchant = await Merchant.findOne({
            where: { id: merchantId },
            attributes: ["id", "name"],
        });

        return {
            verified: Boolean(merchant),
            merchantId,
            merchantName: merchant?.name ?? "",
        };
    }
}