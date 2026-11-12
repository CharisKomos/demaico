// DeMAICo — site script
/* ---------- mobile menu ---------- */
const burger=document.getElementById('burger'),mnav=document.getElementById('mnav');
if(burger)burger.onclick=()=>{mnav.classList.toggle('open');burger.setAttribute('aria-expanded',mnav.classList.contains('open'))};

/* ---------- slim sticky CTA (hidden on the contact page) ---------- */
const slimEl=document.getElementById('slimcta');
function slim(){if(!slimEl)return;
  const show=window.scrollY>window.innerHeight*0.9&&(window.innerHeight+window.scrollY)<document.body.scrollHeight-260;
  slimEl.classList.toggle('show',show)}
window.addEventListener('scroll',slim,{passive:true});

/* ---------- SPC chart engine ---------- */
function makeChart(svg,opts){
  const W=520,H=opts.h,N=80,CL=4.122,S=0.231,UCL=CL+3*S,LCL=CL-3*S;
  const min=CL-4.3*S,max=CL+4.3*S, y=v=>H-8-(v-min)/(max-min)*(H-16), x=i=>8+i*(W-16)/(N-1);
  let data=[],shift=0,shiftT=0,ewma=CL,cp=0,cm=0;
  for(let i=0;i<N;i++)data.push(CL+gauss()*S*0.8);
  function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  function tick(){
    if(shiftT<=0&&Math.random()<0.035){shift=(Math.random()<.5?-1:1)*S*(1.4+Math.random()*1.2);shiftT=14+Math.random()*10}
    if(shiftT>0)shiftT--; else shift*=0.8;
    const v=CL+shift+gauss()*S*0.8; data.push(v); data.shift();
    ewma=0.2*v+0.8*ewma; cp=Math.max(0,cp+(v-CL)/S-0.5); cm=Math.max(0,cm-(v-CL)/S-0.5);
    const rules=opts.rules?opts.rules():{we:true,cusum:true,ewma:false};
    let hit=null; const n=data.length-1;
    if(rules.we){
      if(v>UCL||v<LCL) hit={src:'rule:WE-1',msg:'point beyond 3σ',val:v.toFixed(3)};
      else{const last=data.slice(-8);if(last.every(d=>d>CL)||last.every(d=>d<CL))hit={src:'rule:WE-4',msg:'8 points one side of CL',val:v.toFixed(3)}}
    }
    if(!hit&&rules.cusum&&(cp>4||cm>4)){hit={src:cp>4?'rule:CUSUM+':'rule:CUSUM-',msg:(cp>4?'upward':'downward')+' shift',val:Math.max(cp,cm).toFixed(2)+' > 4.0'};cp=0;cm=0}
    if(!hit&&rules.ewma){const L=CL+3*S*Math.sqrt(0.2/1.8);if(ewma>L||ewma<2*CL-L)hit={src:'rule:EWMA',msg:'λ=0.2 limit crossed',val:ewma.toFixed(3)}}
    flags.push(hit?1:0); flags.shift();
    draw(rules.ewma?ewmaLine(v):null);
    if(hit&&opts.onHit)opts.onHit(hit,v);
    if(opts.onTick)opts.onTick(data);
  }
  let flags=new Array(N).fill(0), ew=new Array(N).fill(CL);
  function ewmaLine(v){ew.push(ewma);ew.shift();return ew}
  function draw(ewl){
    let s=`<rect width="${W}" height="${H}" fill="transparent"/>`;
    [CL-2*S,CL-S,CL+S,CL+2*S].forEach(l=>s+=`<line x1="0" x2="${W}" y1="${y(l)}" y2="${y(l)}" stroke="#2A2E35" stroke-dasharray="2 4"/>`);
    s+=`<line x1="0" x2="${W}" y1="${y(UCL)}" y2="${y(UCL)}" stroke="#E5625A" stroke-dasharray="6 4"/><line x1="0" x2="${W}" y1="${y(LCL)}" y2="${y(LCL)}" stroke="#E5625A" stroke-dasharray="6 4"/><line x1="0" x2="${W}" y1="${y(CL)}" y2="${y(CL)}" stroke="#8D929B" stroke-dasharray="3 3"/>`;
    s+=`<text x="${W-6}" y="${y(UCL)-4}" fill="#E5625A" font-size="10" text-anchor="end" font-family="IBM Plex Mono">UCL</text><text x="${W-6}" y="${y(LCL)+12}" fill="#E5625A" font-size="10" text-anchor="end" font-family="IBM Plex Mono">LCL</text>`;
    if(ewl)s+=`<polyline fill="none" stroke="#B48CF2" stroke-width="1.6" points="${ewl.map((d,i)=>x(i)+','+y(d)).join(' ')}"/>`;
    s+=`<polyline fill="none" stroke="#4FA3F7" stroke-width="1.6" stroke-linejoin="round" points="${data.map((d,i)=>x(i)+','+y(d)).join(' ')}"/>`;
    data.forEach((d,i)=>{if(flags[i]||d>UCL||d<LCL)s+=`<circle cx="${x(i)}" cy="${y(d)}" r="4" fill="${d>UCL||d<LCL?'#E5625A':'#E8890C'}" stroke="#121417" stroke-width="1.5"/>`});
    svg.innerHTML=s;
  }
  draw();
  return {tick,CL,S,UCL,LCL};
}
function stats(data,c){
  const m=data.reduce((a,b)=>a+b,0)/data.length, sd=Math.sqrt(data.reduce((a,b)=>a+(b-m)**2,0)/(data.length-1));
  const usl=c.CL+3.6*c.S,lsl=c.CL-3.6*c.S; const cpk=Math.min(usl-m,m-lsl)/(3*sd);
  return {cpk};
}
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* hero chart */
let vio=0;
const heroSvg=document.getElementById('heroChart');
const hero=heroSvg&&makeChart(document.getElementById('heroChart'),{h:210,
  onHit:(h)=>{vio++;document.getElementById('h-vio').textContent=vio;const t=document.getElementById('heroToast');t.textContent=`⚠ ${h.src} · ${h.msg}`;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600)},
  onTick:(d)=>{if(!hero)return;const s=stats(d,hero);document.getElementById('h-cpk').textContent=s.cpk.toFixed(2);document.getElementById('h-sig').textContent=Math.min(6,s.cpk*3).toFixed(2);document.getElementById('h-oee').textContent=(0.84+Math.random()*0.04).toFixed(2)}
});
/* platform chart */
const R={we:true,cusum:true,ewma:false};
const platSvg=document.getElementById('platChart');
document.querySelectorAll('#rules button').forEach(b=>b.onclick=()=>{R[b.dataset.r]=!R[b.dataset.r];b.classList.toggle('on',R[b.dataset.r])});
const WASTE=['Defects','Overproduction','Waiting','Non-utilised talent','Transport','Inventory','Motion','Extra-processing'];
const wcount=[9,3,6,1,2,3,1,4];
function drawWaste(){if(!document.getElementById('waste'))return;const mx=Math.max(...wcount);document.getElementById('waste').innerHTML=WASTE.map((w,i)=>`<div><span>${w.length>13?w.slice(0,12)+'…':w}</span><i style="width:${wcount[i]/mx*100}%"></i><span>${wcount[i]}</span></div>`).join('')}
drawWaste();
const plat=platSvg&&makeChart(document.getElementById('platChart'),{h:200,rules:()=>R,
  onHit:(h)=>{
    const wi=h.src.includes('CUSUM')?0:h.src.includes('WE-4')?2:h.src.includes('EWMA')?7:0; wcount[wi]++; drawWaste();
    const f=document.getElementById('feed'); const el=document.createElement('div');
    el.innerHTML=`⚠ PP2_MFI_PV<br>${h.src.replace('rule:','')} · ${h.msg}<small>${new Date().toLocaleTimeString()} · → ${WASTE[wi]}</small>`;
    f.prepend(el); while(f.children.length>4)f.lastChild.remove();
    document.getElementById('audit').textContent=`source     ${h.src}\nvalue      ${h.val}\nwaste      ${WASTE[wi]}\ntimestamp  ${new Date().toISOString().slice(0,19)}Z\nml_model   not invoked (rule precedence)`;
  },
  onTick:(d)=>{if(!plat)return;const s=stats(d,plat);document.getElementById('p-cpk').textContent=s.cpk.toFixed(2);document.getElementById('p-sig').textContent=Math.min(6,s.cpk*3).toFixed(2);document.getElementById('p-oee').textContent=(0.84+Math.random()*0.04).toFixed(2)}
});
if(hero||plat)setInterval(()=>{if(document.hidden)return;if(hero)hero.tick();if(plat)plat.tick()},reduce?2400:700);

