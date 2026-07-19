import { prisma } from '../prisma';
import { suggestCategoryML, trainCategoryML } from './auto-categorize-ml';

const MERCHANT_CATEGORY_MAP: Record<string, string[]> = {
  'Food & Drink': [
    // US chains
    'starbucks', 'chipotle', "domino's", 'subway', "mcdonald's", 'panera', 'whole foods',
    "trader joe's", 'kroger', 'costco', 'walmart', 'chick-fil-a', 'wendys', 'burger king',
    'taco bell', 'panda express', 'five guys', 'shake shack', 'in-n-out', 'sweetgreen',
    'dunkin', 'dutch bros', 'papa johns', 'little caesars', 'wingstop', 'zaxbys',
    'crumbl', 'insomnia cookies', 'baskin robbins', 'dairy queen', 'sonic',
    // German grocery
    'rewe', 'lidl', 'aldi', 'edeka', 'netto', 'penny', 'real', 'kaufland', 'norma',
    'aldi nord', 'aldi sud', 'famila', 'tegut', 'bio company', 'dm drogerie',
    'rossmann', 'müller drogerie', 'drogerie', 'apotheken umschau',
    // Food terms (EN)
    'restaurant', 'cafe', 'coffee', 'coffee shop', 'pizza', 'sushi', 'diner', 'bakery',
    'deli', 'grill', 'bar', 'pub', 'tavern', 'bistro', 'brasserie', 'steakhouse',
    'buffet', 'food court', 'takeout', 'take out', 'delivery', 'catering',
    'food truck', 'street food', 'market', 'grocery', 'supermarket', 'convenience store',
    // Food terms (DE)
    'imbiss', 'bäckerei', 'metzgerei', 'lebensmittel', 'einkauf', 'markt', 'laden',
    'gasthaus', 'wirtshaus', 'gaststätte', 'schanze', 'kneipe', 'bar', 'café',
    'eiscafé', 'pizzeria', 'döner', 'kebab', 'sushi', 'ramen', 'noodle',
    'lecrobag', 'taj mahal', 'schloss', 'lieferando', 'wolt', 'hellofresh',
    'marley spoon', 'farmy', 'flaschenpost', 'getränkemarkt', 'wein',
    // Specific food merchants (DE)
    'edeka24', 'bio company', 'vollcorner', 'markthalle', 'wochenmarkt',
  ],
  Shopping: [
    // US retail
    'amazon', 'target', 'best buy', 'nike', 'h&m', 'ikea', 'home depot', 'ebay', 'etsy',
    'walmart', 'costco', 'sam\'s club', 'macys', 'nordstrom', 'tj maxx', 'ross stores',
    'marshalls', 'homegoods', 'burlington', 'old navy', 'gap', 'banana republic',
    'zara', 'uniqlo', 'forever 21', 'anthropologie', 'urban outfitters', 'free people',
    'lululemon', 'patagonia', 'north face', 'columbia', 'adidas', 'puma', 'new balance',
    'foot locker', 'finish line', 'dsw', 'zappos', 'apple store', 'microsoft store',
    'bestbuy', 'micro center', 'newegg', 'b&h photo', 'adorama',
    'wayfair', 'overstock', 'crate and barrel', 'west elm', 'pottery barn',
    'restoration hardware', 'cb2', 'west elm', 'container store', 'organize',
    // German retail
    'otto', 'zalando', 'saturn', 'media markt', 'conrad', 'thalia', 'decathlon',
    'primark', 'c&a', 'pepco', 'action', 'tedi', 'kiK', 'globus', 'breuninger',
    'galeria', 'kaufhof', 'karstadt', 'hagebau', 'hornbach', 'bauhaus', 'obi',
    'toom', 'baumarkt', 'lidl express', 'dm', 'müller drogerie', 'rossmann',
    'notebooksbilliger', 'cyberport', 'alternate', 'mindfactory', 'csv',
    'about you', 'bonprix', 'linga dore', 'shein', 'temu', 'aliexpress', 'wish',
    // Shopping terms (EN)
    'clothing', 'electronics', 'furniture', 'home goods', 'appliance', 'hardware',
    'bookstore', 'toy store', 'pet store', 'garden center', 'florist',
    'mall', 'outlet', 'department store', 'discount store', 'dollar store',
    // Shopping terms (DE)
    'bekleidung', 'elektronik', 'möbel', 'haushalt', 'geräte', 'baumarkt',
    'buchhandlung', 'spielzeug', 'tierbedarf', 'garten', 'blumen',
    'geschäft', 'laden', 'einkaufszentrum', 'factory outlet',
  ],
  Transport: [
    // Rideshare / taxi
    'uber', 'lyft', 'via', 'gett', 'free now', 'bolt', 'cabify', 'mytaxi',
    // Gas / fuel (EN)
    'shell', 'exxon', 'chevron', 'bp', 'sunoco', 'marathon', 'valero', 'citgo',
    'sinclair', 'ircle k', 'speedway', 'casey\'s', 'quik trip', 'wa wa', 'sheetz',
    // Gas / fuel (DE)
    'tankstelle', 'aral', 'total', 'esso', 'avia', 'jet', 'shell', 'esso',
    'tanken', 'benzin', 'diesel', 'autobahn', 'maut', 'ladestation', 'ladesäule',
    // Public transit (EN)
    'transit', 'metro', 'subway', 'bus', 'train', 'rail', 'commuter', 'ferry',
    'amtrak', 'greyhound', 'megabus', 'flixbus', 'bolt bus', 'vamoo',
    // Public transit (DE)
    'deutsche bahn', 'db bahn', 'db vertrieb', 'db netz', 'bahn.de',
    'hvv', 'bvg', 'vgn', 'mvv', 'swv', 'vrs', 'rmv', 'nvv', 'mvs', 'bodo',
    's bahn', 'u bahn', 'sbahn', 'ubahn', 'tram', 'strab', 'bus',
    'schwarzbus', 'flixbus', 'flink', 'tier', 'lime', 'nextbike', 'call a bike',
    // Parking
    'parkhaus', 'parkplatz', 'parken', 'parking', 'garage', 'parkme', 'easy park',
    // Transport terms
    'mietwagen', 'car rental', 'rent a car', 'hertz', 'avis', 'enterprise',
    'budget', 'sixt', ' Europcar', 'auto', 'fahrzeug', 'kilometer',
  ],
  'Bills & Utilities': [
    // Telecom (EN)
    'verizon', 'at&t', 't-mobile', 'sprint', 'comcast', 'xfinity', 'spectrum',
    'cox', ' frontier', 'centurylink', 'windstream', 'google fiber',
    // Telecom (DE)
    'vodafone', 'o2', 'telekom', 'congstar', 'simyo', 'simplytel', 'winsim',
    'freenet', 'klarmobil', 'premiumsim', 'smartmobile', 'aldi talk', 'lebara',
    'lycamobile', 'handy', 'mobilfunk', 'telefon', 'festnetz',
    // Energy / utilities (EN)
    'duke energy', 'pg&e', 'pge', 'con ed', 'dominion', 'southern company',
    'exelon', 'next era', 'american electric', 'entergy', 'xcel energy',
    'water', 'electric', 'utility', 'power', 'gas company', 'sewer',
    // Energy / utilities (DE)
    'e.on', 'rwe', 'eni', 'energie', 'strom', 'wasser', 'gas',
    'müll', 'abfall', 'entsorgung', 'stadtwerk', 'werke', 'netz',
    'grundgebühr', 'gebühr', 'pauschale',
    // Insurance (EN) — non-health
    'allstate', 'state farm', 'geico', 'progressive', 'liberty mutual',
    'farmers', 'nationwide', 'usaa', 'travelers', 'american family',
    'home insurance', 'auto insurance', 'car insurance', 'life insurance',
    'disability insurance', 'umbrella insurance', 'renters insurance',
    'liability insurance', 'property insurance', 'insurance payment',
    // Insurance (DE) — non-health
    'versicherung', 'allianz', 'huk', 'huk24', 'axa', 'ergo', 'debeka',
    'gothaer', 'hdi', 'zurich', 'swiss life', 'munich re',
    'haftpflicht', 'kfz versicherung', 'wohngebäude', 'hausrat',
    'rechtsschutz', 'risikolebensversicherung', 'berufsunfähigkeit',
    'krankenversicherung', 'private krankenversicherung', 'zusatzversicherung',
    'unfallversicherung', 'tierhalterhaftpflicht', 'hundehaftpflicht',
    // Bills general (EN)
    'bill', 'invoice', 'payment', 'renewal', 'subscription', 'monthly',
    'quarterly', 'annual', 'due', 'balance',
    // Bills general (DE)
    'rechnung', 'zahlung', 'monatlich', 'vierteljährlich', 'jährlich', 'fällig',
    'ratenzahlung', 'rate', 'darlehen', 'kredit',
    // Specific
    'ottomed', 'otto med', 'sky', 'dazn', 'rtl+',
  ],
  Entertainment: [
    // Streaming (EN)
    'netflix', 'spotify', 'hulu', 'disney+', 'disney plus', 'hbo', 'hbo max',
    'peacock', 'paramount+', 'paramount plus', 'apple tv', 'amazon prime',
    'youtube premium', 'youtube music', 'tidal', 'deezer', 'pandora',
    'crunchyroll', 'funimation', 'mubi', 'kanopy', 'shudder',
    // Streaming (DE)
    'ard mediathek', 'zdf mediathek', 'joyn', 'joyn plus', 'wow', 'sky ticket',
    'rtl+', 'rtl plus', 'sat1', 'prosieben', 'tvnow', 'disney+',
    'amazon prime video', 'Paramount+',
    // Gaming
    'steam', 'epic games', 'gog', 'playstation', 'psn', 'xbox', 'nintendo',
    'ea games', 'ubisoft', 'blizzard', 'riot games', 'twitch',
    'game', 'gaming', 'esports',
    // Music / events (EN)
    'apple music', 'bandcamp', 'soundcloud', 'audible', 'audiobook',
    'ticketmaster', 'stubhub', 'vivid seats', 'seatgeek',
    'cinema', 'movie', 'theater', 'theatre', 'concert', 'venue',
    'amc', 'regal', 'cinemark', 'fandango',
    // Music / events (DE)
    'eventim', 'ticketmaster', 'kino', 'cinema', 'filmtheater',
    '.oper', 'theater', 'konzert', 'venue', 'konzertkasse',
    ' reservix', 'getgo', 'cinemaxx', 'ucI', 'kinopolis',
    // Hobby / leisure
    'gym', 'fitness', 'yoga', 'pilates', 'crossfit', 'sport', 'club',
    'membership', 'pool', 'swim', 'tennis', 'golf', 'climbing',
    'fitnessstudio', 'sportstudio', 'schwimmbad', 'sauna', 'wellness',
  ],
  Healthcare: [
    // US providers
    'cvs', 'walgreens', 'rite aid', 'kaiser', 'united health', 'aetna',
    'cigna', 'humana', 'blue cross', 'blue shield', 'anthem',
    // Healthcare terms (EN)
    'doctor', 'dentist', 'hospital', 'clinic', 'pharmacy', 'medical',
    'health', 'urgent care', 'dental', 'vision', 'optometrist',
    'ophthalmologist', 'dermatologist', 'cardiologist', 'orthopedic',
    'physical therapy', 'mental health', 'therapy', 'psychologist',
    'psychiatrist', 'counseling', 'chiropractor', 'acupuncture',
    'lab work', 'blood work', 'imaging', 'mri', 'x-ray', 'surgery',
    'prescription', 'medication', 'drug', 'pharmaceutical',
    'health insurance', 'medical bill', 'copay', 'deductible',
    // German health insurance companies
    'barmer', 'aok', 'techniker', 'dak', 'krankenkasse', 'gkv',
    ' TK', 'knappschaft', 'ikk', 'barmenia', 'ottonova', 'feather',
    'forward', 'fluidly', 'mercator', 'hanseatic', 'dfv',
    // German healthcare terms
    'apotheke', 'arzt', 'praxis', 'krankenhaus', 'klinik',
    'zahnarzt', 'zahnpraxis', 'kieferorthopäde', 'augenarzt',
    'hautarzt', 'internist', 'kardiologe', 'orthopäde',
    'physiotherapie', 'psychotherapeut', 'psychiater', 'heilpraktiker',
    'krankenversicherung', 'krankenvers', 'krankenkasse',
    'krankenhaus', 'gesundheit', 'behandlung', 'untersuchung',
    'rezept', 'medikament', 'arzneimittel', 'rezeptgebühr',
    'zuzahlung', 'krankmeldung', 'krankenkassenkarte',
    // Specific
    'zahntechnik', 'prothese', 'brille', ' kontaktlinsen',
    'blutabnahme', 'labor', 'laboratory', 'impfung', 'vaccination',
  ],
  Education: [
    // Platforms (EN)
    'coursera', 'udemy', 'edx', 'skillshare', 'masterclass', 'pluralsight',
    'linkedin learning', 'treehouse', 'codecademy', 'freecodecamp',
    'khan academy', 'brilliant', 'duolingo', 'babbel',
    // Institutions (EN)
    'university', 'college', 'school', 'tuition', 'student loan',
    'fafsa', 'scholarship', 'semester', 'enrollment', 'registration',
    // German education
    'bildung', 'schule', 'universität', 'hochschule', 'lehrgang', 'seminar',
    'fernuni', 'fernstudium', 'weiterbildung', 'fortbildung', 'kurs',
    'volkshochschule', 'akademie', 'institut', 'stiftung',
    'studiengebühr', 'semesterbeitrag', 'werkstudent', 'praktikum',
    'bafög', 'stipendium', 'dienstleistung',
    // Books / supplies
    'bookstore', 'textbook', 'notebook', 'laptop', 'ipad',
    'buchhandlung', 'bücher', 'lehrbuch', 'skript',
  ],
  Housing: [
    // German rent
    'miete', 'wohnung', 'mietzahlung', 'nebenkosten', 'warmmiete', 'kaltmiete',
    'mietvertrag', 'mietpreis', 'mietwohnung', 'mietobjekt',
    'hauseigentum', 'eigentumswohnung', 'einfamilienhaus', 'reihenhaus',
    'renovierung', 'sanierung', 'handwerker', 'meister', 'monteur',
    'gaub', 'elektriker', 'schlosser', 'tischler', 'zimmermann',
    'parkett', 'boden', 'fliese', 'bad', 'küche', 'dach',
    'grundbuch', 'notar', 'immobilie', 'immobilien',
    // English rent
    'rent', 'rental', 'lease', 'tenant', 'landlord',
    'rent payment', 'paying rent', 'monthly rent', 'apartment',
    'mortgage', 'property tax', 'hoa', 'homeowner',
    'plumber', 'electrician', 'contractor', 'carpenter',
    'renovation', 'repair', 'maintenance', 'appliance',
    'real estate', 'property management',
    // Specific
    'mieter', 'vermieter', 'wohnungsgeber', 'hausverwaltung',
    'immobilienscout', 'immonet', 'kleinanzeigen',
  ],
  Income: [
    // English
    'salary', 'wage', 'paycheck', 'bonus', 'commission', 'tip', 'tips',
    'freelance', 'contract', 'consulting', 'dividend', 'interest',
    'refund', 'cashback', 'rebate', 'reimbursement', 'stipend',
    'pension', 'social security', 'unemployment', 'disability',
    'gift', 'inheritance', 'lottery', 'prize',
    // German
    'gehalt', 'lohn', 'gehälter', 'einnahme', 'gutschrift', 'überweisung',
    'rückerstattung', 'kindergeld', 'steuererstattung', 'zinsen', 'dividende',
    'lohngehalt', 'personio', 'payroll', 'abrechnung',
    'nettogehalt', 'bruttogehalt', 'monatsgehalt', 'jahresgehalt',
    'tantieme', 'provision', 'honorar', 'honorarnote',
    'rente', 'pension', 'bürgergeld', 'alg', 'alg ii',
    'kindergeld', 'elterngeld', 'unterhalt', 'stipendium',
    'zinsgutschrift', 'kapitalertrag', 'gewinn',
    // Specific employers
    'sentics', 'sentics gmbh',
  ],
};

