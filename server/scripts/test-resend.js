require('dotenv').config();
const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

if (!apiKey) {
    console.error('❌ RESEND_API_KEY is not set in .env');
    process.exit(1);
}

const resend = new Resend(apiKey);

async function testEmail() {
    console.log(`Testing Resend with:`);
    console.log(`- API Key: ${apiKey.substring(0, 7)}...`);
    console.log(`- From: ${fromEmail}`);
    
    try {
        console.log('Sending email...');
        const response = await resend.emails.send({
            from: fromEmail,
            to: 'delivered@resend.dev',
            subject: 'KiddoTrack — Test Email',
            html: '<p>If you see this, Resend is configured correctly!</p>',
        });

        if (response.error) {
            console.error('❌ Resend API Error Object:', JSON.stringify(response.error, null, 2));
        } else {
            console.log('✅ Email sent successfully!');
            console.log('Response Data:', JSON.stringify(response.data, null, 2));
        }
    } catch (err) {
        console.error('❌ Unexpected Error Catch:', err);
        console.error('Error Stack:', err.stack);
    }
}

testEmail();