/* capabilities explorer */
const CAPS=[
 ['Real-Time Measurement','Historian tags scored against CTQ spec limits every 5 seconds. Cp, Cpk, OEE and sigma level update continuously.'],
 ['Anomaly Detection','Rule-first engine: deterministic rules (priority ≥ 80) take precedence over ML. CUSUM, EWMA and Western Electric on every tag.'],
 ['Waste Classification','Every deviation auto-classified against the 8 DOWNTIME wastes — an audit-ready evidence base for Lean teams.'],
 ['Improvement Tracking','Actions logged with baseline and target sigma; open → in progress → verified → closed, with the before/after delta.'],
 ['GMP Audit Traceability','Each detection records source (rule or model version), threshold and timestamp. Aligned with 21 CFR Part 11 and Annex 11.'],
 ['Multi-Site Fleet View','Sites ranked by health score, critical anomalies, SPC violations and top waste — triage in one view.']];
const capsEl=document.getElementById('caps');
if(capsEl){capsEl.innerHTML=CAPS.map((c,i)=>`<button class="cap${i===0?' on':''}" data-c="${i+1}"><span class="n">0${i+1}</span><b>${c[0]}</b><p>${c[1]}</p></button>`).join('');
function hl(n){document.querySelectorAll('.cap').forEach(c=>c.classList.toggle('on',c.dataset.c==n));document.querySelectorAll('.zone').forEach(z=>{const on=z.dataset.z.split(' ').includes(String(n));z.classList.toggle('hi',on);z.classList.toggle('dim',!on)})}
capsEl.onclick=e=>{const b=e.target.closest('.cap');if(b)hl(b.dataset.c)};
hl(1);
}
document.querySelectorAll('.shot-toggle button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.shot-toggle button').forEach(x=>x.classList.toggle('on',x===b));const s=b.dataset.s==='1';document.getElementById('shot').style.display=s?'block':'none';document.getElementById('dash').parentElement.style.display=s?'none':''});

