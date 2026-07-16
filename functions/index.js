const functions = require('firebase-functions');
const fetch = require('node-fetch');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');
const { Buffer } = require('buffer');

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

// Serper API key stored as Firebase secret (never in client code)
// Deploy with: firebase functions:secrets:set SERPER_API_KEY
const SERPER_KEY = functions.config().serper?.key || process.env.SERPER_API_KEY;

// Simple in-memory cache (lives for Cloud Function instance lifetime)
const cache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

exports.searchBouquets = functions
  .region('asia-south1') // Mumbai — lowest latency for India
  .https.onCall(async (data, context) => {
    const { query, country = 'in' } = data;

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      throw new functions.https.HttpsError('invalid-argument', 'Query must be at least 3 characters.');
    }

    const cacheKey = `${query.trim().toLowerCase()}::${country}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return { results: cached.results, fromCache: true };
    }

    const searchQuery = `${query.trim()} flower bouquet delivery`;

    try {
      const res = await fetch('https://google.serper.dev/shopping', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: searchQuery,
          gl: country,        // geo-location (in = India)
          num: 20,            // up to 20 results
        }),
      });

      if (!res.ok) {
        throw new functions.https.HttpsError('unavailable', `Serper API error: ${res.status}`);
      }

      const json = await res.json();
      const raw = json.shopping || [];

      // Normalise + filter out non-flower results
      const results = raw
        .filter(item => item.title && item.link)
        .map(item => ({
          id: item.productId || item.position?.toString() || Math.random().toString(36).slice(2),
          title: item.title,
          price: item.price || null,
          source: item.source || null,
          rating: item.rating || null,
          ratingCount: item.ratingCount || null,
          imageUrl: item.imageUrl || item.thumbnailUrl || null,
          link: item.link,
          delivery: item.delivery || null,
          offers: item.offers || null,
        }));

      cache.set(cacheKey, { results, ts: Date.now() });
      return { results, fromCache: false };

    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      console.error('Serper fetch error:', err);
      throw new functions.https.HttpsError('internal', 'Failed to fetch bouquet listings.');
    }
  });

exports.onBouquetReply = functions
  .region('asia-south1')
  .firestore
  .document('bouquet-replies/{replyDocId}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return;
    
    const data = change.after.data();
    const beforeData = change.before.exists ? change.before.data() : null;
    
    const currentReplies = data.replies || [];
    const beforeReplies = beforeData?.replies || [];
    
    // Only notify if there's a NEW reply
    if (currentReplies.length <= beforeReplies.length) return;
    
    const latestReply = currentReplies[currentReplies.length - 1];
    
    const bouquetId = data.bouquetId;
    if (!bouquetId) return;
    
    const bouquetDoc = await db.collection('bouquet-cards').doc(bouquetId).get();
    if (!bouquetDoc.exists) return;
    
    const bouquetData = bouquetDoc.data();

    // ── Always write an in-app Firestore notification so it appears in Notifications screen ──
    // even if the user has not enabled push, they still see the reply in-app.
    if (bouquetData.userId) {
      try {
        await db.collection('notifications').doc(bouquetData.userId).collection('items').add({
          type: 'reply',
          title: 'New Reply to Your Bouquet! 🌸',
          message: `Someone replied: "${latestReply.message}"`,
          bouquetId: bouquetId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.error('Error writing in-app notification:', err);
      }
    }

    // ── Push notification — only if sender opted in and has a valid token ──
    if (!bouquetData.notifyOnReply || !bouquetData.senderExpoPushToken) {
      console.log(`Skipping push for bouquet ${bouquetId}: notifyOnReply=${bouquetData.notifyOnReply}, token=${bouquetData.senderExpoPushToken}`);
      return;
    }

    const pushToken = bouquetData.senderExpoPushToken;
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      return;
    }

    const messages = [{
      to: pushToken,
      sound: 'default',
      title: 'New Reply to Your Bouquet! 🌸',
      body: `Someone replied: "${latestReply.message}"`,
      data: {
        bouquetId: bouquetId,
        url: `digibouquet://bouquet/reply?id=${bouquetId}`
      },
    }];

    try {
      const tickets = await expo.sendPushNotificationsAsync(messages);
      console.log('Sent push notification tickets:', tickets);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  });

