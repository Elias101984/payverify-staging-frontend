/**
 * Build-time OpenAPI generator for PayVerify API
 * ----------------------------------------------
 * This script scans all TypeScript route/controller files
 * and produces a dist/openapi.json file used in production.
 */

import fs from 'fs';
import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';

// 1️⃣ Scan the same places where your endpoint JSDoc lives
const apis = [
    './src/**/*.ts',
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts'
];

// 2️⃣ Swagger specification definition
const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PayVerify API',
            version: '1.0.0',
            description: 'API documentation for PayVerify backend',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [{ bearerAuth: [] }]
    },
    apis
};

// 3️⃣ Generate the OpenAPI spec
const spec = swaggerJSDoc(options);

// 4️⃣ Write alongside compiled JS so it’s available in the runtime image
const out = path.join(process.cwd(), 'dist', 'openapi.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(spec, null, 2));
console.log(`✅ OpenAPI written to ${out} with ${Object.keys(spec.paths || {}).length} paths`);
