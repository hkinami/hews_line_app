'use client';

import { LiffProvider } from '../context/LiffProvider';
import LoginButton from '../components/LoginButton';

export default function Home() {
  return (
    <LiffProvider>
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-white dark:bg-black">
          <h1 className="text-3xl font-bold mb-8">Hews Line App (LIFF Demo)</h1>
          <LoginButton />
        </main>
      </div>
    </LiffProvider>
  );
}
