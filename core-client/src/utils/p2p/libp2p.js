import Libp2p from "libp2p";
import Websockets from "libp2p-websockets";
import WebrtcStar from "libp2p-webrtc-star";
import Mplex from "libp2p-mplex";
import { NOISE } from "libp2p-noise";
import Bootstrap from "libp2p-bootstrap";
import KadDHT from "libp2p-kad-dht";
import Gossipsub from "libp2p-gossipsub";

const createLibp2p = async (peerId) => {
  const libp2p = await Libp2p.create({
    peerId,
    addresses: {
      listen: [
        "/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star",
      ],
    },
    modules: {
      transport: [Websockets, WebrtcStar],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      peerDiscovery: [Bootstrap],
      dht: KadDHT,
      pubsub: Gossipsub,
    },
    config: {
      peerDiscovery: {
        bootstrap: {
          list: [
            "/ip4/127.0.0.1/tcp/63786/ws/p2p/QmWjz6xb8v9K4KnYEwP5Yk75k5mMBCehzWFLCvvQpYxF3d",
          ],
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

  await libp2p.start();
  return libp2p;
};

export default createLibp2p;
