'use strict';

/**
 * Module dependencies.
 */

import Core from './core';
import { AuctionError } from './errors';
import dbg from 'debug';
import Bid from './bid';

/**
 * Module variables.
 */

const debug = dbg('auction');
const noop = function noop(){};

export default class Auction extends Core {

  /**
   * Initialize `order` object.
   * 
   * @param {Object} options
   * @param {Function} fn
   * @return {Auction} this
   * @api private
   */

  constructor(data, options = {}, fn) {
    if ('function' === typeof options) {
      fn = options;
      options = {};
    }
    super(data, fn);
    if (options.authorization) {
      this._auth = options.authorization;
    }
  }

  /**
   * Add a new authorization handler.
   *
   * @param {Function} auth
   * @returns {Auction}
   * @api public
   */

  authorize(auth) {
    if ('function' !== typeof auth) {
      throw new AuctionError('Authorize only accepts functions');
    }
    if (auth.length < 3) {
      throw new AuctionError('Authorize function requires more arguments');
    }
    debug('setting authorization function');
    this._auth = auth;
    return this;
  }

  /**
   * Check authorization.
   *
   * @param {Object} cmd
   * @param {Object} data
   * @param {Function} fn
   * @return {Auction} this
   * @api public
   */

  auth(cmd, data, fn) {
    if (!this._auth) return super[cmd](data, fn);
    this._auth(cmd, data, (err) => {
      if (err) return fn(err);
      super[cmd](data, fn);
    });
    return this;
  }

  /**
   * Start `auction`.
   *
   * @param {Object} data
   * @param {Function} fn
   * @return {Auction} this
   * @api public
   */

  start(data, fn) {
    this.auth('start', data, fn);
    return this;
  }

  /**
   * Start `auction`.
   *
   * @param {Object} data
   * @param {Function} fn
   * @return {Auction} this
   * @api public
   */

  bid(data, fn) {
    this.auth('bid', data, fn);
    return this;
  }

  /**
   * Ending `auction`.
   *
   * @param {Object} data
   * @param {Function} fn
   * @return {Auction} this
   * @api public
   */

  ending(data, fn) {
    this.auth('ending', data, fn);
    return this;
  }

  /**
   * Start `auction`.
   *
   * @param {Object} data
   * @param {Function} fn
   * @return {Auction} this
   * @api public
   */

  end(data, fn) {
    this.auth('end', data, fn);
    return this;
  }

}

Auction.Bid = Bid;