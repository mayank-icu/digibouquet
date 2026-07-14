import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Serper API ───────────────────────────────────────────────────────────────
const SERPER_KEYS = [
  '7484bc9d0320df9d4d7f3c055b34a1a1416ad9dc',
  '5e6017b687de0a9682828f4d3946cadcb89f2ddb',
];
const SERPER_URL = 'https://google.serper.dev/shopping';

// ─── Cache TTLs ───────────────────────────────────────────────────────────────
const MEM_TTL_MS      = 2  * 60 * 60 * 1000; // 2 h
const STORAGE_TTL_MS  = 12 * 60 * 60 * 1000; // 12 h
const FIREBASE_TTL_MS = 45 * 24 * 60 * 60 * 1000; // 45 days
const CDN_BASE_URL    = 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop-data-v2';

// ─── Firestore layout ─────────────────────────────────────────────────────────
// Collection : shop-data
// Documents  : "in" | "id" | "us"
// Shape      : { updatedAt: number, queries: { [queryKey]: TrimmedResult[] } }
//
// Max 12 results per query, minimal fields → ~125 KB per country doc (well under 1 MB).
const SHOP_COLLECTION = 'shop-data-v2';
const MAX_RESULTS_PER_QUERY = 40;

// ─── All queries to pre-seed ──────────────────────────────────────────────────
export const ALL_SHOP_QUERIES = [
  // Occasions
  'birthday flower bouquet',
  'love flower bouquet',
  'anniversary flower bouquet',
  'congratulations flower bouquet',
  'get well soon flower bouquet',
  'apology flower bouquet',
  'sympathy flower bouquet',
  'just because flower bouquet',
  'wedding flower bouquet',
  'mothers day flower bouquet',
  'valentines day flower bouquet',
  'thank you flower bouquet',
  'housewarming flower bouquet',
  'new baby flower bouquet',
  'graduation flower bouquet',
  'romance flower bouquet',
  // Flower types
  'red roses flower bouquet',
  'white lilies flower bouquet',
  'sunflowers bouquet',
  'hydrangeas flower bouquet',
  'orchids flower bouquet',
  'pink carnations bouquet',
  'mixed gerberas bouquet',
  'tulips bouquet',
  'peonies bouquet',
  'lavender bouquet',
  'daisies flower bouquet',
  'mixed wildflowers bouquet',
  'chrysanthemums bouquet',
  'lily of the valley bouquet',
  // Bestsellers
  'best seller flower bouquet',
  'premium luxury flower bouquet',
  'fresh seasonal flower bouquet',
  'colorful mixed flower bouquet',
  'cheap beautiful flower bouquet',
  'elegant modern flower bouquet',
];

export const ALL_COUNTRIES = ['in', 'ph', 'id', 'pk', 'us'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toQueryKey(query) {
  return query.trim().toLowerCase().replace(/\s+/g, '-');
}

function trimResult(item, idx) {
  return {
    id:          item.productId || `s${idx}`,
    title:       (item.title || '').slice(0, 90),
    price:       item.price   || null,
    source:      (item.source || '').slice(0, 40),
    rating:      item.rating  ? Number(item.rating) : null,
    ratingCount: item.ratingCount || null,
    imageUrl:    item.imageUrl || item.thumbnailUrl || item.image || item.imageLink || '',
    link:        item.link || '',
  };
}

// ─── In-memory store  {country → {updatedAt, queries:{key→results[]}}} ────────
const _mem = {};

// ─── AsyncStorage helpers ─────────────────────────────────────────────────────
const asKey = (country) => `shopdata-v2-${country}`;

async function saveToStorage(country, data) {
  try {
    await AsyncStorage.setItem(asKey(country), JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch { /* ignore storage write errors */ }
}

async function loadFromStorage(country) {
  try {
    const raw = await AsyncStorage.getItem(asKey(country));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt < STORAGE_TTL_MS) return parsed;
  } catch { /* ignore storage read errors */ }
  return null;
}

// ─── Firestore helpers ────────────────────────────────────────────────────────
async function loadFromFirebase(country) {
  try {
    const snap = await getDoc(doc(db, SHOP_COLLECTION, country));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (Date.now() - (data.updatedAt || 0) < FIREBASE_TTL_MS) return data;
  } catch (e) {
    console.log('[ShopData] Firebase read error:', e?.message);
  }
  return null;
}

async function loadFromCDN(country) {
  try {
    const res = await fetch(`${CDN_BASE_URL}/${country}.json`);
    if (res.ok) {
      const data = await res.json();
      if (Date.now() - (data.updatedAt || 0) < FIREBASE_TTL_MS) return data;
    }
  } catch (e) {
    console.log('[ShopData] CDN read error:', e?.message);
  }
  return null;
}

async function saveToFirebase(country, data) {
  try {
    await setDoc(doc(db, SHOP_COLLECTION, country), data);
  } catch (e) {
    console.log('[ShopData] Firebase write error:', e?.message);
  }
}

// ─── Load full country data (all queries) ─────────────────────────────────────
async function getCountryData(country) {
  const c = country.toLowerCase();

  // 1. Memory
  if (_mem[c] && Date.now() - (_mem[c].updatedAt || 0) < MEM_TTL_MS) {
    return _mem[c];
  }

  // 2. AsyncStorage
  const stored = await loadFromStorage(c);
  if (stored) {
    _mem[c] = stored;
    return stored;
  }

  // 3. CDN
  const cdn = await loadFromCDN(c);
  if (cdn) {
    _mem[c] = cdn;
    await saveToStorage(c, cdn);
    return cdn;
  }

  // 4. Firestore
  const fb = await loadFromFirebase(c);
  if (fb) {
    _mem[c] = fb;
    await saveToStorage(c, fb);
    return fb;
  }

  return null;
}

// ─── Serper fetch for one query ───────────────────────────────────────────────
async function fetchFromSerper(query, country) {
  const apiKey = SERPER_KEYS[Math.floor(Math.random() * SERPER_KEYS.length)];
  const res = await fetch(SERPER_URL, {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: `${query.trim()} delivery`, gl: country.toLowerCase(), num: 20 }),
  });
  if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
  const json = await res.json();
  return (json.shopping || [])
    .filter(i => i.title && i.link)
    .slice(0, MAX_RESULTS_PER_QUERY)
    .map(trimResult);
}