async function getCategoryIdByName(userId: string, name: string): Promise<string | null> {
  const cat = await prisma.category.findFirst({
    where: { userId, name },
    select: { id: true },
  });
  return cat?.id || null;
}

async function suggestCategory(userId: string, merchant: string, description: string): Promise<{ categoryId: string | null; categoryName: string | null } | null> {
  const merchantLower = merchant.toLowerCase().trim();
  const text = `${merchant} ${description}`.toLowerCase().trim();
  if (!text) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    for (const keyword of keywords) {
      let matched = false;
      if (keyword.includes(' ')) {
        matched = text.includes(keyword);
      } else {
        matched = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);
      }
      if (matched) {
        const score = keyword.length + (merchantLower.includes(keyword) ? 10 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }
    }
  }

  if (bestMatch) {
    const categoryId = await getCategoryIdByName(userId, bestMatch);
    return { categoryId, categoryName: bestMatch };
  }

  return null;
}

async function suggestCategoryByRule(
  userId: string, merchant: string, description: string,
): Promise<{ categoryId: string | null; categoryName: string | null } | null> {
  const rules = await prisma.categorizationRule.findMany({
    where: { userId, isActive: true },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { priority: 'desc' },
  });

  const text = `${merchant} ${description}`.toLowerCase().trim();
  if (!text) return null;

  for (const rule of rules) {
    if (rule.merchantPattern && text.includes(rule.merchantPattern.toLowerCase())) {
      return { categoryId: rule.categoryId, categoryName: rule.category.name };
    }
    if (rule.descriptionPattern && text.includes(rule.descriptionPattern.toLowerCase())) {
      return { categoryId: rule.categoryId, categoryName: rule.category.name };
    }
  }

  return null;
}

export async function suggestCategoryWithML(
  userId: string,
  merchant: string,
  description: string,
): Promise<{ categoryId: string | null; categoryName: string | null; confidence?: number } | null> {
  const byRule = await suggestCategoryByRule(userId, merchant, description);
  if (byRule) return { ...byRule, confidence: 1.0 };

  const byKeyword = await suggestCategory(userId, merchant, description);
  if (byKeyword) return { ...byKeyword, confidence: 1.0 };

  const ml = await suggestCategoryML(merchant, description);
  if (ml && ml.categoryName && ml.confidence > 0) {
    const categoryId = await getCategoryIdByName(userId, ml.categoryName);
    return { categoryId, categoryName: ml.categoryName, confidence: ml.confidence };
  }

  return null;
}

export async function trainFromUserCorrection(
  merchant: string,
  description: string,
  categoryName: string,
): Promise<void> {
  await trainCategoryML(merchant, description, categoryName);
}
