/**
 * Centralized Local Storage Manager
 * 
 * This utility manages all AsyncStorage operations for bouquet data across the app.
 * It provides a single source of truth for storage keys and operations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Storage Keys ──────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  // Bouquet data
  BOUQUET_PREFIX: 'bouquet_',                    
  BOUQUET_CREATED_PREFIX: 'bouquet_created_',   
  BOUQUET_RECEIVED_PREFIX: 'bouquet_received_', 
  BOUQUET_REPLIED_PREFIX: 'bouquet_replied_',   
  BOUQUET_REPLIES_PREFIX: 'bouquet_replies_',   
  
  // Lists and caches
  HOME_CACHE: 'home_bouquets_cache',             
  HISTORY_CACHE: 'history_bouquets_cache',     
  RECEIVED_BOUQUETS: 'received_bouquets',    
  HISTORY_SENT_PREFIX: 'history_sent_',        
  
  // Widget
  WIDGET_DATA: 'widget_bouquet_data',           
  WIDGET_SELECTED: 'widget_selected_bouquet',  
  WIDGET_STYLE: 'widget_style',                
  
  // Other
  DEVICE_ID: 'device_id',                        
  LANGUAGE_PICKED: 'hasPickedLanguage',         
  SCHEDULED_EMAILS_CACHE: 'scheduled_emails_cache', 
};

// ─── Storage Operations ────────────────────────────────────────────────────────

/**
 * Get a bouquet by ID
 */
export async function getBouquet(id) {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.BOUQUET_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error getting bouquet:', error);
    return null;
  }
}

/**
 * Save a bouquet
 */
