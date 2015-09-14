'use strict';

/**
 * Module dependencies.
 */

var AuctionError = require('./errors').AuctionError;
var debug = require('debug')('auction');
var Emitter = require('eventemitter3');
var predefine = require('predefine');
var fmt = require('util').format;
var cuid = require('cuid');
var Bid = require('./bid');
var _ = require('lodash');

/**
 * Module variables.
 */

var noop = function (){};

/**
 * Bid object inheriting event emitter.
 * 
 * @type {Auction}
 * @api public
 */

var Auction = Object.create(Emitter.prototype);

Auction.writable = predefine(Auction, predefine.WRITABLE);
Auction.readable = predefine(Auction, predefine.READABLE);


Auction.writable('omit', [
  'authorization',
  '_events',
  'bids',
  'outBid',
  'bestBid',
  'started',
  'ended',
  'state'
]);

/**
 * Create `order` object.
 * 
 * @param {Object} options
 * @param {Function} fn
 * @return {Agent} this
 * @api public
 */

Auction.readable('create', function create(options, fn) {
  return Object.create(this).init(options, fn);
});

/**
 * Initialize `order` object.
 * 
 * @param {Object} options
 * @param {Function} fn
 * @return {Auction} this
 * @api private
 */

Auction.readable('init', function init(options, fn) {

  var data = null;
  var error = null;
  var writable = predefine(this, predefine.WRITABLE);
  var readable = predefine(this, predefine.READABLE);

  writable('_events', {});

  if (error = this.check(options)) {
    if (!fn) throw error;
    return setImmediate(function tick() {
      fn(error);
    });
  }

  fn = fn || noop;
  options = options || {};
  this.reset();
  _.merge(this, _.omit(options, Auction.omit));
  this.id = options.id || cuid();
  data = this.data;

  if (options.authorization) {
    this._auth = options.authorization;
  }
  
  debug('order initialized %j', data);

  setImmediate(function toAsync() {
    fn(null, data);
  });

  return this;
});

/**
 * Check validation data.
 *
 * @param {Object} data
 * @return {Error|Undefined}
 * @api private
 */

Auction.check = function check(data) {
  var error = null;

  if (!data.id) {
    error = 'Invalid auction ID.';
  }

  if ('number' !== typeof data.openPrice) {
    error = 'Invalid opening price.';
  }

  if ('minPrice' in data && 'number' !== typeof data.minPrice) {
    error = 'Invalid minimum price.';
  }

  if (error) {
    error = new AuctionError(error);
    debug('auction error %s', error);
    this.emit('error', error);
    return error;
  }
}

/**
 * Destroy `order`.
 * 
 * @param {Function} fn
 * @return {Auction} this
 * @api public
 */

Auction.readable('destroy', function destroy(fn) {
  fn = fn || noop;
  this.destroyed = true;
  this.removeAllListeners();
  fn();
});

/**
 * Reset `auction`.
 * 
 * @return {Auction} this
 * @api private
 */

Auction.readable('reset', function reset() {
  this.bids = [];
  this.outBid = {};
  this.bestBid = {};
  this.started = {};
  this.ended = {};
  this.saleId = null;
  this.saleDate = null;
  this.minPrice = 0;
  this.openPrice = 0;
  this.increment = 1;
  this.minIncrement = 1;
  this.destroyed = false;
  this.initialized = true;
  this.auctionStatus = 'created';
  return this;
});

/**
 * Add a new authorization handler.
 *
 * @param {Function} auth
 * @returns {Auction}
 * @api public
 */

Auction.readable('authorize', function authorize(auth) {
  if ('function' !== typeof auth) {
    throw new AuctionError('Authorize only accepts functions');
  }
  if (auth.length < 3) {
    throw new AuctionError('Authorize function requires more arguments');
  }
  debug('setting authorization function');
  this._auth = auth;
  return this;
});

/**
 * Check authorization.
 *
 * @param {Object} cmd
 * @param {Object} data
 * @param {Function} fn
 * @return {Auction} this
 * @api public
 */

Auction.readable('auth', function auth(cmd, data, fn) {
  var command = this['_' + cmd].bind(this);
  if (!this._auth) return command(data, fn);
  this._auth(cmd, data, function _auth(err) {
    if (err) return fn(err);
    command(data, fn);
  });
  return this;
});

/**
 * Start `auction`.
 *
 * @param {Object} data
 * @param {Function} fn
 * @return {Auction} this
 * @api public
 */

Auction.readable('start', function start(data, fn) {
  this.auth('start', data, fn);
  return this;
});

/**
 * Start `auction`.
 *
 * @param {Object} data
 * @param {Function} fn
 * @return {Auction} this
 * @api public
 */

Auction.readable('_start', function start(data, fn) {

  fn = fn || noop;
  data = data || {};

  var error = null;
  var agentId = data.agentId;
  var status = this.auctionStatus;

  this.openPrice = data.openPrice || this.openPrice;

  if (!agentId) {
    error = 'Invalid agent.';
  } else if ('ended' === status) {
    error = 'Auction already ended.';
  } else if ('started' === status) {
    error = 'Auction already started.';
  } else if (!this.openPrice || 'number' !== typeof this.openPrice) {
    error = 'Invalid opening price.';
  }

  if (error) {
    debug('auction %d error %s', this.id, error);
    return setImmediate(function toAsync() {
      fn(new AuctionError(error))
    });
  }

  this.auctionStatus = 'started';
  this.started = { 
    agentId: agentId, 
    timestamp: Date.now() 
  };
  var data = this.data;

  debug('started auction %d', this.id, data);
  this.emit('started', data);

  setImmediate(function toAsync() {
    fn(null, data);
  });

  return this;
});

/**
 * Start `auction`.
 *
 * @param {Object} data
 * @param {Function} fn
 * @return {Auction} this
 * @api public
 */

