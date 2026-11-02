'use strict';

if (process.platform === 'win32') {
  const os = require('node:os');
  const userProfile = process.env.USERPROFILE || process.cwd();
  const username = process.env.USERNAME || 'mld-test';

  os.userInfo = () => ({
    username,
    uid: -1,
    gid: -1,
    shell: null,
    homedir: userProfile,
  });
}
