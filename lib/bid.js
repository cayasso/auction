'use strict';

/**
 * Module dependencies.
 */

import { BidError } from './errors';
import predefine from 'predefine';
import cuid from 'cuid';
import dbg from 'debug';

const debug = dbg('auction:bid');

export default class Bid {

  constructor(options = {}) {

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
  }

  /**
   * Accept `bid`.
   * 
   * @return {Object} data
   * @api public
   */

  accept() {
    if (!this.place()) throw new BidError('Bid already placed.');
    this.status = Bid.ACCEPTED;
    debug('bid %s accepted', this.id);
    return this.data;
  }

  /**
   * Reject `bid`.
   * 
   * @return {Object} data
   * @api public
   */

  reject() {
    if (!this.place()) throw new BidError('Bid already placed.');
    this.status = Bid.REJECTED;
    debug('bid %s rejected', this.id);
    return this.data;
  }

  /**
   * Place `bid`.
   * 
   * @return {Bid|Null}
   * @api private
   */

  place() {
    if (this.placed) return null;
    this.placed = true;
    this.timestamp = Date.now();
    debug('bid %s placed', this.id);
    return this;
  }

  /**
   * Method to extend object.
   * 
   * @param {Function} fn
   * @param {Object} options
   * @return {Bid} this
   * @api public
   */

  use(fn, options) {
    fn(this, options);
    return this;
  }

  /**
   * Lazy get `bid` data.
   *
   * @type {Object}
   * @api public
   */


  get data() {
    let data = {
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
}

/**
 * Bid states.
 *
 * @type {Number}
 * @api protected
 */

Bid.INITIALIZED = 'initialized';
Bid.ACCEPTED = 'accepted';
Bid.REJECTED = 'rejected';
