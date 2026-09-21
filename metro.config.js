const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bổ sung đuôi file model tflite vào danh sách assets
config.resolver.assetExts.push('tflite');

module.exports = config;
