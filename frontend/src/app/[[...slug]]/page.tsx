'use client';

import { LiffProvider } from '../../context/LiffProvider';
import LoginButton from '../../components/LoginButton';
import SmartPassButtons from '../../components/SmartPassButtons';
import SmartPassAutoRedirect from '../../components/SmartPassAutoRedirect';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [hash, setHash] = useState('');

    useEffect(() => {
        setHash(window.location.hash);
    }, []);

    return (
        <LiffProvider>
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
                <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-white dark:bg-black">
                    <h1 className="text-3xl font-bold mb-8">Hews Line App (LIFF Demo)</h1>

                    <div className="w-full max-w-md p-4 mb-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden break-all">
                        <h2 className="font-bold mb-2">Debug Info</h2>
                        <div className="mb-2">
                            <span className="font-semibold block text-sm text-gray-500">Path:</span>
                            <span className="font-mono text-sm">{pathname}</span>
                        </div>
                        <div className="mb-2">
                            <span className="font-semibold block text-sm text-gray-500">Query Params:</span>
                            <span className="font-mono text-sm">{searchParams.toString() || '(none)'}</span>
                        </div>
                        <div>
                            <span className="font-semibold block text-sm text-gray-500">Fragment:</span>
                            <span className="font-mono text-sm">{hash || '(none)'}</span>
                        </div>
                    </div>

                    <LoginButton />

                    <div className="mt-8">
                        <SmartPassButtons />
                    </div>

                    <SmartPassAutoRedirect />
                </main>
            </div>
        </LiffProvider>
    );
}
