"""The goal animation player: CSS, markup and JS, embedded into the report.
Pitch is vertical (Leverkusen attack upwards) so it fills a phone screen.
SVG coordinates: sx = y_sb, sy = 120 - x_sb (yards)."""

from pathlib import Path as _P
from game_js import GAME_CSS, GAME_JS
_WEB = _P(__file__).parent / "web"
MOTION_JS = (_WEB / "motion.js").read_text()
GAME3D_JS = (_WEB / "game3d.js").read_text()
THREE_JS = (_P(__file__).parents[1] / "vendor" / "three.global.js").read_text()

PLAYER_CSS = """
.gp{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 10px;margin:14px 0}
.gp-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.gp-title{font-weight:650;font-size:1rem;line-height:1.25}
.gp-sub{font-size:.82rem;color:var(--ink2);margin-top:2px}
.gp-xg{font-size:.8rem;color:var(--ink2);text-align:right;white-space:nowrap}
.gp-xg b{display:block;font-size:1.15rem;color:var(--ink)}
.gp-pitch{width:100%;max-width:440px;margin:8px auto 0;display:block;touch-action:manipulation}
.pitch-bg{fill:var(--pitch)}.pitch-line{fill:none;stroke:var(--pitch-line);stroke-width:.35}
.pitch-spot{fill:var(--pitch-line)}
.lev circle{fill:var(--lev);stroke:var(--lev-ring);stroke-width:.35}
.lev text{fill:#fff;font-size:1.75px;font-weight:700;text-anchor:middle;dominant-baseline:central;font-family:system-ui,sans-serif}
.lev.anon circle{fill:var(--lev);opacity:.55}
.opp circle{fill:var(--opp);stroke:var(--pitch);stroke-width:.35}
.gk circle{stroke:var(--ink);stroke-width:.45}
.tag{font-size:2.3px;font-weight:650;fill:var(--ink);paint-order:stroke;stroke:var(--pitch);stroke-width:.8px;text-anchor:middle;font-family:system-ui,sans-serif}
.ball{fill:#fff;stroke:#111;stroke-width:.35}
.trail{fill:none;stroke:var(--trail);stroke-width:.45;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1.2 .9}
.gp-cap{min-height:1.5em;text-align:center;font-weight:600;font-size:.95rem;margin:8px 0 4px}
.gp-ctl{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gp-ctl button{font:inherit;font-size:.85rem;padding:7px 12px;border-radius:999px;border:1px solid var(--border);background:var(--page);color:var(--ink);cursor:pointer;min-height:36px}
.gp-ctl button.primary{background:var(--lev);color:#fff;border-color:var(--lev);min-width:72px}
.gp-ctl input[type=range]{flex:1;min-width:120px;accent-color:var(--lev)}
.gp-pick{width:100%;font:inherit;font-size:.9rem;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--page);color:var(--ink);margin-top:8px}
.gp-key{display:flex;gap:14px;font-size:.78rem;color:var(--ink2);margin-top:6px;flex-wrap:wrap}
.gp-key i{display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:-1px;margin-right:5px}
.gp-note{font-size:.76rem;color:var(--muted);margin-top:6px}
"""

PITCH_SVG = """
<svg class="gp-pitch" viewBox="-3 -3 86 126" role="img" aria-label="Animated goal build-up on a vertical pitch">
 <rect class="pitch-bg" x="-3" y="-3" width="86" height="126" rx="2"/>
 <g class="pitch-lines">
  <rect class="pitch-line" x="0" y="0" width="80" height="120"/>
  <line class="pitch-line" x1="0" y1="60" x2="80" y2="60"/>
  <circle class="pitch-line" cx="40" cy="60" r="10"/>
  <circle class="pitch-spot" cx="40" cy="60" r=".5"/>
  <rect class="pitch-line" x="18" y="0" width="44" height="18"/>
  <rect class="pitch-line" x="30" y="0" width="20" height="6"/>
  <rect class="pitch-line" x="36" y="-1.6" width="8" height="1.6"/>
  <circle class="pitch-spot" cx="40" cy="12" r=".5"/>
  <path class="pitch-line" d="M32.7,18 A10,10 0 0 0 47.3,18"/>
  <rect class="pitch-line" x="18" y="102" width="44" height="18"/>
  <rect class="pitch-line" x="30" y="114" width="20" height="6"/>
  <rect class="pitch-line" x="36" y="120" width="8" height="1.6"/>
  <circle class="pitch-spot" cx="40" cy="108" r=".5"/>
  <path class="pitch-line" d="M32.7,102 A10,10 0 0 1 47.3,102"/>
 </g>
 <polyline class="trail" points=""/>
 <g class="players"></g>
 <circle class="ball" r="1.05" cx="-10" cy="-10"/>
 <text class="tag" x="-10" y="-10"></text>
</svg>
"""

