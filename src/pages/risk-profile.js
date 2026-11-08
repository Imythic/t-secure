import { h, icon, date } from '../ui.js';
import { RELATIONSHIP_STATUSES, RISK_HISTORY, WELLBEING, OCCUPATIONS, PROTECTION_LABELS, cleanRiskProfile, focusAreas, protectionLevel } from '../../shared/risk-profile.js';
import { VOICE_PROMPTS, CHECKIN_SECONDS, memoryQuestions } from '../../shared/voice-baseline.js';

const radio=(name,value,current,label)=>`<label class="choice"><input type="radio" name="${name}" value="${h(value)}" ${current===value?'checked':''}><span><strong>${h(label)}</strong></span></label>`;
const check=(name,value,checked,label,detail='')=>`<label class="choice"><input type="checkbox" name="${name}" value="${h(value)}" ${checked?'checked':''}><span><strong>${h(label)}</strong>${detail?`<small>${h(detail)}</small>`:''}</span></label>`;

export function riskProfileFields(raw) {
  const p=cleanRiskProfile(raw);
  return `<fieldset><legend>Relationship status</legend><p class="field-help">Romance scams most often target people who are single, widowed, or divorced. If you have a spouse or partner, we’ll suggest talking to them before acting.</p><div class="choice-row">${RELATIONSHIP_STATUSES.map(([v,l])=>radio('relationshipStatus',v,p.relationshipStatus,l)).join('')}</div></fieldset>
    <fieldset><legend>Family</legend>${check('hasGrandchildren','yes',p.hasGrandchildren,'I have grandchildren','Callers pretending to be a grandchild in trouble are one of the most common scams.')}</fieldset>
    <fieldset><legend>Have any of these affected you?</legend><p class="field-help">Scammers look for these. Telling us lets us watch for them.</p>${RISK_HISTORY.map(([v,l,d])=>check('riskHistory',v,p.riskHistory.includes(v),l,d)).join('')}</fieldset>
    <fieldset><legend>Health and wellbeing</legend><p class="field-help">Any answer here turns on <strong>maximum protection</strong>: warnings appear sooner and always interrupt. We never ask for a diagnosis or share this.</p>${WELLBEING.map(([v,l,d])=>check('wellbeing',v,p.wellbeing.includes(v),l,d)).join('')}</fieldset>
    <label for="risk-occupation">Occupation</label><select id="risk-occupation" name="occupation"><option value="">Choose one (optional)</option>${OCCUPATIONS.map(([v,l])=>`<option value="${v}" ${p.occupation===v?'selected':''}>${h(l)}</option>`).join('')}</select>
    <p class="field-help">Business owners, managers, and finance staff receive more business pitches and invoices, which social-engineering attacks imitate.</p>`;
}
export function readRiskProfile(form,current) {
  const data=new FormData(form);
  return cleanRiskProfile({...cleanRiskProfile(current),relationshipStatus:data.get('relationshipStatus'),hasGrandchildren:data.has('hasGrandchildren'),riskHistory:data.getAll('riskHistory'),wellbeing:data.getAll('wellbeing'),occupation:data.get('occupation')});
}

export function protectionBadge(raw) {
  const level=protectionLevel(raw);
  return `<span class="protection-level ${level}">${icon('shield')}${h(PROTECTION_LABELS[level])}</span>`;
}
const LEVEL_EFFECTS={
  standard:'Warnings follow the evidence in each conversation, as chosen in your warning preferences.',
  heightened:'Conversations that touch your focus areas are flagged one level sooner, and we tell you why.',
  maximum:'Warnings appear sooner, always interrupt (even if you chose fewer interruptions), and any pressured request for money, codes, or details is treated as high risk.',
};
export function riskProfileSummary(raw,{actions=true}={}) {
  const p=cleanRiskProfile(raw);
  const level=protectionLevel(p);
  const areas=focusAreas(p);
  const boosted=p.boostUntil&&new Date(p.boostUntil)>new Date();
  return `<section class="settings-section risk-summary" aria-labelledby="risk-summary-title"><div class="section-heading">${icon('spark')}<div><h2 id="risk-summary-title">Your risk profile</h2><p>What scammers might use, so we can watch for it.</p></div>${protectionBadge(p)}</div>
    <p>${h(LEVEL_EFFECTS[level])}</p>
    ${boosted?`<p class="notice">${icon('info')}Extra protection is on until ${h(date(p.boostUntil))}, after your last voice check-in.</p>`:''}
    ${areas.length?`<h3 class="assessment-subhead">Focus areas</h3><ul class="focus-list">${areas.map((a)=>`<li><strong>${h(a.label)}</strong><span>${h(a.because)}</span><small>${h(a.why)}</small></li>`).join('')}</ul>`:'<p class="field-help">No focus areas yet. Answer a few optional questions to tailor your protection.</p>'}
    ${p.relationshipStatus&&['married','partnered'].includes(p.relationshipStatus)?`<p class="field-help">${icon('heart')}Warnings will suggest talking to your ${p.relationshipStatus==='married'?'spouse':'partner'} before you act.</p>`:''}
    ${p.voiceBaseline?`<p class="field-help">${icon('headphones')}Voice baseline recorded ${h(date(p.voiceBaseline.recordedAt))}.${memoryQuestions(p.voiceBaseline).length?' Your memory questions are used to help you verify callers who claim to be family.':''}</p>`:''}
    ${actions?`<div class="button-row"><a class="button secondary" href="#/settings#risk-profile">${icon('settings')}Update risk profile</a></div>`:''}
    <p class="privacy-footnote">${icon('lock')}Only you can see these answers. Your health and history answers never leave your account. Checks only receive your protection level and focus areas, never the answers behind them.</p></section>`;
}

