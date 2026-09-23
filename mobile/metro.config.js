const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('jfif')) {
  config.resolver.assetExts.push('jfif');
}

module.exports = config;
