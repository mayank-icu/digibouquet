import React from 'react';
import { View, StyleSheet, ViewProps, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Image, ImageProps } from 'expo-image';

interface ExpoImageBackgroundProps extends ViewProps {
  source: ImageProps['source'];
  imageStyle?: StyleProp<ImageStyle>;
  imageProps?: Omit<ImageProps, 'source' | 'style'>;
  children?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLayout?: ViewProps['onLayout'];
}

export const ExpoImageBackground = React.forwardRef<View, ExpoImageBackgroundProps>((props, ref) => {
  const { source, children, style, imageStyle, imageProps, resizeMode, onLayout, ...viewProps } = props;
  
  let contentFit: any = 'cover';
  if (resizeMode === 'contain') contentFit = 'contain';
  if (resizeMode === 'stretch') contentFit = 'fill';
  if (resizeMode === 'center') contentFit = 'scale-down';

  return (
    <View style={style} ref={ref} onLayout={onLayout} {...viewProps}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, imageStyle]}
        contentFit={contentFit}
        {...imageProps}
      />
      {children}
    </View>
  );
});

ExpoImageBackground.displayName = 'ExpoImageBackground';
