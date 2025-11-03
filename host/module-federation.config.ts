const deps = require('./package.json').dependencies;

export const mfConfig = {
  name: "host",
  exposes: {},
  remotes: {
        usermanagement: 'usermanagement@http://localhost:3001/remoteEntry.js', // URL to your remote app

        timesheetmanagement: 'timesheetmanagement@http://localhost:3004/remoteEntry.js', // URL to your remote app
  },
  shared: 
  {
   react: { singleton: true, requiredVersion: deps.react, eager: false },
  'react-dom': { singleton: true, requiredVersion: deps['react-dom'], eager: false },
  'react-router-dom': { singleton: true, requiredVersion: deps['react-router-dom'] },
  }

};
