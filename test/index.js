import Auction from '../lib/index';
import Bid from '../lib/bid';
import should from 'should';
import _ from 'lodash';
import agents from './fixtures/agents.json';
import singleAuction from './fixtures/auction.json';

const clone = _.clone;

describe('auction', () => {

  it('should create auction', () => {
    let options = clone(singleAuction);
    let auction = new Auction(options);
    auction.id.should.be.a.Number;
    auction.should.have.properties(options);
    auction.initialized.should.be.ok;
  });

  it('should return json data', () => {
    let options = clone(singleAuction);
    let auction = new Auction(options);
    auction.data.should.have.properties(options);
    auction.data.should.have.properties([
      'outBid', 'bestBid'
    ]);
  });

  it('should return error on invalid auction id', (done) => {
    let options = clone(singleAuction);
    options.id = null;
    new Auction(options, (err) => {
      err.message.should.match(/Invalid auction ID/);
      done();
    });
  });

  it('should return error on invalid opening price', (done) => {
    let options = clone(singleAuction);
    options.openPrice = '123';
    new Auction(options, (err) => {
      err.message.should.match(/Invalid open/);
      done();
    });
  });

  it('should return error on invalid minimum price', (done) => {
    let options = clone(singleAuction);
    options.minPrice = '123';
    new Auction(options, (err) => {
      err.message.should.match(/Invalid min/);
      done();
    });
  });

  describe('#start', () => {

    it('should allow starting an auction', (done) => {
      let options = singleAuction;
      let agent = agents[0];
      let auction = new Auction(options);
      auction.start(agent, (err) => {
        if (err) return done(err);
        auction.auctionStatus.should.be.eql('started');
        done();
      });
    });

    it('should allow starting an auction with opening price', (done) => {
      let options = clone(singleAuction);
      let agent = clone(agents[1]);
      let auction = new Auction(options);
      auction.start(agent, (err) => {
        if (err) return done(err);
        auction.auctionStatus.should.be.eql('started');
        auction.openPrice.should.be.eql(2000);
        done();
      });
    });

    it('should set started agentId and timestamp', (done) => {
      let options = clone(singleAuction);
      let agent = clone(agents[2]);
      let auction = new Auction(options);
      auction.start(agent, (err) => {
        if (err) return done(err);
        auction.auctionStatus.should.be.eql('started');
        auction.started.agentId.should.be.eql(agent.agentId);
        auction.started.timestamp.should.be.belowOrEqual(Date.now());
        done();
      });
    });

    it('should not start if agent is invalid', (done) => {
      let options = clone(singleAuction);
      let auction = new Auction(options);
      auction.start({ agentId: null }, (err) => {
        auction.auctionStatus.should.be.eql('created');
        err.message.should.match(/Invalid agent/)
        done();
      });
    });

    it('should not start if opening price is invalid', (done) => {
      let options = clone(singleAuction);
      let agent = clone(agents[0]);
      let auction = new Auction(options);
      agent.openPrice = '2000';
      auction.start(agent, (err) => {
        auction.auctionStatus.should.be.eql('created');
        err.message.should.match(/Invalid open/)
        done();
      });
    });

    it('should not start an already started auction', (done) => {
      let options = clone(singleAuction);
      let agent = clone(agents[0]);
      let auction = new Auction(options);
      auction.start(agent, (err) => {
        if (err) return done(err);
        auction.start(agent, (err) => {
          err.message.should.match(/already started/)
          done();
        });
      });
    });

    it('should not start an already ended auction', (done) => {
      let options = clone(singleAuction);
      let agent = clone(agents[0]);
      let auction = new Auction(options);
      auction.start(agent, (err) => {
        if (err) return done(err);
        auction.end(agent, (err) => {
          if (err) return done(err);
          auction.start(agent, (err) => {
            err.message.should.match(/already ended/)
            done();
          });
        });
      });
    });

  });

  describe('#end', () => {

    it('should allow ending an auction', (done) => {
      let options = clone(singleAuction);
      let agent = clone(agents[0]);
      let auction = new Auction(options);
      auction.start(agent, (err) => {
        if (err) return done(err);
        auction.end(agent, (err) => {
          if (err) return done(err);
          auction.auctionStatus.should.be.eql('ended');
          done();
        });
      });
    });

    it('should set ended agentId and timestamp', (done) => {
      let options = clone(singleAuction);
      let agent = clone(agents[2]);
      let auction = new Auction(options);
      auction.start(agent, (err) => {
        if (err) return done(err);
        auction.end(agent, (err) => {
          if (err) return done(err);
          auction.auctionStatus.should.be.eql('ended');
          auction.ended.agentId.should.be.eql(agent.agentId);
          auction.ended.timestamp.should.be.belowOrEqual(Date.now());
          done();
        });
      });
    });

    it('should not end if agent is invalid', (done) => {
      let options = clone(singleAuction);
      let auction = new Auction(options);
      auction.end({ agentId: null }, (err) => {
        err.message.should.match(/Invalid agent/)
        done();
      });
    });

    it('should not end an already ended auction', (done) => {
      let options = clone(singleAuction);
      let agent = clone(agents[0]);
      let auction = new Auction(options);
      auction.start(agent, (err) => {
        if (err) return done(err);
        auction.end(agent, (err) => {
          if (err) return done(err);
          auction.end(agent, (err) => {
            err.message.should.match(/already ended/)
            done();
          });
        });
      });
    });

    it('should not end a non started auction', (done) => {
      let options = clone(singleAuction);
      let agent = clone(agents[0]);
      let auction = new Auction(options);
      auction.end(agent, (err) => {
        err.message.should.match(/not started/)
        done();
      });
    });

  });

  describe('#bid', () => {

    it('should allow placing a bid', (done) => {
      let options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let bidder = clone(agents[1]);
      let auction = new Auction(options);
      auction.start(auctioneer, (err) => {
        if (err) return done(err);
        let bid = {
          price: 25000,
          agentId: bidder.agentId 
        };
        auction.bid(bid, (err, b) => {
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

    it('should set outBid and bestBid', (done) => {
      let options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let bidder = clone(agents[1]);
      let auction = new Auction(options);
      auction.start(auctioneer, (err) => {
        if (err) return done(err);
        let bid = {
          price: 25000,
          agentId: bidder.agentId 
        };
        auction.bid(bid, (err, b1) => {
          if (err) return done(err);
          let bid2 = {
            price: 27000,
            agentId: auctioneer.agentId 
          };
          auction.bid(bid2, (err, b2) => {
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

    it('should not place bid if agent is not registered', (done) => {
      let options = clone(singleAuction);
      let auction = new Auction(options);
      let bid = {
        price: 25000,
        agentId: null
      };
      auction.bid(bid, (err) => {
        err.message.should.match(/Invalid agent/)
        done();
      });
    });

    it('should not place bid on non started auction', (done) => {
      let options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let bidder = clone(agents[1]);
      let auction = new Auction(options);
      let bid = {
        price: 25000,
        agentId: bidder.agentId 
      };
      auction.bid(bid, (err) => {
        err.message.should.match(/not started/)
        done();
      });
    });

    it('should not place bid on ended auction', (done) => {
      let options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let bidder = clone(agents[1]);
      let auction = new Auction(options);
      let bid = {
        price: 25000,
        agentId: bidder.agentId 
      };
      auction.start(auctioneer, (err) => {
        if (err) return done(err);
        auction.end(auctioneer, (err) => {
          if (err) return done(err);
          auction.bid(bid, (err) => {
            err.message.should.match(/already ended/)
            done();
          });
        });
      });
    });

    it('should not place bid if price is lower than opening price', (done) => {
      let options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let auction = new Auction(options);
      auction.start(auctioneer, (err) => {
        if (err) return done(err);
        let bid = {
          agentId: auctioneer.agentId,
          price: auction.openPrice - 1
        };
        auction.bid(bid, (err, b) => {
          err.message.should.endWith('higher than the current bid price $' + auction.openPrice + '.');
          done();
        });
      });
    });

    it('should accept first bid price to be 1 dollar higher than opening price', (done) => {
      let options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let auction = new Auction(options);
      auction.start(auctioneer, (err) => {
        if (err) return done(err);
        let bid = {
          agentId: auctioneer.agentId,
          price: auction.openPrice + 1
        };
        auction.bid(bid, (err, b) => {
          if (err) return done(err);
          b.placed.should.be.ok;
          b.status.should.be.eql(Bid.ACCEPTED);
          done();
        });
      });
    });

    it('should accept bids after the first to be over the increment + opening price', (done) => {
      let options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let auction = new Auction(options);
      auction.start(auctioneer, (err) => {
        if (err) return done(err);
        let bid = {
          agentId: auctioneer.agentId,
          price: auction.openPrice + 1
        };
        auction.bid(bid, (err, b) => {
          if (err) return done(err);
          bid = clone(bid);
          bid.price = b.price + auction.increment;
          auction.bid(bid, (err, b) => {
            if (err) return done(err);
            b.placed.should.be.ok;
            b.status.should.be.eql(Bid.ACCEPTED);
            done();
          });
        });
      });
    });

    it('should return error on invalid bid provided', (done) => {
      let options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let auction = new Auction(options);
      auction.start(auctioneer, (err) => {
        if (err) return done(err);
        auction.bid(1234, (err) => {
          err.message.should.match(/Invalid bid/);
          done();
        });
      });
    });

    it('should return error on invalid bid price', (done) => {
      let options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let auction = new Auction(options);
      auction.start(auctioneer, (err) => {
        if (err) return done(err);
        let bid = {
          agentId: auctioneer.agentId,
          price: '20000'
        };
        auction.bid(bid, (err) => {
          err.message.should.match(/Invalid bid price/);
          done();
        });
      });
    });

  });

  describe('#authorize', () => {

    it('should allow passing authorization method when creating auction', () => {
      let options = clone(singleAuction);
      function auth(cmd, data, done) {
        done();
      };
      options.authorization = auth;
      new Auction(options)._auth.should.be.equal(auth);
    });

    it('should allow passing authorization', () => {
      let options = clone(singleAuction);
      function auth(cmd, data, done) {
        done();
      };
      let auction = new Auction(options);
      auction.authorize(auth);
      auction._auth.should.be.equal(auth);
    });

    it('should authorize correctly', (done) => {
      let options = clone(singleAuction);

      let db = [{
        "agentId": "abc123",
        "type": "auctioneer"
      },{
        "agentId": "abc456",
        "type": "bidder"
      },{
        "agentId": "def123",
        "type": "bidder"
      }];

      function auth(cmd, data, authorized) {
        let agent = _.find(db, { agentId: data.agentId });
        if ('start' === cmd) {
          if (agent && agent.type === 'auctioneer') authorized();
          else authorized({ message: 'not authorized' });
        } else if ('bid' === cmd) {
          if (agent && agent.type === 'bidder') authorized();
          else authorized({ message: 'not authorized' });
        }
      };

      options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let bidder = clone(agents[1]);
      let auction = new Auction(options);

      auction.authorize(auth);
      auction.start(db[1], (err) => {
        err.message.should.match('not authorized');
        auction.start(db[0], (err) => {
          if (err) return done(err);
          auction.auctionStatus.should.be.eql('started');
          auction.started.agentId.should.be.eql(db[0].agentId);
          let bid = { price: 25000, agentId: db[0].agentId, type: 'auctioneer' };
          auction.bid(bid, (err, b) => {
            err.message.should.match('not authorized');
            let bid = { price: 25000, agentId: db[2].agentId, type: 'bidder' };
            auction.bid(bid, done);
          });
        });
      });
      
    });

  });

  describe('#reset', () => {

    it('should allow destroying and auction', (done) => {
      let options = clone(singleAuction);
      let auctioneer = clone(agents[0]);
      let bidder = clone(agents[1]);
      let auction = new Auction(options);
      auction.start(auctioneer, (err) => {
        if (err) return done(err);
        let bid = { price: 25000, agentId: bidder.agentId };
        auction.bid(bid, (err, b) => {
          if (err) return done(err);
          auction.reset();
          auction.should.have.properties({
            bids: [],
            outBid: {},
            bestBid: {},
            started: {},
            ended: {},
            saleId: null,
            saleDate: null,
            minPrice: 0,
            openPrice: 0,
            increment: 1,
            minIncrement: 1,
            destroyed: false,
            initialized: true,
            auctionStatus: 'created'
          });
          done();
        });
      });
    });

  });

  describe('#destroy', () => {

    it('should allow destroying and auction', (done) => {
      let options = clone(singleAuction);
      let auction = new Auction(options);
      auction.destroy((err) => {
        if (err) return done(err);
        auction.destroyed.should.be.ok;
        done();
      });
    });

  });

});