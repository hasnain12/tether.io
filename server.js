'use strict';

const RPC = require('@hyperswarm/rpc');
const DHT = require('hyperdht');
const fs = require('fs');

const main = async () => {
  const dht = new DHT({
    bootstrap: [{ host: '127.0.0.1', port: 30001 }]
  });

  const keyPair = DHT.keyPair();
  const rpc = new RPC({ keyPair, dht });
  const rpcServer = rpc.createServer();

  await rpcServer.listen();
  const publicKeyHex = rpcServer.publicKey.toString('hex');
  console.log('public key', publicKeyHex);

  
  fs.writeFileSync('./server_public_key.txt', publicKeyHex);

  const auctions = new Map();

  rpcServer.respond('openAuction', async (reqRaw) => {
    try {
      const req = JSON.parse(reqRaw.toString('utf-8'));
      const { auctionId, item, startingBid } = req;
      auctions.set(auctionId, { item, startingBid, bids: [], highestBid: 0, highestBidder: null });
      console.log(`Auction opened: ${auctionId} - ${item} for ${startingBid} USDt`);

      return Buffer.from(JSON.stringify({ status: 'auctionOpened' }), 'utf-8');
    } catch (error) {
      console.error('Error in openAuction:', error);
      return Buffer.from(JSON.stringify({ status: 'error', message: error.message }), 'utf-8');
    }
  });

  rpcServer.respond('placeBid', async (reqRaw) => {
    try {
      const req = JSON.parse(reqRaw.toString('utf-8'));
      const { auctionId, bidAmount, bidder } = req;
      const auction = auctions.get(auctionId);
      if (auction) {
        if (bidAmount > auction.highestBid) {
          auction.bids.push({ amount: bidAmount, bidder });
          auction.highestBid = bidAmount;
          auction.highestBidder = bidder;
          console.log(`Bid placed: ${bidAmount} USDt by ${bidder} on auction ${auctionId}`);

          return Buffer.from(JSON.stringify({ status: 'bidPlaced', auctionId, highestBid: bidAmount, highestBidder: bidder }), 'utf-8');
        } else {
          return Buffer.from(JSON.stringify({ status: 'bidTooLow' }), 'utf-8');
        }
      } else {
        return Buffer.from(JSON.stringify({ status: 'auctionNotFound' }), 'utf-8');
      }
    } catch (error) {
      console.error('Error in placeBid:', error);
      return Buffer.from(JSON.stringify({ status: 'error', message: error.message }), 'utf-8');
    }
  });

  rpcServer.respond('closeAuction', async (reqRaw) => {
    try {
      const req = JSON.parse(reqRaw.toString('utf-8'));
      const { auctionId } = req;
      const auction = auctions.get(auctionId);
      if (auction) {
        console.log(`Auction closed: ${auctionId} - Highest bid: ${auction.highestBid} USDt by ${auction.highestBidder}`);

        return Buffer.from(JSON.stringify({ status: 'auctionClosed', highestBid: auction.highestBid, highestBidder: auction.highestBidder }), 'utf-8');
      } else {
        return Buffer.from(JSON.stringify({ status: 'auctionNotFound' }), 'utf-8');
      }
    } catch (error) {
      console.error('Error in closeAuction:', error);
      return Buffer.from(JSON.stringify({ status: 'error', message: error.message }), 'utf-8');
    }
  });
};

main().catch(console.error);
