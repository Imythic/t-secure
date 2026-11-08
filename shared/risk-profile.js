// Personal risk profile: what the customer tells us about themselves, used only to protect them.
// Every answer is optional and self-reported. The profile never lowers a warning, never raises
// one without quoted evidence, and only derived codes (level + focus areas) leave the browser.
import { analyzeConversation, riskScore } from './prediction.js';

export const RELATIONSHIP_STATUSES = [
  ['married', 'Married'], ['partnered', 'In a relationship'], ['single', 'Single'],
  ['widowed', 'Widowed'], ['divorced', 'Divorced or separated'], ['prefer-not', 'Prefer not to say'],
];
export const RISK_HISTORY = [
  ['gambling', 'Gambling or betting', 'Prize, lottery, and “sure win” offers are built to appeal to this.'],
  ['previous-scam', 'I have lost money to a scam before', 'People who were scammed are often targeted again by fake “recovery” services.'],
  ['financial-stress', 'Debt or money worries', 'Loan, grant, and debt-relief offers target people under financial pressure.'],
];
export const WELLBEING = [
  ['memory', 'Memory or thinking changes', 'For example, early dementia or mild cognitive impairment.'],
  ['mood', 'Anxiety, depression, or another mental health condition', 'Pressure and fear tactics can hit harder on difficult days.'],
  ['impulse', 'A condition that can make quick decisions harder to stop', 'For example, ADHD or bipolar disorder.'],
  ['other', 'Something else I’d like extra protection for', ''],
];
export const OCCUPATIONS = [
  ['retired', 'Retired'], ['employee', 'Employed'], ['business-owner', 'Business owner or self-employed'],
  ['executive', 'Manager or executive'], ['finance-admin', 'Finance, accounting, or office administration'],
  ['student', 'Student'], ['other', 'Something else'], ['prefer-not', 'Prefer not to say'],
];
export const PROTECTION_LEVELS = ['standard', 'heightened', 'maximum'];
export const PROTECTION_LABELS = {standard: 'Standard protection', heightened: 'Heightened protection', maximum: 'Maximum protection'};

export const FOCUS_AREAS = Object.freeze({
  romance: {label: 'Romance and companionship scams', why: 'Scammers build online relationships with people who are single, widowed, or divorced, then ask for money.'},
  family: {label: 'Grandparent and family emergency scams', why: 'Callers pretend to be a grandchild in trouble and ask for money urgently and secretly.'},
  prize: {label: 'Prizes, lotteries, and “sure win” offers', why: 'Offers of winnings or guaranteed returns are designed to appeal to people who gamble.'},
  recovery: {label: 'Fake money-recovery offers', why: 'After a scam, people are often contacted by “recovery agents” who charge a fee and disappear.'},
  debt: {label: 'Loan, grant, and debt-relief offers', why: 'Fake lenders and grant offers ask for an upfront “processing fee”.'},
  business: {label: 'Business pitches, invoices, and payment changes', why: 'Business people receive more pitches, invoices, and urgent payment requests, which social engineers imitate.'},
});