/* DMAIC stepper */
const D=[
 ['D','Define',"We agree the problem, the customer's CTQs, the goal and what \"better\" means — before proposing a single change.","CTQs and their spec limits are configured once, so everything after is measured against the same definition.",['Project charter','CTQ tree with spec limits','Agreed success measure']],
 ['M','Measure','We baseline how the process really performs today, using the systems you already run.','Connects to historian, MES or batch exports and back-loads history to compute Cp, Cpk, OEE and sigma level.',['Validated measurement system','Capability baseline','Data access in place']],
 ['A','Analyse','We separate real drivers from noise and trace each issue to the waste or variation behind it.','SPC rules and CUSUM/EWMA flag shifts; every deviation is classified against the 8 DOWNTIME wastes.',['Root-cause evidence','Pareto of losses','What to fix — and what to leave']],
 ['I','Improve','We design, pilot and prove the fix — process changes, new ways of working, supporting tools.','Each action is logged with baseline and target sigma and tracked to a verified before/after.',['Piloted, validated changes','Before/after sigma delta','Updated standard work']],
 ['C','Control','We lock in the gain with controls and routines, then hand ownership to your team.','Keeps scoring every tag in real time and raises traceable alerts the moment the process drifts.',['Control plan','Live control screens','Trained owners']]];
const stepsEl=document.getElementById('steps');
if(stepsEl){stepsEl.innerHTML=D.map((d,i)=>`<button class="step${i===0?' on':''}" role="tab" aria-selected="${i===0}" data-i="${i}"><div class="L">${d[0]}</div><div class="W">${d[1]}</div></button>`).join('');
function step(i){const d=D[i];stepsEl.querySelectorAll('.step').forEach((b,j)=>{b.classList.toggle('on',i==j);b.setAttribute('aria-selected',i==j)});
 document.getElementById('stepBody').innerHTML=`<div class="col people"><h4>Our consultants</h4><p>${d[2]}</p></div><div class="col tool"><h4>The platform</h4><p>${d[3]}</p></div><div class="col out"><h4>You keep</h4><ul>${d[4].map(x=>`<li>${x}</li>`).join('')}</ul></div>`}
stepsEl.onclick=e=>{const b=e.target.closest('.step');if(b)step(+b.dataset.i)};
step(0);
}

