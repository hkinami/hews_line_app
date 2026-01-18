'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useLiff } from '../context/LiffProvider';

const SMART_PASS_URL = 'https://stg2-pass.stg.curon.co/home';
const REDIRECT_REQUESTED_KEY = 'smartpass_redirect_requested';

type RedirectStatus =
    | 'initializing'
    | 'not_logged_in'
    | 'already_requested'
    | 'external_browser'
    | 'opening_external_browser';

// モジュールレベルでリダイレクト実行状態を保持
let redirectExecuted = false;

export default function SmartPassAutoRedirect() {
    const { liff, isLoggedIn } = useLiff();
    const hasAttemptedRedirect = useRef(false);

    // LIFFブラウザー内かどうか
    const isInClient = useMemo(() => {
        return liff?.isInClient() ?? null;
    }, [liff]);

    // sessionStorageの値を取得（クライアントサイドのみ）
    const alreadyRequested = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return sessionStorage.getItem(REDIRECT_REQUESTED_KEY) === 'true';
    }, []);

    // ステータスを計算
    const status = useMemo((): RedirectStatus => {
        if (!liff) return 'initializing';
        if (!isLoggedIn) return 'not_logged_in';
        if (alreadyRequested) return 'already_requested';
        if (redirectExecuted || isInClient === false) {
            return isInClient ? 'opening_external_browser' : 'external_browser';
        }
        return isInClient ? 'opening_external_browser' : 'external_browser';
    }, [liff, isLoggedIn, isInClient, alreadyRequested]);

    useEffect(() => {
        // LIFF未初期化またはログインしていない場合は何もしない
        if (!liff || !isLoggedIn) return;

        // 既にリダイレクト試行済みの場合は何もしない
        if (hasAttemptedRedirect.current) return;

        // sessionStorageで既にリダイレクト要求を出しているかチェック
        if (sessionStorage.getItem(REDIRECT_REQUESTED_KEY)) return;

        // リダイレクト試行をマーク
        hasAttemptedRedirect.current = true;
        redirectExecuted = true;

        if (liff.isInClient()) {
            // LIFFブラウザー内の場合、外部ブラウザーで開く
            sessionStorage.setItem(REDIRECT_REQUESTED_KEY, 'true');
            liff.openWindow({
                url: SMART_PASS_URL,
                external: true,
            });
        }
        // 外部ブラウザーの場合は何もしない
    }, [liff, isLoggedIn]);

    const getStatusMessage = (): string => {
        switch (status) {
            case 'initializing':
                return 'LIFF初期化中...';
            case 'not_logged_in':
                return 'LINEログインしていません';
            case 'already_requested':
                return '外部ブラウザーへのリダイレクト済み';
            case 'external_browser':
                return '外部ブラウザーで閲覧中（リダイレクト不要）';
            case 'opening_external_browser':
                return '外部ブラウザーを起動中...';
            default:
                return '不明な状態';
        }
    };

    const getStatusColor = (): string => {
        switch (status) {
            case 'initializing':
                return 'text-gray-500';
            case 'not_logged_in':
                return 'text-yellow-600';
            case 'already_requested':
                return 'text-blue-500';
            case 'external_browser':
                return 'text-green-500';
            case 'opening_external_browser':
                return 'text-purple-500';
            default:
                return 'text-gray-500';
        }
    };

    return (
        <div className="mt-4 p-4 border rounded shadow-md w-full max-w-sm mx-auto">
            <h2 className="text-lg font-bold mb-3">Auto Redirect Status</h2>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">ステータス:</span>
                    <span className={`font-medium ${getStatusColor()}`}>
                        {getStatusMessage()}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">LINEログイン:</span>
                    <span className={isLoggedIn ? 'text-green-500' : 'text-red-500'}>
                        {isLoggedIn ? 'ログイン済み' : '未ログイン'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">環境:</span>
                    <span className="text-gray-800">
                        {isInClient === null
                            ? '判定中...'
                            : isInClient
                              ? 'LIFFブラウザー'
                              : '外部ブラウザー'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">リダイレクト先:</span>
                    <span className="text-gray-800 text-xs break-all">
                        {SMART_PASS_URL}
                    </span>
                </div>
            </div>
        </div>
    );
}
