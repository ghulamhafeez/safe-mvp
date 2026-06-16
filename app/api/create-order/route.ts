import { NextResponse } from 'next/server';

const Safepay = require('@sfpy/node-core');

export async function POST(request: Request) {
  console.log('🚀 API route called');

  try {
    const body = await request.json();
    const { amount } = body;

    const apiKey     = process.env.SAFEPAY_API_KEY;    // sec_xxx  — used for tracker creation
    const apiSecret  = process.env.SAFEPAY_API_SECRET; // hex key  — used for passport/tbt
    const baseUrl    = process.env.NEXT_PUBLIC_SAFEPAY_BASE_URL || 'https://sandbox.api.getsafepay.com';
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Server configuration missing. Check SAFEPAY_API_KEY and SAFEPAY_API_SECRET in .env' },
        { status: 500 }
      );
    }

    // Validate amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount provided' },
        { status: 400 }
      );
    }

    // Safepay expects amount in lowest denomination (paisa for PKR)
    // e.g. 500 PKR → 50000 paisa
    const amountInPaisa = parsedAmount * 100;

    // SDK instance using the sec_ key for tracker creation
    const safepay = Safepay(apiKey, {
      authType: 'secret',
      host: baseUrl,
    });

    // ── Step 1: Create the payment session (tracker) ─────────────────────────
    // Uses sec_ key via x-sfpy-merchant-secret header
    console.log('1. Creating payment session, amount (paisa):', amountInPaisa);
    const sessionResponse = await safepay.payments.session.setup({
      merchant_api_key: apiKey,
      intent: 'CYBERSOURCE',
      mode: 'payment',
      entry_mode: 'raw',
      currency: 'PKR',
      amount: amountInPaisa,
    });

    console.log('2. Session response:', JSON.stringify(sessionResponse, null, 2));

    const trackerToken = sessionResponse?.data?.tracker?.token;
    if (!trackerToken) {
      console.error('No tracker token. Full response:', JSON.stringify(sessionResponse, null, 2));
      return NextResponse.json(
        { error: 'No tracker token received from Safepay', debug: sessionResponse },
        { status: 500 }
      );
    }
    console.log('3. ✅ Tracker token:', trackerToken);

    // ── Step 2: Create passport/tbt using the hex Secret Key ─────────────────
    // /client/passport/v1/token requires the hex secret, NOT the sec_ key.
    // We call it directly with fetch to avoid SDK auth confusion.
    console.log('4. Creating authentication token (tbt)...');
    const passportRes = await fetch(`${baseUrl}/client/passport/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sfpy-merchant-secret': apiSecret,
      },
      body: JSON.stringify({}),
    });

    const passportData = await passportRes.json();
    console.log('5. Passport response:', JSON.stringify(passportData, null, 2));

    const tbt = passportData?.data;
    if (!tbt) {
      console.error('No auth token. Full response:', JSON.stringify(passportData, null, 2));
      return NextResponse.json(
        { error: 'No authentication token received from Safepay', debug: passportData },
        { status: 500 }
      );
    }
    console.log('6. ✅ Auth token (tbt) received');

    // ── Step 3: Build the hosted checkout URL ───────────────────────────────
    const env = baseUrl.includes('sandbox') ? 'sandbox' : 'production';
    console.log('7. Building checkout URL, env:', env);

    const checkoutUrl = safepay.checkout.createCheckoutUrl({
      env,
      tracker: trackerToken,
      tbt,
      source: 'hosted',
      redirect_url: `${appUrl}/success`,
      cancel_url:   `${appUrl}/?status=cancelled`,
    });

    console.log('8. ✅ Checkout URL:', checkoutUrl);

    return NextResponse.json({ success: true, checkoutUrl });

  } catch (error: any) {
    console.error('❌ Server Error:', error?.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}