import { removePII } from '@coffeeandfun/remove-pii';
import { checkProfanity } from 'glin-profanity';
import { RAOK_SUGGESTIONS } from './raokSuggestions';

// Initialize profanity filter if it requires configuration
// Assuming default configuration handles multiple languages
// (glin-profanity usually supports many out of the box)

/**
 * Checks text for PII (phone numbers, emails, URLs, etc) and profanity.
 * Returns an object indicating if it's safe and what words were flagged.
 */
export const checkLocalSafety = (text) => {
  if (!text || text.trim() === '') {
    return { isSafe: true, flaggedWords: [] };
  }

  const flaggedWords = [];

  // 1. Check Profanity
  try {
    const result = checkProfanity(text); 
    if (result && result.containsProfanity) {
      flaggedWords.push(...(result.profaneWords || ['profanity_detected']));
    }
  } catch (e) {
    console.warn('Profanity check error:', e);
  }

  // 2. Check PII
  try {
    const piiRemoved = removePII(text);
    if (piiRemoved && piiRemoved !== text) {
      flaggedWords.push('personal_info_detected');
    }
  } catch (e) {
    console.warn('PII check error:', e);
  }

  // Fallback simple regex for PII (emails, phones, urls, handles) if the library misses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:\+\d{1,3}|0\d{1,3}|00\d{1,2})?(?:\s?\(\d+\))?(?:[-\s\.]|\d){9,15}/;
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/;
  const handleRegex = /@[a-zA-Z0-9_]{1,30}/; // Insta/Twitter handles

  if (emailRegex.test(text)) flaggedWords.push('email_detected');
  if (phoneRegex.test(text)) flaggedWords.push('phone_detected');
  if (urlRegex.test(text)) flaggedWords.push('url_detected');
  if (handleRegex.test(text)) flaggedWords.push('social_handle_detected');

  // Deduplicate
  const uniqueFlags = [...new Set(flaggedWords)];

  return {
    isSafe: uniqueFlags.length === 0,
    flaggedWords: uniqueFlags,
  };
};

/**
 * Calls Sarvam AI to moderate the text for threats/harm and generate tags.
 */
export const moderateWithSarvam = async (text) => {
  if (!text || text.trim() === '') {
    return { isSafe: true, tags: [] };
  }

  let isPreset = false;
  let presetTags = [];

  for (const category of RAOK_SUGGESTIONS) {
    for (const msg of category.messages) {
      const lengthDiff = Math.abs(text.length - msg.length);
      // Check if length is similar and shares first or last 50 characters
      if (lengthDiff < 100 && (text.includes(msg.substring(0, 50)) || text.includes(msg.substring(msg.length - 50)))) {
        isPreset = true;
        presetTags = category.tags || [];
        break;
      }
    }
    if (isPreset) break;
  }

  if (isPreset) {
    const local = checkLocalSafety(text);
    return { isSafe: local.isSafe, tags: presetTags.length ? presetTags : ['encouragement'] };
  }

  const SARVAM_API_KEY = 'sk_zv7duy20_MqNmTQeHzNpQFnr2LFJHOdhd'; // Existing key from codebase

  const prompt = `
You are a strict moderation AI for a digital bouquet gifting app.
Your task is to analyze the following message intended for a random stranger.
Check for:
1. Threats of violence or self-harm.
2. Harassment, bullying, or hate speech.
3. Sexual or highly inappropriate content.

If the message is unsafe, return JSON:
{ "isSafe": false, "reason": "<short explanation>" }

If the message is safe, generate 1-3 short topic/mood tags (e.g. "encouragement", "love", "friendship", "cheer up") and return JSON:
{ "isSafe": true, "tags": ["tag1", "tag2"] }

Message: "${text}"
`;

  try {
    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SARVAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sarvam-105b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      })
    });

    if (!res.ok) {
      throw new Error(`Sarvam API error: ${res.status}`);
    }

    const data = await res.json();
    const replyText = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response (handle markdown blocks if any)
    const jsonMatch = replyText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isSafe: parsed.isSafe,
          reason: parsed.reason,
          tags: parsed.tags || []
        };
      } catch (parseError) {
        // Parse error handled below
      }
    }

    // Default safe if we can't parse, fallback to local checks
    const local = checkLocalSafety(text);
    return { isSafe: local.isSafe, tags: ['general'] };

  } catch (error) {
    // On API failure, use local check
    const local = checkLocalSafety(text);
    return { isSafe: local.isSafe, tags: ['fallback-unverified'], reason: 'Moderation service unavailable, bypassed for demo.' };
  }
};

