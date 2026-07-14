import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdateById, getWidgetInfo } from 'react-native-android-widget';
import * as FileSystem from 'expo-file-system/legacy';
import { BouquetWidget, FLOWER_IMAGE_MAP, BG_IMAGES } from './BouquetWidget';
import { getWidgetData, getHistoryCache, getReceivedBouquets, saveWidgetData } from '../utils/storageManager';

async function getWidgetBouquetProps(widgetId) {
  try {
    let widgetData = await getWidgetData(widgetId);
    
    if (!widgetData) {
      const cached = await getHistoryCache();
      const received = await getReceivedBouquets();
      let allDocs = [];
      if (cached && cached.length > 0) allDocs = [...cached];
      if (received && received.length > 0) {
        allDocs = [...allDocs, ...received].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
      }
      allDocs.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? a.openedAt ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? b.openedAt ?? 0;
        return tb - ta;
      });

      if (allDocs.length > 0) {
        const selectedBouquet = allDocs[0];
        const formattedDate = selectedBouquet.createdAt?.toMillis 
          ? new Date(selectedBouquet.createdAt.toMillis()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : selectedBouquet.createdAt?._millis
          ? new Date(selectedBouquet.createdAt._millis).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        widgetData = {
          id: selectedBouquet.id,
          bouquetId: selectedBouquet.id,
          recipient: selectedBouquet.messageCard?.recipientName || selectedBouquet.recipientName || 'Someone special',
          sender: selectedBouquet.messageCard?.senderName || selectedBouquet.senderName || '',
          date: formattedDate,
          flowerIds: (selectedBouquet.selectedFlowers || []).map(f => typeof f === 'string' ? f : f.id),
          flowers: selectedBouquet.selectedFlowers || [],
          background: selectedBouquet.background || 0,
          greeneryBg: selectedBouquet.greeneryBg || (selectedBouquet.background !== undefined && selectedBouquet.background !== null ? `bg-${selectedBouquet.background + 1}` : 'bg-1'),
          version: selectedBouquet.version || 1,
          widgetStyle: 'petal',
          updatedAt: Date.now()
        };
        await saveWidgetData(widgetData, widgetId);
      }
    }
    
    if (!widgetData) {
      return { 
        widgetStyle: 'petal',
        recipient: 'Someone special',
        sender: '',
        flowerIds: ['rose'],
        bouquetId: 'default'
      };
    }
    
    return {
      recipient: widgetData.recipient || 'Someone special',
      sender: widgetData.sender || '',
      date: widgetData.date || '',
      flowerIds: widgetData.flowerIds || ['rose'],
      flowers: widgetData.flowers || [],
      bouquetId: widgetData.bouquetId || widgetData.id || 'default',
      widgetStyle: widgetData.widgetStyle || 'petal',
      version: widgetData.version || 1,
      background: widgetData.background,
      greeneryBg: widgetData.greeneryBg,
    };
  } catch (error) {
    console.error('Widget data fetch error:', error);
    return { 
      widgetStyle: 'petal',
      recipient: 'Someone special',
      sender: '',
      flowerIds: ['rose'],
      bouquetId: 'default'
    };
  }
}

async function downloadImage(remoteUrl) {
  if (!remoteUrl) return null;
  const filename = remoteUrl.split('/').pop().replace(/[^a-zA-Z0-9.\-]/g, '_');
  const localUri = FileSystem.cacheDirectory + 'widget_' + filename;
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) {
      await FileSystem.downloadAsync(remoteUrl, localUri);
    }
    return localUri;
  } catch (e) {
    console.error('Error downloading image', e);
    return remoteUrl;
  }
}

export async function widgetTaskHandler(props) {
  try {
    const widgetId = props.widgetInfo.widgetId;
    const widgetProps = await getWidgetBouquetProps(widgetId);
    
    const imagesToDownload = new Set();
    const bgUrl = FLOWER_IMAGE_MAP[widgetProps.greeneryBg] || FLOWER_IMAGE_MAP[`bg-${(widgetProps.background || 0) + 1}`] || BG_IMAGES[0];
    if (bgUrl) imagesToDownload.add(bgUrl);
    
    const ids = (widgetProps.flowers && widgetProps.flowers.length > 0) 
      ? widgetProps.flowers.map(f => (typeof f === 'string' ? f : f.id))
      : widgetProps.flowerIds;
      
    (ids || ['rose']).forEach(id => {
      const url = FLOWER_IMAGE_MAP[id];
      if (url) imagesToDownload.add(url);
    });

    const localImages = {};
    for (const url of imagesToDownload) {
      const localUri = await downloadImage(url);
      if (localUri) localImages[url] = localUri;
    }
    
    props.renderWidget(<BouquetWidget {...widgetProps} localImages={localImages} />);
  } catch (error) {
    console.error('Widget task handler error:', error);
    // Render default widget on error
    props.renderWidget(<BouquetWidget 
      widgetStyle="petal"
      recipient="Someone special"
      sender=""
      flowerIds={['rose']}
      bouquetId="default"
      localImages={{}}
    />);
  }
}

export async function forceUpdateAllWidgets() {
  if (Platform.OS !== 'android') return;
  try {
    const widgets = await getWidgetInfo('BouquetWidget');
    if (!widgets || widgets.length === 0) return;
    
    for (const w of widgets) {
      const widgetProps = await getWidgetBouquetProps(w.widgetId);
      requestWidgetUpdateById({
        widgetId: w.widgetId,
        widgetName: 'BouquetWidget',
        renderWidget: () => <BouquetWidget {...widgetProps} />
      });
    }
  } catch (error) {
    console.error('Error forcing widget update:', error);
  }
}
