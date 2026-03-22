require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;

if (!apiKey) {
    console.error('❌ BREVO_API_KEY is not set in .env');
    process.exit(1);
}
if (!senderEmail) {
    console.error('❌ BREVO_SENDER_EMAIL (or EMAIL_USER) is not set in .env');
    process.exit(1);
}

async function testEmail() {
    console.log(`Testing Brevo API with:`);
    console.log(`- API Key: ${apiKey.substring(0, 7)}...`);
    console.log(`- Sender: ${senderEmail}`);
    
    try {
        console.log('Sending email...');
        const response = await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: { name: 'KiddoTrack Test', email: senderEmail },
                to: [ { email: senderEmail } ], // Sending to self for testing
                subject: 'KiddoTrack — Brevo Test Email',
                htmlContent: '<p>If you see this, Brevo API is configured correctly!</p>',
            },
            {
                headers: {
                    'api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', response.data.messageId);

    } catch (err) {
        console.error('❌ Brevo API Error:', err.response?.data || err.message);
        if (err.response?.status === 400 && JSON.stringify(err.response.data).includes('sender')) {
            console.error('\n--> IT LOOKS LIKE YOU HAVE NOT VERIFIED YOUR EMAIL IN BREVO YET.');
            console.error('--> Go to brevo.com > Senders & IP > Add your email address and click the link they send you.');
        }
    }
}

testEmail();
