const functions = require('firebase-functions');
const fetch = require('node-fetch');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

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
    
    if (!bouquetData.notifyOnReply || !bouquetData.senderExpoPushToken) {
      console.log(`Skipping notification for bouquet ${bouquetId}: notifyOnReply is ${bouquetData.notifyOnReply}, token is ${bouquetData.senderExpoPushToken}`);
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
      data: { bouquetId: bouquetId },
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

      if (ageHours >= 16) {
        // Fallback: Pick the first available random candidate
        recipient = validCandidates[0];
      } else {
        // Primary: Match by tags (still randomized because array is shuffled!)
        if (targetTags.length > 0) {
          recipient = validCandidates.find(u => u.interests && u.interests.some(tag => targetTags.includes(tag)));
        }
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
          body: 'A stranger sent you a Random Act of Kindness.',
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
      const transporter = getTransporter();
      await transporter.sendMail({
        from: '"eGreet" <mail@egreet.in>',
        to: data.recipientEmail,
        subject: `${data.senderName || 'Someone'} sent you a message`,
        html: sendEmailHtml(data),
      });
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
      const transporter = getTransporter();
      await transporter.sendMail({
        from: '"eGreet Feedback" <mail@egreet.in>',
        to: 'mayankkumar.inc@gmail.com',
        subject: data.subject,
        html: data.html,
        text: data.text,
      });
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

    const transporter = getTransporter();

    for (const emailData of emailsToSend) {
      try {
        await transporter.sendMail({
          from: '"eGreet" <mail@egreet.in>',
          to: emailData.recipientEmail,
          subject: `${emailData.senderName || 'Someone'} sent you a message`,
          html: sendEmailHtml(emailData),
        });

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
