import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.includes('\\n') 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : process.env.FIREBASE_PRIVATE_KEY, 
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, title, body, icon } = req.body;

  if (!token || !title) {
    return res.status(400).json({ error: 'Missing token or title' });
  }

  try {
    await admin.messaging().send({
      token,
      data: {
        title,
        body: body || '',
        icon: icon || '',
      },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('SEND NOTIFICATION ERROR:', err);
    const isInvalidToken = err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token';
    res.status(isInvalidToken ? 410 : 500).json({ error: err.message, invalidToken: isInvalidToken });
  }
}
