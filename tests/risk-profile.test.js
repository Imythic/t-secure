import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeConversation } from '../shared/prediction.js';
import { scenarios, messageSamples } from '../shared/fixtures.js';
import { analyzePersonal, cleanRiskProfile, focusAreas, interruptsForCaution, parseProtection, protectionLevel, protectionOf } from '../shared/risk-profile.js';
import { compareToBaseline, memoryQuestions, summarizeLevels, validCheckin } from '../shared/voice-baseline.js';
import { parseCommunication } from '../shared/schema.js';
import { createService } from '../server/service.js';

const turnsOf=(id)=>scenarios.find((s)=>s.id===id).turns.map(([speaker,text])=>({speaker,text}));
const message=(text)=>[{speaker:'contact',text}];
const RANK={low:0,unknown:0,caution:1,high:2};
const MAX={level:'maximum',focus:['romance','family','prize','recovery','debt','business']};

test('answers map to focus areas, each with the answer that caused it',()=>{
  const areas=focusAreas({relationshipStatus:'widowed',hasGrandchildren:true,riskHistory:['gambling','previous-scam','financial-stress'],occupation:'business-owner'});
  assert.deepEqual(areas.map((a)=>a.code),['romance','family','prize','recovery','debt','business']);
  for(const a of areas)assert.match(a.because,/^You told us/);
  assert.deepEqual(focusAreas({relationshipStatus:'married',occupation:'retired'}),[]);
});
test('protection level: standard by default, heightened with focus areas, maximum with any health answer',()=>{
  assert.equal(protectionLevel({}),'standard');
  assert.equal(protectionLevel({occupation:'executive'}),'heightened');
  assert.equal(protectionLevel({wellbeing:['mood']}),'maximum');
  const now=Date.parse('2026-01-01');
  assert.equal(protectionLevel({boostUntil:'2026-01-05'},now),'heightened');
  assert.equal(protectionLevel({boostUntil:'2025-12-30'},now),'standard');
});
test('only derived codes leave the browser, and unknown values are rejected',()=>{
  const sent=protectionOf({relationshipStatus:'divorced',wellbeing:['memory'],riskHistory:['gambling']});
  assert.deepEqual(sent,{level:'maximum',focus:['romance','prize']});
  assert.ok(!JSON.stringify(sent).includes('memory'));
  assert.deepEqual(parseProtection(undefined),{level:'standard',focus:[]});
  assert.throws(()=>parseProtection({level:'paranoid'}));
  assert.throws(()=>parseProtection({level:'heightened',focus:['diagnosis']}));
  assert.deepEqual(cleanRiskProfile({wellbeing:['memory','made-up'],relationshipStatus:'complicated'}).wellbeing,['memory']);
  assert.equal(parseCommunication({channel:'message',text:'hi',sequence:1,protection:sent}).protection.level,'maximum');
});
test('the profile never lowers a rating and never raises one without quoted evidence',()=>{
  for(const s of scenarios){
    const turns=turnsOf(s.id);
    const base=analyzeConversation(turns);
    const personal=analyzePersonal(turns,MAX);
    assert.ok(RANK[personal.level]>=RANK[base.level],s.id);
    for(const f of personal.personal.findings)assert.ok(turns[f.turn-1].text.includes(f.excerpt));
  }
  const quiet=analyzePersonal(message('Hi, are we still on for lunch tomorrow?'),MAX);
  assert.equal(quiet.level,'low');
  assert.equal(quiet.personal.boosts.length,0);
});
test('Scenario C and an ordinary check-in stay low even at maximum protection',()=>{
  for(const id of ['legitimate','checkin'])assert.equal(analyzePersonal(turnsOf(id),MAX).level,'low',id);
  assert.equal(analyzePersonal(message(messageSamples.find((m)=>m.name==='An ordinary message').text),MAX).level,'low');
});
test('a business pitch is flagged for a business owner but not for someone without that focus',()=>{
  const text='Hi, this is Dana from accounts. Our vendor has updated banking details, please use them for the next invoice.';
  assert.equal(analyzePersonal(message(text),{level:'standard',focus:[]}).level,'low');
  const business=analyzePersonal(message(text),protectionOf({occupation:'business-owner'}));
  assert.equal(business.level,'caution');
  assert.equal(business.personal.findings[0].focus,'business');
  assert.match(business.personal.boosts[0].reason,/updated banking details/);
});
test('gambling and past-scam histories watch for prize and recovery offers',()=>{
  const prize=analyzePersonal(message('Congratulations, you have won the jackpot! Claim your prize today.'),protectionOf({riskHistory:['gambling']}));
  assert.equal(prize.level,'caution');
  const recovery=analyzePersonal(message('We are an asset recovery firm. We can recover your lost money for a small fee, pay now.'),protectionOf({riskHistory:['previous-scam']}));
  assert.equal(recovery.level,'high');
});
test('a widowed customer gets a high warning on romance pressure one level sooner',()=>{
  const text='My darling, I miss you. I am stuck overseas and need help.';
  const base=analyzeConversation(message(text));
  const personal=analyzePersonal(message(text),protectionOf({relationshipStatus:'widowed'}));
  assert.ok(RANK[personal.level]>RANK[base.level]);
});
test('grandparents are warned at high risk on the grandchild scenario, and maximum always interrupts',()=>{
  const turns=turnsOf('grandchild');
  const at=(protection)=>{for(let n=1;n<=turns.length;n++)if(analyzePersonal(turns.slice(0,n),protection).level==='high')return n;return Infinity;};
  assert.ok(at(protectionOf({hasGrandchildren:true}))<=at({level:'standard',focus:[]}));
  assert.equal(interruptsForCaution({level:'maximum'},'high-only'),true);
  assert.equal(interruptsForCaution({level:'heightened'},'high-only'),false);
});
test('the server applies the protection codes and stores only focus codes',async()=>{
  const sessions=new Map();
  const store={async saveIncident(uid,id,data){sessions.set(id,data);},async getIncident(){return null;},async takeRateLimit(){return true;}};
  const service=createService({store,provider:{id:'rules',label:'Rules',model:'rules',call:null}});
  const text='You have won the lottery! Pay the processing fee to claim your prize.';
  const plain=await service.analyze('u',{channel:'message',sequence:1,text});
  const personal=await service.analyze('u',{channel:'message',sequence:1,text,protection:{level:'heightened',focus:['prize']}});
  assert.ok(RANK[personal.risk]>RANK[plain.risk]);
  assert.equal(personal.report.personal_protection.focus_matches[0].focus,'prize');
  const saved=sessions.get(personal.sessionId);
  assert.deepEqual(saved.focusAreas,['prize']);
  assert.ok(!JSON.stringify(saved).includes('lottery'));
});

