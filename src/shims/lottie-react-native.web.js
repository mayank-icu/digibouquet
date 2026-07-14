import React, { forwardRef } from 'react';
import Lottie from 'lottie-react';

const LottieView = forwardRef(function LottieView(props, ref) {
  const { source, autoPlay, loop, style, speed } = props;

  // lottie-react expects animationData, not source
  const animationData = typeof source === 'object' && !source.uri ? source : null;

  if (!animationData) {
    // URI-based sources not supported on web via this shim
    return null;
  }

  return (
    <Lottie
      lottieRef={ref}
      animationData={animationData}
      loop={loop !== false}
      autoplay={autoPlay !== false}
      speed={speed || 1}
      style={style}
      rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
    />
  );
});

export default LottieView;