/* sigma calculator */
function erfinv(x){const a=0.147,ln=Math.log(1-x*x),t=2/(Math.PI*a)+ln/2;return Math.sign(x)*Math.sqrt(Math.sqrt(t*t-ln/a)-t)}
function zOf(p){return Math.SQRT2*erfinv(2*p-1)}
let lastCalc='';
function calc(){
  const u=+document.getElementById('c-units').value||1,d=Math.max(0,+document.getElementById('c-def').value||0),o=+document.getElementById('c-opp').value||1;
  const dpmo=Math.min(999999,d/(u*o)*1e6), y=1-dpmo/1e6;
  let sig=dpmo<=0?6:Math.max(0,Math.min(6,zOf(Math.max(1e-9,Math.min(1-1e-9,y)))+1.5));
  document.getElementById('c-sig').innerHTML=sig.toFixed(1)+'<small>σ</small>';
  document.getElementById('c-dpmo').textContent=Math.round(dpmo).toLocaleString();
  document.getElementById('c-yield').textContent=(y*100).toFixed(2)+'%';
  document.getElementById('c-g').style.left=`calc(${Math.max(0,(sig-1)/5*100)}% - 2px)`;
  document.getElementById('c-verdict').textContent= sig<3?'Large, costly variation. A Diagnostic will usually find quick wins in the Analyse phase.':sig<4?'Typical industry average. Targeted DMAIC projects tend to pay back well from here.':sig<5?'A capable process. The focus shifts to holding the gain and finding the next CTQ.':'Excellent. Continuous monitoring protects this level against drift.';
  lastCalc=`From the sigma check: ${sig.toFixed(1)}σ · ${Math.round(dpmo).toLocaleString()} DPMO (${d} defects / ${u} units × ${o} opportunities)`;
}
if(document.getElementById('c-units')){['c-units','c-def','c-opp'].forEach(id=>document.getElementById(id).addEventListener('input',calc));calc();
document.getElementById('c-cta').addEventListener('click',()=>{try{sessionStorage.setItem('dm_sigma',lastCalc)}catch(e){}});}

/* contact wizard — posts to Formspree */
const wiz=document.getElementById('wiz');
if(wiz){
  let ws=0;const steps=wiz.querySelectorAll('.wstep'),bars=wiz.querySelectorAll('.prog i');
  try{const p=sessionStorage.getItem('dm_sigma');if(p){const el=document.getElementById('prefill');el.textContent=p;el.style.display='block';document.getElementById('f-sigma').value=p}}catch(e){}
  wiz.querySelectorAll('.opts').forEach(g=>g.onclick=e=>{const b=e.target.closest('.opt');if(!b)return;b.classList.toggle('on');b.setAttribute('aria-pressed',b.classList.contains('on'));
    document.getElementById('f-'+g.dataset.group).value=[...g.querySelectorAll('.opt.on')].map(o=>o.textContent).join(', ')});
  const next=document.getElementById('next'),back=document.getElementById('back'),err=document.getElementById('wizErr');
  function show(i){ws=i;steps.forEach((s,j)=>s.classList.toggle('on',j===i));bars.forEach((b,j)=>b.classList.toggle('on',j<=i));
    back.style.visibility=i>0&&i<4?'visible':'hidden';next.textContent=i===3?'Send message →':'Continue →';
    document.getElementById('wnav').style.display=i===4?'none':'flex';
    const f=steps[i].querySelector('textarea,input:not([type=hidden])');if(f&&i>0)f.focus({preventScroll:true})}
  async function send(){
    const n=document.getElementById('f-name'),e=document.getElementById('f-email');
    [n,e].forEach(x=>x.style.borderColor='');
    if(!n.value.trim()){n.style.borderColor='var(--alarm)';n.focus();return}
    if(!/^\S+@\S+\.\S+$/.test(e.value)){e.style.borderColor='var(--alarm)';e.focus();return}
    next.disabled=true;next.textContent='Sending…';err.style.display='none';
    try{
      const r=await fetch(wiz.action,{method:'POST',body:new FormData(wiz),headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error(r.status);
      try{sessionStorage.removeItem('dm_sigma')}catch(_){}
      show(4);
    }catch(_){err.style.display='block';next.textContent='Send message →'}
    next.disabled=false;
  }
  next.onclick=()=>{if(ws===3)send();else show(Math.min(3,ws+1))};
  back.onclick=()=>show(Math.max(0,ws-1));
  wiz.addEventListener('submit',e=>{e.preventDefault();if(ws===3)send();else show(ws+1)});
}