// ─── Main search function ─────────────────────────────────────────────────────
export async function searchBouquets(query, country = 'in', internalOnly = false) {
  const c = country.toLowerCase();
  const key = toQueryKey(query);

  if (key === 'internal_bouquet_data' || internalOnly) {
    const fallback = await searchLocalCatalog(query, c);
    return { results: fallback, fromCache: true };
  }

  // Look up in country data blob first
  const countryData = await getCountryData(c);
  if (countryData?.queries?.[key]?.length > 0) {
    return { results: countryData.queries[key], fromCache: true };
  }

  // Fetch live from Serper
  try {
    const results = await fetchFromSerper(query, c);
    if (results.length > 0) {
      // Merge into country data and persist
      const updated = {
        updatedAt: Date.now(),
        queries: { ...(countryData?.queries || {}), [key]: results },
      };
      _mem[c] = updated;
      saveToStorage(c, updated);
      saveToFirebase(c, updated); // fire-and-forget
      return { results, fromCache: false };
    }
  } catch (err) {
    // Silent catch
  }

  // Local catalog search across cached data
  const fallback = await searchLocalCatalog(query, c);
  return { results: fallback, fromCache: true };
}

// ─── Local fallback: keyword-score across all cached results ──────────────────
async function searchLocalCatalog(query, country) {
  const data = await getCountryData(country);
  if (!data?.queries) return [];

  const terms = query.trim().toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const all = Object.values(data.queries).flat();
  const seen = new Set();
  const unique = all.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  if (terms.length === 0 || query === 'INTERNAL_BOUQUET_DATA') {
    return unique.sort(() => Math.random() - 0.5).slice(0, 30);
  }

  return unique
    .map(item => ({
      item,
      score: terms.filter(t => `${item.title} ${item.source}`.toLowerCase().includes(t)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ item }) => item);
}

// ─── Bulk Seeder ──────────────────────────────────────────────────────────────
/**
 * Fetches ALL queries for ALL countries and writes ONE Firestore doc per country.
 * 3 total writes (not 78). Rate-limited to 700ms between Serper calls.
 */
export async function seedAllShopData(onProgress) {
  const total = ALL_SHOP_QUERIES.length * ALL_COUNTRIES.length;
  let done = 0;

  for (const country of ALL_COUNTRIES) {
    // Check if country doc is already fresh (via CDN/Storage/Firebase fallback)
    const existing = await getCountryData(country);
    if (existing && Date.now() - (existing.updatedAt || 0) < FIREBASE_TTL_MS) {
      // Still fresh — skip all queries for this country
      done += ALL_SHOP_QUERIES.length;
      onProgress?.({ done, total, country, status: 'skipped_country' });
      continue;
    }

    const queries = existing?.queries || {};
    const missingQueries = ALL_SHOP_QUERIES.filter(q => {
      const key = toQueryKey(q);
      if (queries[key] && queries[key].length > 0) {
        done++;
        onProgress?.({ done, total, query: q, country, status: 'skipped_query', count: queries[key].length });
        return false;
      }
      return true;
    });

    if (missingQueries.length > 0) {
      try {
        const apiKey = SERPER_KEYS[Math.floor(Math.random() * SERPER_KEYS.length)];
        const body = missingQueries.map(q => ({ q: `${q.trim()} delivery`, gl: country.toLowerCase(), num: 20 }));
        
        const res = await fetch(SERPER_URL, {
          method: 'POST',
          headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        if (res.ok) {
          const jsonArray = await res.json();
          const resultsArray = Array.isArray(jsonArray) ? jsonArray : [jsonArray];
          
          resultsArray.forEach((json, idx) => {
            const query = missingQueries[idx];
            const key = toQueryKey(query);
            const results = (json.shopping || [])
              .filter(i => i.title && i.link)
              .map(trimResult);
              
            if (results.length > 0) {
              const existing = queries[key] || [];
              const combined = [...existing, ...results];
              const seen = new Set();
              queries[key] = combined.filter(item => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
              }).slice(0, MAX_RESULTS_PER_QUERY);
            }
            done++;
            onProgress?.({ done, total, query, country, status: 'fetched', count: results.length });
          });
        } else {
          throw new Error(`Serper HTTP ${res.status}`);
        }
      } catch (err) {
        done += missingQueries.length;
        onProgress?.({ done, total, country, status: 'error', error: err?.message });
      }
    }

    // ONE write for the entire country
    const payload = { updatedAt: Date.now(), queries };
    await saveToFirebase(country, payload);
    _mem[country] = payload;
    await saveToStorage(country, payload);
    onProgress?.({ done, total, country, status: 'country_saved' });
  }

  return { done, total };
}

// ─── Client-side filter engine ────────────────────────────────────────────────
export function applyClientFilters(results, { priceMax, scent, longevity, eco, rare, mood }) {
  let filtered = [...results];

  if (priceMax && priceMax > 0 && priceMax < 9999999) {
    filtered = filtered.filter(item => {
      if (!item.price) return true;
      const num = parseFloat(item.price.replace(/[^0-9.]/g, ''));
      return isNaN(num) || num <= priceMax;
    });
  }

  const kw = {
    scent:     ['scent', 'fragrant', 'aromatic', 'jasmine', 'gardenia', 'hyacinth', 'perfumed'],
    longevity: ['lasting', 'preserved', 'dried', 'long', 'durable', 'weeks', 'silk'],
    eco:       ['organic', 'eco', 'sustainable', 'local', 'natural', 'green', 'farm'],
    rare:      ['rare', 'exotic', 'unique', 'seasonal', 'luxury', 'premium', 'special', 'custom'],
  };

  if (scent || longevity || eco || rare) {
    filtered = filtered.filter(item => {
      const text = `${item.title} ${item.source || ''}`.toLowerCase();
      if (scent     && !kw.scent.some(k     => text.includes(k))) return false;
      if (longevity && !kw.longevity.some(k => text.includes(k))) return false;
      if (eco       && !kw.eco.some(k       => text.includes(k))) return false;
      if (rare      && !kw.rare.some(k      => text.includes(k))) return false;
      return true;
    });
  }

  if (mood?.trim()) {
    const terms = mood.trim().toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (terms.length > 0) {
      filtered = filtered.filter(item => {
        const text = `${item.title} ${item.source || ''}`.toLowerCase();
        return terms.some(t => text.includes(t));
      });
    }
  }

  return filtered;
}

// ─── Vendor Info (AI streaming) ───────────────────────────────────────────────
export async function searchVendorInfo(vendorName, onChunk) {
  if (!vendorName) return null;
  const searchName = vendorName.replace(/flowers|florist/i, '').trim();
  const cacheKey = `vendor_${searchName}`;

  try {
    const stored = await AsyncStorage.getItem(`shop-cache-${cacheKey}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Date.now() - parsed.ts < 86400000 * 2) {
        if (onChunk && parsed.data?.snippet) {
          const words = parsed.data.snippet.split(' ');
          for (const word of words) {
            onChunk(word + ' ');
            await new Promise(r => setTimeout(r, 25));
          }
        }
        return parsed.data;
      }
    }
  } catch { /* ignore cache read errors */ }

  const SARVAM_API_KEY = 'sk_zv7duy20_MqNmTQeHzNpQFnr2LFJHOdhd';
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.sarvam.ai/v1/chat/completions');
    xhr.setRequestHeader('Authorization', `Bearer ${SARVAM_API_KEY}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    let seenBytes = 0, fullText = '';

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        const newData = xhr.responseText.substring(seenBytes);
        seenBytes = xhr.responseText.length;
        for (const line of newData.split('\n')) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const chunk = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content;
              if (chunk) { fullText += chunk; onChunk?.(chunk); }
            } catch { /* ignore malformed SSE chunk */ }
          }
        }
        if (xhr.readyState === 4) {
          const urlMatch = fullText.match(/https?:\/\/[^\s]+/);
          const data = {
            title: vendorName,
            snippet: fullText.replace(/https?:\/\/[^\s]+/, '').trim(),
            link: urlMatch?.[0] || null,
          };
          AsyncStorage.setItem(`shop-cache-${cacheKey}`, JSON.stringify({ data, ts: Date.now() })).catch(() => {});
          resolve(data);
        }
      }
    };
    xhr.onerror = () => resolve(null);
    xhr.send(JSON.stringify({
      model: 'sarvam-105b', stream: true,
      messages: [
        { role: 'system', content: 'Provide a very brief 2-sentence description of the requested florist shop. Include their official website at the very end if known.' },
        { role: 'user', content: `Florist: ${searchName}` },
      ],
    }));
  });
}
