import {SHADES,OCCASIONS,PERSONAS,recommendation,concentration,describeColor,replyFor} from './core.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={persona:'gentle',occasion:'daily',style:'soft',shade:'rose',intensity:45,original:false};
let toastTimer,sourceImage,points=null,modelPromise,photoVersion=0,cameraStream=null,guideIndex=0,tourIndex=-1,recognition=null,listening=false;
const canvas=$('#makeup-canvas'),ctx=canvas.getContext('2d');
const defaultPoints={outer:[[.422,.552],[.444,.546],[.464,.541],[.483,.544],[.500,.549],[.516,.544],[.537,.548],[.557,.552],[.578,.550],[.560,.576],[.539,.592],[.516,.602],[.498,.604],[.477,.601],[.455,.589],[.437,.573]],inner:[[.430,.559],[.456,.565],[.483,.570],[.505,.571],[.532,.567],[.557,.561],[.569,.557],[.547,.567],[.519,.573],[.495,.574],[.470,.570],[.445,.565]]};
const outerIndices=[61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
const innerIndices=[78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95];
let settings={largeText:false,highContrast:false,autoRead:false,reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,speed:'1'};
try{Object.assign(settings,JSON.parse(localStorage.getItem('beauty-beyond-access')||'{}'));}catch{}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,5000);}
function speak(text){
  if(!('speechSynthesis' in window)){toast('这个浏览器暂不支持朗读。相同内容已经显示在页面上。');return;}
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang='zh-CN';utterance.rate=Number(settings.speed)||1;
  const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('zh'));if(voice)utterance.voice=voice;
  utterance.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))toast('当前设备无法播放语音，请查看页面文字或更换浏览器。');};
  speechSynthesis.speak(utterance);
}
function stopSpeech(){if('speechSynthesis' in window)speechSynthesis.cancel();}
function openDialog(id){const el=$(id);if(!el.open)el.showModal();}
function closeDialog(el){el.close();}
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.closest('dialog'))));
$$('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});d.addEventListener('close',stopSpeech);});
$('#access-open').onclick=()=>openDialog('#access-dialog');
['#about-open','#footer-about','#vision-open'].forEach(id=>$(id).onclick=()=>openDialog('#about-dialog'));
const settingIds={'large-text':'largeText','high-contrast':'highContrast','auto-read':'autoRead','reduce-motion':'reduceMotion'};
function applySettings(){for(const [id,key] of Object.entries(settingIds)){$('#'+id).checked=!!settings[key];if(key!=='autoRead')document.body.classList.toggle(id,!!settings[key]);}$('#speech-speed').value=settings.speed;}
function saveSettings(){try{localStorage.setItem('beauty-beyond-access',JSON.stringify(settings));}catch{}applySettings();}
for(const [id,key] of Object.entries(settingIds))$('#'+id).onchange=e=>{settings[key]=e.target.checked;saveSettings();if(key==='autoRead'&&settings[key])speak('自动朗读已开启。之后的回复和试色变化会在你操作后朗读。');};
$('#speech-speed').onchange=e=>{settings.speed=e.target.value;saveSettings();};applySettings();
function route(){
  const requested=location.hash.slice(1),page=['home','companion','mirror','support'].includes(requested)?requested:'home';
  if(!['home','companion','mirror','support'].includes(requested))history.replaceState(null,'','#home');
  $$('[data-page]').forEach(p=>p.hidden=p.dataset.page!==page);
  $$('.site-header nav a').forEach(a=>{if(a.hash==='#'+page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  stopSpeech();if(recognition&&listening)recognition.abort();
  if(page==='mirror'&&!sourceImage)loadDefault(false);
  document.title=`${{home:'让美，不再设限',companion:'安心对话',mirror:'无界试妆',support:'温暖同行'}[page]}｜无界 · Beauty Beyond`;
  window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});
}
window.addEventListener('hashchange',route);
$('.skip-link').onclick=e=>{e.preventDefault();$('#main').focus({preventScroll:true});$('#main').scrollIntoView({behavior:'instant'});};
function selectPersona(value,announce=false){
  if(!PERSONAS[value])return;state.persona=value;
  $$('[data-persona]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.persona===value)));
  if(announce){const text={vision:'听觉优先已选好。你可以用文字或语音告诉我需要什么，试色结果也有完整的文字和朗读。',hands:'操作更轻松已选好。我们会先用照片试色，需要实际上妆时，可连接真人协助。',gentle:'我们按你舒服的节奏来，不需要一次学会所有步骤。'}[value];addMessage(text,'assistant');if(settings.autoRead)speak(text);}
}
$$('[data-persona]').forEach(b=>b.onclick=()=>selectPersona(b.dataset.persona,true));
$$('[data-start]').forEach(b=>b.onclick=()=>{selectPersona(b.dataset.start,true);if(b.dataset.start==='vision'){settings.autoRead=true;saveSettings();}location.hash='companion';if(b.dataset.start==='vision')setTimeout(()=>speak('欢迎来到安心对话。听觉优先已开启。你可以点选把颜色说给我听，也可以输入自己的问题。'),120);});
function syncRecommendation(){
  state.shade=recommendation(state.occasion,state.style);state.intensity=state.style==='soft'?45:70;
  const s=SHADES[state.shade];$('#suggestion-orb').style.setProperty('--shade',s.color);$('#suggestion-name').textContent=s.name;$('#suggestion-number').textContent=s.code;$('#suggestion-copy').textContent=s.suggestion;
  $('#suggestion-tags').replaceChildren(...[OCCASIONS[state.occasion],concentration(state.intensity)].map(t=>{const span=document.createElement('span');span.textContent=t;return span;}));
  updateColor(false);
}
$('#occasion').onchange=e=>{state.occasion=e.target.value;syncRecommendation();};
$$('[data-style]').forEach(b=>b.onclick=()=>{state.style=b.dataset.style;$$('[data-style]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));syncRecommendation();});
function addMessage(text,role){const block=document.createElement('div');block.className='message '+role;const label=document.createElement('span');label.className='message-label';label.textContent=role==='user'?'你':'小界';const p=document.createElement('p');p.textContent=text;block.append(label,p);$('#messages').append(block);$('#messages').scrollTop=$('#messages').scrollHeight;}
function sendMessage(text){text=text.trim().slice(0,500);if(!text)return;addMessage(text,'user');$('#chat-text').value='';const reply=replyFor(text,state);addMessage(reply,'assistant');if(settings.autoRead)speak(reply);}
$('#chat-form').onsubmit=e=>{e.preventDefault();sendMessage($('#chat-text').value);};
$$('[data-prompt]').forEach(b=>b.onclick=()=>sendMessage(b.dataset.prompt));
$('#chat-read').onclick=()=>speak($$('.message.assistant p').at(-1)?.textContent||'你好，我是小界。');
$('#chat-mic').onclick=()=>{
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){toast('当前浏览器不支持语音输入。可以输入文字或选择上方话题。');return;}
  if(listening){recognition.stop();return;}
  recognition=new SpeechRecognition();recognition.lang='zh-CN';recognition.interimResults=false;recognition.continuous=false;
  recognition.onstart=()=>{listening=true;$('#chat-mic').classList.add('listening');$('#chat-mic').setAttribute('aria-label','停止语音输入');$('#voice-hint').textContent='正在聆听… 识别结果会先填入输入框，由你确认发送。';};
  recognition.onresult=e=>{$('#chat-text').value=e.results[0][0].transcript.slice(0,500);$('#chat-text').focus();};
  recognition.onerror=e=>{toast(e.error==='not-allowed'?'麦克风未授权，你仍可以输入文字。':'语音识别未完成，可以重试或直接输入文字。');};
  recognition.onend=()=>{listening=false;$('#chat-mic').classList.remove('listening');$('#chat-mic').setAttribute('aria-label','使用语音输入');$('#voice-hint').textContent='语音输入由浏览器提供，可能使用其语音服务。请检查文字后再发送。';};
  try{recognition.start();}catch{toast('语音输入暂不可用，请输入文字。');}
};
function draw(){
  if(!sourceImage)return;
  const w=canvas.width,h=canvas.height,scale=Math.min(w/sourceImage.width,h/sourceImage.height),iw=sourceImage.width*scale,ih=sourceImage.height*scale,dx=(w-iw)/2,dy=(h-ih)/2;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#2d2038';ctx.fillRect(0,0,w,h);ctx.drawImage(sourceImage,dx,dy,iw,ih);
  if(points&&!state.original){
    ctx.save();ctx.beginPath();
    for(const ring of [points.outer,points.inner]){ring.forEach(([x,y],i)=>i?ctx.lineTo(dx+x*iw,dy+y*ih):ctx.moveTo(dx+x*iw,dy+y*ih));ctx.closePath();}
    ctx.clip('evenodd');ctx.globalCompositeOperation='multiply';ctx.globalAlpha=(state.intensity/100)*.88;ctx.fillStyle=SHADES[state.shade].color;ctx.fillRect(0,0,w,h);ctx.restore();
  }
  $('#canvas-badge').textContent=state.original?'原始照片':points?'照片试色 · '+SHADES[state.shade].name:'原始照片 · 未定位唇部';
}
function updateColor(announce=true){
  $$('[data-shade]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shade===state.shade)));
  $('#intensity').value=state.intensity;$('#intensity-value').textContent=`${state.intensity}% · ${concentration(state.intensity)}`;
  document.documentElement.style.setProperty('--shade',SHADES[state.shade].color);
  $('#color-description').textContent=describeColor(state.shade,state.intensity,!!points);
  draw();if(announce&&settings.autoRead)speak($('#color-description').textContent);
}
$$('[data-shade]').forEach(b=>b.onclick=()=>{state.shade=b.dataset.shade;state.original=false;syncCompare();updateColor();});
$('#intensity').oninput=e=>{state.intensity=Number(e.target.value);updateColor(false);};
$('#intensity').onchange=()=>{if(settings.autoRead)speak($('#color-description').textContent);};
function syncCompare(){$('#compare-button').setAttribute('aria-pressed',String(state.original));$('#compare-button').innerHTML='<svg><use href="#i-eye"/></svg>'+(state.original?'返回试色':'查看原图');}
$('#compare-button').onclick=()=>{state.original=!state.original;syncCompare();draw();};
$('#read-color').onclick=()=>speak($('#color-description').textContent);$('#stop-speech').onclick=stopSpeech;
async function getModel(){
  if(!modelPromise)modelPromise=(async()=>{const {FaceLandmarker,FilesetResolver}=await import('./assets/vision/vision_bundle.mjs');const files=await FilesetResolver.forVisionTasks('./assets/vision/wasm');return FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'./assets/vision/face_landmarker.task',delegate:'CPU'},runningMode:'IMAGE',numFaces:2});})().catch(e=>{modelPromise=null;throw e;});
  return modelPromise;
}
async function locateFace(image,version,useSampleFallback=false){
  $('#landmark-status').textContent='正在加载本机识别组件并定位唇部，首次使用可能需要稍等…';
  try{
    const model=await getModel();if(version!==photoVersion)return;
    const result=model.detect(image);if(version!==photoVersion)return;
    if(result.faceLandmarks.length!==1){points=null;$('#landmark-status').textContent=result.faceLandmarks.length>1?'检测到多张脸。请使用只有一人的正面照片；当前未上色。':'未能定位到唇部。请换一张光线均匀的正面照片；当前未上色。';}
    else{const face=result.faceLandmarks[0];points={outer:outerIndices.map(i=>[face[i].x,face[i].y]),inner:innerIndices.map(i=>[face[i].x,face[i].y])};$('#landmark-status').textContent='已在本机完成唇部定位。照片没有上传，可切换颜色查看变化。';}
  }catch{if(version!==photoVersion)return;points=useSampleFallback?defaultPoints:null;$('#landmark-status').textContent=useSampleFallback?'本机定位组件暂不可用，已恢复示例预设唇区，可继续试色。':'唇部定位组件暂不可用，当前未上色。你可以恢复示例照片继续体验。';}
  updateColor(false);
}
async function loadDefault(detect=false){
  const version=++photoVersion;const img=new Image();img.src='assets/portrait.png';
  try{await img.decode();if(version!==photoVersion)return;sourceImage=img;points=defaultPoints;state.original=false;syncCompare();$('#image-label').textContent='AI 生成示例人像';$('#landmark-status').textContent='示例唇区已准备好。选择自己的照片后，会在本机定位唇部。';$('#photo-input').value='';updateColor(false);if(detect)await locateFace(img,version,true);}catch{toast('示例照片加载失败，请刷新重试。');}
}
$('#reset-photo').onclick=()=>loadDefault(true);
async function loadPersonalPhoto(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('请使用 JPG、PNG 或 WebP 照片。');$('#photo-input').value='';return;}
  if(file.size>15*1024*1024){toast('照片较大，请选择小于 15 MB 的图片。');$('#photo-input').value='';return;}
  const version=++photoVersion,url=URL.createObjectURL(file),img=new Image();
  try{
    img.src=url;await img.decode();if(version!==photoVersion)return;
    if(img.width*img.height>40000000){toast('照片分辨率过高，请缩小后重试。');return;}
    const reduced=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(img.width,img.height));reduced.width=Math.round(img.width*scale);reduced.height=Math.round(img.height*scale);reduced.getContext('2d').drawImage(img,0,0,reduced.width,reduced.height);
    sourceImage=reduced;points=null;state.original=false;syncCompare();$('#image-label').textContent='我的照片 · 仅本机';updateColor(false);await locateFace(reduced,version);
  }catch{toast('无法读取这张照片，请换一张 JPG、PNG 或 WebP 图片。');}finally{URL.revokeObjectURL(url);}
}
$('#photo-input').onchange=e=>{const file=e.target.files[0];if(file)loadPersonalPhoto(file);};
$('#camera-open').onclick=async()=>{
  openDialog('#camera-dialog');$('#camera-capture').disabled=true;$('#camera-status').textContent='正在请求摄像头权限…';
  try{if(!navigator.mediaDevices?.getUserMedia)throw Error('unavailable');cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280}},audio:false});if(!$('#camera-dialog').open){stopCamera();return;}$('#camera-video').srcObject=cameraStream;await $('#camera-video').play();$('#camera-capture').disabled=false;$('#camera-status').textContent='准备好后，点击下方按钮拍摄。';}catch{$('#camera-status').textContent='无法开启摄像头。请检查浏览器权限，或关闭此窗口后选择一张照片。';}
};
function stopCamera(){cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;$('#camera-video').srcObject=null;}
$('#camera-dialog').addEventListener('close',stopCamera);
$('#camera-capture').onclick=()=>{const video=$('#camera-video');if(!video.videoWidth)return;const capture=document.createElement('canvas');capture.width=video.videoWidth;capture.height=video.videoHeight;capture.getContext('2d').drawImage(video,0,0);capture.toBlob(blob=>{if(blob)loadPersonalPhoto(new File([blob],'camera.jpg',{type:'image/jpeg'}));},'image/jpeg',.92);closeDialog($('#camera-dialog'));};
window.addEventListener('pagehide',()=>{stopCamera();stopSpeech();recognition?.abort();});
$('#save-look').onclick=()=>{
  if(!sourceImage||!points){toast('请先使用一张已定位唇部的照片，或恢复示例照片。');return;}
  const previous=state.original;state.original=false;draw();
  const card=document.createElement('canvas');card.width=1000;card.height=1200;const c=card.getContext('2d');c.fillStyle='#2d1d39';c.fillRect(0,0,1000,1200);c.drawImage(canvas,50,50,900,900);c.fillStyle='#f0ddff';c.font='32px "Microsoft YaHei",sans-serif';c.fillText('无界 · BEAUTY BEYOND',55,1018);c.font='27px "Microsoft YaHei",sans-serif';c.fillText(`${SHADES[state.shade].name}  /  ${state.intensity}% · ${concentration(state.intensity)}`,55,1075);c.font='18px "Microsoft YaHei",sans-serif';c.fillStyle='#c2a7d0';c.fillText('照片试色示意 · 色彩以实物为准 · 由你定义自己的美',55,1135);
  state.original=previous;draw();card.toBlob(blob=>{if(!blob){toast('保存失败，请重试。');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`无界试色卡-${SHADES[state.shade].name}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('试色卡已生成，浏览器将保存到下载目录。');},'image/png');
};
const guideSteps=[{title:'先把空间准备好',body:'把唇部产品与纸巾放在固定、容易触及的位置。坐稳后再开始；如果拿取或握持不方便，可以请同行者协助。'},{title:'先从少量开始',body:'确认你愿意使用这款产品后，从少量薄涂开始。可以先涂下唇中央，再轻轻向两侧延展。觉得不舒服时就停下。'},{title:'轻轻抿合，慢慢确认',body:'轻轻抿一下双唇，让颜色自然过渡。需要时，请信任的人帮你确认边缘；这个 Demo 无法判断真实上妆是否均匀。'},{title:'喜欢的程度，由你决定',body:'现在可以停在薄涂，也可以再加一点颜色。你可以保存试色卡，或前往温暖同行查看真人协助流程。'}];
function renderGuide(){const s=guideSteps[guideIndex];$('#guide-content').replaceChildren();for(const [tag,cls,text] of [['span','step-number',`0${guideIndex+1} / 04`],['h3','',s.title],['p','',s.body]]){const el=document.createElement(tag);el.className=cls;el.textContent=text;$('#guide-content').append(el);}$('#guide-prev').disabled=guideIndex===0;$('#guide-next').textContent=guideIndex===3?'完成指引':'下一步';if(settings.autoRead)speak(`第 ${guideIndex+1} 步。${s.title}。${s.body}`);}
$('#guide-open').onclick=()=>{guideIndex=0;renderGuide();openDialog('#guide-dialog');};$('#guide-prev').onclick=()=>{guideIndex=Math.max(0,guideIndex-1);renderGuide();};$('#guide-next').onclick=()=>{if(guideIndex===3)closeDialog($('#guide-dialog'));else{guideIndex++;renderGuide();}};$('#guide-read').onclick=()=>{const s=guideSteps[guideIndex];speak(`第 ${guideIndex+1} 步。${s.title}。${s.body}`);};
$('#booking-form').onsubmit=e=>{
  e.preventDefault();const rows=[['所需帮助',new FormData(e.target).get('service')],['见面方式',$('#support-mode').value],['希望时间',$('#support-time').value],['提前告知',$('#support-note').value.trim()||'无补充需求'],['携带偏好',$('#share-plan').checked?`${SHADES[state.shade].name} · ${state.intensity}% · ${PERSONAS[state.persona]}`:'不携带试色与体验偏好']];
  const dl=document.createElement('dl');for(const [key,value] of rows){const row=document.createElement('div');row.className='summary-row';const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;row.append(dt,dd);dl.append(row);}$('#booking-summary').replaceChildren(dl);openDialog('#booking-dialog');
};
$('#booking-back').onclick=()=>closeDialog($('#booking-dialog'));$('#booking-confirm').onclick=()=>{closeDialog($('#booking-dialog'));toast('体验完成。协助安排仅为模拟，没有发送任何预约。');if(tourIndex>=0)endTour();};
const tourSteps=[{page:'companion',text:'第 1 站：选择体验方式，点一个话题，听听小界的建议。',next:'去试色'},{page:'mirror',text:'第 2 站：切换一抹颜色，听描述，再对比原图。',next:'找真人协助'},{page:'support',text:'第 3 站：选择帮助方式，预览一份模拟协助安排。',next:'完成演示'}];
function renderTour(){
  let strip=$('#tour-strip');if(!strip){strip=document.createElement('div');strip.id='tour-strip';strip.className='tour-strip';$('.site-header').after(strip);}
  strip.replaceChildren();const text=document.createElement('span');text.textContent=tourSteps[tourIndex].text;const next=document.createElement('button');next.className='subtle-link';next.textContent=tourSteps[tourIndex].next+' →';next.onclick=()=>{if(tourIndex===2){endTour();toast('完整流程已体验，可继续自由探索。');}else{tourIndex++;renderTour();}};const close=document.createElement('button');close.className='tour-close';close.textContent='退出引导';close.onclick=endTour;strip.append(text,next,close);location.hash=tourSteps[tourIndex].page;
}
function endTour(){tourIndex=-1;$('#tour-strip')?.remove();}
$('#tour-start').onclick=()=>{tourIndex=0;renderTour();};
syncRecommendation();route();
