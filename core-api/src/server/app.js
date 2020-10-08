const Libp2p = require("libp2p");
const TCP = require("libp2p-tcp");
const Websockets = require("libp2p-websockets");
const WebrtcStar = require("libp2p-webrtc-star");
const wrtc = require("wrtc");
const Mplex = require("libp2p-mplex");
const { NOISE } = require("libp2p-noise");
const MDNS = require("libp2p-mdns");
const KademliaDHT = require("libp2p-kad-dht");
const Gossipsub = require("libp2p-gossipsub");
const SignalingServer = require("libp2p-webrtc-star/src/sig-server");
const PeerId = require("peer-id");
const idJSON = require("../utils/id.json");
const SeatsProtocol = require("./seats-protocol");
const PubsubSeats = require('../server/seats');

(async () => {
  const peerId = await PeerId.createFromJSON(idJSON);
  const addrs = [
    '/ip4/0.0.0.0/tcp/63785',
    '/ip4/0.0.0.0/tcp/63786/ws'
  ];
  const signalingServer = await SignalingServer.start({
    port: 15555
  });
  const ssAddr = `/ip4/${signalingServer.info.host}/tcp/${signalingServer.info.port}/ws/p2p-webrtc-star`;
  console.info(`Signaling server running at ${ssAddr}`);
  addrs.push(`${ssAddr}/p2p/${peerId.toB58String()}`);
  const libp2p = await createBootstrapNode(peerId, addrs);

  libp2p.handle(SeatsProtocol.PROTOCOL, SeatsProtocol.handler);

  process.stdin.on('data', (message) => {
    message = message.slice(0, -1)
    libp2p.peerStore.peers.forEach(async (peerData) => {
      if (!peerData.protocols.includes(SeatsProtocol.PROTOCOL)) return;

      const connection = libp2p.connectionManager.get(peerData.id);
      if (!connection) return;

      try {
        const { stream } = await connection.newStream([SeatsProtocol.PROTOCOL]);
        await SeatsProtocol.send(message, stream);
      } catch (err) {
        console.error('Could not negotiate chat protocol stream with peer', err);
      }
    })
  });

  await libp2p.start();
  console.log('Node started with addresses:');
  libp2p.transportManager.getAddrs().forEach(ma => console.log(ma.toString()));
  console.log('\nNode supports protocols:');
  libp2p.upgrader.protocols.forEach((_, p) => console.log(p));

  const pubsubChat = new PubsubSeats(libp2p, PubsubSeats.TOPIC, ({ from, message }) => {
    let fromMe = from === libp2p.peerId.toB58String();
    let user = from.substring(0, 6);
    if (pubsubChat.userHandles.has(from)) {
      user = pubsubChat.userHandles.get(from);
    }
  });

  process.stdin.on('data', async (message) => {
    message = message.slice(0, -1);
    if (pubsubChat.checkCommand(message)) return;

    try {
      await pubsubChat.send(message);
    } catch (err) {
      console.error('Could not publish chat', err);
    }
  })
})();

const createBootstrapNode = (peerId, listenAddrs) => {
  return Libp2p.create({
    peerId,
    addresses: {
      listen: listenAddrs,
    },
    modules: {
      transport: [WebrtcStar, TCP, Websockets],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      peerDiscovery: [MDNS],
      dht: KademliaDHT,
      pubsub: Gossipsub,
    },
    config: {
      transport: {
        [WebrtcStar.prototype[Symbol.toStringTag]]: {
          wrtc,
        },
      },
      relay: {
        enabled: true,
        hop: {
          enabled: true,
          active: false,
        },
      },
      dht: {
        enabled: true,
        randomWalk: {
          enabled: true,
        },
      },
    },
  });
};
