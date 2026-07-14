/**
 * Cloudinary upload utility — images and audio with heavy compression.
 * Cloud: dnki5pyx8 | Key: 451849344346292
 *
 * ⚠️ Move API_SECRET to a backend/env var before production.
 *    Never ship API_SECRET in client code for a public app.
 */

import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY    = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
const API_SECRET = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

// ── Signed upload (needed for audio — resource_type: video) ─────────────────
async function getSignature(params) {
  const sorted = Object.keys(params).sort().reduce((acc, k) => {
    if (params[k] !== undefined && params[k] !== '') acc[k] = params[k];
    return acc;
  }, {});
  const str = Object.entries(sorted).map(([k, v]) => `${k}=${v}`).join('&') + API_SECRET;
  
  // SHA-1 via expo-crypto
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    str
  );
  return hash;
}

/**
 * Upload an image to Cloudinary with high compression.
 * @param {string} uri - local file URI from expo-image-picker
 * @param {string} folder - cloudinary folder e.g. 'bouquet-messages'
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadImage(uri, folder = 'bouquet-messages') {
  const timestamp = Math.round(Date.now() / 1000);
  const params = {
    folder,
    timestamp,
  };
  const signature = await getSignature(params);

  const formData = new FormData();
  if (Platform.OS === 'web') {
    const r = await fetch(uri);
    const b = await r.blob();
    formData.append('file', b, 'upload.jpg');
  } else {
    formData.append('file', { uri, type: 'image/jpeg', name: 'upload.jpg' });
  }
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('angle', 'ignore');

  const res = await fetch(`${UPLOAD_URL}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image upload failed: ${err}`);
  }
  const json = await res.json();
  return { url: json.secure_url, publicId: json.public_id };
}

/**
 * Upload an audio file to Cloudinary (resource_type: video handles audio too).
 * @param {string} uri - local file URI from expo-av recording
 * @param {string} folder - cloudinary folder
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadAudio(uri, folder = 'bouquet-audio') {
  const timestamp = Math.round(Date.now() / 1000);
  const params = {
    folder,
    timestamp,
  };
  const signature = await getSignature(params);

  const formData = new FormData();
  if (Platform.OS === 'web') {
    const r = await fetch(uri);
    const b = await r.blob();
    formData.append('file', b, 'audio.m4a');
  } else {
    formData.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' });
  }
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('resource_type', 'video');

  const res = await fetch(`${UPLOAD_URL}/video/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Audio upload failed: ${err}`);
  }
  const json = await res.json();
  return { url: json.secure_url, publicId: json.public_id };
}
