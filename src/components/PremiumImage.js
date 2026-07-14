import React from 'react';
import { Image } from 'expo-image';

// A soft, pastel aesthetic blurhash suitable for a floral app
const UNIVERSAL_BLURHASH = 'L5PZJ*~q00_300E1t7t7~qRjM{t7';

export function PremiumImage(props) {
  // Map resizeMode to contentFit for expo-image compatibility
  let contentFit = props.contentFit || 'cover';
  if (props.resizeMode) {
    if (props.resizeMode === 'contain') contentFit = 'contain';
    if (props.resizeMode === 'stretch') contentFit = 'fill';
    if (props.resizeMode === 'center') contentFit = 'scale-down';
  }

  return (
    <Image 
      transition={300} 
      placeholder={{ blurhash: props.blurhash || UNIVERSAL_BLURHASH }}
      {...props} 
      contentFit={contentFit}
    />
  );
}
