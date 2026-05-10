const crypto = require('crypto');
const password = "ADM112828";
const salt = "FLM26_INTERNAL_SEC_SALT_v1";
const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
console.log(hash);
