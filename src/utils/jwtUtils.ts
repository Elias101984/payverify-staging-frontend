import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return secret;
};

/**
 * Interface for JWT payload structure.
 * Extend this based on your actual payload needs (e.g. id, email, role)
 */
interface TokenPayload extends JwtPayload {
    id: string;
    email?: string;
    role?: string;
}

/**
 * Signs a JWT token with the provided payload and expiry.
 * @param payload - The data to encode into the token
 * @param expiresIn - Token expiration time (e.g., '1h', '7d')
 * @returns A signed JWT token
 */
export const signToken = (
    payload: TokenPayload,
    expiresIn: SignOptions['expiresIn'] = '1h'
): string => {
    return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

/**
 * Verifies a JWT token and returns the decoded payload.
 * Throws an error if invalid.
 * @param token - The JWT token string
 * @returns The decoded token payload
 */
export const verifyToken = (token: string): TokenPayload => {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
};
