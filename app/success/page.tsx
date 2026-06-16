'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  // Safepay appends ?tracker=track_xxx to the redirect_url after payment
  const tracker = searchParams.get('tracker');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
            <span className="text-3xl">✅</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2 text-green-600">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">Thank you for your payment.</p>

        {tracker && (
          <div className="bg-gray-50 p-4 rounded mb-6 text-left">
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Transaction Reference</p>
            <p className="text-sm font-mono break-all text-gray-700">{tracker}</p>
          </div>
        )}

        <a
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Make Another Payment
        </a>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}