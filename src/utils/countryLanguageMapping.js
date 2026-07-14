// Country to Language Mapping for IP-based language detection
export const COUNTRY_TO_LANGUAGE = {
  // English-speaking countries
  US: 'en', CA: 'en', GB: 'en', AU: 'en', NZ: 'en', IE: 'en', ZA: 'en', 
  SG: 'en', HK: 'en', PH: 'en', NG: 'en', KE: 'en', GH: 'en', ZW: 'en', ZM: 'en',
  JM: 'en', TT: 'en', UG: 'en', RW: 'en',
  
  // Spanish-speaking countries
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', VE: 'es', CL: 'es', EC: 'es',
  GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es',
  CR: 'es', PA: 'es', UY: 'es',
  
  // French-speaking countries
  FR: 'fr', BE: 'fr', CH: 'fr', LU: 'fr', MC: 'fr', CI: 'fr', SN: 'fr',
  ML: 'fr', CM: 'fr', MG: 'fr', BF: 'fr', NE: 'fr', TD: 'fr', GN: 'fr',
  HT: 'fr',
  
  // German-speaking countries
  DE: 'de', AT: 'de', LI: 'de',
  
  // Portuguese-speaking countries
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt', GW: 'pt', TL: 'pt', MO: 'pt',
  
  // Arabic-speaking countries
  SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', JO: 'ar', KW: 'ar', LB: 'ar', LY: 'ar',
  MA: 'ar', OM: 'ar', QA: 'ar', SD: 'ar', SY: 'ar', TN: 'ar', YE: 'ar', BH: 'ar',
  DZ: 'ar', SO: 'ar',
  
  // Chinese-speaking countries
  CN: 'cn', TW: 'cn',
  
  // Hindi-speaking countries
  IN: 'hi', NP: 'hi',
  
  // Other Asian languages
  BD: 'bn', // Bengali
  PK: 'ur', // Urdu
  ID: 'id', // Indonesian
  JP: 'ja', // Japanese
  KR: 'ko', // Korean
  TH: 'id', // Thai (fallback to Indonesian for now)
  VN: 'id', // Vietnamese (fallback to Indonesian for now)
  MY: 'id', // Malay (fallback to Indonesian for now)
  
  // European languages
  IT: 'it', // Italian
  RU: 'ru', // Russian
  TR: 'tr', // Turkish
  NL: 'nl', // Dutch
  PL: 'pl', // Polish
  SE: 'sv', // Swedish
  NO: 'sv', // Norwegian (fallback to Swedish)
  DK: 'sv', // Danish (fallback to Swedish)
  FI: 'sv', // Finnish (fallback to Swedish)
  UA: 'ru', // Ukrainian (fallback to Russian)
  BY: 'ru', // Belarusian (fallback to Russian)
  KZ: 'ru', // Kazakhstan (fallback to Russian)
  
  // Tamil-speaking regions
  LK: 'ta', // Sri Lanka
  
  // Add more mappings as needed
};

/** Get the primary language code for a country. */
export const getLanguageForCountry = (countryCode) => {
  return COUNTRY_TO_LANGUAGE[countryCode] || 'en';
};

/** Detect country from IP (falls back to null). */
export const detectCountryFromIP = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    // Primary API: ipapi.co - only fetch country code for faster response
    const response = await fetch('https://ipapi.co/country/', { 
      signal: controller.signal,
      headers: { 
        'Accept': 'text/plain',
        'User-Agent': 'DigiBouquet/1.0'
      }
    });
    
    if (response.ok) {
      const countryCode = (await response.text()).trim();
      if (countryCode && countryCode.length === 2) {
        clearTimeout(timeoutId);
        return countryCode;
      }
    }
  } catch {
    // Silently handle primary API failure
  }

  try {
    // Fallback API: ip-api.com
    const fallbackResponse = await fetch('https://ip-api.com/json/?fields=countryCode', { 
      signal: controller.signal,
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'DigiBouquet/1.0'
      }
    });
    
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      if (fallbackData.countryCode && fallbackData.countryCode.length === 2) {
        clearTimeout(timeoutId);
        return fallbackData.countryCode;
      }
    }
  } catch {
    // Silently handle fallback API failure
  }

  try {
    // Third API: ipwhois.app
    const thirdResponse = await fetch('https://ipwhois.app/json/', { 
      signal: controller.signal,
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'DigiBouquet/1.0'
      }
    });
    
    if (thirdResponse.ok) {
      const thirdData = await thirdResponse.json();
      if (thirdData.country_code && thirdData.country_code.length === 2) {
        clearTimeout(timeoutId);
        return thirdData.country_code;
      }
    }
  } catch {
    // Silently handle third API failure
  } finally {
    clearTimeout(timeoutId);
  }
  
  // Return null if detection fails
  return null;
};

/** Get flag emoji for a country code. */
export const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};
