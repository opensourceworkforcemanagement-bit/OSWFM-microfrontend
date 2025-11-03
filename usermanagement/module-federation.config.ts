const deps = require('./package.json').dependencies;

export const mfConfig = {
  name: "usermanagement",
  filename: "remoteEntry.js",
  exposes: {
    "./App": "./src/App",
  },
  shared: {
  react: { singleton: true, requiredVersion: deps.react, eager: false },
  'react-dom': { singleton: true, requiredVersion: deps['react-dom'], eager: false },
  'react-router-dom': { singleton: true, requiredVersion: deps['react-router-dom'] },
 },
};
