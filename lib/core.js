'use strict';

/**
 * Module dependencies.
 */

import { AuctionError } from './errors';
import Emitter from 'eventemitter3';
import predefine from 'predefine';
import dbg from 'debug';
import Bid from './bid';
import _ from 'lodash';

/**
 * Module variables.
 */

const debug = dbg('auction');
const noop = function noop(){};

const READ_ONLY_FIELDS = {
  authorization: true,
  auctionStatus: true,
  currentPrice: true,
  _events: true,
  outBid: true,
  bestBid: true,
  started: true,
  ended: true,
  bids: true
};

export default class extends Emitter {

  /**
   * Initialize `auction` object.
   * 
   * @param {Object} options
   * @param {Function} fn
   * @return {Auction} this
   * @api private
   */

  constructor(data = {}, fn) {

    super();
    
    this.writable = predefine(this, predefine.WRITABLE);
    this.readable = predefine(this, predefine.READABLE);
    this.predefineProperties();

    let error = this.check(data);

    if (error) {
      if (!this.listeners('error', true) && !fn) throw error;
      if (fn) setImmediate(fn.bind(null, error));
      this.emit('error', error);
      return this;
    }

    this.reset();
    this.mergeProperties(data);

    
    
    debug('auction initialized %j', this.data);

    if (fn) setImmediate(fn.bind(null, null, this.data));
  }

  /**
   * Set predefined properties.
   *
   * @api private
   */

  predefineProperties() {
    this.writable('_events', {});
  }

  /**
   * Merge 'auction' properties.
   *
   * @param {Object} data
   * @type {Auction} this
   * @api private
   */

  mergeProperties(data) {
    for (let key in data) {
      if ('undefined' !== typeof data[key]) {
        this.mergeProperty(key, data[key]);
      }
    }
  }

  /**
   * Merge 'auction' property.
   *
   * @param {String} key
   * @param {Mixed} value
   * @type {Auction} this
   * @api private
   */

  mergeProperty(key, value) {
    if (READ_ONLY_FIELDS[key]) return;
    this[key] = value;
  }

  /**
   * Merge data to auction.
   *
   * @return {Object} data
   * @return {Boolean}
   * @api private
   */

  merge(data) {
    this.mergeProperties(this.deff(data));
    return this.data;
  }

  /**
   * Diff auction data.
   *
   * @return {Object} data
   * @return {Object} diff
   * @api private
   */

  diff(data) {
    let res = {};
    for (let key in data) {
      if (_.isEqual(this[key], data[key])) continue;
      if (!Order.READ_ONLY_FIELDS[key]) {
        res[key] = data[key];
      }
    }
    return res;
  }

  /**
   * Validate auction data.
   *
   * @param {Object} data
   * @return {Error|Boolean}
   * @api private
   */

  validate(data) {
    // Extend this method
    return false;
  }

  /**
   * Normalize auction data.
   *
   * @param {Object} data
   * @api private
   */

  normalize(data) {
    // Extend this method
    return data;
  }

  /**
   * Check validation data.
   *
   * @param {Object} data
   * @return {Error|Undefined}
   * @api private
   */

  check(data) {
    let message = null;

    if (!data.id) {
      message = 'Invalid auction ID.';
    } else if (!_.isNumber(data.openPrice)) {
      message = 'Invalid open price.';
    } else if ('minPrice' in data && !_.isNumber(data.minPrice)) {
      message = 'Invalid minimum price.';
    } else {
      message = this.validate(data);
    }

    if (message) {
      let error = new AuctionError(message);
      debug('auction error %s', message);
      this.emit('error', error);
      return error;
    }
  }

  /**
   * Update `auction`.
   * 
   * @param {Object} data
   * @param {Function} fn
   * @return {Order} this
   * @api public
   */

  update(data, fn = noop) {
    data = this.normalize(data);
    let error = this.validate(data);
    if (error) {
      error = new OrderError(error);
      this.emit('error', error);
      return fn(error);
    }
    fn(null, this.merge(data));
  }

  /**
   * Destroy `auction`.
   * 
   * @param {Function} fn
   * @return {Auction} this
   * @api public
   */

  destroy(fn = noop) {
    this.destroyed = true;
    this.removeAllListeners();
    fn();
  }

  /**
   * Reset `auction`.
   * 
   * @return {Auction} this
   * @api private
   */

  reset() {
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
  }

