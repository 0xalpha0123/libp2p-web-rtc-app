const protons = require('protons')
const uint8arrayFromString = require('uint8arrays/from-string')
const uint8arrayToString = require('uint8arrays/to-string')

const EventEmitter = require('events')

const { Request, Stats } = protons(`
message Request {
  enum Type {
    SEND_MESSAGE = 0;
    UPDATE_PEER = 1;
    STATS = 2;
  }
  required Type type = 1;
  optional SendMessage sendMessage = 2;
  optional UpdatePeer updatePeer = 3;
  optional Stats stats = 4;
}
message SendMessage {
  required bytes data = 1;
  required int64 created = 2;
  required bytes id = 3;
}
message UpdatePeer {
  optional bytes userHandle = 1;
}
message Stats {
  enum NodeType {
    GO = 0;
    NODEJS = 1;
    BROWSER = 2;
  }
  repeated bytes connectedPeers = 1;
  optional NodeType nodeType = 2;
}
`)

class PubSubSeat extends EventEmitter {
    constructor(libp2p, topic) {
        super()
        this.libp2p = libp2p
        this.topic = topic
        this.connectedPeers = new Set()
        this.stats = new Map()
        this.libp2p.connectionManager.on('peer:connect', (connection) => {
            if (this.connectedPeers.has(connection.remotePeer.toB58String())) return
            this.connectedPeers.add(connection.remotePeer.toB58String())
            this.sendStats(Array.from(this.connectedPeers))
        })
        this.libp2p.connectionManager.on('peer:disconnect', (connection) => {
            if (this.connectedPeers.delete(connection.remotePeer.toB58String())) {
                this.sendStats(Array.from(this.connectedPeers))
            }
        })
        this._onMessage = this._onMessage.bind(this)
        if (this.libp2p.isStarted()) this.join()
    }

    join() {
        this.libp2p.pubsub.on(this.topic, this._onMessage)
        this.libp2p.pubsub.subscribe(this.topic)
    }

    leave() {
        this.libp2p.pubsub.removeListener(this.topic, this._onMessage)
        this.libp2p.pubsub.unsubscribe(this.topic)
    }

    _onMessage(message) {
        try {
            const request = Request.decode(message.data)
            switch (request.type) {
                case Request.Type.UPDATE_PEER:
                    this.emit('peer:update', {
                        id: message.from,
                        name: request.updatePeer.userHandle.toString()
                    })
                    break
                case Request.Type.STATS:
                    this.stats.set(message.from, request.stats)
                    this.emit('stats', this.stats)
                    break
                default:
                    this.emit('message', {
                        from: message.from,
                        data: uint8arrayToString(request.sendMessage.data),
                        created: request.sendMessage.created,
                        id: uint8arrayToString(request.sendMessage.id)
                    })
            }
        } catch (err) {
            console.error(err)
        }
    }

    checkCommand(input) {
        const str = input.toString()
        if (str.startsWith('/')) {
            const args = str.slice(1).split(' ')
            switch (args[0]) {
                case 'name':
                    this.updatePeer(args[1])
                    return true
                default:
                    return
            }
        }
        return false
    }

    async updatePeer(name) {
        const msg = Request.encode({
            type: Request.Type.UPDATE_PEER,
            updatePeer: {
                userHandle: Buffer.from(name)
            }
        })

        try {
            await this.libp2p.pubsub.publish(this.topic, msg)
        } catch (err) {
            console.error('Could not publish name change')
        }
    }

    async sendStats(connectedPeers) {
        const msg = Request.encode({
            type: Request.Type.STATS,
            stats: {
                connectedPeers: connectedPeers.map(id => uint8arrayFromString(id)),
                nodeType: Stats.NodeType.BROWSER
            }
        })

        try {
            await this.libp2p.pubsub.publish(this.topic, msg)
        } catch (err) {
            console.error('Could not publish stats update')
        }
    }

    async send(message) {
        const msg = Request.encode({
            type: Request.Type.SEND_MESSAGE,
            sendMessage: {
                id: uint8arrayFromString((~~(Math.random() * 1e9)).toString(36) + Date.now()),
                data: uint8arrayFromString(message),
                created: Date.now()
            }
        })
        await this.libp2p.pubsub.publish(this.topic, msg)
    }
}

module.exports = PubSubSeat
module.exports.TOPIC = '/libp2p/rumblefish/seats/1.0.0'