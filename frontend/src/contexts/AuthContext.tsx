// frontend/src/contexts/AuthContext.tsx

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

import { jwtDecode } from 'jwt-decode';

import {
    loginUser,
    registerUser,
} from '../services/api';

interface DecodedToken {
    id: number;
    email: string;
    name?: string;
    role: string;
    exp: number;
}

interface User {
    id: number;
    email: string;
    name?: string;
    role: string;
}

interface RegisterData {
    name: string;
    email: string;
    password: string;

    cac_number: string;
    tin_number?: string;
    bvn?: string;

    account_number: string;
    bank_name: string;

    qr_code?: string;

    captchaToken: string;
}

interface Merchant {
    id: number;
    name: string;
    userId: number;

    account_number: string;
    bank_name: string;

    qr_code?: string;

    createdAt: string;
}

interface AuthContextProps {
    user: User | null;

    token: string | null;

    isAuthenticated: boolean;

    login: (
        email: string,
        password: string,
        captchaToken: string
    ) => Promise<void>;

    logout: () => void;

    register: (
        data: RegisterData
    ) => Promise<{
        merchant: Merchant;
    }>;

    setSession: (
        token: string,
        user: User
    ) => void;
}

interface AuthProviderProps {
    children: React.ReactNode;
}

const AuthContext =
    createContext<
        AuthContextProps | undefined
    >(undefined);

export const AuthProvider:
    React.FC<AuthProviderProps> = ({
        children,
    }) => {
        const [
            user,
            setUser,
        ] =
            useState<User | null>(
                null
            );

        const [
            token,
            setToken,
        ] =
            useState<
                string | null
            >(null);

        // ---------------------------------------------------------------------
        // Clear session
        // ---------------------------------------------------------------------

        const clearSession =
            useCallback(() => {
                setToken(null);
                setUser(null);

                try {
                    localStorage.removeItem(
                        'token'
                    );

                    localStorage.removeItem(
                        'user'
                    );
                } catch {
                    // Ignore unavailable storage.
                }
            }, []);

        // ---------------------------------------------------------------------
        // Restore session
        // ---------------------------------------------------------------------

        useEffect(() => {
            let storedToken:
                string | null = null;

            let storedUser:
                string | null = null;

            try {
                storedToken =
                    localStorage.getItem(
                        'token'
                    );

                storedUser =
                    localStorage.getItem(
                        'user'
                    );
            } catch {
                clearSession();
                return;
            }

            if (
                !storedToken ||
                !storedUser
            ) {
                return;
            }

            try {
                const payload =
                    jwtDecode<
                        DecodedToken
                    >(
                        storedToken
                    );

                if (
                    payload.exp &&
                    Date.now() >=
                    payload.exp *
                    1000
                ) {
                    clearSession();
                    return;
                }

                const parsedUser =
                    JSON.parse(
                        storedUser
                    ) as User;

                setToken(
                    storedToken
                );

                setUser(
                    parsedUser
                );
            } catch (error) {
                console.error(
                    '[Auth] Failed to restore session',
                    error
                );

                clearSession();
            }
        }, [clearSession]);

        // ---------------------------------------------------------------------
        // Save session
        // ---------------------------------------------------------------------

        const setSession = (
            newToken: string,
            newUser: User
        ) => {
            try {
                const payload =
                    jwtDecode<
                        DecodedToken
                    >(
                        newToken
                    );

                if (
                    payload.exp &&
                    Date.now() >=
                    payload.exp *
                    1000
                ) {
                    clearSession();
                    return;
                }
            } catch (error) {
                console.error(
                    '[Auth] Invalid token',
                    error
                );

                clearSession();
                return;
            }

            setToken(
                newToken
            );

            setUser(
                newUser
            );

            try {
                localStorage.setItem(
                    'token',
                    newToken
                );

                localStorage.setItem(
                    'user',
                    JSON.stringify(
                        newUser
                    )
                );
            } catch (error) {
                console.error(
                    '[Auth] Failed to persist session',
                    error
                );

                clearSession();
            }
        };

        // ---------------------------------------------------------------------
        // LOGIN
        // ---------------------------------------------------------------------

        const login = async (
            email: string,
            password: string,
            captchaToken: string
        ): Promise<void> => {
            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();

            const response =
                await loginUser({
                    email:
                        normalizedEmail,

                    password,

                    captchaToken,
                });

            const newToken =
                response
                    ?.data
                    ?.token;

            if (
                !newToken ||
                typeof newToken !==
                'string'
            ) {
                throw new Error(
                    'Authentication token was not returned by the server.'
                );
            }

            const payload =
                jwtDecode<
                    DecodedToken
                >(
                    newToken
                );

            if (
                !payload.id ||
                !payload.email ||
                !payload.role
            ) {
                throw new Error(
                    'Authentication token contains invalid user information.'
                );
            }

            const nextUser:
                User = {
                id:
                    payload.id,

                email:
                    payload.email,

                name:
                    payload.name,

                role:
                    payload.role,
            };

            setSession(
                newToken,
                nextUser
            );
        };

        // ---------------------------------------------------------------------
        // REGISTER
        // ---------------------------------------------------------------------

        const register = async (
            data: RegisterData
        ): Promise<{
            merchant: Merchant;
        }> => {
            const response =
                await registerUser({
                    ...data,

                    email:
                        data.email
                            .trim()
                            .toLowerCase(),
                });

            const newToken =
                response
                    ?.data
                    ?.token;

            const merchant =
                response
                    ?.data
                    ?.merchant;

            if (
                !newToken ||
                typeof newToken !==
                'string'
            ) {
                throw new Error(
                    'Authentication token was not returned by the server.'
                );
            }

            if (!merchant) {
                throw new Error(
                    'Merchant information was not returned by the server.'
                );
            }

            const payload =
                jwtDecode<
                    DecodedToken
                >(
                    newToken
                );

            if (
                !payload.id ||
                !payload.email ||
                !payload.role
            ) {
                throw new Error(
                    'Authentication token contains invalid user information.'
                );
            }

            const nextUser:
                User = {
                id:
                    payload.id,

                email:
                    payload.email,

                name:
                    payload.name,

                role:
                    payload.role,
            };

            setSession(
                newToken,
                nextUser
            );

            return {
                merchant,
            };
        };

        // ---------------------------------------------------------------------
        // LOGOUT
        // ---------------------------------------------------------------------

        const logout = () => {
            clearSession();

            window.location.replace(
                '/'
            );
        };

        const value:
            AuthContextProps = {
            user,

            token,

            isAuthenticated:
                Boolean(
                    token
                ),

            login,

            logout,

            register,

            setSession,
        };

        return (
            <AuthContext.Provider
                value={value}
            >
                {children}
            </AuthContext.Provider>
        );
    };

export const useAuth = () => {
    const context =
        useContext(
            AuthContext
        );

    if (!context) {
        throw new Error(
            'useAuth must be used within an AuthProvider'
        );
    }

    return context;
};