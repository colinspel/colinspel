"""Game-style 'broadcast camera' renderer for the goal player.

A pinhole camera sits behind the attack, above the pitch, and follows the ball.
Players are drawn as running footballer figures (back view, shirt numbers) with
shadows, a striped pitch, a 3D goal and a game-style HUD. Generic look: no
league, club or game branding, no player likenesses.
Inserted into PLAYER_JS, so it can use lerpTrack / opacity / mlabel.
"""

GAME_CSS = """
.gp-game{width:100%;max-width:440px;aspect-ratio:4/5;display:block;margin:8px auto 0;border-radius:10px;background:#0c1522;touch-action:manipulation}
.gp[data-mode="game"] .gp-pitch{display:none}.gp[data-mode="tactical"] .gp-game{display:none}
.gp-view{font-weight:600}
"""

GAME_JS = r"""
const KIT={L:{shirt:'#d81e2c',shirt2:'#a5121e',shorts:'#141414',socks:'#d81e2c',num:'#ffffff'},
           O:{shirt:'#f2f3f5',shirt2:'#c9cdd3',shorts:'#1d2b4f',socks:'#f2f3f5',num:'#1d2b4f'},
           GL:{shirt:'#2fbf71',shirt2:'#1f8f52',shorts:'#2fbf71',socks:'#2fbf71',num:'#0b2a18'},
           GO:{shirt:'#f5d33a',shirt2:'#c9a815',shorts:'#202020',socks:'#f5d33a',num:'#202020'}};
const SKIN='#c99b72', HAIR='#2a2018', BOOT='#111';
const ABBR={'Bayern Munich':'FCB','Borussia Dortmund':'BVB','RB Leipzig':'RBL','VfB Stuttgart':'VFB','Eintracht Frankfurt':'SGE',
 'Hoffenheim':'TSG','Freiburg':'SCF','Augsburg':'FCA','Werder Bremen':'SVW','Borussia Mönchengladbach':'BMG','Wolfsburg':'WOB',
 'Union Berlin':'FCU','Bochum':'BOC','FC Heidenheim':'HDH','FSV Mainz 05':'M05','FC Köln':'KOE','Darmstadt 98':'D98'};

function makeGame(canvas){
  const ctx=canvas.getContext('2d');
  let W=0,H=0,K=1,dpr=1,focal=0, cam={x:0,y:40,z:13,phi:.40};
  function resize(){
    const r=canvas.getBoundingClientRect(); dpr=Math.min(2.5,window.devicePixelRatio||1);
    W=Math.max(200,r.width); H=W*1.25; K=W/400; canvas.width=W*dpr; canvas.height=H*dpr; focal=H*1.12;
  }
  resize(); addEventListener('resize',()=>{resize(); if(last) render(...last)});
  // ---- projection: world (x along pitch, y across, z up) -> screen
  function proj(x,y,z){
    const dx=x-cam.x, dy=y-cam.y, dz=z-cam.z, c=Math.cos(cam.phi), s=Math.sin(cam.phi);
    const depth=dx*c-dz*s; if(depth<.5) return null;
    const up=dx*s+dz*c;
    return [W/2+focal*dy/depth, H/2-focal*up/depth, focal/depth, depth];
  }
  function poly(pts,fill){
    const P=pts.map(p=>proj(...p)); if(P.some(p=>!p)) return;
    ctx.beginPath(); P.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
  }
  function line3(a,b,n=1){
    // clip against the near plane by sampling forward of the camera
    const x0=cam.x+2; let A=a.slice(), B=b.slice();
    if(A[0]<x0&&B[0]<x0) return;
    if(A[0]<x0){const f=(x0-A[0])/(B[0]-A[0]); A=[x0,A[1]+(B[1]-A[1])*f,A[2]+(B[2]-A[2])*f];}
    if(B[0]<x0){const f=(x0-B[0])/(A[0]-B[0]); B=[x0,B[1]+(A[1]-B[1])*f,B[2]+(A[2]-B[2])*f];}
    const p=proj(...A), q=proj(...B); if(!p||!q) return;
    ctx.moveTo(p[0],p[1]); ctx.lineTo(q[0],q[1]);
  }
  function arc3(cx,cy,r,a0,a1){
    const n=40; let prev=null;
    for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n, p=[cx+r*Math.cos(a),cy+r*Math.sin(a),0];
      if(prev) line3(prev,p); prev=p;}
  }
  // ---- static scene
  function stadium(){
    const g=ctx.createLinearGradient(0,0,0,H*.5); g.addColorStop(0,'#05080e'); g.addColorStop(1,'#16212f');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // crowd band behind the far goal: deterministic speckle
    const hz=H/2-focal*Math.tan(cam.phi);
    const far=proj(126,40,0); const top=far?far[1]:hz;
    let seed=7; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    for(let i=0;i<420;i++){const x=rnd()*W, y=top-rnd()*H*.16; const c=60+rnd()*90|0;
      ctx.fillStyle=`rgba(${c+40},${c+30},${c+30},${.35+rnd()*.4})`; ctx.fillRect(x,y,1.6,1.6);}
    // floodlight glow
    const gl=ctx.createRadialGradient(W*.5,top-H*.05,0,W*.5,top-H*.05,W*.9); gl.addColorStop(0,'rgba(255,255,240,.10)'); gl.addColorStop(1,'rgba(255,255,240,0)');
    ctx.fillStyle=gl; ctx.fillRect(0,0,W,H);
  }
  function pitch(){
    const x0=Math.max(-8,cam.x+3);
    // grass beyond the lines
    poly([[x0,-10,0],[128,-10,0],[128,90,0],[x0,90,0]],'#2b6b33');
    // mowing stripes, 6 yards
    for(let s=0;s<20;s++){const a=s*6, b=a+6; if(b<x0) continue;
      poly([[Math.max(a,x0),-2,0],[b,-2,0],[b,82,0],[Math.max(a,x0),82,0]], s%2?'#3a8b3f':'#33803a');}
    // subtle across-the-pitch stripes for texture
    ctx.save(); ctx.globalAlpha=.06;
    for(let k=0;k<8;k++){ if(k%2) continue; poly([[x0,k*10,0],[120,k*10,0],[120,k*10+10,0],[x0,k*10+10,0]],'#ffffff'); }
    ctx.restore();
    ctx.strokeStyle='rgba(255,255,255,.88)'; ctx.lineWidth=1.6; ctx.lineCap='round'; ctx.beginPath();
    line3([0,0,0],[120,0,0]); line3([0,80,0],[120,80,0]); line3([120,0,0],[120,80,0]); line3([60,0,0],[60,80,0]); line3([0,0,0],[0,80,0]);
    line3([102,18,0],[120,18,0]); line3([102,62,0],[120,62,0]); line3([102,18,0],[102,62,0]);
    line3([114,30,0],[120,30,0]); line3([114,50,0],[120,50,0]); line3([114,30,0],[114,50,0]);
    line3([18,18,0],[0,18,0]); line3([18,62,0],[0,62,0]); line3([18,18,0],[18,62,0]);
    arc3(60,40,10,0,Math.PI*2);
    arc3(108,40,10,Math.PI*0.705,Math.PI*1.295);   // the D (outside the box only)
    ctx.stroke();
    const spot=proj(108,40,0); if(spot){ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(spot[0],spot[1],spot[2]*.13,spot[2]*.05,0,0,7); ctx.fill();}
  }
  function goalFrame(){
    const y1=36.34,y2=43.66,h=2.67,d=2.2;
    ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=.8; ctx.beginPath();
    for(let i=0;i<=8;i++){const y=y1+(y2-y1)*i/8; line3([120,y,h],[120+d,y,h*.75]); line3([120+d,y,h*.75],[120+d,y,0]);}
    for(let k=0;k<=4;k++){const z=h*k/4; line3([120+d,y1,z*.75],[120+d,y2,z*.75]); line3([120,y1,z],[120+d,y1,z*.75]); line3([120,y2,z],[120+d,y2,z*.75]);}
    ctx.stroke();
    ctx.strokeStyle='#fafafa'; ctx.lineWidth=3; ctx.beginPath();
    line3([120,y1,0],[120,y1,h]); line3([120,y2,0],[120,y2,h]); line3([120,y1,h],[120,y2,h]); ctx.stroke();
  }
  // ---- a footballer, back view, standing on (x,y)
  function footballer(p,kit,num,phase,amp,lean,alpha,hl){
    const s=p[2], X=p[0], Y=p[1];        // s = pixels per yard
    const u=v=>v*s;
    ctx.save(); ctx.globalAlpha=alpha; ctx.translate(X,Y);
    // shadow
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(u(.12),0,u(.42),u(.12),0,0,7); ctx.fill();
    if(hl){ctx.strokeStyle='rgba(255,230,90,.95)'; ctx.lineWidth=Math.max(1.2,u(.05)); ctx.beginPath(); ctx.ellipse(0,0,u(.55),u(.17),0,0,7); ctx.stroke();}
    ctx.rotate(lean);
    const sw=Math.sin(phase)*amp, hip=-u(.95);
    const leg=(dir,col)=>{ // thigh + shin with knee bend
      const a=dir*sw*.55, kx=Math.sin(a)*u(.46), ky=hip+Math.cos(a)*u(.46);
      const b=a+Math.max(0,-dir*sw)*.9, fx=kx+Math.sin(b)*u(.46), fy=ky+Math.cos(b)*u(.46);
      ctx.strokeStyle=kit.socks; ctx.lineWidth=u(.15); ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(dir*u(.1),hip); ctx.lineTo(kx+dir*u(.08),ky); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(kx+dir*u(.08),ky); ctx.lineTo(fx+dir*u(.08),fy); ctx.stroke();
      ctx.fillStyle=BOOT; ctx.beginPath(); ctx.ellipse(fx+dir*u(.08),fy,u(.09),u(.06),0,0,7); ctx.fill();
      // skin at the knee
      ctx.strokeStyle=SKIN; ctx.lineWidth=u(.13); ctx.beginPath(); ctx.moveTo(dir*u(.1),hip+u(.15)); ctx.lineTo(kx+dir*u(.08),ky); ctx.stroke();
    };
    leg(-1); leg(1);
    // shorts
    ctx.fillStyle=kit.shorts; ctx.beginPath(); ctx.roundRect(-u(.25),hip-u(.24),u(.5),u(.3),u(.06)); ctx.fill();
    // arms swing opposite the legs
    const arm=(dir)=>{const a=-dir*sw*.6; ctx.strokeStyle=SKIN; ctx.lineWidth=u(.1);
      ctx.beginPath(); ctx.moveTo(dir*u(.28),-u(1.55)); ctx.lineTo(dir*u(.33)+Math.sin(a)*u(.2),-u(1.55)+Math.cos(a)*u(.42)); ctx.stroke();
      ctx.strokeStyle=kit.shirt; ctx.lineWidth=u(.13); ctx.beginPath(); ctx.moveTo(dir*u(.27),-u(1.58)); ctx.lineTo(dir*u(.31)+Math.sin(a)*u(.07),-u(1.58)+Math.cos(a)*u(.18)); ctx.stroke();};
    arm(-1); arm(1);
    // torso with shading
    const tg=ctx.createLinearGradient(-u(.3),0,u(.3),0); tg.addColorStop(0,kit.shirt2); tg.addColorStop(.45,kit.shirt); tg.addColorStop(1,kit.shirt2);
    ctx.fillStyle=tg; ctx.beginPath(); ctx.roundRect(-u(.29),-u(1.66),u(.58),u(.5),u(.1)); ctx.fill();
    if(num&&s>7){ctx.fillStyle=kit.num; ctx.font=`800 ${u(.26)}px system-ui,sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(num,0,-u(1.4));}
    // neck, head, hair (back of head)
    ctx.fillStyle=SKIN; ctx.fillRect(-u(.05),-u(1.74),u(.1),u(.1));
    ctx.beginPath(); ctx.arc(0,-u(1.84),u(.14),0,7); ctx.fill();
    ctx.fillStyle=HAIR; ctx.beginPath(); ctx.arc(0,-u(1.87),u(.135),Math.PI*.95,Math.PI*2.05); ctx.fill();
    ctx.restore();
  }
  function ball3(p,z,sp){
    const gp=proj(sp[0],sp[1],0), bp=proj(sp[0],sp[1],z+.12); if(!gp||!bp) return;
    ctx.fillStyle=`rgba(0,0,0,${.32/(1+z*.3)})`; ctx.beginPath(); ctx.ellipse(gp[0],gp[1],gp[2]*.2,gp[2]*.07,0,0,7); ctx.fill();
    const r=Math.max(2.2,bp[2]*.13);
    const g=ctx.createRadialGradient(bp[0]-r*.35,bp[1]-r*.35,r*.1,bp[0],bp[1],r); g.addColorStop(0,'#fff'); g.addColorStop(1,'#c9ccd1');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bp[0],bp[1],r,0,7); ctx.fill();
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(bp[0]+r*.15,bp[1]-r*.1,r*.32,0,7); ctx.fill();
  }
  function tagAbove(p,text){
    const hp=[p[0],p[1]-p[2]*2.25]; ctx.save(); ctx.translate(hp[0],hp[1]); ctx.scale(K,K);
    ctx.font='700 12px system-ui,sans-serif';
    const w=ctx.measureText(text).width+14;
    ctx.fillStyle='rgba(10,14,22,.82)'; ctx.beginPath(); ctx.roundRect(-w/2,-30,w,19,9.5); ctx.fill();
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,0,-20.5);
    ctx.fillStyle='#ffd94a'; ctx.beginPath(); ctx.moveTo(-5,-9); ctx.lineTo(5,-9); ctx.lineTo(0,-3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function hud(goal,t){
    const m=goal.meta, opp=ABBR[m.opponent]||m.opponent.slice(0,3).toUpperCase();
    const [lf,la]=m.score_before, goalNow=t>=goal.dur-1.15;
    const L=m.home?'LEV':opp, R=m.home?opp:'LEV';
    const sl=m.home?(goalNow?lf+1:lf):la, sr=m.home?la:(goalNow?lf+1:lf);
    // match clock: count up to the goal moment
    const tot=(m.minute*60+m.second)-Math.max(0,goal.dur-1.2-t);
    const mm=Math.max(0,Math.floor(tot/60)), ss=Math.max(0,Math.floor(tot%60));
    ctx.save(); ctx.scale(K,K); const Wk=W/K;
    ctx.font='800 13px system-ui,sans-serif'; ctx.textBaseline='middle';
    const x=12,y=12,h=26;
    ctx.fillStyle='rgba(8,12,20,.88)'; ctx.beginPath(); ctx.roundRect(x,y,158,h,6); ctx.fill();
    ctx.fillStyle=m.home?'#d81e2c':'#f2f3f5'; ctx.fillRect(x+6,y+6,4,14);
    ctx.fillStyle=m.home?'#f2f3f5':'#d81e2c'; ctx.fillRect(x+86,y+6,4,14);
    ctx.fillStyle='#fff'; ctx.textAlign='left';
    ctx.fillText(L,x+14,y+h/2); ctx.fillText(R,x+94,y+h/2);
    ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.fillText(`${sl}-${sr}`,x+67,y+h/2);
    ctx.fillStyle='rgba(8,12,20,.88)'; ctx.beginPath(); ctx.roundRect(x+162,y,52,h,6); ctx.fill();
    ctx.fillStyle='#9fe870'; ctx.fillText(`${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`,x+188,y+h/2);
    ctx.fillStyle='rgba(8,12,20,.75)'; ctx.beginPath(); ctx.roundRect(Wk-74,y,62,h,6); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='700 11px system-ui,sans-serif'; ctx.fillText(`xG ${m.xg.toFixed(2)}`,Wk-43,y+h/2); ctx.restore();
    if(goalNow){
      const k=Math.min(1,(t-(goal.dur-1.15))/.35);
      ctx.save(); ctx.globalAlpha=k;
      ctx.fillStyle='rgba(216,30,44,.92)'; ctx.fillRect(0,H*.70,W,H*.13);
      ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font=`900 ${Math.round(W*.13)}px system-ui,sans-serif`;
      ctx.fillText('GOAL',W/2,H*.745);
      ctx.font=`700 ${Math.round(W*.042)}px system-ui,sans-serif`;
      ctx.fillText(`${m.scorer.toUpperCase()} ${mlabel(m)}${m.assist?'  ·  ASSIST '+m.assist.toUpperCase():''}`,W/2,H*.798);
      ctx.restore();
    }
  }
  // ---- ball height: long passes travel in an arc
  function ballZ(goal,t){
    const b=goal.ball;
    for(let i=1;i<b.length;i++){ if(b[i][0]>=t){const a=b[i-1],c=b[i],dt=c[0]-a[0],dist=Math.hypot(c[1]-a[1],c[2]-a[2]);
      if(dt<.35||dist<20) return 0; const f=(t-a[0])/dt; return 4*Math.min(5,dist*.12)*f*(1-f);}}
    return 0;
  }
  // per-track cumulative distance -> stride phase (deterministic, so scrubbing works)
  function prep(goal){
    goal.tracks.forEach(tr=>{let d=0; tr.cum=[0]; for(let i=1;i<tr.pts.length;i++){d+=Math.hypot(tr.pts[i][1]-tr.pts[i-1][1],tr.pts[i][2]-tr.pts[i-1][2]); tr.cum.push(d);}});
    goal._prepped=true;
  }
  function stride(tr,t){
    const p=tr.pts; if(t<=p[0][0]||t>=p[p.length-1][0]) return [0,0,0];
    let i=1; while(p[i][0]<t) i++;
    const f=(t-p[i-1][0])/((p[i][0]-p[i-1][0])||1), d=tr.cum[i-1]+(tr.cum[i]-tr.cum[i-1])*f;
    const v=(tr.cum[i]-tr.cum[i-1])/((p[i][0]-p[i-1][0])||1), vy=(p[i][2]-p[i-1][2])/((p[i][0]-p[i-1][0])||1);
    return [d*2.6, Math.min(1,v/5), Math.max(-.12,Math.min(.12,vy*.012))];
  }
  let last=null;
  function render(goal,t,bp){
    last=[goal,t,bp]; if(!goal._prepped) prep(goal);
    // camera: behind the ball, smoothed over the last second so it glides
    let sx=0,sy=0,n=0; for(let k=0;k<=8;k++){const tt=Math.max(0,t-k*.06); const q=window.__lerpBall(goal.ball,tt); sx+=q[0]; sy+=q[1]; n++;}
    sx/=n; sy/=n;
    const box=Math.max(0,Math.min(1,(sx-92)/14));   // near goal, swing the camera towards the posts
    cam.x=Math.min(sx-17,99,bp[0]-10); cam.z=9.5; cam.phi=.39;
    // aim between ball and goal, but never let the live ball leave the frame
    let cy=40+(sy-40)*(.93-.55*box);
    const dep=(bp[0]-cam.x)*Math.cos(cam.phi)+cam.z*Math.sin(cam.phi), half=dep*(W/2)/focal*.72;
    cam.y=Math.max(bp[1]-half,Math.min(bp[1]+half,cy));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    stadium(); pitch();
    // depth-sorted sprites: players, ball, goal
    const items=[];
    let near=null, nd=3.2;
    goal.tracks.forEach(tr=>{
      const o=opacity(tr,t,goal.dur); if(!o) return;
      const q=lerpTrack(tr.pts,t), p=proj(q[0],q[1],0); if(!p) return;
      if(tr.team==='L'&&tr.name){const d=Math.hypot(q[0]-bp[0],q[1]-bp[1]); if(d<nd){nd=d;near=[tr,p];}}
      items.push({d:p[3],f:()=>{const [ph,amp,lean]=stride(tr,t);
        const kit=tr.keeper?(tr.team==='L'?KIT.GL:KIT.GO):KIT[tr.team];
        footballer(p,kit,tr.team==='L'?tr.num:null,ph,amp,lean,o*(tr.team==='L'&&!tr.num?.75:1),near&&near[0]===tr);}});
    });
    const z=ballZ(goal,t), bproj=proj(bp[0],bp[1],0);
    if(bproj) items.push({d:bproj[3]-.05,f:()=>ball3(bproj,z,bp)});
    const gp=proj(120,40,0); if(gp) items.push({d:gp[3]+1.5,f:goalFrame});
    items.sort((a,b)=>b.d-a.d).forEach(it=>it.f());
    if(near) tagAbove(near[1],`${near[0].num?near[0].num+'  ':''}${near[0].name.toUpperCase()}`);
    // vignette
    const vg=ctx.createRadialGradient(W/2,H*.55,H*.35,W/2,H*.55,H*.85); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.35)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
    hud(goal,t);
  }
  return {render,resize};
}
"""
