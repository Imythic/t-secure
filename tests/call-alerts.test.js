import test from 'node:test';
import assert from 'node:assert/strict';
import {CallSession} from '../src/call-session.js';

function makeSession(t,turns,analyze=async()=>({risk:'low',reasons:[]})){
  const session=new CallSession({analyze,onChange:()=>{},intervalMs:60000,minAnalysisMs:60000});
  t.after(()=>session.end(false));
  session.start({id:'alerts',turns});
  return session;
}
test('caution stays non-interrupting and escalation pauses once per call',t=>{
  const session=makeSession(t,[
    ['contact','Your account will be locked within five minutes.'],
    ['contact','Your account is suspended.'],
    ['contact','Send your password now.'],
    ['contact','Send your verification code.'],
  ]);
  assert.equal(session.snapshot.alert?.risk,'caution');
  assert.equal(session.snapshot.status,'playing');
  const cautionId=session.snapshot.alert.id;
  session.advance();
  assert.equal(session.snapshot.alert.id,cautionId,'Repeated tactics must not announce another alert.');
  session.advance();
  assert.equal(session.snapshot.alert.risk,'high');
  assert.equal(session.snapshot.status,'paused');
  const highId=session.snapshot.alert.id;
  assert.notEqual(highId,cautionId);
  session.resume();
  session.advance();
  assert.equal(session.snapshot.status,'playing','Continuing after review must not immediately interrupt again.');
  assert.equal(session.snapshot.alert.id,highId);
  assert.equal(session.snapshot.analysis.risk,'high');
});
test('a new call can warn again after a previous warning was reviewed',t=>{
  const session=makeSession(t,[['contact','Send your password.']]);
  const previousId=session.snapshot.alert?.id;
  assert.equal(session.snapshot.status,'paused');
  session.end();
  session.start({id:'second',turns:[['contact','Send your password.']]});
  assert.equal(session.snapshot.alert?.risk,'high');
  assert.notEqual(session.snapshot.alert.id,previousId);
});
test('benign conversations and incomplete checks do not generate scam alerts',async t=>{
  const benign=makeSession(t,[['contact','Keep the surprise party secret until Saturday.']]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(benign.snapshot.alert,null);
  assert.equal(benign.snapshot.status,'playing');
  const offline=makeSession(t,[['contact','Hello, how are you?']],async()=>{throw new Error('offline');});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(offline.snapshot.alert,null);
  assert.equal(offline.snapshot.analysis.incomplete,true);
  assert.equal(offline.snapshot.status,'playing');
});
test('a grounded model warning also pauses an active call',async t=>{
  const session=makeSession(t,[['contact','Move your savings to the vault I control.']],async()=>({
    risk:'high',reasons:[{code:'authority',evidence:'Move your savings to the vault I control.'}],analysisSource:'hybrid',
  }));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(session.snapshot.status,'paused');
  assert.equal(session.snapshot.alert?.risk,'high');
});
test('an elevated result without evidence does not interrupt the call',async t=>{
  const session=makeSession(t,[['contact','We are meeting at noon.']],async()=>({risk:'high',reasons:[]}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(session.snapshot.alert,null);
  assert.equal(session.snapshot.status,'playing');
});