PLAYER_JS_RAW = r"""
(function(){
const G = window.GOALS;
function lerpBall(b,t){
  if(t<=b[0][0]) return [b[0][1],b[0][2]];
  for(let i=1;i<b.length;i++){ if(b[i][0]>=t){const a=b[i-1],c=b[i],f=(t-a[0])/((c[0]-a[0])||1); return [a[1]+(c[1]-a[1])*f,a[2]+(c[2]-a[2])*f];}}
  const z=b[b.length-1]; return [z[1],z[2]];
}
window.__lerpBall=lerpBall;
function mlabel(m){const v=m.minute+1; if(m.period===1&&v>45) return `45+${v-45}'`; if(m.period===2&&v>90) return `90+${v-90}'`; return `${v}'`;}
function lerpTrack(pts,t){ return hermite(pts,t); }
function opacity(tr,t,dur){
  const pts=tr.pts, s=pts[0][0]-.6, e=pts[pts.length-1][0]>=dur-1.4?1e9:pts[pts.length-1][0]+.6;
  if(t<s||t>e) return 0;
  let o=Math.min(1,(t-s)/.4,(e-t)/.4);
  for(const [a,b] of (tr.gaps||[])){ if(t>a&&t<b){ o=Math.min(o,Math.max(0,1-(t-a)/.5),Math.max(0,1-(b-t)/.5)); } }
  return o;
}
__MOTION__
__GAME__
__GAME3D__
function makePlayer(root){
  const svg=root.querySelector('svg'), g=svg.querySelector('.players'), ball=svg.querySelector('.ball'),
        tag=svg.querySelector('.tag'), trail=svg.querySelector('.trail'), cap=root.querySelector('.gp-cap'),
        title=root.querySelector('.gp-title'), sub=root.querySelector('.gp-sub'), xg=root.querySelector('.gp-xg'),
        play=root.querySelector('.gp-play'), scrub=root.querySelector('.gp-scrub'), speedB=root.querySelector('.gp-speed'),
        pick=root.querySelector('.gp-pick'), prev=root.querySelector('.gp-prev'), next=root.querySelector('.gp-next');
  const NS='http://www.w3.org/2000/svg';
  const stage=root.querySelector('.gp-stage');
  let g3=null; try{ g3=window.THREE?makeGame3D(stage):null; }catch(e){ console.warn('3D view unavailable',e); g3=null; }
  if(!g3){ root.classList.add('no-gl'); }
  const game=makeGame(root.querySelector('.gp-game')), viewB=root.querySelector('.gp-view');
  viewB.onclick=()=>{root.dataset.mode=root.dataset.mode==='game'?'tactical':'game'; viewB.textContent=root.dataset.mode==='game'?'Tactical view':'Game view'; if(root.dataset.mode==='game'){ g3?g3.resize():game.resize(); } draw();};
  let goal=null, nodes=[], t=0, playing=false, last=null, speed=1;
  function load(i){
    goal=G[i]; pick.value=i; g.innerHTML=''; nodes=[];
    const m=goal.meta, opp=m.opponent, ha=m.home?'vs':'at';
    title.textContent=`${m.scorer} ${mlabel(m)} ${ha} ${opp}`;
    sub.textContent=`${m.assist?'Assist '+m.assist+' · ':''}${m.pattern} · ${m.poss_passes} passes · ${m.date} · final ${m.final}`;
    xg.innerHTML=`<b>${m.xg.toFixed(2)}</b>xG`;
    // opponents first so Leverkusen draw on top
    goal.tracks.slice().sort((a,b)=>(a.team==='L')-(b.team==='L')).forEach(tr=>{
      const el=document.createElementNS(NS,'g');
      el.setAttribute('class',(tr.team==='L'?'lev':'opp')+(tr.keeper?' gk':'')+(tr.team==='L'&&!tr.num?' anon':''));
      const c=document.createElementNS(NS,'circle'); c.setAttribute('r',tr.team==='L'?1.55:1.3); el.appendChild(c);
      if(tr.team==='L'&&tr.num){const tx=document.createElementNS(NS,'text'); tx.textContent=tr.num; el.appendChild(tx);}
      g.appendChild(el); nodes.push([tr,el]);
    });
    // frame the action: from the goal line down to 14 yards behind the deepest ball position
    const minX=Math.min(...goal.ball.map(b=>b[1]));
    const h=Math.max(58,Math.min(126,120-minX+17));
    svg.setAttribute('viewBox',`-3 -3 86 ${h.toFixed(1)}`);
    t=0; scrub.max=goal.dur; draw();
  }
  function ballAt(t){return lerpBall(goal.ball,t)}
  function draw(){
    const bs=ballState(goal,t), bp=[bs.x,bs.y];
    if(root.dataset.mode==='game'){ if(g3) g3.render(goal,t); else game.render(goal,t,bp); }
    ball.setAttribute('cx',bp[1]); ball.setAttribute('cy',120-bp[0]);
    let near=null, nd=3.2;
    nodes.forEach(([tr,el])=>{
      const o=opacity(tr,t,goal.dur); el.style.opacity=o; if(!o) return;
      const p=lerpTrack(tr.pts,t); el.setAttribute('transform',`translate(${p[1]},${120-p[0]})`);
      if(tr.team==='L'&&tr.name){const d=Math.hypot(p[0]-bp[0],p[1]-bp[1]); if(d<nd){nd=d;near=[tr,p];}}
    });
    if(near){tag.textContent=near[0].name; tag.setAttribute('x',near[1][1]); tag.setAttribute('y',120-near[1][0]-2.6); tag.style.opacity=1}
    else tag.style.opacity=0;
    const pts=goal.ball.filter(b=>b[0]<=t&&b[0]>=t-9).map(b=>`${b[2]},${120-b[1]}`); pts.push(`${bp[1]},${120-bp[0]}`);
    trail.setAttribute('points',pts.join(' '));
    let c=''; goal.caps.forEach(k=>{if(k[0]<=t+.05) c=k[1]}); cap.textContent=t>=goal.dur-1.15?`GOAL · ${goal.meta.scorer}`:c;
    scrub.value=t;
  }
  function tick(ts){
    if(!playing){last=null;return}
    if(last!==null){t+=(ts-last)/1000*speed; if(t>=goal.dur){t=goal.dur; playing=false; play.textContent='Replay';}}
    last=ts; draw(); if(playing) requestAnimationFrame(tick);
  }
  play.onclick=()=>{ if(t>=goal.dur) t=0; playing=!playing; play.textContent=playing?'Pause':'Play'; last=null; if(playing) requestAnimationFrame(tick); };
  scrub.oninput=()=>{t=+scrub.value; draw()};
  speedB.onclick=()=>{speed=speed===1?.5:speed===.5?2:1; speedB.textContent=speed+'×'};
  pick.onchange=()=>{playing=false; play.textContent='Play'; load(+pick.value)};
  prev.onclick=()=>{playing=false; play.textContent='Play'; load((+pick.value-1+G.length)%G.length)};
  next.onclick=()=>{playing=false; play.textContent='Play'; load((+pick.value+1)%G.length)};
  G.forEach((g,i)=>{const o=document.createElement('option'); const m=g.meta;
    o.value=i; o.textContent=`${m.date.slice(5)} ${m.home?'vs':'at'} ${m.opponent} · ${mlabel(m)} ${m.scorer}`; pick.appendChild(o)});
  const start=+(root.dataset.start||0); load(start);
  // autoplay once when scrolled into view
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting&&!root.dataset.played){root.dataset.played=1; play.click();}})},{threshold:.6});
  io.observe(root);
  window.__gp=window.__gp||[]; window.__gp.push({seek:v=>{t=v;draw()},load});
}
document.querySelectorAll('.gp').forEach(makePlayer);
})();
"""

