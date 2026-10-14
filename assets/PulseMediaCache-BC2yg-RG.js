import{c as l,ao as d}from"./index-D9jZY4nL.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]],k=l("globe",h);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]],b=l("image",g);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"M12 19v3",key:"npa21l"}],["path",{d:"M19 10v2a7 7 0 0 1-14 0v-2",key:"1vc78b"}],["rect",{x:"9",y:"2",width:"6",height:"13",rx:"3",key:"s6n7sd"}]],A=l("mic",m);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["path",{d:"M9 18V5l12-2v13",key:"1jmyc2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["circle",{cx:"18",cy:"16",r:"3",key:"1hluhg"}]],D=l("music",f);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1",key:"zuxfzm"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1",key:"1okwgv"}]],C=l("pause",x);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]],F=l("play",M),y=new Map,v=e=>{const t=y.get(e);if(t){try{URL.revokeObjectURL(t)}catch{}y.delete(e)}},U=async e=>{if(e)try{const t=await d(),a=localStorage.getItem("userid")||"default";await t.put("pulseStore",{pulseId:`mine_${a}`,isMineFeed:!0,data:e,lastUpdated:Date.now()})}catch(t){console.warn("[PulseMediaCache] Failed to save mine data to DB:",t)}},I=async()=>{try{const e=await d(),t=localStorage.getItem("userid")||"default",a=await e.get("pulseStore",`mine_${t}`);return a?a.data:null}catch{return null}},$=async e=>{if(e)try{const t=await d(),a=localStorage.getItem("userid")||"default";await t.put("pulseStore",{pulseId:`feed_${a}`,isFeedCache:!0,data:e,lastUpdated:Date.now()})}catch(t){console.warn("[PulseMediaCache] Failed to save feed data to DB:",t)}},S=async()=>{try{const e=await d(),t=localStorage.getItem("userid")||"default",a=await e.get("pulseStore",`feed_${t}`);return a?a.data:null}catch{return null}},P=async e=>{if(!e||!e.pulseId&&!e.id)return;const t=String(e.pulseId||e.id),a=e.createdAt?new Date(e.createdAt).getTime():Date.now(),o=e.expiresAt?new Date(e.expiresAt).getTime():a+24*60*60*1e3,c=await d(),n={...e,pulseId:t,expiresAt:o,createdAt:a,lastUpdated:Date.now()};return await c.put("pulseStore",n),n},B=async e=>{if(!(!Array.isArray(e)||e.length===0))for(const t of e)await P(t)},w=async()=>{try{const e=await d(),t=Date.now(),a=e.transaction("pulseMediaCache","readwrite");let o=await a.store.openCursor(),c=0;for(;o;){const s=o.value;s.expiresAt&&s.expiresAt<=t&&(v(s.id),await o.delete(),c++),o=await o.continue()}await a.done;const n=e.transaction("pulseStore","readwrite");let r=await n.store.openCursor(),i=0;for(;r;){const s=r.value;if(s.isMineFeed){r=await r.continue();continue}if(s.expiresAt&&s.expiresAt<=t){const u={...s,status:"expired",imageUrl:null,audioUrl:null,videoUrl:null,mediaUrl:null,pulseUrl:null,content:s.type==="text"?s.content:"Media expired and deleted."};await r.update(u),i++}r=await r.continue()}await n.done,(c>0||i>0)&&console.log(`[PulseMediaCache] Purged ${c} media blobs and updated ${i} expired pulses.`)}catch(e){console.error("[PulseMediaCache] Purge failed:",e)}},p=new Map,T=async e=>{if(!e)return null;const t=String(e);if(p.has(t))return p.get(t);try{const o=await(await d()).get("pulseStore",t);if(o&&o.pulse)return p.set(t,o.pulse),o.pulse;const c=await S();if(Array.isArray(c))for(const r of c){const s=(r.pulses||(r.pulseId||r.pulse_id?[r]:[])).find(u=>String(u.pulseId||u.id||u.pulse_id)===t);if(s)return p.set(t,s),s}const n=await I();if(n){const i=(n.activePulses||n.pulses||[]).find(s=>String(s.pulseId||s.id||s.pulse_id)===t);if(i)return p.set(t,i),i}}catch(a){console.warn("[PulseMediaCache] getPulseFromStore error:",a)}return null};w();setInterval(w,60*1e3);export{k as G,b as I,A as M,F as P,C as a,D as b,I as c,T as d,w as e,B as f,S as g,U as h,P as i,p,$ as s};
