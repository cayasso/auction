'use strict';

/**
 * Module dependencies.
 */

var BidError = require('./errors').BidError;
var debug = require('debug')('auction:bid');
var predefine = require('predefine');
var cuid = require('cuid');

/**
 * Bid object.
 *
 * @type {Object}
 * @api public
 */

var Bid = Object.create(null);

Bid.writable = predefine(Bid, predefine.WRITABLE);
Bid.readable = predefine(Bid, predefine.READABLE);

/**
 * Bid states.
 *
 * @type {Number}
 * @api protected
 */

Bid.INITIALIZED = 'initialized';
Bid.ACCEPTED = 'accepted';
Bid.REJECTED = 'rejected';

/**
 * Create bid object.
 * 
 * @param {Object} options
 * @param {Function} fn
 * @return {Bid} this
 * @api public
 */

Bid.readable('create', function create(options) {
  return Object.create(this).init(options);
});

/**
 * Initialize `bid`.
 * 
 * @param {Object} options
 * @return {Bid} this
 * @api private
 */

Bid.readable('init', function init(options) {

  options = options || {};

  this.status = Bid.REJECTED;

  debug('creating bid with options %j', options);

  if ('number' !== typeof options.price && !options.maxPrice) {
    throw new BidError('Invalid bid price.');
  }

  if (!options.auctionId) {
    throw new BidError('Invalid auction id.');
  }

  if ('string' !== typeof options.agentId) {
    throw new BidError('Invalid agent.');
  }

  if (this.placed) {
    throw new BidError('Bid already placed.');
  }

  this.id = cuid();
  this.agentId = options.agentId;
  this.price = options.price || 0;
  this.saleId = options.saleId;
  this.auctionId = options.auctionId;
  
  this.status = Bid.INITIALIZED;

  debug('initialized bid %j', this.data);

  return this;
});

/**
 * Accept `bid`.
 * 
 * @return {Object} data
 * @api public
 */

Bid.readable('accept', function accept() {
  if (!this.place()) throw new BidError('Bid already placed.');
  this.status = Bid.ACCEPTED;
  debug('bid %s accepted', this.id);
  return this.data;
});

/**
 * Reject `bid`.
 * 
 * @return {Object} data
 * @api public
 */

Bid.readable('reject', function reject() {
  if (!this.place()) throw new BidError('Bid already placed.');
  this.status = Bid.REJECTED;
  debug('bid %s rejected', this.id);
  return this.data;
});

/**
 * Place `bid`.
 * 
 * @return {Bid|Null}
 * @api private
 */

Bid.readable('place', function place() {
  if (this.placed) return null;
  this.placed = true;
  this.timestamp = Date.now();
  debug('bid %s placed', this.id);
  return this;
});

/**
 * Method to extend object.
 * 
 * @param {Function} fn
 * @param {Object} options
 * @return {Bid} this
 * @api public
 */

Bid.readable('use', function use(fn, options) {
  fn(this, options);
  return this;
});

/**
 * Lazy get `bid` data.
 *
 * @type {Object}
 * @api public
 */

Object.defineProperty(Bid, 'data', {
  get: function read() {
    var data = {
      id: this.id,
      price: this.price,
      placed: this.placed,
      status: this.status,
      agentId: this.agentId,
      timestamp: this.timestamp,
      auctionId: this.auctionId
    };
    if (this.saleId) data.saleId = this.saleId;
    return data;
  }
});

/**
 * Export `bid` object.
 *
 * @type {Bid} options
 * @api public
 */

module.exports = Bid;
