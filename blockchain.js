const cluster = require('cluster')
const dgram = require('dgram')
const crypto = require('crypto')
const assert = require('assert')

const express = require('express')
const parser = require('body-parser')
const request = require('request')

const lastOf = list => list[list.length - 1]


class Block {

  constructor(index, previousHash, timestamp, data, nonce = 0, hash = '') {
    this.index = index
    this.previousHash = previousHash
    this.timestamp = timestamp
    this.data = data
    this.nonce = nonce
    this.hash = this.calculateHash()
  }

  calculateHash() {
    const { hash, ...data } = this
    return crypto
      .createHmac('sha256', JSON.stringify(data))
      .digest('hex')
  }

  mineBlock(difficulty) {
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log("Block mined: " + this.hash);
  }

  static get GENESIS() {
    return new Block(
      0, '', 1522983367254, null, 0,
      'e063dac549f070b523b0cb724efb1d4f81de67ea790f78419f9527aa3450f64c'
    )
  }

  static fromPrevious({ index, hash }, data) {
    // Initialize next block using previous block and transaction data
    // assert(typeof hash === 'string' && hash.length === 64)
    return new Block(index + 1, hash, Date.now(), data, 0)
  }

  static fromJson({ index, previousHash, timestamp, data, nonce, hash }) {
    const block = new Block(index, previousHash, timestamp, data, nonce, hash)
    assert(block.calculateHash() === block.hash)
    return block
  }
}


class Server {

  constructor() {
    this.blocks = [Block.GENESIS]
    this.difficulty = 4;
    this.peers = {}
    this.state = {}

    this.peerServer = dgram.createSocket('udp4')
    this.peerServer.on('listening', this.onPeerServerListening.bind(this))
    this.peerServer.on('message', this.onPeerMessage.bind(this))

    this.httpServer = express()
    this.httpServer.use(parser.json())
    this.httpServer.get('/peers', this.showPeers.bind(this))
    this.httpServer.get('/blocks', this.showBlocks.bind(this))
    this.httpServer.post('/blocks', this.processBlocks.bind(this))
    this.httpServer.post('/transactions', this.processTransaction.bind(this))
    this.httpServer.post('/accounts', this.createAccount.bind(this))
  }

  start() {
    if (!cluster.isMaster) return
    cluster.fork().on('online', _ => this.peerServer.bind(2346))
    cluster.fork().on('online', _ => this.httpServer.listen(2345, _ => {
      console.info('RPC server started at port 2345.')
    }))
  }

  onPeerServerListening() {
    const address = this.peerServer.address()
    console.info(
      `Peer discovery server started at ${address.address}:${address.port}.`
    )

    this.peerServer.setBroadcast(true)

    const message = new Buffer('hello')
    setInterval(_ => {
      this.peerServer.send(message, 0, message.length, address.port, '172.28.0.0')
    }, 1000)
  }

  onPeerMessage(message, remote) {
    if (this.peers[remote.address]) return

    this.peers[remote.address] = remote
    console.log(`Peer discovered: ${remote.address}:${remote.port}`)
  }

  showPeers(req, resp) { resp.json(this.peers) }
  showBlocks(req, resp) { resp.json(this.blocks) }

  processTransaction(req, resp) {

    // - Verify signature
    const verify = crypto.createVerify('SHA256');

    verify.write('some data to sign');
    verify.end();

    const publicKey = getPublicKeySomehow();
    const signature = getSignatureToVerify();
    console.log(verify.verify(publicKey, signature));
    // - Verify balance

    // - Current block
    // if (!this.currentBlock) {
    //   this.currentBlock = Block.fromPrevious(Block.GENESIS)
    // }
    // - Add transaction to block
    this.currentBlock.data.push(transaction)

    // Response

    // - Check if we have waited for 30 seconds
    // - Proof-of-work
    while (!this.currentBlock.hash.startsWith('000')) {
      this.currentBlock.nonce += 1
      this.currentBlock.hash = this.currentBlock.calculateHash()
    }

    this.blocks.push(this.currentBlock)

    Object.keys(this.peers).forEach(address => {
      // POST /blocks
    })

    this.currentBlock = Block.fromPrevious(this.currentBlock)
  }

  getLastedBlock() {
    return this.blocks[this.blocks.length - 1]
  }
  processBlocks(req, resp) {
    // TODO
    block.hash.startsWith('000')
    block.hash === block.calculateHash()
    block.previousHash === this.blocks[block.index - 1].hash

    block.index > lastOf(this.blocks).index
    // newBlock.previousHash = this.getLastedBlock().hash;
    // newBlock.mineBlock(this.difficulty);
    // this.blocks.push(newBlock)
  }

  createAccount(req, resp) {
    // TODO
    // - Generate key pair based on password
    // - Response
    // let password = crypto.createHmac('sha256', req.body.password).digest('hex');
    var password = crypto.createHmac('sha256', req.body.password).digest('hex');
    let diffHell = crypto.createDiffieHellman(password)
    diffHell.generateKeys('hex');

    return resp.send(`Address:${diffHell.getPublicKey('hex')} Private Key:${diffHell.getPrivateKey('hex')}`)
  }
}

// let testing = new Server();

// console.log("Mining block 1...")
// testing.processBlocks(new Block(1, null, "17/07/2018", "Hello", 0, null));

// console.log("Mining block 2...")
// testing.processBlocks(new Block(2, null, "17/07/2018", "Holle", 0, null));

// console.log(testing.blocks)
// testing.createAccount(1, 1)
exports.Block = Block
exports.Server = Server
