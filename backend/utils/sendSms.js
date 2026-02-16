const https = require('https');

const sendSms = async (to, body) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from || !to) return { sent: false, reason: 'twilio_not_configured' };

  const postData = new URLSearchParams({ To: to, From: from, Body: body }).toString();
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');

  const options = {
    hostname: 'api.twilio.com',
    path: `/2010-04-01/Accounts/${sid}/Messages.json`,
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ sent: true });
        } else {
          resolve({ sent: false, reason: `twilio_http_${res.statusCode}`, data });
        }
      });
    });

    req.on('error', () => resolve({ sent: false, reason: 'request_error' }));
    req.write(postData);
    req.end();
  });
};

module.exports = sendSms;
