import axios from "axios";
import { MerchantExistenceFallbackService } from "./MerchantExistenceFallbackService";

export interface VerifyMerchantRequest {
    merchantId: number;
}

export interface VerificationResponse {
    verified: boolean;
    merchantId: number;
    merchantName: string;
    bankName: string;
    accountName: string;
    accountNumberMasked: string;
    trustScore: number | null;
    verificationStatus: string | null;
    verificationCount: string;
    verificationBadge: string;
    reasonCode?: string;
    message?: string;
    source?: "verification_api" | "database_fallback";
}

export class VerificationGatewayService {
    private readonly baseUrl = (
        process.env.VERIFICATION_API_URL ||
        "http://localhost:5001/api/v1"
    ).replace(/\/+$/, "");

    private readonly fallback = new MerchantExistenceFallbackService();

    async verifyMerchant(
        payload: VerifyMerchantRequest
    ): Promise<VerificationResponse> {
        const merchantId = payload.merchantId;

        if (!Number.isSafeInteger(merchantId) || merchantId <= 0) {
            throw new Error("Invalid merchant ID");
        }

        const url = `${this.baseUrl}/verify`;

        console.info("Verification API request", {
            merchantId,
            url,
        });

        try {
            const response = await axios.post<VerificationResponse>(
                url,
                { merchantId },
                {
                    timeout: 60000,
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (typeof response.data?.verified !== "boolean") {
                throw new Error("Invalid Verification API response");
            }

            return {
                ...response.data,
                source: "verification_api",
            };
        } catch (error: unknown) {
            const axiosError = axios.isAxiosError(error) ? error : null;
            const status = axiosError?.response?.status;

            const isNetworkFailure =
                Boolean(axiosError) && !axiosError?.response;

            const isServerFailure =
                typeof status === "number" && status >= 500;

            if (!isNetworkFailure && !isServerFailure) {
                throw error;
            }

            console.warn("Verification API unavailable; using database fallback", {
                merchantId,
                status,
                code: axiosError?.code,
            });

            const result = await this.fallback.verifyMerchant(merchantId);

            return {
                verified: result.verified,
                merchantId: result.merchantId,
                merchantName: result.merchantName,
                bankName: "",
                accountName: "",
                accountNumberMasked: "",
                trustScore: null,
                verificationStatus: result.verified
                    ? "EXISTS"
                    : "NOT_FOUND",
                verificationCount: "",
                verificationBadge: "",
                reasonCode: result.verified
                    ? "DATABASE_FALLBACK"
                    : "MERCHANT_NOT_FOUND",
                message: result.verified
                    ? "Merchant existence confirmed using PayVerify database."
                    : "Merchant does not exist in PayVerify database.",
                source: "database_fallback",
            };
        }
    }
}

export default VerificationGatewayService;