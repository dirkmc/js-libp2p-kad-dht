'use strict'

const express = require('express')
const cors = require('cors')
const SSE = require('express-sse')
const bs58 = require('bs58')

const PORT = 8080

class SimServer {
  constructor (dht) {
    this.dht = dht
  }

  start () {
    const app = express()
    app.use(cors())

    this.sse = new SSE([this.dht.peerInfo.id.toB58String()])
    app.get('/sse', (req, res, next) => {
      this.sse.init(req, res)
      next()
    }, this.onConnect.bind(this))

    this.server = app.listen(PORT, function () {
      console.log('DHT Viz server listening on port ' + PORT)
    })
  }

  onConnect (req, res) {
    this.dht.on('peer', (peerInfo) => {
      this.sse.send(peerInfo.id.toB58String(), 'peer')
    })

    // this.dht.on('dial', (peer) => {
    //   sse.send(peer.toB58String(), 'dial')
    // })
    // this.dht.on('dial complete', (peer) => {
    //   sse.send(peer.toB58String(), 'dial complete')
    // })

    this.dht.on('query', ({ peerId, pathId }) => {
      this.sse.send({ peerId: peerId.toB58String(), pathId }, 'query')
    })
    this.dht.on('query complete', ({ peerId, pathId }) => {
      this.sse.send({ peerId: peerId.toB58String(), pathId }, 'query complete')
    })

    this.dht.on('run', (run) => {
      this.sse.send({ runKey: bs58.encode(run.key) }, 'run')
    })
    this.dht.on('run complete', (run) => {
      this.sse.send({ runKey: bs58.encode(run.key) }, 'run complete')
    })

    this.dht.on('queue', ({ query, path, queue, running, pending }) => {
      const runningIds = running.map(p => p.toB58String())
      this.sse.send({ name: query.name, runKey: bs58.encode(query.key), pathId: path.id, running: runningIds, pending }, 'queue')
    })
    this.dht.on('queue update', ({ query, path, queue, running, pending }) => {
      const runningIds = running.map(p => p.toB58String())
      // console.log('queue update', { runKey: bs58.encode(query.key), pathId: path.id, running: queue.running(), pending })
      // console.log('queue update', JSON.stringify({ run: bs58.encode(query.key).substr(-4), path: path.id.substr(-4), r: queue.running(), p: pending }))
      this.sse.send({ name: query.name, runKey: bs58.encode(query.key), pathId: path.id, running: runningIds, pending }, 'queue update')
    })
    this.dht.on('queue complete', ({ query, path, queue, pending }) => {
      // console.log('queue complete', { runKey: bs58.encode(query.key), pathId: path.id })
      this.sse.send({ name: query.name, runKey: bs58.encode(query.key), pathId: path.id }, 'queue complete')
    })

    const known = this.dht.peerBook.getAllArray().map(p => p.id.toB58String())
    this.sse.send({ known }, 'connect')
  }

  stop () {
    this.server.close()
  }
}

module.exports = SimServer
