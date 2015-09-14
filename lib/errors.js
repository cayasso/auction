'use strict';

/**
 * Module dependencies.
 */

var util = require('util');

/**
 * Generic `Auction` error.
 *
 * @constructor
 * @param {String} message
 * @param {EventEmitter} logger
 * @api public
 */

function AuctionError(message, logger) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);

  this.message = message;
  this.name = this.constructor.name;

  if (logger) {
    logger.emit('log', 'error', this);
  }
}

util.inherits(AuctionError, Error);

/**
 * Generic `Bid` error.
 *
 * @constructor
 * @param {String} message
 * @param {EventEmitter} logger
 * @api public
 */

function BidError(message, logger) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);

  this.message = message;
  this.name = this.constructor.name;

  if (logger) {
    logger.emit('log', 'error', this);
  }
}

util.inherits(BidError, Error);

/**
 * Expose custom errors.
 */

exports.AuctionError = AuctionError;
exports.BidError = BidError;