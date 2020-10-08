import React, { useState, useEffect } from "react";

import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import PubSubSeat from '../utils/seats';
import isEmpty from 'lodash/isEmpty';

const useStyles = makeStyles({
  root: {
    minWidth: 275,
  },
  rowWithCards: {
    marginTop: '250px',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  card: {
    minHeight: '160px',
    minWidth: '350px',
    maxWidth: '350px',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    justifyContent: 'center',
    alignItems: 'center',
    wordBreak: 'break-all'
  }
});

export const Seats = ({ libp2p, eventBus }) => {
  const classes = useStyles();
  const [peers, setPeers] = useState({});
  const [message, setMessage] = useState({})
  const [seatClient, setSeatClient] = useState(null);
  const [firstSeatOcup, setFirstSeatOcup] = useState({});
  const [secondSeatOcup, setSecondSeatOcup] = useState({});

  useEffect(() => {
    if (!libp2p) return
    if (!seatClient) {
      const pubsubSeat = new PubSubSeat(libp2p, PubSubSeat.TOPIC);
      pubsubSeat.on('message', (message) => {
        message.data = JSON.parse(message.data);

        if (message.from === libp2p.peerId.toB58String()) {
          message.isMine = true;
        }

        message.data.seat_id === 1
          ? message.data.isTaken ? setFirstSeatOcup(message) : setFirstSeatOcup({})
          : message.data.isTaken ? setSecondSeatOcup(message) : setSecondSeatOcup({});
      });

      pubsubSeat.on('peer:update', ({ id, name }) => {
        setPeers((peers) => {
          const newPeers = { ...peers }
          newPeers[id] = { name }
          return newPeers
        })
      });
      pubsubSeat.on('stats', (stats) => eventBus.emit('stats', stats))
      setSeatClient(pubsubSeat);
    }
  }, [libp2p, seatClient, eventBus]);

  const handleSeatClick = async (seat_id) => {
    const messageObject = buildObject(seat_id);
    setMessage(messageObject);

    if (!message) return;
    if (seatClient.checkCommand(message)) return;

    try {
      await seatClient.send(messageObject);
    } catch (err) {
      console.error("Could not send message", err);
    }
  }

  const buildObject = (seat_id) => {
    return (isEmpty(firstSeatOcup) && seat_id === 1) || (isEmpty(secondSeatOcup) && seat_id === 2)
      ? JSON.stringify({ peer_id: libp2p.peerId.toB58String(), seat_id: seat_id, isTaken: true })
      : JSON.stringify({ peer_id: libp2p.peerId.toB58String(), seat_id: seat_id, isTaken: false })
  }

  return (
    <div className={classes.rowWithCards}>
      <Card className={classes.card}>
        <CardContent>
          {firstSeatOcup.isMine ? firstSeatOcup.from + ' (you)' : firstSeatOcup.from}
        </CardContent>
        <CardActions>
          <Button disabled={firstSeatOcup.data && !firstSeatOcup.isMine}
            onClick={() => handleSeatClick(1)} size="small" variant="contained" color="primary">
            {isEmpty(firstSeatOcup) || !firstSeatOcup.isMine ? 'Take the seat' : 'Release'}
          </Button>
        </CardActions>
      </Card>
      <Card className={classes.card}>
        <CardContent>
          {secondSeatOcup.isMine ? secondSeatOcup.from + ' (you)' : secondSeatOcup.from}
        </CardContent>
        <CardActions >
          <Button disabled={secondSeatOcup.data && !secondSeatOcup.isMine}
            onClick={() => handleSeatClick(2)} size="small" variant="contained" color="primary">
            {isEmpty(secondSeatOcup) || !secondSeatOcup.isMine ? 'Take the seat' : 'Release'}
          </Button>
        </CardActions>
      </Card>
    </div>
  );
};
