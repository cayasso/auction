var Auction = require('../');
var Bid = require('../').Bid;
var clone = require('./common').clone;
var should = require('should');
var agents = require('./fixtures/agents.json');
var singleAuction = require('./fixtures/auction.json');

describe('auction', function () {

  it('should create auction', function () {
    var options = clone(singleAuction);
    var auction = Auction.create(options);
    auction.id.should.be.a.Number;
    auction.should.have.properties(options);
    auction.initialized.should.be.ok;
  });

  it('should return json data', function () {
    var options = clone(singleAuction);
    var auction = Auction.create(options);
    auction.data.should.have.properties(options);
    auction.data.should.have.properties([
      'outBid', 'bestBid'
    ]);
  });

  it('should return error on invalid auction id', function (done) {
    var options = clone(singleAuction);
    options.id = null;
    Auction.create(options, function (err) {
      err.message.should.match(/Invalid auction ID/);
      done();
    });
  });

  it('should return error on invalid opening price', function (done) {
    var options = clone(singleAuction);
    options.openPrice = '123';
    Auction.create(options, function (err) {
      err.message.should.match(/Invalid open/);
      done();
    });
  });

  it('should return error on invalid minimum price', function (done) {
    var options = clone(singleAuction);
    options.minPrice = '123';
    Auction.create(options, function (err) {
      err.message.should.match(/Invalid min/);
      done();
    });
  });

  describe('#start', function () {

    it('should allow starting an auction', function (done) {
      var options = clone(singleAuction);
      var agent = clone(agents[0]);
      var auction = Auction.create(options);
      auction.start(agent, function (err) {
        if (err) return done(err);
        auction.auctionStatus.should.be.eql('started');
        done();
      });
    });

    it('should allow starting an auction with opening price', function (done) {
      var options = clone(singleAuction);
      var agent = clone(agents[1]);
      var auction = Auction.create(options);
      auction.start(agent, function (err) {
        if (err) return done(err);
        auction.auctionStatus.should.be.eql('started');
        auction.openPrice.should.be.eql(2000);
        done();
      });
    });

    it('should set started agentId and timestamp', function (done) {
      var options = clone(singleAuction);
      var agent = clone(agents[2]);
      var auction = Auction.create(options);
      auction.start(agent, function (err) {
        if (err) return done(err);
        auction.auctionStatus.should.be.eql('started');
        auction.started.agentId.should.be.eql(agent.agentId);
        auction.started.timestamp.should.be.belowOrEqual(Date.now());
        done();
      });
    });

    it('should not start if agent is invalid', function (done) {
      var options = clone(singleAuction);
      var auction = Auction.create(options);
      auction.start({ agentId: null }, function (err) {
        auction.auctionStatus.should.be.eql('created');
        err.message.should.match(/Invalid agent/)
        done();
      });
    });

    it('should not start if opening price is invalid', function (done) {
      var options = clone(singleAuction);
      var agent = clone(agents[0]);
      var auction = Auction.create(options);
      agent.openPrice = '2000';
      auction.start(agent, function (err) {
        auction.auctionStatus.should.be.eql('created');
        err.message.should.match(/Invalid open/)
        done();
      });
    });

    it('should not start an already started auction', function (done) {
      var options = clone(singleAuction);
      var agent = clone(agents[0]);
      var auction = Auction.create(options);
      auction.start(agent, function (err) {
        if (err) return done(err);
        auction.start(agent, function (err) {
          err.message.should.match(/already started/)
          done();
        });
      });
    });

    it('should not start an already ended auction', function (done) {
      var options = clone(singleAuction);
      var agent = clone(agents[0]);
      var auction = Auction.create(options);
      auction.start(agent, function (err) {
        if (err) return done(err);
        auction.end(agent, function (err) {
          if (err) return done(err);
          auction.start(agent, function (err) {
            err.message.should.match(/already ended/)
            done();
          });
        });
      });
    });

  });

  describe('#end', function () {

    it('should allow ending an auction', function (done) {
      var options = clone(singleAuction);
      var agent = clone(agents[0]);
      var auction = Auction.create(options);
      auction.start(agent, function (err) {
        if (err) return done(err);
        auction.end(agent, function (err) {
          if (err) return done(err);
          auction.auctionStatus.should.be.eql('ended');
          done();
        });
      });
    });

    it('should set ended agentId and timestamp', function (done) {
      var options = clone(singleAuction);
      var agent = clone(agents[2]);
      var auction = Auction.create(options);
      auction.start(agent, function (err) {
        if (err) return done(err);
        auction.end(agent, function (err) {
          if (err) return done(err);
          auction.auctionStatus.should.be.eql('ended');
          auction.ended.agentId.should.be.eql(agent.agentId);
          auction.ended.timestamp.should.be.belowOrEqual(Date.now());
          done();
        });
      });
    });

    it('should not end if agent is invalid', function (done) {
      var options = clone(singleAuction);
      var auction = Auction.create(options);
      auction.end({ agentId: null }, function (err) {
        err.message.should.match(/Invalid agent/)
        done();
      });
    });

    it('should not end an already ended auction', function (done) {
      var options = clone(singleAuction);
      var agent = clone(agents[0]);
      var auction = Auction.create(options);
      auction.start(agent, function (err) {
        if (err) return done(err);
        auction.end(agent, function (err) {
          if (err) return done(err);
          auction.end(agent, function (err) {
            err.message.should.match(/already ended/)
            done();
          });
        });
      });
    });

    it('should not end a non started auction', function (done) {
      var options = clone(singleAuction);
      var agent = clone(agents[0]);
      var auction = Auction.create(options);
      auction.end(agent, function (err) {
        err.message.should.match(/not started/)
        done();
      });
    });

  });

  describe('#bid', function () {

    it('should allow placing a bid', function (done) {
      var options = clone(singleAuction);
      var auctioneer = clone(agents[0]);
      var bidder = clone(agents[1]);
      var auction = Auction.create(options);
      auction.start(auctioneer, function (err) {
        if (err) return done(err);
        var bid = {
          price: 25000,
          agentId: bidder.agentId 
        };
        auction.bid(bid, function (err, b) {
          b.should.be.an.Object;
          b.placed.should.be.ok;
          auction.bids.length.should.be.eql(1);
          auction.bestBid.should.have.properties({
            id: b.id,
            agentId: b.agentId,
            placed: b.placed,
            price: b.price,
            status: b.status,
            timestamp: b.timestamp
          });
          done();
        });
      });
    });

    it('should set outBid and bestBid', function (done) {
      var options = clone(singleAuction);
      var auctioneer = clone(agents[0]);
      var bidder = clone(agents[1]);
      var auction = Auction.create(options);
      auction.start(auctioneer, function (err) {
        if (err) return done(err);
        var bid = {
          price: 25000,
          agentId: bidder.agentId 
        };
        auction.bid(bid, function (err, b1) {
          if (err) return done(err);
          var bid2 = {
            price: 27000,
            agentId: auctioneer.agentId 
          };
          auction.bid(bid2, function (err, b2) {
            if (err) return done(err);
            auction.bids.length.should.be.eql(2);
            auction.outBid.should.have.properties({
              id: b1.id,
              agentId: b1.agentId,
              placed: b1.placed,
              price: b1.price,
              status: b1.status,
              timestamp: b1.timestamp
            });
            auction.bestBid.should.have.properties({
              id: b2.id,
              agentId: b2.agentId,
              placed: b2.placed,
              price: b2.price,
              status: b2.status,
              timestamp: b2.timestamp
            });
            done();
          });
        });
      });
    });

    it('should not place bid if agent is not registered', function (done) {
      var options = clone(singleAuction);
      var auction = Auction.create(options);
      var bid = {
        price: 25000,
        agentId: null
      };
      auction.bid(bid, function (err) {
        err.message.should.match(/Invalid agent/)
        done();
      });
    });

    it('should not place bid on non started auction', function (done) {
      var options = clone(singleAuction);
      var auctioneer = clone(agents[0]);
      var bidder = clone(agents[1]);
      var auction = Auction.create(options);
      var bid = {
        price: 25000,
        agentId: bidder.agentId 
      };
      auction.bid(bid, function (err) {
        err.message.should.match(/not started/)
        done();
      });
    });

    it('should not place bid on ended auction', function (done) {
      var options = clone(singleAuction);
      var auctioneer = clone(agents[0]);
      var bidder = clone(agents[1]);
      var auction = Auction.create(options);
      var bid = {
        price: 25000,
        agentId: bidder.agentId 
      };
      auction.start(auctioneer, function (err) {
        if (err) return done(err);
        auction.end(auctioneer, function (err) {
          if (err) return done(err);
          auction.bid(bid, function (err) {
            err.message.should.match(/already ended/)
            done();
          });
        });
      });
    });

    it('should not place bid if price is lower than opening price', function (done) {
      var options = clone(singleAuction);
      var auctioneer = clone(agents[0]);
      var auction = Auction.create(options);
      auction.start(auctioneer, function (err) {
        if (err) return done(err);
        var bid = {
          agentId: auctioneer.agentId,
          price: auction.openPrice - 1
        };
        auction.bid(bid, function (err, b) {
          err.message.should.endWith('higher than the current bid price $' + auction.openPrice + '.');
          done();
        });
      });
    });

    it('should accept first bid price to be 1 dollar higher than opening price', function (done) {
      var options = clone(singleAuction);
      var auctioneer = clone(agents[0]);
      var auction = Auction.create(options);
      auction.start(auctioneer, function (err) {
        if (err) return done(err);
        var bid = {
          agentId: auctioneer.agentId,
          price: auction.openPrice + 1
        };
        auction.bid(bid, function (err, b) {
          if (err) return done(err);
          b.placed.should.be.ok;
          b.status.should.be.eql(Bid.ACCEPTED);
          done();
        });
      });
    });

    it('should accept bids after the first to be over the increment + opening price', function (done) {
      var options = clone(singleAuction);
      var auctioneer = clone(agents[0]);
      var auction = Auction.create(options);
      auction.start(auctioneer, function (err) {
        if (err) return done(err);
        var bid = {
          agentId: auctioneer.agentId,
          price: auction.openPrice + 1
        };
        auction.bid(bid, function (err, b) {
          if (err) return done(err);
          bid = clone(bid);
          bid.price = b.price + auction.increment;
          auction.bid(bid, function (err, b) {
            if (err) return done(err);
            b.placed.should.be.ok;
            b.status.should.be.eql(Bid.ACCEPTED);
            done();
          });
        });
      });
    });

    it('should return error on invalid bid provided', function (done) {
      var options = clone(singleAuction);
      var auctioneer = clone(agents[0]);
      var auction = Auction.create(options);
      auction.start(auctioneer, function (err) {
        if (err) return done(err);
        auction.bid(1234, function (err) {
          err.message.should.match(/Invalid bid/);
          done();
        });
      });
    });

    it('should return error on invalid bid price', function (done) {
      var options = clone(singleAuction);
      var auctioneer = clone(agents[0]);
      var auction = Auction.create(options);
      auction.start(auctioneer, function (err) {
        if (err) return done(err);
        var bid = {
          agentId: auctioneer.agentId,
          price: '20000'
        };
        auction.bid(bid, function (err) {
          err.message.should.match(/Invalid bid price/);
          done();
        });
      });
    });

  });

  describe('#destroy', function () {

    it('should allow destroying and auction', function (done) {
      var options = clone(singleAuction);
      var auction = Auction.create(options);
      auction.destroy(function (err) {
        if (err) return done(err);
        auction.destroyed.should.be.ok;
        done();
      });
    });

  });

});