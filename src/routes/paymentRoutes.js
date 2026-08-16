// ১. ফাইলের একদম উপরে require করুন
const SSLCommerzPayment = require('sslcommerz-lts');

// ২. ফাইলের শেষে module.exports = router; এর ঠিক উপরে এই Endpoint-টি পেস্ট করুন
router.post('/initiate-sslcommerz', asyncHandler(async (req, res) => {
    const { amount, submissionId } = req.body;

    const data = {
        total_amount: amount || 100,
        currency: 'BDT',
        tran_id: 'REF_' + Date.now(),
        success_url: 'http://localhost:5000/api/payments/ssl-success',
        fail_url: 'http://localhost:5000/api/payments/ssl-fail',
        cancel_url: 'http://localhost:5000/api/payments/ssl-cancel',
        ipn_url: 'http://localhost:5000/api/payments/ssl-ipn',
        cus_name: 'Test Patient',
        cus_email: 'patient@example.com',
        cus_add1: 'Dhaka',
        cus_phone: '01700000000',
        shipping_method: 'NO',
        product_name: 'TeleTriage Doctor Appointment',
        product_category: 'Healthcare',
        product_profile: 'general'
    };

    const sslcz = new SSLCommerzPayment(
        process.env.SSLCOMMERZ_STORE_ID,
        process.env.SSLCOMMERZ_STORE_PASSWORD,
        process.env.SSLCOMMERZ_IS_LIVE === 'true'
    );

    const apiResponse = await sslcz.init(data);
    if (apiResponse?.GatewayPageURL) {
        return res.json({ GatewayPageURL: apiResponse.GatewayPageURL });
    } else {
        return res.status(400).json({ error: 'Failed to create SSLCommerz session' });
    }
}));

// ৩. SSLCommerz Success Callback Route
router.post('/ssl-success', (req, res) => {
    // পেমেন্ট সফল হলে ড্যাশবোর্ডে পাঠাবে
    res.redirect('http://127.0.0.1:5500/frontend/patient-dashboard.html');
});