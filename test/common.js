exports.clone = function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
};