// ─── PROCESS RANDOM ACT OF KINDNESS MATCHES ─────────────────────────────────
exports.processRaokMatches = functions
  .region('asia-south1')
  .pubsub.schedule('every 60 minutes')
  .onRun(async (context) => {
    const now = Date.now();
    
    // 1. Fetch unmatched bouquets that are past their delivery delay
    const unmatchedSnapshot = await db.collection('bouquet-cards')
      .where('isRandomAct', '==', true)
      .where('status', '==', 'unmatched')
      .where('deliveryTimestamp', '<=', now)
      .limit(50) // process in batches
      .get();
      
    if (unmatchedSnapshot.empty) {
      console.log('No eligible RAOK bouquets to match right now.');
      return null;
    }

    // 2. Fetch potential recipients
    const usersSnapshot = await db.collection('users')
      .where('expoPushToken', '!=', null)
      .limit(200)
      .get();

    if (usersSnapshot.empty) {
      console.log('No eligible users found with push tokens.');
      return null;
    }

    const eligibleUsers = [];
    usersSnapshot.forEach(doc => {
      eligibleUsers.push({ id: doc.id, ...doc.data() });
    });

    // EFFICIENCY & LOGIC FIX: Shuffle the users array (Fisher-Yates) 
    // so we don't always pick the same first few users in the database
    for (let i = eligibleUsers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligibleUsers[i], eligibleUsers[j]] = [eligibleUsers[j], eligibleUsers[i]];
    }

    const batch = db.batch();
    const messages = [];

    unmatchedSnapshot.docs.forEach((bouquetDoc) => {
      const bouquet = bouquetDoc.data();
      const senderId = bouquet.creatorId;
      const targetTags = bouquet.targetTags || [];
      const ageHours = (now - (bouquet.createdAt || now)) / (1000 * 60 * 60);

      // Filter valid candidates
      const validCandidates = eligibleUsers.filter(u => u.id !== senderId && (u.raokReceivedToday || 0) < 2);
      
      let recipient = null;

      // Primary: Match by tags (still randomized because array is shuffled!)
      if (targetTags.length > 0) {
        recipient = validCandidates.find(u => u.interests && u.interests.some(tag => targetTags.includes(tag)));
      }

      // Fallback: if no tag match found (or no tags / 16h+ old), pick any available random candidate
      if (!recipient) {
        recipient = validCandidates[0];
      }

      if (recipient) {
        // Match found!
        batch.update(bouquetDoc.ref, {
          status: 'matched',
          matchedRecipient: recipient.id,
          matchedAt: now
        });

        batch.update(db.collection('users').doc(recipient.id), {
          raokReceivedToday: admin.firestore.FieldValue.increment(1)
        });

        batch.set(db.collection('notifications').doc(recipient.id).collection('items').doc(bouquetDoc.id), {
          type: 'raok_received',
          bouquetId: bouquetDoc.id,
          createdAt: now,
          read: false,
          title: 'You received a bouquet! ✨',
          message: 'A stranger sent you a Random Act of Kindness.',  // FIX: was 'body' — client reads 'message'
          isRandomAct: true
        });

        if (Expo.isExpoPushToken(recipient.expoPushToken)) {
          messages.push({
            to: recipient.expoPushToken,
            sound: 'default',
            title: 'You received a bouquet! ✨',
            body: 'A stranger sent you a Random Act of Kindness.',
            data: { bouquetId: bouquetDoc.id },
          });
        }
        
        // Update local object
        recipient.raokReceivedToday = (recipient.raokReceivedToday || 0) + 1;
        if (recipient.raokReceivedToday >= 2) {
          const rIndex = eligibleUsers.findIndex(u => u.id === recipient.id);
          if (rIndex > -1) eligibleUsers.splice(rIndex, 1);
        }
      }
    });

    await batch.commit();
    console.log(`Successfully matched ${messages.length} RAOK bouquets.`);

    if (messages.length > 0) {
      try {
        const chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
          await expo.sendPushNotificationsAsync(chunk);
        }
      } catch (error) {
        console.error('Error sending RAOK push notifications:', error);
      }
    }

    return null;
  });

// ─── DAILY RESET: raokReceivedToday ──────────────────────────────────────────
// Runs at midnight IST (18:30 UTC) every day.
// Resets the daily RAOK receive counter so users can receive bouquets again.
exports.resetRaokDailyCounters = functions
  .region('asia-south1')
  .pubsub.schedule('30 18 * * *')  // 18:30 UTC = 00:00 IST
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('Running daily RAOK counter reset...');

    const usersWithCounterSnapshot = await db.collection('users')
      .where('raokReceivedToday', '>', 0)
      .get();

    if (usersWithCounterSnapshot.empty) {
      console.log('No users with raokReceivedToday > 0. Nothing to reset.');
      return null;
    }

    const batch = db.batch();
    usersWithCounterSnapshot.forEach(doc => {
      batch.update(doc.ref, { raokReceivedToday: 0 });
    });

    await batch.commit();
    console.log(`Reset raokReceivedToday for ${usersWithCounterSnapshot.size} users.`);
    return null;
  });

