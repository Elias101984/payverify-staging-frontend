const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "1";
process.env.VERIFICATION_API_URL = "http://127.0.0.1:1/api/v1";

require("ts-node").register({
    transpileOnly: true,
    compilerOptions: {
        module: "CommonJS",
        moduleResolution: "Node",
    },
});

const axios = require("axios");

const originalPost = axios.post;
const originalLoad = Module._load;

let merchantLookupCalls = 0;
let merchantLookup;

const fakeMerchantModule = {
    __esModule: true,
    default: {
        findOne: async (...args) => {
            merchantLookupCalls++;
            return merchantLookup(...args);
        },
    },
};

Module._load = function(request, parent, isMain) {
    if (
        request === "../models/Merchant" &&
        parent?.filename?.includes("MerchantExistenceFallbackService")
    ) {
        return fakeMerchantModule;
    }

    return originalLoad.apply(this, arguments);
};

const {
    VerificationGatewayService,
} = require("./src/services/VerificationGatewayService.ts");

Module._load = originalLoad;

function createNetworkError() {
    const error = new Error("Simulated connection failure");
    error.isAxiosError = true;
    error.code = "ECONNREFUSED";
    return error;
}

function setup() {
    merchantLookupCalls = 0;
    merchantLookup = async () => null;
}

test("API verified true", async () => {
    setup();

    axios.post = async () => ({
        status: 200,
        data: {
            verified: true,
            merchantId: 1,
            merchantName: "Test Merchant",
        },
    });

    const result = await new VerificationGatewayService()
        .verifyMerchant({ merchantId: 1 });

    assert.equal(result.verified, true);
    assert.equal(result.source, "verification_api");
    assert.equal(merchantLookupCalls, 0);
});

test("API verified false does not trigger fallback", async () => {
    setup();

    axios.post = async () => ({
        status: 200,
        data: {
            verified: false,
            merchantId: 999,
            merchantName: "",
        },
    });

    const result = await new VerificationGatewayService()
        .verifyMerchant({ merchantId: 999 });

    assert.equal(result.verified, false);
    assert.equal(merchantLookupCalls, 0);
});

test("API outage with existing merchant", async () => {
    setup();

    axios.post = async () => {
        throw createNetworkError();
    };

    merchantLookup = async () => ({
        id: 1,
        name: "Existing Merchant",
    });

    const result = await new VerificationGatewayService()
        .verifyMerchant({ merchantId: 1 });

    assert.equal(result.verified, true);
    assert.equal(result.source, "database_fallback");
    assert.equal(result.merchantName, "Existing Merchant");
    assert.equal(result.trustScore, null);
    assert.equal(merchantLookupCalls, 1);
});

test("API outage with missing merchant", async () => {
    setup();

    axios.post = async () => {
        throw createNetworkError();
    };

    merchantLookup = async () => null;

    const result = await new VerificationGatewayService()
        .verifyMerchant({ merchantId: 999 });

    assert.equal(result.verified, false);
    assert.equal(result.reasonCode, "MERCHANT_NOT_FOUND");
    assert.equal(merchantLookupCalls, 1);
});

test("API outage and database failure fail closed", async () => {
    setup();

    axios.post = async () => {
        throw createNetworkError();
    };

    merchantLookup = async () => {
        throw new Error("Simulated database unavailable");
    };

    await assert.rejects(
        () => new VerificationGatewayService()
            .verifyMerchant({ merchantId: 1 }),
        /Simulated database unavailable/
    );

    assert.equal(merchantLookupCalls, 1);
});

process.on("exit", () => {
    axios.post = originalPost;
});
test("HTTP 500 triggers database fallback", async () => {
    setup();

    const error = new Error("Simulated server error");
    error.isAxiosError = true;
    error.response = { status: 500 };

    axios.post = async () => {
        throw error;
    };

    merchantLookup = async () => ({
        id: 1,
        name: "Existing Merchant",
    });

    const result = await new VerificationGatewayService()
        .verifyMerchant({ merchantId: 1 });

    assert.equal(result.verified, true);
    assert.equal(result.source, "database_fallback");
    assert.equal(merchantLookupCalls, 1);
});

test("HTTP 400 does not trigger database fallback", async () => {
    setup();

    const error = new Error("Simulated bad request");
    error.isAxiosError = true;
    error.response = { status: 400 };

    axios.post = async () => {
        throw error;
    };

    await assert.rejects(
        () => new VerificationGatewayService()
            .verifyMerchant({ merchantId: 1 }),
        /Simulated bad request/
    );

    assert.equal(merchantLookupCalls, 0);
});

test("Malformed HTTP 200 response fails closed", async () => {
    setup();

    axios.post = async () => ({
        status: 200,
        data: {
            merchantId: 1,
            merchantName: "Existing Merchant",
        },
    });

    await assert.rejects(
        () => new VerificationGatewayService()
            .verifyMerchant({ merchantId: 1 }),
        /Invalid Verification API response/
    );

    assert.equal(merchantLookupCalls, 0);
});