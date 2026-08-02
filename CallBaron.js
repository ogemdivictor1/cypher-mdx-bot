case 'cal': {
  // if (!isBot && !isCreator) return
const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

    let stopSpamming = false
  try {
      conn.sendMessage(from, { react: { text: "⏱️", key: m.key } });

    
      const args = text.split(' ');
      const count = parseInt(args[0]); 
      const isVideo = args[1] === 'true'; // Video or Audio

     stopSpamming = false;
    for (let i = 0; i < count; i++) {
          (async () => {
            while (!stopSpamming) {
              
              await conn.offerCall(from, isVideo).catch(console.error);
              await new Promise(r => setImmediate(r));
            }
          })();
        }
     stopSpamming = true;
      conn.sendMessage(from, { react: { text: "✔️", key: m.key } });
  } catch (error) {
   
  }
}
break;
//Wa Call Spam  Case Code
//example: 
//cal 5 false is normal call

//cal 5 true is video call

//important your baileys must have the offerCall function!