const nodemailer = require('nodemailer');

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-pulse.com',
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'mayankkumar.inc@gmail.com',
      pass: process.env.SMTP_PASS || 'Mayank0218',
    },
  });
};

let sendPulseToken = null;
let sendPulseTokenExpiry = 0;

async function getSendPulseAccessToken() {
  const clientId = process.env.SENDPULSE_CLIENT_ID;
  const clientSecret = process.env.SENDPULSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SendPulse Client ID or Client Secret is not configured.');
  }

  const now = Date.now();
  if (sendPulseToken && now < sendPulseTokenExpiry - 5 * 60 * 1000) {
    return sendPulseToken;
  }

  console.log('Fetching new SendPulse access token via OAuth...');
  const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to authenticate with SendPulse: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  sendPulseToken = data.access_token;
  sendPulseTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return sendPulseToken;
}

async function getSendPulseToken() {
  const apiKey = process.env.SENDPULSE_API_KEY;
  if (apiKey) {
    return apiKey;
  }
  return getSendPulseAccessToken();
}

async function sendEmailViaSendPulseREST(emailData, subject, htmlContent, textContent, fromName = 'eGreet', fromEmail = 'mail@egreet.in') {
  const token = await getSendPulseToken();
  const htmlBase64 = Buffer.from(htmlContent).toString('base64');
  
  const payload = {
    email: {
      html: htmlBase64,
      text: textContent,
      subject: subject,
      from: {
        name: fromName,
        email: fromEmail
      },
      to: [
        {
          name: emailData.recipientName || 'Friend',
          email: emailData.recipientEmail
        }
      ]
    }
  };

  const response = await fetch('https://api.sendpulse.com/smtp/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SendPulse SMTP REST API error: ${response.status} - ${errText}`);
  }

  const resJson = await response.json();
  if (resJson.error_code) {
    throw new Error(`SendPulse API error: ${resJson.error_code} - ${resJson.message}`);
  }
  return resJson;
}

async function sendEmail(emailData, subject, htmlContent, textContent, fromName = 'eGreet', fromEmail = 'mail@egreet.in') {
  const hasRestCreds = process.env.SENDPULSE_API_KEY || (process.env.SENDPULSE_CLIENT_ID && process.env.SENDPULSE_CLIENT_SECRET);
  if (hasRestCreds) {
    console.log('Sending email using SendPulse REST API...');
    return sendEmailViaSendPulseREST(emailData, subject, htmlContent, textContent, fromName, fromEmail);
  } else {
    console.log('Falling back to SMTP for email sending...');
    const transporter = getTransporter();
    return transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: emailData.recipientEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });
  }
}

const sendEmailHtml = (emailData) => `
  <div style="background-color:#f9f6f2;padding:40px 20px;font-family:Arial,sans-serif;">
    <div style="max-width:580px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="padding:40px 32px;text-align:center;">
        <div style="margin:0 auto 24px;">
          <img src="https://egreet.in/logo.webp" alt="eGreet" height="50" style="height:50px;width:auto;display:block;margin:0 auto;" />
        </div>
        <h2 style="color:#7A5C58;margin:0 0 16px;font-size:24px;font-weight:600;">You have a new message!</h2>
        <p style="color:#555555;font-size:16px;line-height:1.6;margin:0 0 32px;">
          <strong>${emailData.senderName || 'Someone'}</strong> sent you a digital bouquet and a special message.
        </p>
        <a href="${emailData.bouquetUrl}" style="display:inline-block;background-color:#7A5C58;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:30px;">
          View Your Bouquet
        </a>
      </div>
    </div>
  </div>
`;

exports.sendInstantEmail = functions
  .region('asia-south1')
  .https.onCall(async (data, context) => {
    try {
      const subject = `${data.senderName || 'Someone'} sent you a message`;
      const htmlContent = sendEmailHtml(data);
      const textContent = `${data.senderName || 'Someone'} sent you a digital bouquet and a special message. View your bouquet at: ${data.bouquetUrl}`;
      
      await sendEmail(
        { recipientEmail: data.recipientEmail, recipientName: data.recipientName },
        subject,
        htmlContent,
        textContent,
        'eGreet',
        'mail@egreet.in'
      );
      return { success: true };
    } catch (err) {
      console.error('Error sending instant email:', err);
      throw new functions.https.HttpsError('internal', 'Failed to send email.');
    }
  });

