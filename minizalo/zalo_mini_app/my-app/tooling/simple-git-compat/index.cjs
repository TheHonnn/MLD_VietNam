// ZMP CLI 4 expects the callable CommonJS export removed in simple-git 4.
// Delegate every Git operation and safety check to the patched upstream library.
const secure = require('simple-git-secure');
module.exports = Object.assign(secure.simpleGit, secure);