  /**
   * Start `auction`.
   *
   * @param {Object} data
   * @param {Function} fn
   * @return {Auction} this
   * @api public
   */

  start(data = {}, fn = noop) {

    let error = null;
    let agentId = data.agentId;
    let status = this.auctionStatus;

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
      error = new AuctionError(error);
      this.emit('error', error);
      return setImmediate(fn.bind(null, error));
    }

    this.auctionStatus = 'started';
    this.started = { 
      agentId: agentId, 
      timestamp: Date.now() 
    };
    
    data = this.data;

    debug('started auction %d', this.id, data);
    this.emit('started', data);

    setImmediate(() => {
      fn(null, data);
    });

    return this;
  }

  /**
   * Place `bid`.
   *
   * @param {Object} data
   * @param {Function} fn
   * @return {Auction} this
   * @api public
   */

  bid(data = {}, fn = noop) {

    let bid = null;
    let error = null;
    let id = this.id;
    let bestBid = this.bestBid;
    let openPrice = this.openPrice;
    let agentId = data.agentId;
    let plus = this.increment;
    let status = this.auctionStatus;
    let omit = ['auctionId', 'saleId'];

    // Ensure that the first bid is always openPrice + 1
    if (!this.bids.length) {
      plus = this.minIncrement;
    }

    bestBid = this.bestBid = _.omit(this.bestBid, omit);

    debug('creating bid %j', data);

    try {
      bid = new Bid({
        price: data.price,
        auctionId: this.id,
        agentId: data.agentId,
        foreclosureId: this.foreclosureId
      });
    } catch(e) {
      debug(`auction ${id} error ${e.messsage}`);
      return process.nextTick(fn.bind(null, e));
    }

    debug(`placing bid ${bid.id}`);

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
    } else if (bid.price < (bestBid.price + plus)) {
      error = `Bid price ${bid.price} must be ${plus} higher than the current bid price $${bestBid.price}.`;
    } else if (bid.price <= this.openPrice) {
      error = `Bid price ${bid.price} must be at least ${plus} higher than the current bid price $${openPrice}.`;
    } else if (bestBid.price > bid.price) {
      error = 'Invalid bid price';
    }

    if (!error) {
      bid.accept();
      this.outBid = bestBid;
      this.bestBid = _.omit(bid.data, omit);
      this.bids.push(bid);
      debug(`saving bid ${bid.id} to auction bid list`);
    } else {
      bid.reject(error);
    }

    data = this.data;

    if (error) {
      debug('auction %d error %s', this.id, error);
      error = new AuctionError(error);
      this.emit('error', error);
      return setImmediate(fn.bind(null, error));
    }
    
    debug(`bid placed ${bid.data}`);
    this.emit('changed', data);

    setImmediate(() => {
      fn(null, bid.data);
    });

    return this;
  }

  /**
   * End `auction`.
   *
   * @param {Object} data
   * @param {Function} fn
   * @return {Auction} this
   * @api public
   */

  end(data = {}, fn = noop) {

    let error = null;
    let agentId = data.agentId;
    let status = this.auctionStatus;

    if (!agentId) {
      error = 'Invalid agent.';
    } else if ('ended' === status) {
      error = 'Auction already ended.';
    } else if ('started' !== status) {
      error = 'Auction not started.';
    }

    if (error) {
      debug('auction %d error %s', this.id, error);
      error = new AuctionError(error);
      this.emit('error', error);
      return setImmediate(fn.bind(null, error));
    }

    this.auctionStatus = 'ended';
    this.ended = { 
      agentId: agentId, 
      timestamp: Date.now() 
    };
    
    data = this.data;

    debug('ended auction %d', this.id, data);
    this.emit('ended', data);
    setImmediate(() => {
      fn(null, data);
    });

    return this;
  }

  /**
   * Method to extend object.
   * 
   * @param {Function} fn
   * @param {Object} options
   * @return {Auction} this
   * @api public
   */

  use(fn, options) {
    fn(this, options);
    return this;
  }

  /**
   * Lazy get bid data.
   *
   * @type {Object}
   * @api public
   */

  get currentPrice() {
    return _.isEmpty(this.bestBid) ? 
    this.openPrice : this.bestBid.price;
  }

  /**
   * Lazy get auctioneer.
   *
   * @type {Object}
   * @api public
   */

  get auctioneer() {
    this.started.agentId;
  }

  /**
   * Lazy get bid data.
   *
   * @type {Object}
   * @api public
   */


  get data() {
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
  }

}
