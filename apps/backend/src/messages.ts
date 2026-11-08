export type Lang = 'en' | 'zu' | 'af';

export const languagePrompt =
  'Sawubona! Welcome to Qup 👋\n\n' +
  'Choose your language / Khetha ulimi / Kies jou taal:\n' +
  '1. English\n2. isiZulu\n3. Afrikaans';

type Msgs = {
  chooseClinic: string;
  consent: string;
  askName: string;
  askReason: string;
  invalid: string;
  noTicket: string;
  cancelled: string;
  error: string;
  ticket: (name: string, code: string, ahead: number, from: string, to: string) => string;
  status: (code: string, ahead: number, from: string, to: string) => string;
  called: (name: string, code: string) => string;
  soon: (name: string, code: string, ahead: number) => string;
};

const M: Record<Lang, Msgs> = {
  en: {
    chooseClinic: 'Which clinic are you visiting?',
    consent: 'By continuing you agree that we use your name and phone number only for your queue.',
    askName: 'What is your name?',
    askReason: 'Reason for your visit?\n1. General\n2. Chronic\n3. Baby',
    invalid: 'Sorry, please reply with one of the numbers shown.',
    noTicket: "You don't have an active ticket. Send HI to join the queue.",
    cancelled: 'Your ticket has been cancelled. Send HI to join again.',
    error: 'Sorry, something went wrong. Please try again.',
    ticket: (name, code, ahead, from, to) =>
      `✅ You're in the queue, ${name}\nTicket: ${code}\nAhead of you: ${ahead}\nEstimated time: ${from} to ${to}\n\nReply STATUS to check your place or CANCEL to leave the queue.`,
    status: (code, ahead, from, to) =>
      `Ticket ${code}: ${ahead} ahead of you. Estimated time: ${from} to ${to}.`,
    called: (name, code) =>
      `🔔 ${name}, it's your turn! Ticket ${code}. Please go to reception now.`,
    soon: (name, code, ahead) =>
      ahead === 0
        ? `⏳ ${name}, you're next! Please be at the clinic now. Ticket ${code}.`
        : `⏳ ${name}, only ${ahead} ahead of you. Please head to the clinic now. Ticket ${code}.`,
  },
  zu: {
    chooseClinic: 'Ufuna ukuya kuyiphi ikliniki?',
    consent: 'Uma uqhubeka, uyavuma ukuthi sisebenzisa igama lakho nenombolo yocingo kuphela emgqeni wakho.',
    askName: 'Ubani igama lakho?',
    askReason: 'Isizathu sokuvakasha:\n1. Jikelele\n2. Isifo eside\n3. Ingane',
    invalid: 'Uxolo, sicela uphendule ngenombolo eyodwa evela ohlwini.',
    noTicket: 'Awunalo ithikithi elisebenzayo. Bhala HI ukujoyina.',
    cancelled: 'Ithikithi lakho likhanseliwe. Bhala HI ukujoyina futhi.',
    error: 'Uxolo, kuvele inkinga. Sicela uzame futhi.',
    ticket: (name, code, ahead, from, to) =>
      `✅ Ungene emgqeni, ${name}\nIthikithi: ${code}\nAbakwandulele: ${ahead}\nIkhathi elilinganiselwe: ${from} kuya ku-${to}\n\nBhala STATUS ukubona indawo yakho noma CANCEL ukuphuma emgqeni.`,
    status: (code, ahead, from, to) =>
      `Ithikithi ${code}: abakwandulele ${ahead}. Ikhathi elilinganiselwe: ${from} kuya ku-${to}.`,
    called: (name, code) =>
      `🔔 ${name}, isikhathi sakho sesifikile! Ithikithi ${code}. Sicela uye endaweni yokwamukela izivakashi manje.`,
    soon: (name, code, ahead) =>
      ahead === 0
        ? `⏳ Sawubona ${name}, ungowokulandelayo! Sicela ube sekliniki manje. Ithikithi ${code}.`
        : `⏳ Sawubona ${name}, abakwandulele ${ahead} kuphela. Sicela uye ekliniki manje. Ithikithi ${code}.`,
  },
  af: {
    chooseClinic: 'By watter kliniek is jy?',
    consent: 'Deur voort te gaan, stem jy in dat ons jou naam en foonnommer slegs vir jou tou gebruik.',
    askName: 'Wat is jou naam?',
    askReason: 'Rede vir jou besoek?\n1. Algemeen\n2. Chronies\n3. Baba',
    invalid: 'Jammer, antwoord asseblief met een van die nommers hierbo.',
    noTicket: "Jy het nie 'n aktiewe kaartjie nie. Stuur HI om aan te sluit.",
    cancelled: 'Jou kaartjie is gekanselleer. Stuur HI om weer aan te sluit.',
    error: 'Jammer, iets het skeefgeloop. Probeer asseblief weer.',
    ticket: (name, code, ahead, from, to) =>
      `✅ Jy is in die tou, ${name}\nKaartjie: ${code}\nVoor jou: ${ahead}\nGeskatte tyd: ${from} tot ${to}\n\nStuur STATUS om jou plek te sien of CANCEL om die tou te verlaat.`,
    status: (code, ahead, from, to) =>
      `Kaartjie ${code}: ${ahead} voor jou. Geskatte tyd: ${from} tot ${to}.`,
    called: (name, code) =>
      `🔔 ${name}, dit is jou beurt! Kaartjie ${code}. Gaan asseblief nou na ontvangs.`,
    soon: (name, code, ahead) =>
      ahead === 0
        ? `⏳ ${name}, jy is volgende! Gaan asseblief nou kliniek toe. Kaartjie ${code}.`
        : `⏳ ${name}, net ${ahead} voor jou. Gaan asseblief nou kliniek toe. Kaartjie ${code}.`,
  },
};

export const t = (lang: Lang) => M[lang];