PLAYER_HTML = """
<div class="gp" data-start="{start}" data-mode="game">
 <div class="gp-head"><div><div class="gp-title"></div><div class="gp-sub"></div></div><div class="gp-xg"></div></div>
 <div class="gp-stage"><canvas class="gp-gl" aria-label="3D replay of the goal"></canvas><canvas class="gp-hud" aria-hidden="true"></canvas></div>
 <canvas class="gp-game" aria-label="Game-style replay of the goal"></canvas>
 {pitch}
 <div class="gp-cap" aria-live="polite"></div>
 <div class="gp-ctl"><button class="primary gp-play">Play</button><button class="gp-prev" aria-label="Previous goal">‹</button><button class="gp-next" aria-label="Next goal">›</button>
 <input class="gp-scrub" type="range" min="0" step="0.01" aria-label="Time"><button class="gp-speed">1×</button><button class="gp-view">Tactical view</button></div>
 <select class="gp-pick" aria-label="Pick a goal"></select>
 <div class="gp-key gp-key-t"><span><i style="background:var(--lev)"></i>Leverkusen (shirt number)</span><span><i style="background:var(--opp)"></i>Opponent</span><span><i style="background:#fff;border:1px solid #111"></i>Ball</span></div>
</div>
"""

PLAYER_JS = PLAYER_JS_RAW.replace("__MOTION__", MOTION_JS).replace("__GAME3D__", GAME3D_JS).replace("__GAME__", GAME_JS)
PLAYER_CSS = PLAYER_CSS + GAME_CSS + """
.gp-stage{position:relative;width:100%;max-width:440px;aspect-ratio:4/5;margin:8px auto 0;border-radius:10px;overflow:hidden;background:#0a1019}
.gp-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.gp .gp-game{display:none}.gp.no-gl[data-mode="game"] .gp-game{display:block}.gp.no-gl .gp-stage{display:none}
.gp[data-mode="tactical"] .gp-stage{display:none}
"""
