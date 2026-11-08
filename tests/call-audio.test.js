import test from 'node:test';
import assert from 'node:assert/strict';
import {CallAudio} from '../src/call-audio.js';

function toneScope(resume){
  const events={created:0,started:0,stopped:0};
  class AudioContext{
    constructor(){events.created++;this.state=resume?'suspended':'running';this.currentTime=0;}
    resume(){return resume();}
    createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){events.started++;},stop(){events.stopped++;}};}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
  }
  return {scope:{AudioContext},events};
}
test('visual-only mode does not initialize or play device audio',async()=>{
  const {scope,events}=toneScope();
  const audio=new CallAudio({scope});
  await audio.play('high');
  assert.equal(events.created,0);
  assert.equal(events.started,0);
});
test('a selected tone plays once and can be stopped',async()=>{
  const {scope,events}=toneScope();
  const audio=new CallAudio({scope});
  await audio.setMode('tone');
  await audio.play('high');
  assert.equal(events.started,1);
  audio.stop();
  assert.ok(events.stopped>=1);
});
test('ending the call while audio permission resumes prevents a late tone',async()=>{
  let finish;
  const {scope,events}=toneScope(()=>new Promise(resolve=>{finish=resolve;}));
  const audio=new CallAudio({scope});audio.mode='tone';
  const pending=audio.play('high');
  await new Promise(resolve=>setImmediate(resolve));
  audio.stop();finish();await pending;
  assert.equal(events.started,0);
});
test('unsupported optional audio reports availability without throwing',async()=>{
  let unavailable=0;
  const audio=new CallAudio({scope:{},onUnavailable:()=>unavailable++});
  assert.equal(await audio.setMode('speech'),false);
  assert.equal(unavailable,1);
});
