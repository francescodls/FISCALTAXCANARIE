const { withGradleProperties } = require('@expo/config-plugins');

const withTargetSdk35 = (config) => {
  return withGradleProperties(config, (config) => {
    config.modResults.push(
      {
        type: 'property',
        key: 'android.compileSdkVersion',
        value: '35',
      },
      {
        type: 'property',
        key: 'android.targetSdkVersion', 
        value: '35',
      }
    );
    return config;
  });
};

module.exports = withTargetSdk35;