// voice: {status:'idle'|'recording'|'done'|'error'|'unsupported', remaining, promptIndex, result, comparison, error}
export function voiceCheckin(raw,voice,{onboarding=false}={}) {
  const baseline=cleanRiskProfile(raw).voiceBaseline;
  const mode=baseline&&!onboarding?'checkin':'baseline';
  const body={
    idle:()=>`<p>${mode==='checkin'?'Record a one-minute check-in. We compare how you spoke with your baseline. If it sounds noticeably different, we’ll offer extra protection for a week.':'Answer a few simple questions out loud for one minute. This records how you normally speak and gives you personal memory questions for checking callers who claim to be family.'}</p>
      <ol class="voice-prompts">${VOICE_PROMPTS.map((p)=>`<li>${h(p.text)}</li>`).join('')}</ol>
      <div class="button-row"><button class="button primary" type="button" data-action="voice-start">${icon('headphones')}Start ${CHECKIN_SECONDS}-second recording</button></div>
      <p class="privacy-footnote">${icon('lock')}The recording stays on this device and is deleted when you leave the page. We only save speaking pace, pauses, and which questions you answered, never the audio or your words.</p>`,
    recording:()=>`<div class="voice-live" role="status" aria-live="polite"><span class="voice-dot"></span><span>Recording · <strong>${voice.remaining}s</strong> left</span></div>
      <p class="voice-question">${h(VOICE_PROMPTS[voice.promptIndex]?.text||'')}</p><p class="field-help">Question ${voice.promptIndex+1} of ${VOICE_PROMPTS.length}. Speak naturally. There are no wrong answers.</p>
      <div class="button-row"><button class="button secondary" type="button" data-action="voice-stop">${icon('stop')}Finish early</button><button class="text-button" type="button" data-action="voice-cancel">Cancel</button></div>`,
    done:()=>{
      const {summary,audio,valid}=voice.result;
      const comparison=voice.comparison;
      return `<dl class="voice-metrics"><div><dt>Length</dt><dd>${summary.durationSec}s</dd></div><div><dt>Time speaking</dt><dd>${Math.round(summary.speechRatio*100)}%</dd></div><div><dt>Long pauses</dt><dd>${summary.pausesPerMin}/min</dd></div><div><dt>Pace</dt><dd>${summary.wordsPerMin?summary.wordsPerMin+' words/min':'Not available in this browser'}</dd></div></dl>
        ${audio?`<audio controls src="${h(audio)}" aria-label="Play back your recording"></audio>`:''}
        ${!valid?`<p class="notice error" role="alert">We couldn’t hear enough speech. Try somewhere quieter, a little closer to the microphone.</p>`:''}
        ${comparison?.changed?`<div class="notice" role="status"><p><strong>This check-in sounded different from your baseline.</strong></p><ul>${comparison.notes.map((n)=>`<li>${h(n)}</li>`).join('')}</ul><p>This is not a diagnosis. Tiredness, illness, or a noisy room can cause it. Would you like extra protection for the next 7 days?</p><button class="button primary" type="button" data-action="voice-boost">${icon('shield')}Turn on extra protection</button></div>`:comparison?'<p class="notice">Similar to your baseline. No change to your protection.</p>':''}
        <div class="button-row">${valid&&mode==='baseline'?`<button class="button primary" type="button" data-action="voice-save">${icon('check')}Save as my baseline</button>`:''}${valid&&mode==='checkin'?`<button class="button secondary" type="button" data-action="voice-save">Replace my baseline with this one</button>`:''}<button class="button secondary" type="button" data-action="voice-reset">${icon('refresh')}Record again</button></div>`;
    },
    error:()=>`<p class="notice error" role="alert">${h(voice.error||'The microphone could not be used.')}</p><button class="button secondary" type="button" data-action="voice-reset">Try again</button>`,
    unsupported:()=>'<p class="notice">This browser can’t record audio. You can skip this step, or try again in a current version of Chrome, Edge, Safari, or Firefox.</p>',
  };
  return `<div id="voice-checkin" class="voice-checkin">${(body[voice.status]||body.idle)()}${baseline&&voice.status==='idle'&&!onboarding?`<p class="field-help">Baseline recorded ${h(date(baseline.recordedAt))}. <button class="text-button destructive" type="button" data-action="voice-delete">Delete baseline</button></p>`:''}</div>`;
}
