import { NextResponse } from 'next/server';

const Safepay = require('@sfpy/node-core');

export async function POST(request: Request) {
  console.log('🚀 API route called');
  
  try {
    const body = await request.json();
    const { amount, chopperAccountId } = body;
    
    // ✅ Environment variables from .env file
    const apiKey = process.env.SAFEPAY_API_KEY;
    const apiSecret = process.env.SAFEPAY_API_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_SAFEPAY_BASE_URL || "https://sandbox.api.getsafepay.com";

    // ✅ Debug - check if values are loaded
    console.log('1. API Key length:', apiKey?.length || 0);
    console.log('2. API Secret length:', apiSecret?.length || 0);

    // ✅ Validate credentials
    if (!apiKey || !apiSecret) {
      console.error('Missing credentials in .env file');
      return NextResponse.json({ 
        error: 'Server configuration missing. Check .env file for SAFEPAY_API_KEY and SAFEPAY_API_SECRET' 
      }, { status: 500 });
    }

    // ✅ Use SDK to create payment
    console.log('3. Initializing Safepay SDK...');
    
    const safepay = Safepay(apiKey, {
      authType: 'secret',
      host: baseUrl
    });

    console.log('4. Creating payment session for amount:', amount);

    const payment = await safepay.payments.session.setup({
      merchant_api_key: apiKey,
      intent: "CYBERSOURCE",
      mode: "payment",
      currency: "PKR",
      amount: parseInt(amount)
    });

    console.log('5. Payment session created');

    // ✅ Extract token
    const token = payment.data?.tracker?.token || payment.tracker?.token;
    
    if (!token) {
      console.error('No token received');
      return NextResponse.json({ error: 'No token received from Safepay' }, { status: 500 });
    }

    console.log('6. ✅ Token:', token);

    // ✅ Generate checkout URL
    const checkoutUrl = `${baseUrl}/v1/checkout?token=${token}`;
    console.log('7. ✅ Checkout URL:', checkoutUrl);

    return NextResponse.json({ 
      success: true, 
      checkoutUrl: checkoutUrl
    });

  } catch (error: any) {
    console.error('❌ Server Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}