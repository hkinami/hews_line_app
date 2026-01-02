'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import liff from '@line/liff';
import type { Liff } from '@line/liff';

interface LiffContextType {
    liff: Liff | null;
    error: unknown;
    isLoggedIn: boolean;
}

const LiffContext = createContext<LiffContextType>({
    liff: null,
    error: null,
    isLoggedIn: false,
});

export const useLiff = () => useContext(LiffContext);

export const LiffProvider = ({ children }: { children: React.ReactNode }) => {
    const [liffObject, setLiffObject] = useState<Liff | null>(null);
    const [liffError, setLiffError] = useState<unknown>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Avoid double init in React StructMode or dev
        if (liffObject) return;

        const initLiff = async () => {
            try {
                const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';
                if (!liffId) {
                    throw new Error('NEXT_PUBLIC_LIFF_ID is not defined');
                }

                await liff.init({ liffId });
                setLiffObject(liff);

                if (liff.isLoggedIn()) {
                    setIsLoggedIn(true);
                }
            } catch (err) {
                console.error('LIFF init failed', err);
                setLiffError(err);
            }
        };

        initLiff();
    }, [liffObject]);

    return (
        <LiffContext.Provider
            value={{
                liff: liffObject,
                error: liffError,
                isLoggedIn,
            }}
        >
            {children}
        </LiffContext.Provider>
    );
};
