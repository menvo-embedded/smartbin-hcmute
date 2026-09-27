module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Biên dịch hàm có 'worklet' để chạy trong frame processor của camera
    // (nhận diện rác trực tiếp — src/ml/hooks/useLiveWasteDetector.ts).
    plugins: ['react-native-worklets-core/plugin'],
  };
};
