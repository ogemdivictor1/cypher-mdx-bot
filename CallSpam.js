case 'call': {
  const [mobileNumber, spamCountStr] = args.join(" ").split(',').map(arg => arg.trim());
  const target1 = mobileNumber.replace(/[+\s()-]/g, '') + '@s.whatsapp.net';
  const spam1 = parseInt(spamCountStr);
  sock.sendMessage(from, { react: { text: "⏱️", key: m.key } });
  for (let i = 0; i < spam1; i++) {
    sock.offerCall(target1);
  }
  await delay(3000);
  sock.sendMessage(from, { react: { text: "✔️", key: m.key } });
}
break;
