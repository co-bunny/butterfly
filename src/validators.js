'use strict';

const v = require('@mapbox/fusspot');

const validateButterfly = v.assert(
  v.strictShape({
    commonName: v.required(v.string),
    species: v.required(v.string),
    article: v.required(v.string)
  })
);

const validateUser = v.assert(
  v.strictShape({
    username: v.required(v.string)
  })
);

const validateButterflyRating = v.assert(
  v.strictShape({
    userid: v.required(v.string),
    rating: v.required(v.string),
    type: v.oneOf('userid', 'rating')
  })
);

module.exports = {
  validateButterfly,
  validateUser,
  validateButterflyRating
};