export async function saveBouquet(id, data) {
  try {
    await AsyncStorage.setItem(`${STORAGE_KEYS.BOUQUET_PREFIX}${id}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving bouquet:', error);
    return false;
  }
}

/**
 * Delete a bouquet and all related data
 */
export async function deleteBouquet(id) {
  try {
    const keysToRemove = [
      `${STORAGE_KEYS.BOUQUET_PREFIX}${id}`,
      `${STORAGE_KEYS.BOUQUET_CREATED_PREFIX}${id}`,
      `${STORAGE_KEYS.BOUQUET_RECEIVED_PREFIX}${id}`,
      `${STORAGE_KEYS.BOUQUET_REPLIED_PREFIX}${id}`,
      `${STORAGE_KEYS.BOUQUET_REPLIES_PREFIX}${id}`,
    ];
    await AsyncStorage.multiRemove(keysToRemove);

    // Also update/clear any widgets that were showing this deleted bouquet
    const keys = await AsyncStorage.getAllKeys();
    const widgetKeys = keys.filter(k => k.startsWith(STORAGE_KEYS.WIDGET_DATA));
    for (const key of widgetKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      
      const widgetData = JSON.parse(raw);
      if (widgetData.bouquetId === id || widgetData.id === id) {
        // Reset widget to placeholder or clear it
        widgetData.recipient = '';
        widgetData.sender = '';
        widgetData.date = '';
        widgetData.flowerIds = [];
        widgetData.flowers = [];
        widgetData.background = 0;
        widgetData.greeneryBg = null;
        widgetData.bouquetId = null;
        widgetData.id = null;
        widgetData.updatedAt = Date.now();

        await AsyncStorage.setItem(key, JSON.stringify(widgetData));

        // Note: Widget UI re-render (requestWidgetUpdateById with JSX) must be
        // triggered from a React component/screen — not here — because JSX cannot
        // be used inside a plain .js utility file in production Hermes builds.
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting bouquet:', error);
    return false;
  }
}

/**
 * Mark a bouquet as created by this device
 */
export async function markBouquetCreated(id) {
  try {
    await AsyncStorage.setItem(`${STORAGE_KEYS.BOUQUET_CREATED_PREFIX}${id}`, 'true');
    return true;
  } catch (error) {
    console.error('Error marking bouquet created:', error);
    return false;
  }
}

/**
 * Check if a bouquet was created by this device
 */
export async function isBouquetCreated(id) {
  try {
    const value = await AsyncStorage.getItem(`${STORAGE_KEYS.BOUQUET_CREATED_PREFIX}${id}`);
    return value === 'true';
  } catch (error) {
    console.error('Error checking bouquet created:', error);
    return false;
  }
}

/**
 * Mark a bouquet as received
 */
export async function markBouquetReceived(id, bouquetData) {
  try {
    await AsyncStorage.setItem(`${STORAGE_KEYS.BOUQUET_RECEIVED_PREFIX}${id}`, 'true');
    
    // Add to received list
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECEIVED_BOUQUETS);
    const list = raw ? JSON.parse(raw) : [];
    
    const entry = {
      id,
      recipientName: bouquetData.recipientName || bouquetData.messageCard?.recipientName || '',
      senderName: bouquetData.senderName || bouquetData.messageCard?.senderName || '',
      selectedFlowers: bouquetData.selectedFlowers || [],
      openedAt: Date.now(),
    };
    
    // Keep last 50, newest first
    const updated = [entry, ...list.filter(r => r.id !== id)].slice(0, 50);
    await AsyncStorage.setItem(STORAGE_KEYS.RECEIVED_BOUQUETS, JSON.stringify(updated));
    
    return true;
  } catch (error) {
    console.error('Error marking bouquet received:', error);
    return false;
  }
}

/**
 * Get received bouquets list
 */
export async function getReceivedBouquets() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECEIVED_BOUQUETS);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error getting received bouquets:', error);
    return [];
  }
}

/**
 * Remove from received bouquets list
 */
export async function removeFromReceivedBouquets(id) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECEIVED_BOUQUETS);
    const list = raw ? JSON.parse(raw) : [];
    const updated = list.filter(r => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.RECEIVED_BOUQUETS, JSON.stringify(updated));
    await AsyncStorage.removeItem(`${STORAGE_KEYS.BOUQUET_RECEIVED_PREFIX}${id}`);
    return true;
  } catch (error) {
    console.error('Error removing from received bouquets:', error);
    return false;
  }
}

/**
 * Get home screen cache
 */
export async function getHomeCache() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HOME_CACHE);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error getting home cache:', error);
    return [];
  }
}

/**
 * Save home screen cache
 */
export async function saveHomeCache(data) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HOME_CACHE, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving home cache:', error);
    return false;
  }
}

/**
 * Get history screen cache
 */
export async function getHistoryCache() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY_CACHE);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error getting history cache:', error);
    return [];
  }
}

/**
 * Save history screen cache
 */
export async function saveHistoryCache(data) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY_CACHE, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving history cache:', error);
    return false;
  }
}

/**
 * Get widget data
 */
export async function getWidgetData(widgetId) {
  try {
    const key = widgetId ? `${STORAGE_KEYS.WIDGET_DATA}_${widgetId}` : STORAGE_KEYS.WIDGET_DATA;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error getting widget data:', error);
    return null;
  }
}

/**
 * Save widget data
 */
export async function saveWidgetData(data, widgetId) {
  try {
    const key = widgetId ? `${STORAGE_KEYS.WIDGET_DATA}_${widgetId}` : STORAGE_KEYS.WIDGET_DATA;
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving widget data:', error);
    return false;
  }
}

/**
 * Clear all widget data
 */
export async function clearWidgetData(widgetId) {
  try {
    if (widgetId) {
      await AsyncStorage.removeItem(`${STORAGE_KEYS.WIDGET_DATA}_${widgetId}`);
      return true;
    }
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.WIDGET_DATA,
      STORAGE_KEYS.WIDGET_SELECTED,
      STORAGE_KEYS.WIDGET_STYLE,
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing widget data:', error);
    return false;
  }
}

/**
 * Clear all caches (home, history)
 */
export async function clearAllCaches() {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.HOME_CACHE,
      STORAGE_KEYS.HISTORY_CACHE,
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing caches:', error);
    return false;
  }
}

/**
 * Clear all bouquet data (for logout/account deletion)
 */
export async function clearAllBouquetData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter(k => 
      k.startsWith(STORAGE_KEYS.BOUQUET_PREFIX) || 
      k.startsWith(STORAGE_KEYS.BOUQUET_CREATED_PREFIX) ||
      k.startsWith(STORAGE_KEYS.BOUQUET_RECEIVED_PREFIX) ||
      k.startsWith(STORAGE_KEYS.BOUQUET_REPLIED_PREFIX) ||
      k.startsWith(STORAGE_KEYS.BOUQUET_REPLIES_PREFIX) ||
      k.startsWith(STORAGE_KEYS.HISTORY_SENT_PREFIX) ||
      k === STORAGE_KEYS.HOME_CACHE ||
      k === STORAGE_KEYS.HISTORY_CACHE ||
      k === STORAGE_KEYS.RECEIVED_BOUQUETS ||
      k === STORAGE_KEYS.WIDGET_DATA ||
      k === STORAGE_KEYS.WIDGET_SELECTED ||
      k === STORAGE_KEYS.WIDGET_STYLE ||
      k === STORAGE_KEYS.SCHEDULED_EMAILS_CACHE
    );
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
    return true;
  } catch (error) {
    console.error('Error clearing all bouquet data:', error);
    return false;
  }
}

/**
 * Mark bouquet as replied
 */
export async function markBouquetReplied(id) {
  try {
    await AsyncStorage.setItem(`${STORAGE_KEYS.BOUQUET_REPLIED_PREFIX}${id}`, 'true');
    return true;
  } catch (error) {
    console.error('Error marking bouquet replied:', error);
    return false;
  }
}

/**
 * Check if bouquet has been replied to
 */
export async function hasBouquetBeenReplied(id) {
  try {
    const value = await AsyncStorage.getItem(`${STORAGE_KEYS.BOUQUET_REPLIED_PREFIX}${id}`);
    return value === 'true';
  } catch (error) {
    console.error('Error checking bouquet replied:', error);
    return false;
  }
}

/**
 * Save bouquet replies
 */
export async function saveBouquetReplies(id, replies) {
  try {
    await AsyncStorage.setItem(`${STORAGE_KEYS.BOUQUET_REPLIES_PREFIX}${id}`, JSON.stringify(replies));
    return true;
  } catch (error) {
    console.error('Error saving bouquet replies:', error);
    return false;
  }
}

/**
 * Get bouquet replies
 */
export async function getBouquetReplies(id) {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.BOUQUET_REPLIES_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error getting bouquet replies:', error);
    return [];
  }
}

/**
 * Synchronize all widget data cached in AsyncStorage with updated bouquet data
 */
export async function syncWidgetDataWithBouquet(bouquetId, bouquetData) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const widgetKeys = keys.filter(k => k.startsWith(STORAGE_KEYS.WIDGET_DATA));
    
    const formattedDate = bouquetData.createdAt?.toMillis 
      ? new Date(bouquetData.createdAt.toMillis()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : bouquetData.createdAt?._millis
      ? new Date(bouquetData.createdAt._millis).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    for (const key of widgetKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      
      const widgetData = JSON.parse(raw);
      if (widgetData.bouquetId === bouquetId || widgetData.id === bouquetId) {
        // Update fields
        widgetData.recipient = bouquetData.messageCard?.recipientName || bouquetData.recipientName || 'Someone special';
        widgetData.sender = bouquetData.messageCard?.senderName || bouquetData.senderName || '';
        widgetData.date = formattedDate;
        widgetData.flowerIds = (bouquetData.selectedFlowers || []).map(f => typeof f === 'string' ? f : f.id);
        widgetData.flowers = bouquetData.selectedFlowers || [];
        widgetData.background = bouquetData.background || 0;
        widgetData.greeneryBg = bouquetData.greeneryBg || null;
        widgetData.version = bouquetData.version || 1;
        widgetData.updatedAt = Date.now();

        await AsyncStorage.setItem(key, JSON.stringify(widgetData));

        // Trigger a native update using the new task handler function
      }
    }
    // Also explicitly force update all widgets
    try {
      const { forceUpdateAllWidgets } = require('../widgets/widgetTaskHandler');
      await forceUpdateAllWidgets();
    } catch (updateErr) {
      console.warn('Failed to force widget update:', updateErr);
    }
  } catch (error) {
    console.error('Error syncing widget data with bouquet:', error);
  }
}
