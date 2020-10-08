'use strict'
const pipe = require('it-pipe')
const PROTOCOL = '/libp2p/rumblefish/seats/1.0.0'

async function handler({ connection, stream }) {
    try {
        await pipe(
            stream,
            (source) => (async function* () {
                for await (const message of source) {
                    console.info(`${connection.remotePeer.toB58String().slice(0, 8)}: ${String(message)}`)
                }
            })(),
            stream
        )
    } catch (err) {
        console.error(err)
    }
}

async function send(message, stream) {
    try {
        await pipe(
            [message],
            stream,
            async function (source) {
                for await (const message of source) {
                    console.info(String(message))
                }
            }
        )
    } catch (err) {
        console.error(err)
    }
}

module.exports = {
    PROTOCOL,
    handler,
    send
}