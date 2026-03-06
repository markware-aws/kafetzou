const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required for aws-amplify to resolve correctly in Metro
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
