'use client';

import React from 'react';
import { useLiff } from '../context/LiffProvider';

const SMART_PASS_URL = 'https://stg2-pass.stg.curon.co/home';

export default function SmartPassButtons() {
    const { liff } = useLiff();

    const handleOpenInCurrentPage = () => {
        window.location.href = SMART_PASS_URL;
    };

    const handleOpenInExternalBrowser = () => {
        if (liff && liff.isInClient()) {
            // LIFFブラウザー内の場合、外部ブラウザーで開く
            liff.openWindow({
                url: SMART_PASS_URL,
                external: true,
            });
        } else {
            // すでに外部ブラウザーの場合、同じページで開く
            window.location.href = SMART_PASS_URL;
        }
    };

    if (!liff) {
        return <div className="text-gray-500">Loading...</div>;
    }

    return (
        <div className="p-4 border rounded shadow-md w-full max-w-sm mx-auto text-center">
            <h2 className="text-xl font-bold mb-4">スマートパス</h2>
            <div className="flex flex-col gap-3">
                <button
                    onClick={handleOpenInCurrentPage}
                    className="px-6 py-3 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 transition-colors"
                >
                    スマートパスを開く
                </button>
                <button
                    onClick={handleOpenInExternalBrowser}
                    className="px-6 py-3 bg-green-500 text-white rounded font-bold hover:bg-green-600 transition-colors"
                >
                    外部ブラウザーで開く
                </button>
            </div>
        </div>
    );
}