Auction.readable('bid', function placeBid(data, fn) {
  this.auth('bid', data, fn);
  return this;
});

/**
 * Place `bid`.
 *
 * @param {Object} data
 * @param {Function} fn
 * @return {Auction} this
 * @api public
 */

Auction.readable('_bid', function placeBid(data, fn) {

  fn = fn || noop;

  var bid = null;
  var error = null;
  var agentId = data.agentId;
  var plus = this.increment;
  var status = this.auctionStatus;
  var omit = ['auctionId', 'saleId'];

  // Ensure that the first bid is always openPrice + 1
  if (!this.bids.length) {
    plus = this.minIncrement;
  }

  this.bestBid = _.omit(this.bestBid, omit);

  debug('creating bid %j', data);

  try {
    bid = Bid.create({
      price: data.price,
      auctionId: this.id,
      agentId: data.agentId,
      foreclosureId: this.foreclosureId
    });
  } catch(e) {
    debug('auction %d error %s', this.id, e.message);
    return process.nextTick(fn.bind(null, e));
  }

  debug('placing bid %s', bid.id);

  if (!agentId) {
    error = 'Invalid agent.';
  } else if ('object' !== typeof bid) {
    error = 'Invalid bid.';
  } else if ('function' !== typeof bid.place) {
    error = 'Invalid bid object.';
  } else if (bid.maxPrice && bid.price > bid.maxPrice) {
    error = 'Invalid bid price.';
  } else if ('created' === status) {
    error = 'Auction not started.';
  } else if ('ended' === status) {
    error = 'Auction already ended.';
  } else if (bid.price < (this.bestBid.price + plus)) {
    error = fmt('Bid price $%d must be $%d higher than the current bid price $%d.', bid.price, plus, this.bestBid.price);
  } else if (bid.price <= this.openPrice) {
    error = fmt('Bid price $%d must be at least $%d higher than the current bid price $%d.', bid.price, plus, this.openPrice);
  } else if (this.bestBid.price > bid.price) {
    error = 'Invalid bid price';
  }

  if (!error) {
    bid.accept();
    this.outBid = this.bestBid;
    this.bestBid = _.omit(bid.data, omit);
    this.bids.push(bid);
    debug('saving bid %s to auction bid list', bid.id);
  } else {
    bid.reject(error);
  }

  data = this.data;
  
  if (error) {
    debug('auction %s error %s', this.id, error);
    return setImmediate(function toAsync() {
      fn(new AuctionError(error))
    });
  }
  
  debug('bid placed %j', bid.data);
  this.emit('changed', data);

  setImmediate(function toAsync() {
    fn(null, bid.data);
  });

  return this;
});

/**
 * Start `auction`.
 *
 * @param {Object} data
 * @param {Function} fn
 * @return {Auction} this
 * @api public
 */

Auction.readable('end', function end(data, fn) {
  this.auth('end', data, fn);
  return this;
});

/**
 * End `auction`.
 *
 * @param {Object} data
 * @param {Function} fn
 * @return {Auction} this
 * @api public
 */

Auction.readable('_end', function end(data, fn) {

  fn = fn || noop;

  var error = null;
  var agentId = data.agentId;
  var status = this.auctionStatus;

  if (!agentId) {
    error = 'Invalid agent.';
  } else if ('ended' === status) {
    error = 'Auction already ended.';
  } else if ('started' !== status) {
    error = 'Auction not started.';
  }

  if (error) {
    debug('auction %d error %s', this.id, error);
    return setImmediate(function toAsync() {
      fn(new AuctionError(error))
    });
  }

  this.auctionStatus = 'ended';
  this.ended = { 
    agentId: agentId, 
    timestamp: Date.now() 
  };
  var data = this.data;

  debug('ended auction %d', this.id, data);
  this.emit('ended', data);
  setImmediate(function toAsync() {
    fn(null, data);
  });

  return this;
});

/**
 * Method to extend object.
 * 
 * @param {Function} fn
 * @param {Object} options
 * @return {Auction} this
 * @api public
 */

Auction.readable('use', function use(fn, options) {
  fn(this, options);
  return this;
});

/**
 * Lazy get bid data.
 *
 * @type {Object}
 * @api public
 */

Object.defineProperty(Auction, 'currentPrice', {
  get: function read() {
    return _.isEmpty(this.bestBid) ? 
    this.openPrice : this.bestBid.price;
  },
  set: function write() {},
  enumerable: true
});

/**
 * Lazy get auctioneer.
 *
 * @type {Object}
 * @api public
 */

Object.defineProperty(Auction, 'auctioneer', {
  get: function read() {
    this.started.agentId;
  },
  enumerable: true
});

/**
 * Lazy get bid data.
 *
 * @type {Object}
 * @api public
 */

Object.defineProperty(Auction, 'data', {
  get: function read() {
    return {
      id: this.id,
      agents: this.agents,
      auctioneer: this.auctioneer,
      started: this.started,
      ended: this.ended,
      saleId: this.saleId,
      saleDate: this.saleDate,
      bids: this.bids,
      outBid: this.outBid,
      bestBid: this.bestBid,
      minPrice: this.minPrice,
      openPrice: this.openPrice,
      currentPrice: this.currentPrice,
      increment: this.increment,
      auctionStatus: this.auctionStatus
    };
  },
  enumerable: false
});


/**
 * Exports `order` object.
 * 
 * @type {Auction} this
 */

module.exports = function Factory(options, fn) {
  return Auction.create(options, fn);
};

/**
 * Expose Bid object.
 * @type {Bid}
 */

module.exports.Bid = Bid;

/**
 * Exports `order` object.
 * 
 * @type {Auction} this
 */

module.exports.Auction = Auction;