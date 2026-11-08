import { CHECKIN_SECONDS, FRAME_MS, PROMPT_SECONDS, VOICE_PROMPTS, summarizeLevels } from '../shared/voice-baseline.js';
// Records the one-minute check-in locally. Audio is kept only as an in-memory blob for playback
// and is never uploaded; word counts come from the browser's own speech recognition when available.
export class VoiceRecorder {
  constructor({onTick}={}) {this.onTick=onTick;}
  static supported() {return Boolean(navigator.mediaDevices?.getUserMedia&&window.AudioContext);}
  async start() {
    this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    this.context=new AudioContext();
    const analyser=this.context.createAnalyser();analyser.fftSize=2048;
    this.context.createMediaStreamSource(this.stream).connect(analyser);
    const samples=new Float32Array(analyser.fftSize);
    this.levels=[];this.words=0;this.chunks=[];this.startedAt=Date.now();
    if(window.MediaRecorder){
      this.recorder=new MediaRecorder(this.stream);
      this.recorder.ondataavailable=(event)=>{if(event.data.size)this.chunks.push(event.data);};
      this.recorder.start();
    }
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(Recognition){
      try{
        this.recognition=new Recognition();this.recognition.continuous=true;this.recognition.interimResults=false;
        this.recognition.onresult=(event)=>{for(let i=event.resultIndex;i<event.results.length;i++)if(event.results[i].isFinal)this.words+=event.results[i][0].transcript.trim().split(/\s+/).filter(Boolean).length;};
        this.recognition.onerror=()=>{this.recognitionFailed=true;};
        this.recognition.start();
      }catch{this.recognition=null;}
    }
    this.timer=setInterval(()=>{
      analyser.getFloatTimeDomainData(samples);
      let sum=0;for(const s of samples)sum+=s*s;
      this.levels.push(Math.sqrt(sum/samples.length));
      const elapsed=(Date.now()-this.startedAt)/1000;
      if(elapsed>=CHECKIN_SECONDS){this.stop();return;}
      this.onTick?.({remaining:Math.ceil(CHECKIN_SECONDS-elapsed),promptIndex:Math.min(VOICE_PROMPTS.length-1,Math.floor(elapsed/PROMPT_SECONDS))});
    },FRAME_MS);
    return new Promise((resolve)=>{this.resolve=resolve;});
  }
  async stop() {
    if(!this.timer)return;
    clearInterval(this.timer);this.timer=null;
    try{this.recognition?.stop();}catch{/* Already stopped. */}
    const audio=await new Promise((resolve)=>{
      if(!this.recorder||this.recorder.state==='inactive'){resolve(null);return;}
      this.recorder.onstop=()=>resolve(this.chunks.length?URL.createObjectURL(new Blob(this.chunks,{type:this.recorder.mimeType})):null);
      this.recorder.stop();
    });
    // Recognition delivers its last results shortly after stopping.
    await new Promise((resolve)=>setTimeout(resolve,400));
    this.stream.getTracks().forEach((track)=>track.stop());
    this.context.close().catch(()=>{});
    const elapsed=(Date.now()-this.startedAt)/1000;
    const prompts=VOICE_PROMPTS.filter((_,i)=>elapsed>i*PROMPT_SECONDS+PROMPT_SECONDS/2).map((p)=>p.id);
    const words=this.recognition&&!this.recognitionFailed&&this.words?this.words:null;
    this.resolve({summary:summarizeLevels(this.levels,{words}),prompts,audio});
  }
  cancel() {
    clearInterval(this.timer);this.timer=null;
    try{this.recognition?.abort();}catch{/* Optional. */}
    try{if(this.recorder?.state!=='inactive')this.recorder.stop();}catch{/* Optional. */}
    this.stream?.getTracks().forEach((track)=>track.stop());
    this.context?.close().catch(()=>{});
    this.resolve?.(null);
  }
}