// Signals for each focus area. `strong` signals can raise a quiet conversation to elevated on their own;
// weak ones only strengthen a conversation that already shows another warning sign.
const FOCUS_SIGNALS = [
  ['romance', true, /\b(?:soul ?mate|i(?:’|')?ve fallen (?:in love )?(?:for|with) you|stuck (?:overseas|abroad)|plane ticket to (?:see|visit) you|customs fee|deployed overseas|oil rig)\b/i],
  ['romance', false, /\b(?:my (?:love|darling|dear|sweetheart)|we have never met|meet (?:you )?in person|lonely)\b/i],
  ['family', false, /\bgrand(?:son|daughter|ma|pa|mother|father|child)\b|\bnana\b|it(?:’|')?s me\b/i],
  ['prize', true, /you(?:’|')?ve won|you have won|\bjackpot\b|\blottery\b|\bsweepstakes\b|\bwinnings\b|double your money|guaranteed (?:returns?|profits?|wins?)|claim your (?:prize|reward)/i],
  ['prize', false, /\b(?:prize|winner|betting tip|casino bonus|sure bet)\b/i],
  ['recovery', true, /recover (?:your )?(?:lost |stolen )?(?:money|funds)|get your (?:money|funds) back|(?:asset|funds?) recovery|victims? compensation (?:fund|program)/i],
  ['debt', true, /debt (?:relief|forgiveness|consolidation)|pre-?approved (?:loan|for a loan)|government grant|student loan forgiveness/i],
  ['debt', false, /\bloan (?:approved|offer)|lower your (?:debt|interest rate)|processing fee\b/i],
  ['business', true, /(?:new|updated|changed) (?:bank(?:ing)? |payment |account |wire )(?:details|information|instructions)|gift cards? for (?:the )?(?:team|staff|clients|office)|confidential (?:deal|acquisition|transaction|matter)|the (?:CEO|director|boss|president|owner) (?:asked|needs|wants)/i],
  ['business', false, /\b(?:invoice|purchase order|vendor|wire transfer|investment opportunity|exclusive (?:deal|partnership)|business proposal)\b/i],
];
const PRESSURE = new Set(['fear', 'urgency', 'secrecy', 'isolation', 'verification', 'financial']);
const RANK = {low: 0, unknown: 0, caution: 1, high: 2};
const LEVELS = ['low', 'caution', 'high'];

const list = (value, allowed) => Array.isArray(value) ? [...new Set(value.filter((v) => allowed.some(([key]) => key === v)))] : [];
// Normalizes a stored or submitted profile to known values only.
export function cleanRiskProfile(raw = {}) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const pick = (value, allowed) => allowed.some(([key]) => key === value) ? value : null;
  return {
    relationshipStatus: pick(p.relationshipStatus, RELATIONSHIP_STATUSES),
    hasGrandchildren: p.hasGrandchildren === true,
    riskHistory: list(p.riskHistory, RISK_HISTORY),
    wellbeing: list(p.wellbeing, WELLBEING),
    occupation: pick(p.occupation, OCCUPATIONS),
    voiceBaseline: p.voiceBaseline || null,
    boostUntil: p.boostUntil || null,
  };
}

// Each focus area with the answer that caused it, so the customer can see why.
export function focusAreas(raw) {
  const p = cleanRiskProfile(raw);
  const areas = [];
  const add = (code, because) => { if (!areas.some((a) => a.code === code)) areas.push({code, ...FOCUS_AREAS[code], because}); };
  if (['single', 'widowed', 'divorced'].includes(p.relationshipStatus)) add('romance', 'You told us you are ' + RELATIONSHIP_STATUSES.find(([v]) => v === p.relationshipStatus)[1].toLowerCase() + '.');
  if (p.hasGrandchildren) add('family', 'You told us you have grandchildren.');
  if (p.riskHistory.includes('gambling')) add('prize', 'You told us about gambling or betting.');
  if (p.riskHistory.includes('previous-scam')) add('recovery', 'You told us you have lost money to a scam before.');
  if (p.riskHistory.includes('financial-stress')) add('debt', 'You told us about debt or money worries.');
  if (['business-owner', 'executive', 'finance-admin'].includes(p.occupation)) add('business', 'You told us you work as: ' + OCCUPATIONS.find(([v]) => v === p.occupation)[1].toLowerCase() + '.');
  return areas;
}

export function protectionLevel(raw, now = Date.now()) {
  const p = cleanRiskProfile(raw);
  let level = p.wellbeing.length ? 2 : (focusAreas(p).length || p.riskHistory.length) ? 1 : 0;
  // A temporary boost (for example after a voice check-in sounded different) adds one level.
  if (p.boostUntil && new Date(p.boostUntil).getTime() > now) level = Math.min(2, level + 1);
  return PROTECTION_LEVELS[level];
}

// The only part of the profile that is sent with an analysis request: no answers, just codes.
export function protectionOf(raw, now = Date.now()) {
  return {level: protectionLevel(raw, now), focus: focusAreas(raw).map((a) => a.code)};
}

export function parseProtection(value) {
  if (value == null) return {level: 'standard', focus: []};
  if (typeof value !== 'object' || !PROTECTION_LEVELS.includes(value.level || 'standard')) throw new Error('Invalid protection settings.');
  const focus = Array.isArray(value.focus) ? value.focus : [];
  if (focus.length > 8 || focus.some((f) => !FOCUS_AREAS[f])) throw new Error('Invalid protection settings.');
  return {level: value.level || 'standard', focus: [...new Set(focus)]};
}

// Words from the other party that touch the customer's focus areas. Excerpts are exact substrings.
export function focusFindings(turns = [], focus = []) {
  const found = [];
  turns.forEach((turn, index) => {
    if (turn.speaker !== 'contact' || typeof turn.text !== 'string') return;
    for (const [code, strong, pattern] of FOCUS_SIGNALS) {
      if (!focus.includes(code) || found.some((f) => f.focus === code && (f.strong || !strong))) continue;
      const match = turn.text.match(pattern);
      if (!match) continue;
      const i = found.findIndex((f) => f.focus === code);
      const finding = {focus: code, strong, label: FOCUS_AREAS[code].label, excerpt: match[0], turn: index + 1, why: FOCUS_AREAS[code].why};
      if (i >= 0) found[i] = finding; else found.push(finding);
    }
  });
  return found;
}

// Raises an analyzeConversation() result for the customer's protection level and focus areas.
export function personalize(insight, turns = [], protection = {level: 'standard', focus: []}) {
  const level = protection?.level || 'standard';
  const focus = protection?.focus || [];
  const findings = level === 'standard' ? [] : focusFindings(turns, focus);
  const pressure = new Set(insight.findings.map((f) => f.tactic).filter((t) => PRESSURE.has(t)));
  const evidence = insight.findings.length + insight.requests.length;
  const boosts = [];
  let next = insight.level;
  const raise = (to, reason) => { if (RANK[to] > RANK[next]) { boosts.push({from: next, to, reason}); next = to; } };

  if (level !== 'standard') {
    for (const f of findings) {
      if (RANK[next] === 0 && (f.strong || evidence)) raise('caution', `“${f.excerpt}” matches ${f.label.toLowerCase()}, an area your profile asks us to watch.`);
      if (RANK[next] === 1 && (insight.requests.length || pressure.size)) raise('high', `This conversation touches ${f.label.toLowerCase()} and adds pressure or a request.`);
    }
    const pattern = insight.prediction?.pattern;
    if (pattern && focus.includes(pattern) && insight.prediction.strength !== 'possible') raise('high', `It follows a ${insight.prediction.name.toLowerCase()}, which your profile asks us to watch closely.`);
  }
  if (level === 'maximum') {
    if (RANK[next] === 1 && insight.requests.length) raise('high', 'Maximum protection: any request for money, codes, links, or details under pressure is treated as high risk.');
    if (RANK[next] === 0 && pressure.size && !insight.reassured && insight.prediction) raise('caution', 'Maximum protection: pressure tactics get a second look sooner.');
  }
  const final = LEVELS.includes(next) ? next : insight.level;
  return {
    ...insight, level: final,
    score: final === insight.level ? insight.score : riskScore(final, insight.findings, insight.requests, insight.prediction),
    personal: {level, focus, findings, boosts},
  };
}

export const analyzePersonal = (turns, protection) => personalize(analyzeConversation(turns), turns, protection);

// Maximum protection always interrupts, even when the customer chose fewer interruptions.
export const interruptsForCaution = (protection, warningStyle) => protection?.level === 'maximum' || warningStyle !== 'high-only';
