const { withAppBuildGradle } = require('@expo/config-plugins');

const withTargetSdk35 = (config) => {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    
    // Replace targetSdkVersion
    buildGradle = buildGradle.replace(
      /targetSdkVersion\s*=?\s*\d+/g,
      'targetSdkVersion = 35'
    );
    
    // Replace compileSdkVersion
    buildGradle = buildGradle.replace(
      /compileSdkVersion\s*=?\s*\d+/g,
      'compileSdkVersion = 35'
    );
    
    // Also handle if they use compileSdk instead of compileSdkVersion
    buildGradle = buildGradle.replace(
      /compileSdk\s*=?\s*\d+/g,
      'compileSdk = 35'
    );
    
    // Handle targetSdk
    buildGradle = buildGradle.replace(
      /targetSdk\s*=?\s*\d+/g,
      'targetSdk = 35'
    );
    
    config.modResults.contents = buildGradle;
    return config;
  });
};

module.exports = withTargetSdk35;
