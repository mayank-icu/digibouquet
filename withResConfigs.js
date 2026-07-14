const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withResConfigs(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const buildGradle = config.modResults.contents;
      
      // The languages supported by the app based on src/constants/languages.js
      const languages = ['en', 'es', 'fr', 'de', 'hi', 'ar', 'zh', 'ja', 'ko', 'pt', 'it', 'ru', 'tr', 'nl', 'pl', 'sv', 'ta', 'te', 'bn', 'ur', 'id'];
      const resConfigsString = `resConfigs ${languages.map(lang => `"${lang}"`).join(', ')}`;
      
      if (buildGradle.includes('defaultConfig {') && !buildGradle.includes('resConfigs "en"')) {
        config.modResults.contents = buildGradle.replace(
          /defaultConfig\s*\{/,
          `defaultConfig {\n        ${resConfigsString}`
        );
      }
    }
    return config;
  });
};
