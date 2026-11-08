const test = require('get-npm-global')('brittle')
const { RTCPeerConnection } = require('./node.js')

test('basic', async function (t) {
  const a = new RTCPeerConnection()
  const b = new RTCPeerConnection()

  const channel = a.createDataChannel('test')

  channel.onopen = () => channel.send('Hello from A')

  b.ondatachannel = e => {
    e.channel.onmessage = msg => {
      t.is(msg.data, 'Hello from A')
      e.channel.send('Hello from B')
    }
  }

  const reply = new Promise(resolve => {
    channel.onmessage = e => resolve(e.data)
  })

  a.onicecandidate = e => e.candidate && b.addIceCandidate(e.candidate)
  b.onicecandidate = e => e.candidate && a.addIceCandidate(e.candidate)

  await a.setLocalDescription(await a.createOffer())
  await b.setRemoteDescription(a.localDescription)

  await b.setLocalDescription(await b.createAnswer())
  await a.setRemoteDescription(b.localDescription)

  t.is(await reply, 'Hello from B')

  a.close()
  b.close()
})

test('basic automatic negotiation', async function (t) {
  const a = new RTCPeerConnection()
  const b = new RTCPeerConnection()

  const signalingA = perfectNegotiation(a, true, signal => signalingB(signal))
  const signalingB = perfectNegotiation(b, false, signal => signalingA(signal))

  a.ondatachannel = e => {
    e.channel.onmessage = msg => {
      t.is(msg.data, 'Hello from B')
      e.channel.send('Hello from A')
    }
  }

  const channel = b.createDataChannel('test')

  channel.onopen = () => channel.send('Hello from B')

  const reply = new Promise(resolve => {
    channel.onmessage = e => resolve(e.data)
  })

  t.is(await reply, 'Hello from A')

  a.close()
  b.close()
})

function perfectNegotiation (pc, polite, send) {
  let makingOffer = false
  let ignoreOffer = false
  let settingAnswer = false

  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true
      await pc.setLocalDescription()
      send({ description: pc.localDescription })
    } catch (e) {
      console.error(e)
    } finally {
      makingOffer = false
    }
  }

  pc.onicecandidate = ({ candidate }) => {
    send({ candidate })
  }

  async function receive ({ description, candidate }) {
    try {
      if (description) {
        const readyForOffer = !makingOffer && (pc.signalingState === 'stable' || settingAnswer)
        const collision = description.type === 'offer' && !readyForOffer

        ignoreOffer = !polite && collision
        if (ignoreOffer) return

        try {
          settingAnswer = description.type === 'answer'
          await pc.setRemoteDescription(description)
        } finally {
          settingAnswer = false
        }

        if (description.type === 'offer') {
          await pc.setLocalDescription()
          send({ description: pc.localDescription })
        }
      } else if (candidate) {
        try {
          await pc.addIceCandidate(candidate)
        } catch (e) {
          if (!ignoreOffer) throw e
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  return receive
}
