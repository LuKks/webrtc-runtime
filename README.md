# webrtc-runtime

WebRTC for Node.js, React Native and browser.

[![npm](https://img.shields.io/npm/v/webrtc-runtime.svg)](https://www.npmjs.com/package/webrtc-runtime)
[![downloads](https://img.shields.io/npm/dt/webrtc-runtime.svg)](https://www.npmjs.com/package/webrtc-runtime)
[![license](https://img.shields.io/github/license/LuKks/webrtc-runtime.svg)](https://github.com/LuKks/webrtc-runtime/blob/main/LICENSE)
[![CI](https://github.com/LuKks/webrtc-runtime/actions/workflows/test-node.yml/badge.svg?branch=main)](https://github.com/LuKks/webrtc-runtime/actions/workflows/test-node.yml)

```
npm i webrtc-runtime
```

- **Direct connections.** ICE uses STUN for NAT traversal, with TURN relay fallback.
- **Low latency.** Real-time audio, video and data, with adaptive bitrate.
- **Network resilience.** Handles packet loss, jitter and network changes.
- **Secure by default.** DTLS-SRTP encrypts media, while DTLS protects data channels.
- **Data channels.** SCTP supports ordered or unordered, reliable or unreliable delivery.
- **Open ecosystem.** Built on W3C and IETF specs, with interoperable implementations.
- **One API everywhere.** `RTCPeerConnection` across browsers, Node.js and React Native.

Questions or ideas? Open a GitHub issue :)

## Usage

```js
const { RTCPeerConnection } = require('webrtc-runtime')

const a = new RTCPeerConnection()
const b = new RTCPeerConnection()

const signalingA = perfectNegotiation(a, true, signal => signalingB(signal))
const signalingB = perfectNegotiation(b, false, signal => signalingA(signal))

a.ondatachannel = e => {
  e.channel.onmessage = msg => {
    console.log('A:', msg.data)

    e.channel.send('Hello from A')
  }
}

const channel = b.createDataChannel('test')

channel.onopen = () => channel.send('Hello from B')
channel.onmessage = e => console.log('B received:', e.data)
```

Modern WebRTC perfect negotiation (2020+):

- Automatic offer/answer via `setLocalDescription()` without arguments (M80+).
- Implicit rollback on colliding offers via `setRemoteDescription()` (M80+).
- Reliable `negotiationneeded` and glare handling (M87+).

https://w3c.github.io/webrtc-pc/#perfect-negotiation-example

<details>
<summary>Click to see a perfect negotiation example</summary>

```js
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
```
</details>

## Signaling

Complete solution with perfect negotiation and signaling built-in:

https://github.com/lukks/like-webrtc (uses `webrtc-runtime` internally)

## Versions

Other `wrtc` packages are outdated using M81 or M106.

We use recent WebRTC builds:

- Node.js with `@lukks/wrtc` uses M154.
- React Native with `react-native-webrtc` uses M155.
- Browsers and WebViews use ~M150–M157 (Nov 2026).

## License

MIT. Copyright (c) Lucas Barrena
