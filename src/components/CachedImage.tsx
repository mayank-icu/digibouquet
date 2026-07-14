import React, { useState, useEffect } from 'react';
import { Image, ImageProps, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

interface CachedImageProps extends ImageProps {
  source: any;
}

export const CachedImage = (props: CachedImageProps) => {
  const [cachedSource, setCachedSource] = useState<any>(null);
  const [proxyFailed, setProxyFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadCachedImage = async () => {
      const { source } = props;
      
      // Fallback for Web or non-network images
      if (
        Platform.OS === 'web' ||
        typeof source === 'number' ||
        !source ||
        !source.uri ||
        typeof source.uri !== 'string' ||
        source.uri.startsWith('file://') ||
        source.uri.startsWith('data:')
      ) {
        if (isMounted) {
          if (source && source.uri && typeof source.uri === 'string' && source.uri.includes('res.cloudinary.com') && !proxyFailed) {
            const noProtocol = source.uri.replace(/^https?:\/\//, '');
            const proxyBase = process.env.EXPO_PUBLIC_IMAGE_PROXY_URL || 'https://wsrv.nl/?url=';
            setCachedSource({ ...source, uri: `${proxyBase}${encodeURIComponent(noProtocol)}` });
          } else {
            setCachedSource(source);
          }
        }
        return;
      }

      try {
        const uri = source.uri;
        const hashed = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          uri
        );
        const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
        const validExt = ext.length > 5 ? 'jpg' : ext;
        // Use a different filename prefix if we're proxying so we don't mix cache
        const filename = `${proxyFailed ? 'orig_' : 'proxy_'}${hashed}.${validExt}`;
        // @ts-ignore
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;

        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
          if (isMounted) setCachedSource({ uri: fileUri });
          return;
        }

        let downloadUri = uri;
        if (uri.includes('res.cloudinary.com') && !proxyFailed) {
          const noProtocol = uri.replace(/^https?:\/\//, '');
          const proxyBase = process.env.EXPO_PUBLIC_IMAGE_PROXY_URL || 'https://wsrv.nl/?url=';
          downloadUri = `${proxyBase}${encodeURIComponent(noProtocol)}`;
        }

        let downloadResult = await FileSystem.downloadAsync(downloadUri, fileUri);
        
        if (downloadResult.status !== 200 && downloadUri !== uri) {
          console.warn('Proxy failed, falling back to original URI');
          if (isMounted) setProxyFailed(true);
          downloadResult = await FileSystem.downloadAsync(uri, fileUri);
        }

        if (downloadResult.status !== 200) {
          throw new Error('Download failed');
        }

        if (isMounted) setCachedSource({ uri: downloadResult.uri });
      } catch (error) {
        console.warn('Error caching image:', error);
        if (isMounted) {
          setProxyFailed(true);
          setCachedSource(source);
        }
      }
    };

    loadCachedImage();

    return () => {
      isMounted = false;
    };
  }, [props.source, proxyFailed]);

  if (!cachedSource) {
    let sourceToUse = props.source;
    if (props.source && props.source.uri && typeof props.source.uri === 'string' && props.source.uri.includes('res.cloudinary.com') && !proxyFailed) {
      const noProtocol = props.source.uri.replace(/^https?:\/\//, '');
      const proxyBase = process.env.EXPO_PUBLIC_IMAGE_PROXY_URL || 'https://wsrv.nl/?url=';
      sourceToUse = { ...props.source, uri: `${proxyBase}${encodeURIComponent(noProtocol)}` };
    }
    return (
      <Image 
        {...props} 
        source={sourceToUse} 
        onError={(e) => {
          if (props.onError) props.onError(e);
          setProxyFailed(true);
        }} 
      />
    );
  }

  return (
    <Image 
      {...props} 
      source={cachedSource} 
      onError={(e) => {
        if (props.onError) props.onError(e);
        if (cachedSource && cachedSource.uri && cachedSource.uri.includes('wsrv.nl')) {
          setProxyFailed(true);
          setCachedSource(props.source);
        }
      }}
    />
  );
};
