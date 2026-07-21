import React, { useState, useEffect } from 'react';
import { ImageProps, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

interface CachedImageProps extends ImageProps {
  source: any;
}

export const preloadImage = async (uri: string) => {
  if (!uri || typeof uri !== 'string' || !uri.startsWith('http')) return;
  try {
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uri);
    const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const validExt = ext.length > 5 ? 'jpg' : ext;
    const filename = `proxy_${hashed}.${validExt}`;
    // @ts-ignore
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      let downloadUri = uri;
      if (uri.includes('res.cloudinary.com')) {
        const noProtocol = uri.replace(/^https?:\/\//, '');
        const proxyBase = process.env.EXPO_PUBLIC_IMAGE_PROXY_URL || 'https://wsrv.nl/?url=';
        downloadUri = `${proxyBase}${encodeURIComponent(noProtocol)}`;
      }
      let res = await FileSystem.downloadAsync(downloadUri, fileUri);
      if (res.status !== 200 && downloadUri !== uri) {
        await FileSystem.downloadAsync(uri, fileUri);
      }
    }
  } catch (error) {
    // Ignore preload errors
  }
};

export const CachedImage = (props: CachedImageProps) => {
  const { source, ...imageProps } = props;
  const [cachedSource, setCachedSource] = useState<any>(null);
  const [proxyFailed, setProxyFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const lastSourceRef = React.useRef(source);

  useEffect(() => {
    if (lastSourceRef.current !== source) {
      lastSourceRef.current = source;
      setRetryCount(0);
      setProxyFailed(false);
      return;
    }

    let isMounted = true;
    
    const loadCachedImage = async () => {
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
  }, [source, proxyFailed, retryCount]);

  if (!cachedSource) {
    let sourceToUse = source;
    if (source && source.uri && typeof source.uri === 'string' && source.uri.includes('res.cloudinary.com') && !proxyFailed) {
      const noProtocol = source.uri.replace(/^https?:\/\//, '');
      const proxyBase = process.env.EXPO_PUBLIC_IMAGE_PROXY_URL || 'https://wsrv.nl/?url=';
      sourceToUse = { ...source, uri: `${proxyBase}${encodeURIComponent(noProtocol)}` };
    }
    return (
      <Image 
        {...imageProps} 
        source={sourceToUse} 
        onError={(e) => {
          if (imageProps.onError) imageProps.onError(e);
          setProxyFailed(true);
          if (retryCount < 3) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 2000);
          }
        }} 
      />
    );
  }

  return (
    <Image 
      {...imageProps} 
      source={cachedSource} 
      onError={(e) => {
        if (imageProps.onError) imageProps.onError(e);
        if (cachedSource && cachedSource.uri && cachedSource.uri.includes('wsrv.nl')) {
          setProxyFailed(true);
          setCachedSource(source);
        }
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000);
        }
      }}
    />
  );
};
