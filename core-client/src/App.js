import React, { useEffect, useState } from "react";
import { getOrCreatePeerId } from "./utils/peerId";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import { Seats } from "../src/components/Seats";
import EventEmitter from "events";
import {
  Container,
} from "@material-ui/core";

export default function App({
  createLibp2p,
}) {
  const [peerId, setPeerId] = useState(null);
  const [libp2p, setLibp2p] = useState(null);
  const [started, setStarted] = useState(false);

  const eventBus = new EventEmitter();

  useEffect(() => {
    if (!peerId) {
      getOrCreatePeerId().then(setPeerId);
      return;
    }

    if (!libp2p) {
      (async () => {
        const node = await createLibp2p(peerId);
        setLibp2p(node);
        setStarted(true);
      })();
    }
  }, [peerId, libp2p, createLibp2p]);

  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography>
            PeerId: {peerId ? peerId._idB58String : "Not generated peerId"}
          </Typography>
        </Toolbar>
      </AppBar>
      <Container fixed>
        <Seats libp2p={libp2p} eventBus={eventBus} peerIdNum={peerId ? peerId._idB58String : "Not generated peerId"} />
      </Container>
    </div>
  );
}
