const path = require('path');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// On web, alias `lottie-react-native` to our web shim so Metro
// doesn't try to bundle the native renderer (which requires
// @lottiefiles/dotlottie-react and fails on web).
const SHIMS_DIR = path.resolve(__dirname, 'src/shims');

config.resolver = config.resolver || {};

// Allow Metro to resolve .mjs files (needed for lucide-react-native ESM dist)
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'lottie-react-native' && platform === 'web') {
    return {
      filePath: path.join(SHIMS_DIR, 'lottie-react-native.web.js'),
      type: 'sourceFile',
    };
  }
  // Fall back to the default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;