exports.sendFeedbackEmail = functions
  .region('asia-south1')
  .https.onCall(async (data, context) => {
    try {
      await sendEmail(
        { recipientEmail: 'mayankkumar.inc@gmail.com', recipientName: 'eGreet Feedback' },
        data.subject,
        data.html,
        data.text,
        'eGreet Feedback',
        'mail@egreet.in'
      );
      return { success: true };
    } catch (err) {
      console.error('Error sending feedback email:', err);
      throw new functions.https.HttpsError('internal', 'Failed to send feedback email.');
    }
  });

// ─── PROCESS SCHEDULED EMAILS ─────────────────────────────────
exports.processScheduledEmails = functions
  .region('asia-south1')
  .pubsub.schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = Date.now();
    const pendingEmailsSnapshot = await db.collection('bouquet-scheduled-emails')
      .where('status', '==', 'pending')
      .where('scheduledAt', '<=', now)
      .limit(50)
      .get();

    if (pendingEmailsSnapshot.empty) {
      console.log('No pending scheduled emails to process.');
      return null;
    }

    const batch = db.batch();
    const emailsToSend = [];

    pendingEmailsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      emailsToSend.push({ id: doc.id, ref: doc.ref, ...data });
    });

    for (const emailData of emailsToSend) {
      try {
        const subject = `${emailData.senderName || 'Someone'} sent you a message`;
        const htmlContent = sendEmailHtml(emailData);
        const textContent = `${emailData.senderName || 'Someone'} sent you a digital bouquet and a special message. View your bouquet at: ${emailData.bouquetUrl}`;
        
        await sendEmail(
          { recipientEmail: emailData.recipientEmail, recipientName: emailData.recipientName },
          subject,
          htmlContent,
          textContent,
          'eGreet',
          'mail@egreet.in'
        );

        batch.update(emailData.ref, {
          status: 'sent',
          sentAt: now
        });
        console.log(`Successfully sent email for bouquet ${emailData.bouquetId}`);
      } catch (err) {
        console.error(`Error sending scheduled email ${emailData.id}:`, err);
        // Mark as failed so it doesn't get stuck in a retry loop forever if it's a bad request
        batch.update(emailData.ref, { status: 'failed', error: err.message });
      }
    }

    await batch.commit();
    console.log(`Processed ${emailsToSend.length} scheduled emails.`);
    return null;
  });


exports.claimGoldenReferral = functions.region("asia-south1").https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { referralCode, userId } = req.body;
  if (!referralCode || !userId) {
    return res.status(400).json({ error: "Missing parameters." });
  }

  const enteredCode = referralCode.trim().toUpperCase();

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 1. Check if user already claimed this code
      const claimRef = db.collection("users").doc(userId).collection("claimed_codes").doc(enteredCode);
      const claimSnap = await transaction.get(claimRef);
      if (claimSnap.exists) {
        throw new Error("You have already claimed this code.");
      }

      // 2. Check if code is valid
      const codeRef = db.collection("golden_codes").doc(enteredCode);
      const codeSnap = await transaction.get(codeRef);
      if (!codeSnap.exists) {
        throw new Error("Invalid code.");
      }

      const creatorUid = codeSnap.data().ownerUid;
      if (creatorUid === userId) {
        throw new Error("You cannot use your own code.");
      }

      // 3. Get user details for joined list
      const userRef = db.collection("users").doc(userId);
      const userSnap = await transaction.get(userRef);
      let userName = "A Friend";
      if (userSnap.exists) {
        const userData = userSnap.data();
        userName = userData.displayName || userData.email?.split("@")[0] || "A Friend";
      }

      // 4. Update both users and record claim
      // Mark as claimed
      transaction.set(claimRef, { claimedAt: Date.now() });

      // Add to creator's joined users
      const joinedRef = db.collection("golden_codes").doc(enteredCode).collection("joined_users").doc(userId);
      transaction.set(joinedRef, {
        name: userName,
        date: new Date().toLocaleDateString("en-US")
      });

      // Increment receiver's credits
      transaction.set(userRef, {
        goldenCredits: admin.firestore.FieldValue.increment(1)
      }, { merge: true });

      // Increment creator's credits
      const creatorRef = db.collection("users").doc(creatorUid);
      transaction.set(creatorRef, {
        goldenCredits: admin.firestore.FieldValue.increment(1)
      }, { merge: true });

      return { success: true };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error claiming referral:", err);
    return res.status(400).json({ error: err.message || "Failed to claim code." });
  }
});