test('voice summaries measure speaking time and pauses from loudness frames',()=>{
  const speech=(n)=>Array(n).fill(0.2),silence=(n)=>Array(n).fill(0.005);
  // 60 seconds: speech with four one-second pauses.
  const levels=[...speech(110),...silence(10),...speech(110),...silence(10),...speech(110),...silence(10),...speech(110),...silence(10),...speech(120)];
  const summary=summarizeLevels(levels,{words:150});
  assert.equal(summary.durationSec,60);
  assert.equal(summary.pausesPerMin,4);
  assert.ok(summary.speechRatio>0.9);
  assert.ok(summary.wordsPerMin>140&&summary.wordsPerMin<170);
  assert.equal(validCheckin(summary),true);
  assert.equal(validCheckin(summarizeLevels(silence(600))),false);
});
test('a check-in that differs from the baseline only suggests extra protection',()=>{
  const baseline={speechRatio:0.6,pausesPerMin:5,wordsPerMin:130};
  assert.equal(compareToBaseline(baseline,{speechRatio:0.58,pausesPerMin:6,wordsPerMin:125}).changed,false);
  const different=compareToBaseline(baseline,{speechRatio:0.3,pausesPerMin:12,wordsPerMin:80});
  assert.equal(different.changed,true);
  assert.equal(different.notes.length,3);
});
test('memory prompts from the check-in become family verification questions',()=>{
  assert.deepEqual(memoryQuestions({prompts:['breakfast','grandchild']}),['What is your first memory of us together?']);
  assert.deepEqual(memoryQuestions(null),[]);
});
