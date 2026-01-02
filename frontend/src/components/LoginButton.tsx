'use client';

import React, { useEffect, useState } from 'react';
import { useLiff } from '../context/LiffProvider';
import { authWithLine } from '../lib/api';

export default function LoginButton() {
    const { liff, isLoggedIn, error } = useLiff();
    const [status, setStatus] = useState<string>('Initializing LIFF...');
    const [user, setUser] = useState<{ displayName: string; pictureUrl?: string } | null>(null);

    useEffect(() => {
        if (error) {
            setStatus(`LIFF Init Failed: ${error}`);
            return;
        }
        if (!liff) return;

        if (isLoggedIn) {
            setStatus('Verify Session...');
            // 1. Get ID Token from LIFF
            const idToken = liff.getIDToken();

            if (idToken) {
                // 2. Send to Backend
                authWithLine(idToken)
                    .then(async (res) => {
                        console.log('Login Success:', res);
                        setStatus('Logged In via Backend');
                        // Load profile for display (optional, can use res.user)
                        const profile = await liff.getProfile();
                        setUser(profile);
                    })
                    .catch((err) => {
                        console.error('Backend Auth Failed:', err);
                        setStatus(`Auth Failed: ${err.message}`);
                    });
            } else {
                setStatus('Error: ID Token not found');
            }
        } else {
            setStatus('Waiting for Login');
        }
    }, [liff, isLoggedIn, error]);

    const handleLogin = () => {
        if (liff) {
            liff.login();
        }
    };

    const handleLogout = () => {
        if (liff) {
            liff.logout();
            window.location.reload();
        }
    };

    if (error) return <div className="text-red-500">{String(error)}</div>;
    if (!liff) return <div>Loading LIFF...</div>;

    return (
        <div className="p-4 border rounded shadow-md w-full max-w-sm mx-auto text-center">
            <h2 className="text-xl font-bold mb-4">LIFF Login Demo</h2>
            <p className="mb-4 text-sm text-gray-600">Status: {status}</p>

            {isLoggedIn && user ? (
                <div>
                    {user.pictureUrl && (
                        <img
                            src={user.pictureUrl}
                            alt={user.displayName}
                            className="w-20 h-20 rounded-full mx-auto mb-2"
                        />
                    )}
                    <p className="font-bold">{user.displayName}</p>
                    <button
                        onClick={handleLogout}
                        className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Logout
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleLogin}
                    className="px-6 py-3 bg-[#06C755] text-white rounded font-bold hover:bg-[#05b34c] transition-colors"
                >
                    Login with LINE
                </button>
            )}
        </div>
    );
}
