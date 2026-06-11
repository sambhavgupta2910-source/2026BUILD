'use strict';

const PILLARS = {
  'real-estate': {
    keywords: ['real estate', 'property', 'dubai', 'cap rate', 'developer', 'hnwi',
               'investor', 'rental', 'dld', 'rera', 'apartment', 'villa', 'residential',
               'commercial', 'yield', 'off-plan', 'prime', 'luxury home', 'penthouse',
               'transaction', 'sq ft', 'price per'],
    hashtags: ['dubaiinvestment', 'realestateinvestor', 'dubaimarket', 'propertyvaluation',
               'wealthadvisory', 'investorintelligence', 'dubaieconomics', 'hnwiinvestor',
               'luxuryproperty', 'dubaireal'],
    imagePrompt: 'Aerial drone photography of Dubai skyline at golden hour, luxury skyscrapers, ' +
                 'clean architectural lines, warm amber light, ultra realistic, no text, no watermark, ' +
                 'professional commercial photography, 4K'
  },
  'trading': {
    keywords: ['gold', 'oil', 'trading', 'market', 'fed', 'macro', 'inflation',
               'geopolitical', 'silver', 'equities', 'commodity', 'price', 'supply',
               'demand', 'brent', 'wti', 'interest rate', 'central bank', 'dollar'],
    hashtags: ['trading', 'marketanalysis', 'goldprices', 'oilmarkets', 'macroeconomics',
               'investingstrategy', 'financialmarkets', 'geopoliticalrisk', 'commoditytrading',
               'wealthmanagement'],
    imagePrompt: 'Abstract financial data visualization with glowing gold lines on dark background, ' +
                 'elegant minimalist composition, no text, no watermark, premium financial aesthetic, ' +
                 'professional studio photography'
  },
  'founder': {
    keywords: ['founder', 'business lesson', 'team', 'hire', 'negotiation', 'relationship',
               'sales', 'client', 'partnership', 'build', 'startup', 'entrepreneur',
               'leadership', 'mistake', 'learned', 'growth', 'decision'],
    hashtags: ['founders', 'entrepreneurship', 'businessstrategy', 'startuplife',
               'businessdevelopment', 'leadership', 'founderjourney', 'salesstrategy',
               'growthmindset', 'buildingabusiness'],
    imagePrompt: 'Clean minimalist Dubai office workspace with laptop and notebook on white desk, ' +
                 'natural morning light through floor-to-ceiling windows, premium aesthetic, ' +
                 'no text, no watermark, professional lifestyle photography'
  },
  'aviation': {
    keywords: ['aviation', 'aircraft', 'engine', 'mro', 'spare parts', 'propeller',
               'overhaul', 'supplier', 'fleet', 'maintenance', 'apu', 'airframe',
               'turbine', 'hangar', 'arrow aviation', 'aerospace'],
    hashtags: ['aviation', 'aircraftmaintenance', 'mro', 'aviationindustry', 'spareparts',
               'aerospaceindustry', 'aviationbusiness', 'aircraftparts', 'aviationsupplychain',
               'aviationprofessional'],
    imagePrompt: 'Close-up of commercial aircraft jet engine turbine blades, MRO hangar background, ' +
                 'dramatic industrial lighting, deep focus, no text, no watermark, ' +
                 'professional aviation photography'
  },
  'ai': {
    keywords: ['ai', 'artificial intelligence', 'claude', 'automation', 'workflow',
               'notion', 'llm', 'gpt', 'machine learning', 'productivity', 'system',
               'content engine', 'jarvis', 'prism', 'digital brain', 'tool'],
    hashtags: ['artificialintelligence', 'aitools', 'automation', 'productivity',
               'claudeai', 'aiworkflow', 'futureofwork', 'techfounder',
               'aiinbusiness', 'buildwithAI'],
    imagePrompt: 'Abstract neural network with glowing blue electric nodes on dark background, ' +
                 'geometric connection patterns, clean tech aesthetic, no text, no watermark, ' +
                 'digital art, high detail'
  }
};

const UNIVERSAL_HASHTAGS = [
  'dubai', 'business', 'entrepreneurship', 'insights', 'strategy',
  'analysis', 'marketintel', 'thoughtleadership', 'professionaladvice', 'executivelevel'
];

function detectPillar(topic) {
  const lower = topic.toLowerCase();
  let best = { pillar: 'founder', score: 0 };
  for (const [pillar, config] of Object.entries(PILLARS)) {
    const score = config.keywords.filter(kw => lower.includes(kw)).length;
    if (score > best.score) best = { pillar, score };
  }
  return best.pillar;
}

function hashtagsFor(pillar) {
  return [...PILLARS[pillar].hashtags, ...UNIVERSAL_HASHTAGS];
}

module.exports = { PILLARS, UNIVERSAL_HASHTAGS, detectPillar, hashtagsFor };
