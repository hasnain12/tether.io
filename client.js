'use strict';

const RPC = require('@hyperswarm/rpc');
const DHT = require('hyperdht');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const main = async (clientName) => {
  const dht = new DHT({
    bootstrap: [{ host: '127.0.0.1', port: 30001 }]
  });

  const keyPair = DHT.keyPair();
  const rpc = new RPC({ keyPair, dht });

  const readServerPublicKey = () => {
    try {
      const publicKey = fs.readFileSync('./server_public_key.txt', 'utf-8').trim();
      return Buffer.from(publicKey, 'hex');
    } catch (err) {
      console.error('Failed to read server public key:', err.message);
      return null;
    }
  };

  let serverPubKey = readServerPublicKey();
  if (!serverPubKey) {
    console.log('Server public key not found');
    process.exit(1);
  }

  const openAuction = async (auctionId, item, startingBid) => {
    try {
      const openAuctionPayload = {
        auctionId,
        item,
        startingBid
      };
      const response = await rpc.request(serverPubKey, 'openAuction', Buffer.from(JSON.stringify(openAuctionPayload), 'utf-8'));
      console.log(JSON.parse(response.toString('utf-8')));
    } catch (error) {
      console.error('Error in openAuction:', error);
    }
  };

  const placeBid = async (auctionId, bidAmount) => {
    try {
      const placeBidPayload = {
        auctionId,
        bidAmount: bidAmount,
        bidder: clientName
      };
      const response = await rpc.request(serverPubKey, 'placeBid', Buffer.from(JSON.stringify(placeBidPayload), 'utf-8'));
      const res = JSON.parse(response.toString('utf-8'));
      console.log(res);
    } catch (error) {
      console.error('Error in placeBid:', error);
    }
  };

  const closeAuction = async (auctionId) => {
    try {
      const closeAuctionPayload = {
        auctionId
      };
      const response = await rpc.request(serverPubKey, 'closeAuction', Buffer.from(JSON.stringify(closeAuctionPayload), 'utf-8'));
      const res = JSON.parse(response.toString('utf-8'));
      console.log(res);
    } catch (error) {
      console.error('Error in closeAuction:', error);
    }
  };

  const mainLoop = () => {
    rl.question('Do you want to open an auction, place a bid, or close an auction? (open/place/close): ', (action) => {
      if (action.toLowerCase() === 'open') {
        rl.question('Enter auction ID: ', (auctionId) => {
          rl.question('Enter item: ', (item) => {
            rl.question('Enter starting bid: ', (startingBid) => {
              openAuction(auctionId, item, parseFloat(startingBid)).then(mainLoop);
            });
          });
        });
      } else if (action.toLowerCase() === 'place') {
        rl.question('Enter auction ID: ', (auctionId) => {
          rl.question('Enter bid amount: ', (amount) => {
            placeBid(auctionId, parseFloat(amount)).then(mainLoop);
          });
        });
      } else if (action.toLowerCase() === 'close') {
        rl.question('Enter auction ID: ', (auctionId) => {
          closeAuction(auctionId).then(mainLoop);
        });
      } else {
        console.log('Invalid action.');
        mainLoop();
      }
    });
  };

  mainLoop();
};

rl.question('Enter your name: ', (name) => {
  main(name).catch(console.error);
});
