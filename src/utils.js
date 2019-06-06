

module.exports.toJSON = (s) => {
  try {
    return JSON.stringify(s);
  } catch(err) {
    return null;
  }
}


module.exports.fromJSON = (json) => {
  try {
    return JSON.parse(json);
  } catch(err) {
    return null;
  }
}
