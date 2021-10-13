

module.exports.toJSON = (s) => {
  try {
    return JSON.stringify(s);
  } catch(err) {
    return null;
  }
};


module.exports.fromJSON = (json) => {
  try {
    return JSON.parse(json);
  } catch(err) {
    return null;
  }
};


module.exports.randomString = (length) => {
  let result              = '';
  const characters        = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength  = characters.length;
  for (let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
