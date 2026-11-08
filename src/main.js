import '@fontsource-variable/manrope';
import './styles.css';
import { Client, firebaseConfigured, friendlyAuthError } from './client.js';
import { CallSession } from './call-session.js';
import { analyzeText } from '../shared/detection.js';
import { scenarios, messageSamples } from '../shared/fixtures.js';
import { h, icon, riskLabels } from './ui.js';
import * as views from './views.js';

const client=new Client();
const ui={
  scenario:'family',call:{status:'idle',turns:[],analysis:{risk:'low',reasons:[]}},
  messageText:'',messageResult:null,messageBusy:false,profileBusy:false,profileOperation:0,
  authMode:'login',recoveryTopic:'payment',recoverySteps:[],menuOpen:false,
};
const app=document.querySelector('#app');
const route=()=>{const parts=location.hash.replace(/^#\/?/,'').split('/');return {name:parts[0]||'home',id:parts[1]||null};};
function notify(message,error=false) {
  clearTimeout(notify.timer);
  const target=document.querySelector('#notifications');
  target.innerHTML=`<div class="toast ${error?'toast-error':''}" ${error?'role="alert"':''}>${icon(error?'alert':'check')}<span>${h(message)}</span><button aria-label="Dismiss notification" data-action="dismiss">×</button></div>`;
  notify.timer=setTimeout(()=>{target.innerHTML='';},8000);
}
function render() {
  const state=client.state,current=route();
  if(state.loading){app.innerHTML='<p class="boot" role="status">Getting your safety space ready…</p>';return;}
  if(!state.user || (!state.demo&&!state.user.emailVerified) || current.name==='account'){
    app.innerHTML=views.authView(state,ui,firebaseConfigured);return;
  }
  const pages={
    home:()=>views.home(state),calls:()=>views.calls(state,ui),messages:()=>views.messages(state,ui),
    profile:()=>views.profile(state,ui),settings:()=>views.settings(state,ui),history:()=>views.history(state),
    learn:()=>views.learn(state),recovery:()=>views.recovery(state,ui,current.id),
    't-life':()=>views.profile(state,ui,true),about:()=>views.about(),
  };
  app.innerHTML=views.shell(state,current.name,(pages[current.name]||pages.home)(),ui.menuOpen);
  document.title=(current.name==='home'?'T-Secure':({'t-life':'T-Life preview',calls:'Call protection',messages:'Check a message',profile:'My profile',settings:'Settings',history:'Recent activity',learn:'Safety guide',recovery:'Recovery guidance',about:'About this demo'}[current.name]||'T-Secure'))+' · A safer next step';
}
const session=new CallSession({
  analyze:(input,signal)=>client.analyze(input,signal),
  onChange:(snapshot)=>{
    const oldRisk=ui.call.analysis?.risk;
    ui.call=snapshot;
    const workspace=document.querySelector('#call-workspace');
    if(workspace){
      const action=document.activeElement?.dataset.action;
      workspace.innerHTML=views.callWorkspace(client.state,ui);
      const selector=document.querySelector('#scenario');if(selector)selector.disabled=['playing','paused'].includes(snapshot.status);
      const transcript=workspace.querySelector('.transcript');
      if(transcript)transcript.scrollTop=transcript.scrollHeight;
      if(oldRisk!==snapshot.analysis.risk)document.querySelector('#call-announcement').textContent=riskLabels[snapshot.analysis.risk];
      if(action==='pause')workspace.querySelector('[data-action="resume"]')?.focus({preventScroll:true});
      if(action==='resume')workspace.querySelector('[data-action="pause"]')?.focus({preventScroll:true});
    }
  },
});
client.subscribe((state)=>{
  if(state.user?.emailVerified&&!state.demo&&route().name==='account')location.hash='/home';
  render();
});
window.addEventListener('hashchange',()=>{
  ui.menuOpen=false;
  if(route().name!=='calls'&&['playing','paused'].includes(ui.call.status))session.end();
  render();window.scrollTo({top:0,behavior:'instant'});
  document.querySelector('main')?.focus({preventScroll:true});
});
async function analyzeProfile() {
  const operation=++ui.profileOperation;
  ui.profileBusy=true;render();
  try {
    const result=await client.assess();
    if(operation===ui.profileOperation&&result)notify('Assessment ready.');
  } finally {
    if(operation===ui.profileOperation){ui.profileBusy=false;render();}
  }
}
async function changeConsent(enabled,historySetId) {
  ++ui.profileOperation;ui.profileBusy=false;
  await client.setConsent(enabled,historySetId);
  if(enabled)await analyzeProfile();
  else notify('Advanced analysis is off. Your assessment has been removed.');
}
document.addEventListener('click',async(event)=>{
  const skip=event.target.closest('.skip-link');
  if(skip){event.preventDefault();document.querySelector('main')?.focus();return;}
  const button=event.target.closest('[data-action]');
  if(!button)return;
  const action=button.dataset.action;
  if(button.tagName==='A')event.preventDefault();
  try {
    switch(action){
      case 'dismiss':document.querySelector('#notifications').innerHTML='';break;
      case 'toggle-menu':ui.menuOpen=!ui.menuOpen;render();document.querySelector('[data-action="toggle-menu"]')?.focus({preventScroll:true});break;
      case 'enter-demo':client.enterDemo();location.hash='/home';break;
      case 'auth-mode':ui.authMode=button.dataset.mode;render();break;
      case 'start-call':session.start(scenarios.find((s)=>s.id===ui.scenario));break;
      case 'pause':session.pause();break;
      case 'resume':session.resume();break;
      case 'end-call':session.end();break;
      case 'message-sample':ui.messageText=messageSamples[Number(button.dataset.index)].text;ui.messageResult=null;render();document.querySelector('#message-text')?.focus();break;
      case 'analyze-profile':await analyzeProfile();break;
      case 'delete-assessment':++ui.profileOperation;ui.profileBusy=false;await client.deleteAssessment();notify('Assessment deleted from both profile views.');break;
      case 'delete-contact':await client.deleteContact();notify('Trusted contact removed.');break;
      case 'delete-incident':await client.deleteIncident(button.dataset.id);notify('Check deleted.');break;
      case 'logout':session.end();ui.messageText='';ui.messageResult=null;await client.logout();location.hash='/account';break;
      case 'google':button.disabled=true;await client.google();break;
      case 'resend-verification':button.disabled=true;await client.resend();notify('Verification email sent. Please check your inbox.');break;
      case 'check-verification':button.disabled=true;await client.refreshVerification();break;
      case 'retry-account':window.location.reload();break;
      case 'skip-onboarding':await client.setConsent(false,'pressure');break;
    }
  }catch(error){notify(friendlyAuthError(error),true);}
  finally{if(button.isConnected)button.disabled=false;}
});
document.addEventListener('input',(event)=>{
  if(event.target.id==='message-text')ui.messageText=event.target.value;
});
document.addEventListener('change',async(event)=>{
  const element=event.target;
  try{
    if(element.id==='scenario'){
      ui.scenario=element.value;session.end(false);
      ui.call={status:'idle',turns:[],analysis:{risk:'low',reasons:[]}};render();
    }
    if(element.id==='advanced')await changeConsent(element.checked,client.state.consent.historySetId);
    if(element.id==='history-set')await changeConsent(true,element.value);
    if(element.id==='recovery-topic'){ui.recoveryTopic=element.value;render();}
    if(element.name==='recovery-step'){
      const steps=[...document.querySelectorAll('[name="recovery-step"]:checked')].map((input)=>input.value);
      const id=route().id;
      const previous=id?client.state.incidents.find((item)=>item.id===id)?.recovery||[]:ui.recoverySteps;
      const visible=[...document.querySelectorAll('[name="recovery-step"]')].map((input)=>input.value);
      const merged=[...previous.filter((step)=>!visible.includes(step)),...steps];
      if(id)await client.saveRecovery(id,merged);else ui.recoverySteps=merged;
    }
  }catch(error){notify(friendlyAuthError(error),true);render();}
});
document.addEventListener('submit',async(event)=>{
  const form=event.target;
  if(!['message-form','auth-form','contact-form'].includes(form.id))return;
  event.preventDefault();
  const data=Object.fromEntries(new FormData(form));
  const submit=form.querySelector('[type="submit"]');submit.disabled=true;
  try{
    if(form.id==='message-form'){
      ui.messageText=data.text;ui.messageBusy=true;ui.messageResult=null;render();
      const text=data.text;
      // Immediate checks never wait for the AI provider.
      ui.messageResult=analyzeText(text);render();
      try{
        const result=await client.analyze({channel:/^https?:\/\/\S+$/.test(text.trim())?'link':'message',text,sequence:1});
        if(ui.messageText===text)ui.messageResult=result;
      }catch(error){
        ui.messageResult.incomplete=true;
        if(ui.messageResult.risk==='low')ui.messageResult.risk='unknown';
        notify(friendlyAuthError(error),true);
      }finally{ui.messageBusy=false;render();}
    }
    if(form.id==='contact-form'){
      await client.saveContact({name:data.name.trim(),relationship:data.relationship.trim(),phone:data.phone.trim()});
      notify('Trusted contact saved.');
    }
    if(form.id==='auth-form'){
      if(ui.authMode==='signup')await client.signup({...data,advanced:form.elements.advanced.checked});
      else if(ui.authMode==='reset'){await client.reset(data.email);notify('If an account exists for that email, a reset link is on its way.');}
      else await client.login(data.email,data.password);
    }
  }catch(error){notify(friendlyAuthError(error),true);}
  finally{if(submit.isConnected)submit.disabled=false;}
});
render();
client.init().catch((error)=>{client.state.loading=false;render();notify(friendlyAuthError(error),true);});
