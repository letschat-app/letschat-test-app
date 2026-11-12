function I(e,t){if(!e)return"";const n=new Date(e);if(isNaN(n.getTime()))return"";const r=t&&t.timeZone||"Asia/Kolkata";return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",hour12:!0,timeZone:r}).format(n)}function q(e,t){if(!e)return"";const n=new Date(e);if(isNaN(n.getTime()))return"";const r=t&&t.timeZone||"Asia/Kolkata";return new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:r}).format(n)}function et(e,t){if(!e)return"";const n=new Date(e);if(isNaN(n.getTime()))return"";const r=t&&t.timeZone||"Asia/Kolkata",s=t&&t.now?new Date(t.now):new Date,i=u=>new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:r}).format(u),o=i(n),a=i(s),l=new Date(s.getTime()+24*60*60*1e3),c=i(l);return o===a?"Today":o===c?"Tomorrow":q(e,t)}function _n(e,t){if(!e)return"soon";const n=new Date(e);if(isNaN(n.getTime()))return"soon";const r=t&&t.now?new Date(t.now):new Date,s=n.getTime()-r.getTime(),i=Math.round(s/(1e3*60*60)),o=t&&t.timeZone||"Asia/Kolkata",a=c=>new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:o}).format(c);if(i>0&&i<24&&a(n)===a(r))return i===1?"in 1 hour":`in ${i} hours`;const l=new Date(r.getTime()+24*60*60*1e3);return a(n)===a(l)?"tomorrow":a(n)===a(r)?"today":`on ${q(e,t)}`}function tt(e,t){return e?e.length<=t?e:e.slice(0,t-1)+"…":""}function nt(e){if(e&&e.icon)return e.icon;try{const t=typeof self<"u"&&self.registration&&self.registration.scope?self.registration.scope:typeof location<"u"?location.origin+"/":"/",n=t.endsWith("/")?t:t+"/";return new URL("icon-notify.png",n).href}catch{return"icon-notify.png"}}function rt(e){if(e&&e.badge)return e.badge;try{const t=typeof self<"u"&&self.registration&&self.registration.scope?self.registration.scope:typeof location<"u"?location.origin+"/":"/",n=t.endsWith("/")?t:t+"/";return new URL("badge-96.png",n).href}catch{return"badge-96.png"}}function P(e,t){const n=(e||"text").toLowerCase(),r=t||"";switch(n){case"text":return r;case"assignment":return r?`📚 Assignment: ${r}`:"📚 Assignment";case"poll":return"📊 Poll";case"image":return"📷 Photo";case"video":return"🎥 Video";case"audio":case"voice":return"🎤 Voice message";case"file":return"📁 File";default:return r||"New message"}}function st(e,t){if(!e){const c=nt(t),u=rt(t);return{title:"LetsChat",body:"New notification",icon:c,badge:u,tag:"letschat-default",data:{},renotify:!0,silent:!1,vibrate:[200,100,200]}}const n=e.type||"CHAT",r=e.silent==="true";let s="LetsChat",i="",o="letschat-default";if(n==="CHAT"){const c=e.chatId||"",u=tt(e.chatName||e.senderName||"Chat",40),f=e.chatKind||"group",d=e.alertKind||"message",m=e.senderName||"Someone",p=e.msgType||"text",g=e.preview||"",S=parseInt(e.newCount||"1",10),y=parseInt(e.unread||"1",10),G=e.msgId||"";if(d==="mention"?o=`mention-${c}-${G||Date.now()}`:d==="reply"?o=`reply-${c}-${G||Date.now()}`:o=`chat-${c}`,d==="mention")s=f==="dm"?m:`${m} mentioned you in ${u}`,i=P(p,g);else if(d==="reply")s=f==="dm"?m:`${m} replied to you in ${u}`,i=P(p,g);else if(y>1||S>1||e.items&&(()=>{try{return JSON.parse(e.items).length>1}catch{return!1}})()){const J=y>1?y:S;s=`${u} · ${J} new messages`;let Y=[];if(e.items)try{Y=JSON.parse(e.items)}catch{Y=[]}if(Y.length===0)i=P(p,g);else{const Xe=Y.slice(-3).map(Z=>{const Qe=P(Z.t,Z.x),In=f!=="dm"&&Z.s?`${Z.s}: ${Qe}`:Qe;return tt(In,90)});J>3&&Xe.push(`+${J-3} more`),i=Xe.join(`
`)}}else f==="dm"?(s=u,i=P(p,g)):(s=u,i=`${m}: ${P(p,g)}`)}else if(n==="EVENT"){o=`event-reminder-${e.eventId||""}`;const u=e.eventTitle||"Event",f=e.minutesBefore||"15";s=`${u} starts in ${f} min`;const d=[],m=I(e.startTime,t);m&&d.push(m),e.location&&d.push(e.location),e.chatName&&d.push(e.chatName),i=d.join(" · ")||e.title||"Event starts soon"}else if(n==="EVENT_CHANGED"){o=`event-changed-${e.eventId||""}`;const u=(e.action||"updated").toLowerCase(),f=e.eventTitle||"Event",d=e.chatName||"",m=e.location||"",p=e.startTime||"";if(u==="created"||u==="scheduled"){s=`New event: ${f}`;const g=et(p,t),S=I(p,t),y=[`${g}, ${S}`];m&&y.push(m),d&&y.push(d),i=y.join(" · ")}else if(u==="rescheduled"||u==="postponed"){s=`${f} was rescheduled`;let g="";if(e.changes)try{const y=JSON.parse(e.changes).find(G=>G.field==="time");y&&y.from&&y.to&&(g=`Time: ${I(y.from,t)} → ${I(y.to,t)}`)}catch{}!g&&p&&(g=`Time: ${I(p,t)}`),i=d?`${g}
${d}`:g}else if(u==="cancelled"){s=`${f} was cancelled`;const g=et(p,t).toLowerCase(),S=I(p,t);i=d?`Was ${g} at ${S} · ${d}`:`Was ${g} at ${S}`}else u==="booking_request"?(s=`Meeting request from ${e.personName||"A user"}`,i=`${q(p,t)} · ${I(p,t)}`):u==="booking_approved"?(s=`Meeting confirmed with ${e.personName||"Host"}`,i=`${q(p,t)} · ${I(p,t)}`):u==="booking_declined"?(s=`Meeting declined by ${e.personName||"Host"}`,i=`${q(p,t)} · ${I(p,t)}`):(s=`${f} updated`,i=d||"Event details updated.")}else if(n==="DAILY"){const c=parseInt(e.total||"0",10);o=`daily-summary-${e.date||"today"}`,s=`Today: ${c} ${c===1?"event":"events"}`;let u=[];if(e.eventsV2)try{u=JSON.parse(e.eventsV2)}catch{u=[]}i=u.map(d=>`${I(d.startTime,t)} ${d.title}`).join(`
`)||(c>0?`You have ${c} events scheduled for today.`:"Check your schedule for today.")}else if(n==="ASSIGNMENT_MISSING"){const c=parseInt(e.total||"0",10);o="assignment-missing",s=`${c} ${c===1?"assignment":"assignments"} due soon`;let u=[];if(e.assignmentsV2)try{u=JSON.parse(e.assignmentsV2)}catch{u=[]}i=u.map(d=>`${d.title} · due ${_n(d.deadline,t)}`).join(`
`)}const a=nt(t),l=rt(t);return{title:s,body:i,icon:a,badge:l,tag:o,data:{...e,path:kt(e),alertTs:Date.now()},renotify:!r,silent:r,vibrate:r?[]:[200,100,200]}}function kt(e){if(!e)return"/";const t=e.type;if(t==="EVENT"||t==="EVENT_CHANGED")return e.action==="cancelled"?"/calendar":e.eventId?`/calendar?eventId=${e.eventId}&viewInfo=true`:"/calendar";if(t==="DAILY")return"/calendar";if(t==="ASSIGNMENT_MISSING"){if(e.chatId){const n=e.assignmentId?`&assignmentId=${e.assignmentId}`:"";return`/chat/${e.chatId}?space=1${n}`}if(e.assignmentsV2)try{const n=typeof e.assignmentsV2=="string"?JSON.parse(e.assignmentsV2):e.assignmentsV2;if(Array.isArray(n)&&n.length>0&&n[0].chatId){const r=n[0],s=r.id?`&assignmentId=${r.id}`:"";return`/chat/${r.chatId}?space=1${s}`}}catch{}return"/chats"}if(e.chatId){const n=`/chat/${e.chatId}`,r=[];return e.spaceId&&e.spaceId!=="0"&&r.push(`space=${e.spaceId}`),e.msgId&&r.push(`msgId=${e.msgId}`),r.length>0?`${n}?${r.join("&")}`:n}return"/"}function Sn(e,t,n){if(!n)return!1;const r=String(n),s=e&&typeof e=="object"?e:{},o={...s.FCM_MSG?.data&&typeof s.FCM_MSG.data=="object"?s.FCM_MSG.data:{},...s};if([o.chatId,o.chatid,o.roomId,o.roomid].some(c=>c!=null&&String(c)===r))return!0;if(o.type==="ASSIGNMENT_MISSING"&&o.assignmentsV2)try{const c=typeof o.assignmentsV2=="string"?JSON.parse(o.assignmentsV2):o.assignmentsV2;if(Array.isArray(c)&&c.length>0&&c.every(u=>String(u?.chatId||"")===r))return!0}catch{}const l=typeof t=="string"?t:"";return l===`chat-${r}`||l===`room-${r}`||l===r||l.startsWith(`mention-${r}-`)||l.startsWith(`reply-${r}-`)}try{self["workbox:core:7.4.0"]&&_()}catch{}const En=(e,...t)=>{let n=e;return t.length>0&&(n+=` :: ${JSON.stringify(t)}`),n},Cn=En;class w extends Error{constructor(t,n){const r=Cn(t,n);super(r),this.name=t,this.details=n}}const C={googleAnalytics:"googleAnalytics",precache:"precache-v2",prefix:"workbox",runtime:"runtime",suffix:typeof registration<"u"?registration.scope:""},ae=e=>[C.prefix,e,C.suffix].filter(t=>t&&t.length>0).join("-"),Dn=e=>{for(const t of Object.keys(C))e(t)},Be={updateDetails:e=>{Dn(t=>{typeof e[t]=="string"&&(C[t]=e[t])})},getGoogleAnalyticsName:e=>e||ae(C.googleAnalytics),getPrecacheName:e=>e||ae(C.precache),getPrefix:()=>C.prefix,getRuntimeName:e=>e||ae(C.runtime),getSuffix:()=>C.suffix};function it(e,t){const n=t();return e.waitUntil(n),n}try{self["workbox:precaching:7.4.0"]&&_()}catch{}const Tn="__WB_REVISION__";function An(e){if(!e)throw new w("add-to-cache-list-unexpected-type",{entry:e});if(typeof e=="string"){const i=new URL(e,location.href);return{cacheKey:i.href,url:i.href}}const{revision:t,url:n}=e;if(!n)throw new w("add-to-cache-list-unexpected-type",{entry:e});if(!t){const i=new URL(n,location.href);return{cacheKey:i.href,url:i.href}}const r=new URL(n,location.href),s=new URL(n,location.href);return r.searchParams.set(Tn,t),{cacheKey:r.href,url:s.href}}class vn{constructor(){this.updatedURLs=[],this.notUpdatedURLs=[],this.handlerWillStart=async({request:t,state:n})=>{n&&(n.originalRequest=t)},this.cachedResponseWillBeUsed=async({event:t,state:n,cachedResponse:r})=>{if(t.type==="install"&&n&&n.originalRequest&&n.originalRequest instanceof Request){const s=n.originalRequest.url;r?this.notUpdatedURLs.push(s):this.updatedURLs.push(s)}return r}}}class kn{constructor({precacheController:t}){this.cacheKeyWillBeUsed=async({request:n,params:r})=>{const s=r?.cacheKey||this._precacheController.getCacheKeyForURL(n.url);return s?new Request(s,{headers:n.headers}):n},this._precacheController=t}}let x;function Rn(){if(x===void 0){const e=new Response("");if("body"in e)try{new Response(e.body),x=!0}catch{x=!1}x=!1}return x}async function Nn(e,t){let n=null;if(e.url&&(n=new URL(e.url).origin),n!==self.location.origin)throw new w("cross-origin-copy-response",{origin:n});const r=e.clone(),i={headers:new Headers(r.headers),status:r.status,statusText:r.statusText},o=Rn()?r.body:await r.blob();return new Response(o,i)}const $n=e=>new URL(String(e),location.href).href.replace(new RegExp(`^${location.origin}`),"");function ot(e,t){const n=new URL(e);for(const r of t)n.searchParams.delete(r);return n.href}async function Mn(e,t,n,r){const s=ot(t.url,n);if(t.url===s)return e.match(t,r);const i=Object.assign(Object.assign({},r),{ignoreSearch:!0}),o=await e.keys(t,i);for(const a of o){const l=ot(a.url,n);if(s===l)return e.match(a,r)}}let On=class{constructor(){this.promise=new Promise((t,n)=>{this.resolve=t,this.reject=n})}};const Ln=new Set;async function Bn(){for(const e of Ln)await e()}function Pn(e){return new Promise(t=>setTimeout(t,e))}try{self["workbox:strategies:7.4.0"]&&_()}catch{}function X(e){return typeof e=="string"?new Request(e):e}class Un{constructor(t,n){this._cacheKeys={},Object.assign(this,n),this.event=n.event,this._strategy=t,this._handlerDeferred=new On,this._extendLifetimePromises=[],this._plugins=[...t.plugins],this._pluginStateMap=new Map;for(const r of this._plugins)this._pluginStateMap.set(r,{});this.event.waitUntil(this._handlerDeferred.promise)}async fetch(t){const{event:n}=this;let r=X(t);if(r.mode==="navigate"&&n instanceof FetchEvent&&n.preloadResponse){const o=await n.preloadResponse;if(o)return o}const s=this.hasCallback("fetchDidFail")?r.clone():null;try{for(const o of this.iterateCallbacks("requestWillFetch"))r=await o({request:r.clone(),event:n})}catch(o){if(o instanceof Error)throw new w("plugin-error-request-will-fetch",{thrownErrorMessage:o.message})}const i=r.clone();try{let o;o=await fetch(r,r.mode==="navigate"?void 0:this._strategy.fetchOptions);for(const a of this.iterateCallbacks("fetchDidSucceed"))o=await a({event:n,request:i,response:o});return o}catch(o){throw s&&await this.runCallbacks("fetchDidFail",{error:o,event:n,originalRequest:s.clone(),request:i.clone()}),o}}async fetchAndCachePut(t){const n=await this.fetch(t),r=n.clone();return this.waitUntil(this.cachePut(t,r)),n}async cacheMatch(t){const n=X(t);let r;const{cacheName:s,matchOptions:i}=this._strategy,o=await this.getCacheKey(n,"read"),a=Object.assign(Object.assign({},i),{cacheName:s});r=await caches.match(o,a);for(const l of this.iterateCallbacks("cachedResponseWillBeUsed"))r=await l({cacheName:s,matchOptions:i,cachedResponse:r,request:o,event:this.event})||void 0;return r}async cachePut(t,n){const r=X(t);await Pn(0);const s=await this.getCacheKey(r,"write");if(!n)throw new w("cache-put-with-no-response",{url:$n(s.url)});const i=await this._ensureResponseSafeToCache(n);if(!i)return!1;const{cacheName:o,matchOptions:a}=this._strategy,l=await self.caches.open(o),c=this.hasCallback("cacheDidUpdate"),u=c?await Mn(l,s.clone(),["__WB_REVISION__"],a):null;try{await l.put(s,c?i.clone():i)}catch(f){if(f instanceof Error)throw f.name==="QuotaExceededError"&&await Bn(),f}for(const f of this.iterateCallbacks("cacheDidUpdate"))await f({cacheName:o,oldResponse:u,newResponse:i.clone(),request:s,event:this.event});return!0}async getCacheKey(t,n){const r=`${t.url} | ${n}`;if(!this._cacheKeys[r]){let s=t;for(const i of this.iterateCallbacks("cacheKeyWillBeUsed"))s=X(await i({mode:n,request:s,event:this.event,params:this.params}));this._cacheKeys[r]=s}return this._cacheKeys[r]}hasCallback(t){for(const n of this._strategy.plugins)if(t in n)return!0;return!1}async runCallbacks(t,n){for(const r of this.iterateCallbacks(t))await r(n)}*iterateCallbacks(t){for(const n of this._strategy.plugins)if(typeof n[t]=="function"){const r=this._pluginStateMap.get(n);yield i=>{const o=Object.assign(Object.assign({},i),{state:r});return n[t](o)}}}waitUntil(t){return this._extendLifetimePromises.push(t),t}async doneWaiting(){for(;this._extendLifetimePromises.length;){const t=this._extendLifetimePromises.splice(0),r=(await Promise.allSettled(t)).find(s=>s.status==="rejected");if(r)throw r.reason}}destroy(){this._handlerDeferred.resolve(null)}async _ensureResponseSafeToCache(t){let n=t,r=!1;for(const s of this.iterateCallbacks("cacheWillUpdate"))if(n=await s({request:this.request,response:n,event:this.event})||void 0,r=!0,!n)break;return r||n&&n.status!==200&&(n=void 0),n}}class Fn{constructor(t={}){this.cacheName=Be.getRuntimeName(t.cacheName),this.plugins=t.plugins||[],this.fetchOptions=t.fetchOptions,this.matchOptions=t.matchOptions}handle(t){const[n]=this.handleAll(t);return n}handleAll(t){t instanceof FetchEvent&&(t={event:t,request:t.request});const n=t.event,r=typeof t.request=="string"?new Request(t.request):t.request,s="params"in t?t.params:void 0,i=new Un(this,{event:n,request:r,params:s}),o=this._getResponse(i,r,n),a=this._awaitComplete(o,i,r,n);return[o,a]}async _getResponse(t,n,r){await t.runCallbacks("handlerWillStart",{event:r,request:n});let s;try{if(s=await this._handle(n,t),!s||s.type==="error")throw new w("no-response",{url:n.url})}catch(i){if(i instanceof Error){for(const o of t.iterateCallbacks("handlerDidError"))if(s=await o({error:i,event:r,request:n}),s)break}if(!s)throw i}for(const i of t.iterateCallbacks("handlerWillRespond"))s=await i({event:r,request:n,response:s});return s}async _awaitComplete(t,n,r,s){let i,o;try{i=await t}catch{}try{await n.runCallbacks("handlerDidRespond",{event:s,request:r,response:i}),await n.doneWaiting()}catch(a){a instanceof Error&&(o=a)}if(await n.runCallbacks("handlerDidComplete",{event:s,request:r,response:i,error:o}),n.destroy(),o)throw o}}class A extends Fn{constructor(t={}){t.cacheName=Be.getPrecacheName(t.cacheName),super(t),this._fallbackToNetwork=t.fallbackToNetwork!==!1,this.plugins.push(A.copyRedirectedCacheableResponsesPlugin)}async _handle(t,n){const r=await n.cacheMatch(t);return r||(n.event&&n.event.type==="install"?await this._handleInstall(t,n):await this._handleFetch(t,n))}async _handleFetch(t,n){let r;const s=n.params||{};if(this._fallbackToNetwork){const i=s.integrity,o=t.integrity,a=!o||o===i;r=await n.fetch(new Request(t,{integrity:t.mode!=="no-cors"?o||i:void 0})),i&&a&&t.mode!=="no-cors"&&(this._useDefaultCacheabilityPluginIfNeeded(),await n.cachePut(t,r.clone()))}else throw new w("missing-precache-entry",{cacheName:this.cacheName,url:t.url});return r}async _handleInstall(t,n){this._useDefaultCacheabilityPluginIfNeeded();const r=await n.fetch(t);if(!await n.cachePut(t,r.clone()))throw new w("bad-precaching-response",{url:t.url,status:r.status});return r}_useDefaultCacheabilityPluginIfNeeded(){let t=null,n=0;for(const[r,s]of this.plugins.entries())s!==A.copyRedirectedCacheableResponsesPlugin&&(s===A.defaultPrecacheCacheabilityPlugin&&(t=r),s.cacheWillUpdate&&n++);n===0?this.plugins.push(A.defaultPrecacheCacheabilityPlugin):n>1&&t!==null&&this.plugins.splice(t,1)}}A.defaultPrecacheCacheabilityPlugin={async cacheWillUpdate({response:e}){return!e||e.status>=400?null:e}};A.copyRedirectedCacheableResponsesPlugin={async cacheWillUpdate({response:e}){return e.redirected?await Nn(e):e}};class Wn{constructor({cacheName:t,plugins:n=[],fallbackToNetwork:r=!0}={}){this._urlsToCacheKeys=new Map,this._urlsToCacheModes=new Map,this._cacheKeysToIntegrities=new Map,this._strategy=new A({cacheName:Be.getPrecacheName(t),plugins:[...n,new kn({precacheController:this})],fallbackToNetwork:r}),this.install=this.install.bind(this),this.activate=this.activate.bind(this)}get strategy(){return this._strategy}precache(t){this.addToCacheList(t),this._installAndActiveListenersAdded||(self.addEventListener("install",this.install),self.addEventListener("activate",this.activate),this._installAndActiveListenersAdded=!0)}addToCacheList(t){const n=[];for(const r of t){typeof r=="string"?n.push(r):r&&r.revision===void 0&&n.push(r.url);const{cacheKey:s,url:i}=An(r),o=typeof r!="string"&&r.revision?"reload":"default";if(this._urlsToCacheKeys.has(i)&&this._urlsToCacheKeys.get(i)!==s)throw new w("add-to-cache-list-conflicting-entries",{firstEntry:this._urlsToCacheKeys.get(i),secondEntry:s});if(typeof r!="string"&&r.integrity){if(this._cacheKeysToIntegrities.has(s)&&this._cacheKeysToIntegrities.get(s)!==r.integrity)throw new w("add-to-cache-list-conflicting-integrities",{url:i});this._cacheKeysToIntegrities.set(s,r.integrity)}if(this._urlsToCacheKeys.set(i,s),this._urlsToCacheModes.set(i,o),n.length>0){const a=`Workbox is precaching URLs without revision info: ${n.join(", ")}
This is generally NOT safe. Learn more at https://bit.ly/wb-precache`;console.warn(a)}}}install(t){return it(t,async()=>{const n=new vn;this.strategy.plugins.push(n);for(const[i,o]of this._urlsToCacheKeys){const a=this._cacheKeysToIntegrities.get(o),l=this._urlsToCacheModes.get(i),c=new Request(i,{integrity:a,cache:l,credentials:"same-origin"});await Promise.all(this.strategy.handleAll({params:{cacheKey:o},request:c,event:t}))}const{updatedURLs:r,notUpdatedURLs:s}=n;return{updatedURLs:r,notUpdatedURLs:s}})}activate(t){return it(t,async()=>{const n=await self.caches.open(this.strategy.cacheName),r=await n.keys(),s=new Set(this._urlsToCacheKeys.values()),i=[];for(const o of r)s.has(o.url)||(await n.delete(o),i.push(o.url));return{deletedURLs:i}})}getURLsToCacheKeys(){return this._urlsToCacheKeys}getCachedURLs(){return[...this._urlsToCacheKeys.keys()]}getCacheKeyForURL(t){const n=new URL(t,location.href);return this._urlsToCacheKeys.get(n.href)}getIntegrityForCacheKey(t){return this._cacheKeysToIntegrities.get(t)}async matchPrecache(t){const n=t instanceof Request?t.url:t,r=this.getCacheKeyForURL(n);if(r)return(await self.caches.open(this.strategy.cacheName)).match(r)}createHandlerBoundToURL(t){const n=this.getCacheKeyForURL(t);if(!n)throw new w("non-precached-url",{url:t});return r=>(r.request=new Request(t),r.params=Object.assign({cacheKey:n},r.params),this.strategy.handle(r))}}let ce;const Pe=()=>(ce||(ce=new Wn),ce);try{self["workbox:routing:7.4.0"]&&_()}catch{}const Rt="GET",Q=e=>e&&typeof e=="object"?e:{handle:e};class W{constructor(t,n,r=Rt){this.handler=Q(n),this.match=t,this.method=r}setCatchHandler(t){this.catchHandler=Q(t)}}class jn extends W{constructor(t,n,r){const s=({url:i})=>{const o=t.exec(i.href);if(o&&!(i.origin!==location.origin&&o.index!==0))return o.slice(1)};super(s,n,r)}}class Kn{constructor(){this._routes=new Map,this._defaultHandlerMap=new Map}get routes(){return this._routes}addFetchListener(){self.addEventListener("fetch",t=>{const{request:n}=t,r=this.handleRequest({request:n,event:t});r&&t.respondWith(r)})}addCacheListener(){self.addEventListener("message",t=>{if(t.data&&t.data.type==="CACHE_URLS"){const{payload:n}=t.data,r=Promise.all(n.urlsToCache.map(s=>{typeof s=="string"&&(s=[s]);const i=new Request(...s);return this.handleRequest({request:i,event:t})}));t.waitUntil(r),t.ports&&t.ports[0]&&r.then(()=>t.ports[0].postMessage(!0))}})}handleRequest({request:t,event:n}){const r=new URL(t.url,location.href);if(!r.protocol.startsWith("http"))return;const s=r.origin===location.origin,{params:i,route:o}=this.findMatchingRoute({event:n,request:t,sameOrigin:s,url:r});let a=o&&o.handler;const l=t.method;if(!a&&this._defaultHandlerMap.has(l)&&(a=this._defaultHandlerMap.get(l)),!a)return;let c;try{c=a.handle({url:r,request:t,event:n,params:i})}catch(f){c=Promise.reject(f)}const u=o&&o.catchHandler;return c instanceof Promise&&(this._catchHandler||u)&&(c=c.catch(async f=>{if(u)try{return await u.handle({url:r,request:t,event:n,params:i})}catch(d){d instanceof Error&&(f=d)}if(this._catchHandler)return this._catchHandler.handle({url:r,request:t,event:n});throw f})),c}findMatchingRoute({url:t,sameOrigin:n,request:r,event:s}){const i=this._routes.get(r.method)||[];for(const o of i){let a;const l=o.match({url:t,sameOrigin:n,request:r,event:s});if(l)return a=l,(Array.isArray(a)&&a.length===0||l.constructor===Object&&Object.keys(l).length===0||typeof l=="boolean")&&(a=void 0),{route:o,params:a}}return{}}setDefaultHandler(t,n=Rt){this._defaultHandlerMap.set(n,Q(t))}setCatchHandler(t){this._catchHandler=Q(t)}registerRoute(t){this._routes.has(t.method)||this._routes.set(t.method,[]),this._routes.get(t.method).push(t)}unregisterRoute(t){if(!this._routes.has(t.method))throw new w("unregister-route-but-not-found-with-method",{method:t.method});const n=this._routes.get(t.method).indexOf(t);if(n>-1)this._routes.get(t.method).splice(n,1);else throw new w("unregister-route-route-not-registered")}}let V;const Hn=()=>(V||(V=new Kn,V.addFetchListener(),V.addCacheListener()),V);function Nt(e,t,n){let r;if(typeof e=="string"){const i=new URL(e,location.href),o=({url:a})=>a.href===i.href;r=new W(o,t,n)}else if(e instanceof RegExp)r=new jn(e,t,n);else if(typeof e=="function")r=new W(e,t,n);else if(e instanceof W)r=e;else throw new w("unsupported-route-type",{moduleName:"workbox-routing",funcName:"registerRoute",paramName:"capture"});return Hn().registerRoute(r),r}function xn(e,t=[]){for(const n of[...e.searchParams.keys()])t.some(r=>r.test(n))&&e.searchParams.delete(n);return e}function*Vn(e,{ignoreURLParametersMatching:t=[/^utm_/,/^fbclid$/],directoryIndex:n="index.html",cleanURLs:r=!0,urlManipulation:s}={}){const i=new URL(e,location.href);i.hash="",yield i.href;const o=xn(i,t);if(yield o.href,n&&o.pathname.endsWith("/")){const a=new URL(o.href);a.pathname+=n,yield a.href}if(r){const a=new URL(o.href);a.pathname+=".html",yield a.href}if(s){const a=s({url:i});for(const l of a)yield l.href}}class qn extends W{constructor(t,n){const r=({request:s})=>{const i=t.getURLsToCacheKeys();for(const o of Vn(s.url,n)){const a=i.get(o);if(a){const l=t.getIntegrityForCacheKey(a);return{cacheKey:a,integrity:l}}}};super(r,t.strategy)}}function zn(e){const t=Pe(),n=new qn(t,e);Nt(n)}function Gn(e){return Pe().createHandlerBoundToURL(e)}function Jn(e){Pe().precache(e)}function Yn(e,t){Jn(e),zn(t)}class Zn extends W{constructor(t,{allowlist:n=[/./],denylist:r=[]}={}){super(s=>this._match(s),t),this._allowlist=n,this._denylist=r}_match({url:t,request:n}){if(n&&n.mode!=="navigate")return!1;const r=t.pathname+t.search;for(const s of this._denylist)if(s.test(r))return!1;return!!this._allowlist.some(s=>s.test(r))}}const Xn=()=>{};var at={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $t=function(e){const t=[];let n=0;for(let r=0;r<e.length;r++){let s=e.charCodeAt(r);s<128?t[n++]=s:s<2048?(t[n++]=s>>6|192,t[n++]=s&63|128):(s&64512)===55296&&r+1<e.length&&(e.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(e.charCodeAt(++r)&1023),t[n++]=s>>18|240,t[n++]=s>>12&63|128,t[n++]=s>>6&63|128,t[n++]=s&63|128):(t[n++]=s>>12|224,t[n++]=s>>6&63|128,t[n++]=s&63|128)}return t},Qn=function(e){const t=[];let n=0,r=0;for(;n<e.length;){const s=e[n++];if(s<128)t[r++]=String.fromCharCode(s);else if(s>191&&s<224){const i=e[n++];t[r++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=e[n++],o=e[n++],a=e[n++],l=((s&7)<<18|(i&63)<<12|(o&63)<<6|a&63)-65536;t[r++]=String.fromCharCode(55296+(l>>10)),t[r++]=String.fromCharCode(56320+(l&1023))}else{const i=e[n++],o=e[n++];t[r++]=String.fromCharCode((s&15)<<12|(i&63)<<6|o&63)}}return t.join("")},Mt={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(e,t){if(!Array.isArray(e))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=t?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<e.length;s+=3){const i=e[s],o=s+1<e.length,a=o?e[s+1]:0,l=s+2<e.length,c=l?e[s+2]:0,u=i>>2,f=(i&3)<<4|a>>4;let d=(a&15)<<2|c>>6,m=c&63;l||(m=64,o||(d=64)),r.push(n[u],n[f],n[d],n[m])}return r.join("")},encodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?btoa(e):this.encodeByteArray($t(e),t)},decodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?atob(e):Qn(this.decodeStringToByteArray(e,t))},decodeStringToByteArray(e,t){this.init_();const n=t?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<e.length;){const i=n[e.charAt(s++)],a=s<e.length?n[e.charAt(s)]:0;++s;const c=s<e.length?n[e.charAt(s)]:64;++s;const f=s<e.length?n[e.charAt(s)]:64;if(++s,i==null||a==null||c==null||f==null)throw new er;const d=i<<2|a>>4;if(r.push(d),c!==64){const m=a<<4&240|c>>2;if(r.push(m),f!==64){const p=c<<6&192|f;r.push(p)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let e=0;e<this.ENCODED_VALS.length;e++)this.byteToCharMap_[e]=this.ENCODED_VALS.charAt(e),this.charToByteMap_[this.byteToCharMap_[e]]=e,this.byteToCharMapWebSafe_[e]=this.ENCODED_VALS_WEBSAFE.charAt(e),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]]=e,e>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)]=e,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)]=e)}}};class er extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const tr=function(e){const t=$t(e);return Mt.encodeByteArray(t,!0)},Ot=function(e){return tr(e).replace(/\./g,"")},nr=function(e){try{return Mt.decodeString(e,!0)}catch(t){console.error("base64Decode failed: ",t)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function rr(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sr=()=>rr().__FIREBASE_DEFAULTS__,ir=()=>{if(typeof process>"u"||typeof at>"u")return;const e=at.__FIREBASE_DEFAULTS__;if(e)return JSON.parse(e)},or=()=>{if(typeof document>"u")return;let e;try{e=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const t=e&&nr(e[1]);return t&&JSON.parse(t)},ar=()=>{try{return Xn()||sr()||ir()||or()}catch(e){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);return}},Lt=()=>ar()?.config;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cr{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((t,n)=>{this.resolve=t,this.reject=n})}wrapCallback(t){return(n,r)=>{n?this.reject(n):this.resolve(r),typeof t=="function"&&(this.promise.catch(()=>{}),t.length===1?t(n):t(n,r))}}}function Bt(){try{return typeof indexedDB=="object"}catch{return!1}}function Pt(){return new Promise((e,t)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),n||self.indexedDB.deleteDatabase(r),e(!0)},s.onupgradeneeded=()=>{n=!1},s.onerror=()=>{t(s.error?.message||"")}}catch(n){t(n)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lr="FirebaseError";class H extends Error{constructor(t,n,r){super(n),this.code=t,this.customData=r,this.name=lr,Object.setPrototypeOf(this,H.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,se.prototype.create)}}class se{constructor(t,n,r){this.service=t,this.serviceName=n,this.errors=r}create(t,...n){const r=n[0]||{},s=`${this.service}/${t}`,i=this.errors[t],o=i?ur(i,r):"Error",a=`${this.serviceName}: ${o} (${s}).`;return new H(s,a,r)}}function ur(e,t){return e.replace(fr,(n,r)=>{const s=t[r];return s!=null?String(s):`<${r}?>`})}const fr=/\{\$([^}]+)}/g;function De(e,t){if(e===t)return!0;const n=Object.keys(e),r=Object.keys(t);for(const s of n){if(!r.includes(s))return!1;const i=e[s],o=t[s];if(ct(i)&&ct(o)){if(!De(i,o))return!1}else if(i!==o)return!1}for(const s of r)if(!n.includes(s))return!1;return!0}function ct(e){return e!==null&&typeof e=="object"}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ut(e){return e&&e._delegate?e._delegate:e}class M{constructor(t,n,r){this.name=t,this.instanceFactory=n,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(t){return this.instantiationMode=t,this}setMultipleInstances(t){return this.multipleInstances=t,this}setServiceProps(t){return this.serviceProps=t,this}setInstanceCreatedCallback(t){return this.onInstanceCreated=t,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const N="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dr{constructor(t,n){this.name=t,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(t){const n=this.normalizeInstanceIdentifier(t);if(!this.instancesDeferred.has(n)){const r=new cr;if(this.instancesDeferred.set(n,r),this.isInitialized(n)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:n});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(t){const n=this.normalizeInstanceIdentifier(t?.identifier),r=t?.optional??!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(s){if(r)return null;throw s}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(t){if(t.name!==this.name)throw Error(`Mismatching Component ${t.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=t,!!this.shouldAutoInitialize()){if(pr(t))try{this.getOrInitializeService({instanceIdentifier:N})}catch{}for(const[n,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(n);try{const i=this.getOrInitializeService({instanceIdentifier:s});r.resolve(i)}catch{}}}}clearInstance(t=N){this.instancesDeferred.delete(t),this.instancesOptions.delete(t),this.instances.delete(t)}async delete(){const t=Array.from(this.instances.values());await Promise.all([...t.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...t.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(t=N){return this.instances.has(t)}getOptions(t=N){return this.instancesOptions.get(t)||{}}initialize(t={}){const{options:n={}}=t,r=this.normalizeInstanceIdentifier(t.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:n});for(const[i,o]of this.instancesDeferred.entries()){const a=this.normalizeInstanceIdentifier(i);r===a&&o.resolve(s)}return s}onInit(t,n){const r=this.normalizeInstanceIdentifier(n),s=this.onInitCallbacks.get(r)??new Set;s.add(t),this.onInitCallbacks.set(r,s);const i=this.instances.get(r);return i&&t(i,r),()=>{s.delete(t)}}invokeOnInitCallbacks(t,n){const r=this.onInitCallbacks.get(n);if(r)for(const s of r)try{s(t,n)}catch{}}getOrInitializeService({instanceIdentifier:t,options:n={}}){let r=this.instances.get(t);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:hr(t),options:n}),this.instances.set(t,r),this.instancesOptions.set(t,n),this.invokeOnInitCallbacks(r,t),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,t,r)}catch{}return r||null}normalizeInstanceIdentifier(t=N){return this.component?this.component.multipleInstances?t:N:t}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function hr(e){return e===N?void 0:e}function pr(e){return e.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gr{constructor(t){this.name=t,this.providers=new Map}addComponent(t){const n=this.getProvider(t.name);if(n.isComponentSet())throw new Error(`Component ${t.name} has already been registered with ${this.name}`);n.setComponent(t)}addOrOverwriteComponent(t){this.getProvider(t.name).isComponentSet()&&this.providers.delete(t.name),this.addComponent(t)}getProvider(t){if(this.providers.has(t))return this.providers.get(t);const n=new dr(t,this);return this.providers.set(t,n),n}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var h;(function(e){e[e.DEBUG=0]="DEBUG",e[e.VERBOSE=1]="VERBOSE",e[e.INFO=2]="INFO",e[e.WARN=3]="WARN",e[e.ERROR=4]="ERROR",e[e.SILENT=5]="SILENT"})(h||(h={}));const mr={debug:h.DEBUG,verbose:h.VERBOSE,info:h.INFO,warn:h.WARN,error:h.ERROR,silent:h.SILENT},wr=h.INFO,yr={[h.DEBUG]:"log",[h.VERBOSE]:"log",[h.INFO]:"info",[h.WARN]:"warn",[h.ERROR]:"error"},br=(e,t,...n)=>{if(t<e.logLevel)return;const r=new Date().toISOString(),s=yr[t];if(s)console[s](`[${r}]  ${e.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`)};class Ir{constructor(t){this.name=t,this._logLevel=wr,this._logHandler=br,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(t){if(!(t in h))throw new TypeError(`Invalid value "${t}" assigned to \`logLevel\``);this._logLevel=t}setLogLevel(t){this._logLevel=typeof t=="string"?mr[t]:t}get logHandler(){return this._logHandler}set logHandler(t){if(typeof t!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=t}get userLogHandler(){return this._userLogHandler}set userLogHandler(t){this._userLogHandler=t}debug(...t){this._userLogHandler&&this._userLogHandler(this,h.DEBUG,...t),this._logHandler(this,h.DEBUG,...t)}log(...t){this._userLogHandler&&this._userLogHandler(this,h.VERBOSE,...t),this._logHandler(this,h.VERBOSE,...t)}info(...t){this._userLogHandler&&this._userLogHandler(this,h.INFO,...t),this._logHandler(this,h.INFO,...t)}warn(...t){this._userLogHandler&&this._userLogHandler(this,h.WARN,...t),this._logHandler(this,h.WARN,...t)}error(...t){this._userLogHandler&&this._userLogHandler(this,h.ERROR,...t),this._logHandler(this,h.ERROR,...t)}}const _r=(e,t)=>t.some(n=>e instanceof n);let lt,ut;function Sr(){return lt||(lt=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Er(){return ut||(ut=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Ft=new WeakMap,Te=new WeakMap,Wt=new WeakMap,le=new WeakMap,Ue=new WeakMap;function Cr(e){const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("success",i),e.removeEventListener("error",o)},i=()=>{n(v(e.result)),s()},o=()=>{r(e.error),s()};e.addEventListener("success",i),e.addEventListener("error",o)});return t.then(n=>{n instanceof IDBCursor&&Ft.set(n,e)}).catch(()=>{}),Ue.set(t,e),t}function Dr(e){if(Te.has(e))return;const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("complete",i),e.removeEventListener("error",o),e.removeEventListener("abort",o)},i=()=>{n(),s()},o=()=>{r(e.error||new DOMException("AbortError","AbortError")),s()};e.addEventListener("complete",i),e.addEventListener("error",o),e.addEventListener("abort",o)});Te.set(e,t)}let Ae={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return Te.get(e);if(t==="objectStoreNames")return e.objectStoreNames||Wt.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return v(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function Tr(e){Ae=e(Ae)}function Ar(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const r=e.call(ue(this),t,...n);return Wt.set(r,t.sort?t.sort():[t]),v(r)}:Er().includes(e)?function(...t){return e.apply(ue(this),t),v(Ft.get(this))}:function(...t){return v(e.apply(ue(this),t))}}function vr(e){return typeof e=="function"?Ar(e):(e instanceof IDBTransaction&&Dr(e),_r(e,Sr())?new Proxy(e,Ae):e)}function v(e){if(e instanceof IDBRequest)return Cr(e);if(le.has(e))return le.get(e);const t=vr(e);return t!==e&&(le.set(e,t),Ue.set(t,e)),t}const ue=e=>Ue.get(e);function kr(e,t,{blocked:n,upgrade:r,blocking:s,terminated:i}={}){const o=indexedDB.open(e,t),a=v(o);return r&&o.addEventListener("upgradeneeded",l=>{r(v(o.result),l.oldVersion,l.newVersion,v(o.transaction),l)}),n&&o.addEventListener("blocked",l=>n(l.oldVersion,l.newVersion,l)),a.then(l=>{i&&l.addEventListener("close",()=>i()),s&&l.addEventListener("versionchange",c=>s(c.oldVersion,c.newVersion,c))}).catch(()=>{}),a}const Rr=["get","getKey","getAll","getAllKeys","count"],Nr=["put","add","delete","clear"],fe=new Map;function ft(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(fe.get(t))return fe.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,s=Nr.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(s||Rr.includes(n)))return;const i=async function(o,...a){const l=this.transaction(o,s?"readwrite":"readonly");let c=l.store;return r&&(c=c.index(a.shift())),(await Promise.all([c[n](...a),s&&l.done]))[0]};return fe.set(t,i),i}Tr(e=>({...e,get:(t,n,r)=>ft(t,n)||e.get(t,n,r),has:(t,n)=>!!ft(t,n)||e.has(t,n)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $r{constructor(t){this.container=t}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(Mr(n)){const r=n.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(n=>n).join(" ")}}function Mr(e){return e.getComponent()?.type==="VERSION"}const ve="@firebase/app",dt="0.14.11";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const T=new Ir("@firebase/app"),Or="@firebase/app-compat",Lr="@firebase/analytics-compat",Br="@firebase/analytics",Pr="@firebase/app-check-compat",Ur="@firebase/app-check",Fr="@firebase/auth",Wr="@firebase/auth-compat",jr="@firebase/database",Kr="@firebase/data-connect",Hr="@firebase/database-compat",xr="@firebase/functions",Vr="@firebase/functions-compat",qr="@firebase/installations",zr="@firebase/installations-compat",Gr="@firebase/messaging",Jr="@firebase/messaging-compat",Yr="@firebase/performance",Zr="@firebase/performance-compat",Xr="@firebase/remote-config",Qr="@firebase/remote-config-compat",es="@firebase/storage",ts="@firebase/storage-compat",ns="@firebase/firestore",rs="@firebase/ai",ss="@firebase/firestore-compat",is="firebase";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ke="[DEFAULT]",os={[ve]:"fire-core",[Or]:"fire-core-compat",[Br]:"fire-analytics",[Lr]:"fire-analytics-compat",[Ur]:"fire-app-check",[Pr]:"fire-app-check-compat",[Fr]:"fire-auth",[Wr]:"fire-auth-compat",[jr]:"fire-rtdb",[Kr]:"fire-data-connect",[Hr]:"fire-rtdb-compat",[xr]:"fire-fn",[Vr]:"fire-fn-compat",[qr]:"fire-iid",[zr]:"fire-iid-compat",[Gr]:"fire-fcm",[Jr]:"fire-fcm-compat",[Yr]:"fire-perf",[Zr]:"fire-perf-compat",[Xr]:"fire-rc",[Qr]:"fire-rc-compat",[es]:"fire-gcs",[ts]:"fire-gcs-compat",[ns]:"fire-fst",[ss]:"fire-fst-compat",[rs]:"fire-vertex","fire-js":"fire-js",[is]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ee=new Map,as=new Map,Re=new Map;function ht(e,t){try{e.container.addComponent(t)}catch(n){T.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`,n)}}function K(e){const t=e.name;if(Re.has(t))return T.debug(`There were multiple attempts to register component ${t}.`),!1;Re.set(t,e);for(const n of ee.values())ht(n,e);for(const n of as.values())ht(n,e);return!0}function Fe(e,t){const n=e.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),e.container.getProvider(t)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cs={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},k=new se("app","Firebase",cs);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ls{constructor(t,n,r){this._isDeleted=!1,this._options={...t},this._config={...n},this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new M("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(t){this.checkDestroyed(),this._automaticDataCollectionEnabled=t}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(t){this._isDeleted=t}checkDestroyed(){if(this.isDeleted)throw k.create("app-deleted",{appName:this._name})}}function jt(e,t={}){let n=e;typeof t!="object"&&(t={name:t});const r={name:ke,automaticDataCollectionEnabled:!0,...t},s=r.name;if(typeof s!="string"||!s)throw k.create("bad-app-name",{appName:String(s)});if(n||(n=Lt()),!n)throw k.create("no-options");const i=ee.get(s);if(i){if(De(n,i.options)&&De(r,i.config))return i;throw k.create("duplicate-app",{appName:s})}const o=new gr(s);for(const l of Re.values())o.addComponent(l);const a=new ls(n,r,o);return ee.set(s,a),a}function us(e=ke){const t=ee.get(e);if(!t&&e===ke&&Lt())return jt();if(!t)throw k.create("no-app",{appName:e});return t}function j(e,t,n){let r=os[e]??e;n&&(r+=`-${n}`);const s=r.match(/\s|\//),i=t.match(/\s|\//);if(s||i){const o=[`Unable to register library "${r}" with version "${t}":`];s&&o.push(`library name "${r}" contains illegal characters (whitespace or "/")`),s&&i&&o.push("and"),i&&o.push(`version name "${t}" contains illegal characters (whitespace or "/")`),T.warn(o.join(" "));return}K(new M(`${r}-version`,()=>({library:r,version:t}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fs="firebase-heartbeat-database",ds=1,z="firebase-heartbeat-store";let de=null;function Kt(){return de||(de=kr(fs,ds,{upgrade:(e,t)=>{switch(t){case 0:try{e.createObjectStore(z)}catch(n){console.warn(n)}}}}).catch(e=>{throw k.create("idb-open",{originalErrorMessage:e.message})})),de}async function hs(e){try{const n=(await Kt()).transaction(z),r=await n.objectStore(z).get(Ht(e));return await n.done,r}catch(t){if(t instanceof H)T.warn(t.message);else{const n=k.create("idb-get",{originalErrorMessage:t?.message});T.warn(n.message)}}}async function pt(e,t){try{const r=(await Kt()).transaction(z,"readwrite");await r.objectStore(z).put(t,Ht(e)),await r.done}catch(n){if(n instanceof H)T.warn(n.message);else{const r=k.create("idb-set",{originalErrorMessage:n?.message});T.warn(r.message)}}}function Ht(e){return`${e.name}!${e.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ps=1024,gs=30;class ms{constructor(t){this.container=t,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new ys(n),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){try{const n=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),r=gt();if(this._heartbeatsCache?.heartbeats==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null)||this._heartbeatsCache.lastSentHeartbeatDate===r||this._heartbeatsCache.heartbeats.some(s=>s.date===r))return;if(this._heartbeatsCache.heartbeats.push({date:r,agent:n}),this._heartbeatsCache.heartbeats.length>gs){const s=bs(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(s,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(t){T.warn(t)}}async getHeartbeatsHeader(){try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=gt(),{heartbeatsToSend:n,unsentEntries:r}=ws(this._heartbeatsCache.heartbeats),s=Ot(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,r.length>0?(this._heartbeatsCache.heartbeats=r,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return T.warn(t),""}}}function gt(){return new Date().toISOString().substring(0,10)}function ws(e,t=ps){const n=[];let r=e.slice();for(const s of e){const i=n.find(o=>o.agent===s.agent);if(i){if(i.dates.push(s.date),mt(n)>t){i.dates.pop();break}}else if(n.push({agent:s.agent,dates:[s.date]}),mt(n)>t){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}class ys{constructor(t){this.app=t,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Bt()?Pt().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await hs(this.app);return n?.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(t){if(await this._canUseIndexedDBPromise){const r=await this.read();return pt(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:t.heartbeats})}else return}async add(t){if(await this._canUseIndexedDBPromise){const r=await this.read();return pt(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...t.heartbeats]})}else return}}function mt(e){return Ot(JSON.stringify({version:2,heartbeats:e})).length}function bs(e){if(e.length===0)return-1;let t=0,n=e[0].date;for(let r=1;r<e.length;r++)e[r].date<n&&(n=e[r].date,t=r);return t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Is(e){K(new M("platform-logger",t=>new $r(t),"PRIVATE")),K(new M("heartbeat",t=>new ms(t),"PRIVATE")),j(ve,dt,e),j(ve,dt,"esm2020"),j("fire-js","")}Is("");var _s="firebase",Ss="12.12.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */j(_s,Ss,"app");const Es=(e,t)=>t.some(n=>e instanceof n);let wt,yt;function Cs(){return wt||(wt=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Ds(){return yt||(yt=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const xt=new WeakMap,Ne=new WeakMap,Vt=new WeakMap,he=new WeakMap,We=new WeakMap;function Ts(e){const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("success",i),e.removeEventListener("error",o)},i=()=>{n(R(e.result)),s()},o=()=>{r(e.error),s()};e.addEventListener("success",i),e.addEventListener("error",o)});return t.then(n=>{n instanceof IDBCursor&&xt.set(n,e)}).catch(()=>{}),We.set(t,e),t}function As(e){if(Ne.has(e))return;const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("complete",i),e.removeEventListener("error",o),e.removeEventListener("abort",o)},i=()=>{n(),s()},o=()=>{r(e.error||new DOMException("AbortError","AbortError")),s()};e.addEventListener("complete",i),e.addEventListener("error",o),e.addEventListener("abort",o)});Ne.set(e,t)}let $e={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return Ne.get(e);if(t==="objectStoreNames")return e.objectStoreNames||Vt.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return R(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function vs(e){$e=e($e)}function ks(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const r=e.call(pe(this),t,...n);return Vt.set(r,t.sort?t.sort():[t]),R(r)}:Ds().includes(e)?function(...t){return e.apply(pe(this),t),R(xt.get(this))}:function(...t){return R(e.apply(pe(this),t))}}function Rs(e){return typeof e=="function"?ks(e):(e instanceof IDBTransaction&&As(e),Es(e,Cs())?new Proxy(e,$e):e)}function R(e){if(e instanceof IDBRequest)return Ts(e);if(he.has(e))return he.get(e);const t=Rs(e);return t!==e&&(he.set(e,t),We.set(t,e)),t}const pe=e=>We.get(e);function Ns(e,t,{blocked:n,upgrade:r,blocking:s,terminated:i}={}){const o=indexedDB.open(e,t),a=R(o);return r&&o.addEventListener("upgradeneeded",l=>{r(R(o.result),l.oldVersion,l.newVersion,R(o.transaction),l)}),n&&o.addEventListener("blocked",l=>n(l.oldVersion,l.newVersion,l)),a.then(l=>{i&&l.addEventListener("close",()=>i()),s&&l.addEventListener("versionchange",c=>s(c.oldVersion,c.newVersion,c))}).catch(()=>{}),a}const $s=["get","getKey","getAll","getAllKeys","count"],Ms=["put","add","delete","clear"],ge=new Map;function bt(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(ge.get(t))return ge.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,s=Ms.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(s||$s.includes(n)))return;const i=async function(o,...a){const l=this.transaction(o,s?"readwrite":"readonly");let c=l.store;return r&&(c=c.index(a.shift())),(await Promise.all([c[n](...a),s&&l.done]))[0]};return ge.set(t,i),i}vs(e=>({...e,get:(t,n,r)=>bt(t,n)||e.get(t,n,r),has:(t,n)=>!!bt(t,n)||e.has(t,n)}));const qt="@firebase/installations",je="0.6.21";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zt=1e4,Gt=`w:${je}`,Jt="FIS_v2",Os="https://firebaseinstallations.googleapis.com/v1",Ls=60*60*1e3,Bs="installations",Ps="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Us={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},O=new se(Bs,Ps,Us);function Yt(e){return e instanceof H&&e.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zt({projectId:e}){return`${Os}/projects/${e}/installations`}function Xt(e){return{token:e.token,requestStatus:2,expiresIn:Ws(e.expiresIn),creationTime:Date.now()}}async function Qt(e,t){const r=(await t.json()).error;return O.create("request-failed",{requestName:e,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function en({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function Fs(e,{refreshToken:t}){const n=en(e);return n.append("Authorization",js(t)),n}async function tn(e){const t=await e();return t.status>=500&&t.status<600?e():t}function Ws(e){return Number(e.replace("s","000"))}function js(e){return`${Jt} ${e}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ks({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const r=Zt(e),s=en(e),i=t.getImmediate({optional:!0});if(i){const c=await i.getHeartbeatsHeader();c&&s.append("x-firebase-client",c)}const o={fid:n,authVersion:Jt,appId:e.appId,sdkVersion:Gt},a={method:"POST",headers:s,body:JSON.stringify(o)},l=await tn(()=>fetch(r,a));if(l.ok){const c=await l.json();return{fid:c.fid||n,registrationStatus:2,refreshToken:c.refreshToken,authToken:Xt(c.authToken)}}else throw await Qt("Create Installation",l)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nn(e){return new Promise(t=>{setTimeout(t,e)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Hs(e){return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xs=/^[cdef][\w-]{21}$/,Me="";function Vs(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const n=qs(e);return xs.test(n)?n:Me}catch{return Me}}function qs(e){return Hs(e).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ie(e){return`${e.appName}!${e.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rn=new Map;function sn(e,t){const n=ie(e);on(n,t),zs(n,t)}function on(e,t){const n=rn.get(e);if(n)for(const r of n)r(t)}function zs(e,t){const n=Gs();n&&n.postMessage({key:e,fid:t}),Js()}let $=null;function Gs(){return!$&&"BroadcastChannel"in self&&($=new BroadcastChannel("[Firebase] FID Change"),$.onmessage=e=>{on(e.data.key,e.data.fid)}),$}function Js(){rn.size===0&&$&&($.close(),$=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ys="firebase-installations-database",Zs=1,L="firebase-installations-store";let me=null;function Ke(){return me||(me=Ns(Ys,Zs,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(L)}}})),me}async function te(e,t){const n=ie(e),s=(await Ke()).transaction(L,"readwrite"),i=s.objectStore(L),o=await i.get(n);return await i.put(t,n),await s.done,(!o||o.fid!==t.fid)&&sn(e,t.fid),t}async function an(e){const t=ie(e),r=(await Ke()).transaction(L,"readwrite");await r.objectStore(L).delete(t),await r.done}async function oe(e,t){const n=ie(e),s=(await Ke()).transaction(L,"readwrite"),i=s.objectStore(L),o=await i.get(n),a=t(o);return a===void 0?await i.delete(n):await i.put(a,n),await s.done,a&&(!o||o.fid!==a.fid)&&sn(e,a.fid),a}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function He(e){let t;const n=await oe(e.appConfig,r=>{const s=Xs(r),i=Qs(e,s);return t=i.registrationPromise,i.installationEntry});return n.fid===Me?{installationEntry:await t}:{installationEntry:n,registrationPromise:t}}function Xs(e){const t=e||{fid:Vs(),registrationStatus:0};return cn(t)}function Qs(e,t){if(t.registrationStatus===0){if(!navigator.onLine){const s=Promise.reject(O.create("app-offline"));return{installationEntry:t,registrationPromise:s}}const n={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},r=ei(e,n);return{installationEntry:n,registrationPromise:r}}else return t.registrationStatus===1?{installationEntry:t,registrationPromise:ti(e)}:{installationEntry:t}}async function ei(e,t){try{const n=await Ks(e,t);return te(e.appConfig,n)}catch(n){throw Yt(n)&&n.customData.serverCode===409?await an(e.appConfig):await te(e.appConfig,{fid:t.fid,registrationStatus:0}),n}}async function ti(e){let t=await It(e.appConfig);for(;t.registrationStatus===1;)await nn(100),t=await It(e.appConfig);if(t.registrationStatus===0){const{installationEntry:n,registrationPromise:r}=await He(e);return r||n}return t}function It(e){return oe(e,t=>{if(!t)throw O.create("installation-not-found");return cn(t)})}function cn(e){return ni(e)?{fid:e.fid,registrationStatus:0}:e}function ni(e){return e.registrationStatus===1&&e.registrationTime+zt<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ri({appConfig:e,heartbeatServiceProvider:t},n){const r=si(e,n),s=Fs(e,n),i=t.getImmediate({optional:!0});if(i){const c=await i.getHeartbeatsHeader();c&&s.append("x-firebase-client",c)}const o={installation:{sdkVersion:Gt,appId:e.appId}},a={method:"POST",headers:s,body:JSON.stringify(o)},l=await tn(()=>fetch(r,a));if(l.ok){const c=await l.json();return Xt(c)}else throw await Qt("Generate Auth Token",l)}function si(e,{fid:t}){return`${Zt(e)}/${t}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xe(e,t=!1){let n;const r=await oe(e.appConfig,i=>{if(!ln(i))throw O.create("not-registered");const o=i.authToken;if(!t&&ai(o))return i;if(o.requestStatus===1)return n=ii(e,t),i;{if(!navigator.onLine)throw O.create("app-offline");const a=li(i);return n=oi(e,a),a}});return n?await n:r.authToken}async function ii(e,t){let n=await _t(e.appConfig);for(;n.authToken.requestStatus===1;)await nn(100),n=await _t(e.appConfig);const r=n.authToken;return r.requestStatus===0?xe(e,t):r}function _t(e){return oe(e,t=>{if(!ln(t))throw O.create("not-registered");const n=t.authToken;return ui(n)?{...t,authToken:{requestStatus:0}}:t})}async function oi(e,t){try{const n=await ri(e,t),r={...t,authToken:n};return await te(e.appConfig,r),n}catch(n){if(Yt(n)&&(n.customData.serverCode===401||n.customData.serverCode===404))await an(e.appConfig);else{const r={...t,authToken:{requestStatus:0}};await te(e.appConfig,r)}throw n}}function ln(e){return e!==void 0&&e.registrationStatus===2}function ai(e){return e.requestStatus===2&&!ci(e)}function ci(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+Ls}function li(e){const t={requestStatus:1,requestTime:Date.now()};return{...e,authToken:t}}function ui(e){return e.requestStatus===1&&e.requestTime+zt<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function fi(e){const t=e,{installationEntry:n,registrationPromise:r}=await He(t);return r?r.catch(console.error):xe(t).catch(console.error),n.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function di(e,t=!1){const n=e;return await hi(n),(await xe(n,t)).token}async function hi(e){const{registrationPromise:t}=await He(e);t&&await t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pi(e){if(!e||!e.options)throw we("App Configuration");if(!e.name)throw we("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw we(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}function we(e){return O.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const un="installations",gi="installations-internal",mi=e=>{const t=e.getProvider("app").getImmediate(),n=pi(t),r=Fe(t,"heartbeat");return{app:t,appConfig:n,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},wi=e=>{const t=e.getProvider("app").getImmediate(),n=Fe(t,un).getImmediate();return{getId:()=>fi(n),getToken:s=>di(n,s)}};function yi(){K(new M(un,mi,"PUBLIC")),K(new M(gi,wi,"PRIVATE"))}yi();j(qt,je);j(qt,je,"esm2020");const bi=(e,t)=>t.some(n=>e instanceof n);let St,Et;function Ii(){return St||(St=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function _i(){return Et||(Et=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const fn=new WeakMap,Oe=new WeakMap,dn=new WeakMap,ye=new WeakMap,Ve=new WeakMap;function Si(e){const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("success",i),e.removeEventListener("error",o)},i=()=>{n(D(e.result)),s()},o=()=>{r(e.error),s()};e.addEventListener("success",i),e.addEventListener("error",o)});return t.then(n=>{n instanceof IDBCursor&&fn.set(n,e)}).catch(()=>{}),Ve.set(t,e),t}function Ei(e){if(Oe.has(e))return;const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("complete",i),e.removeEventListener("error",o),e.removeEventListener("abort",o)},i=()=>{n(),s()},o=()=>{r(e.error||new DOMException("AbortError","AbortError")),s()};e.addEventListener("complete",i),e.addEventListener("error",o),e.addEventListener("abort",o)});Oe.set(e,t)}let Le={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return Oe.get(e);if(t==="objectStoreNames")return e.objectStoreNames||dn.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return D(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function Ci(e){Le=e(Le)}function Di(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const r=e.call(be(this),t,...n);return dn.set(r,t.sort?t.sort():[t]),D(r)}:_i().includes(e)?function(...t){return e.apply(be(this),t),D(fn.get(this))}:function(...t){return D(e.apply(be(this),t))}}function Ti(e){return typeof e=="function"?Di(e):(e instanceof IDBTransaction&&Ei(e),bi(e,Ii())?new Proxy(e,Le):e)}function D(e){if(e instanceof IDBRequest)return Si(e);if(ye.has(e))return ye.get(e);const t=Ti(e);return t!==e&&(ye.set(e,t),Ve.set(t,e)),t}const be=e=>Ve.get(e);function hn(e,t,{blocked:n,upgrade:r,blocking:s,terminated:i}={}){const o=indexedDB.open(e,t),a=D(o);return r&&o.addEventListener("upgradeneeded",l=>{r(D(o.result),l.oldVersion,l.newVersion,D(o.transaction),l)}),n&&o.addEventListener("blocked",l=>n(l.oldVersion,l.newVersion,l)),a.then(l=>{i&&l.addEventListener("close",()=>i()),s&&l.addEventListener("versionchange",c=>s(c.oldVersion,c.newVersion,c))}).catch(()=>{}),a}function Ie(e,{blocked:t}={}){const n=indexedDB.deleteDatabase(e);return t&&n.addEventListener("blocked",r=>t(r.oldVersion,r)),D(n).then(()=>{})}const Ai=["get","getKey","getAll","getAllKeys","count"],vi=["put","add","delete","clear"],_e=new Map;function Ct(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(_e.get(t))return _e.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,s=vi.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(s||Ai.includes(n)))return;const i=async function(o,...a){const l=this.transaction(o,s?"readwrite":"readonly");let c=l.store;return r&&(c=c.index(a.shift())),(await Promise.all([c[n](...a),s&&l.done]))[0]};return _e.set(t,i),i}Ci(e=>({...e,get:(t,n,r)=>Ct(t,n)||e.get(t,n,r),has:(t,n)=>!!Ct(t,n)||e.has(t,n)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pn="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",ki="https://fcmregistrations.googleapis.com/v1",gn="FCM_MSG",Ri="google.c.a.c_id",Ni=3,$i=1;var ne;(function(e){e[e.DATA_MESSAGE=1]="DATA_MESSAGE",e[e.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION"})(ne||(ne={}));/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */var re;(function(e){e.PUSH_RECEIVED="push-received",e.NOTIFICATION_CLICKED="notification-clicked"})(re||(re={}));/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function E(e){const t=new Uint8Array(e);return btoa(String.fromCharCode(...t)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function Mi(e){const t="=".repeat((4-e.length%4)%4),n=(e+t).replace(/\-/g,"+").replace(/_/g,"/"),r=atob(n),s=new Uint8Array(r.length);for(let i=0;i<r.length;++i)s[i]=r.charCodeAt(i);return s}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Se="fcm_token_details_db",Oi=5,Dt="fcm_token_object_Store";async function Li(e){if("databases"in indexedDB&&!(await indexedDB.databases()).map(i=>i.name).includes(Se))return null;let t=null;return(await hn(Se,Oi,{upgrade:async(r,s,i,o)=>{if(s<2||!r.objectStoreNames.contains(Dt))return;const a=o.objectStore(Dt),l=await a.index("fcmSenderId").get(e);if(await a.clear(),!!l){if(s===2){const c=l;if(!c.auth||!c.p256dh||!c.endpoint)return;t={token:c.fcmToken,createTime:c.createTime??Date.now(),subscriptionOptions:{auth:c.auth,p256dh:c.p256dh,endpoint:c.endpoint,swScope:c.swScope,vapidKey:typeof c.vapidKey=="string"?c.vapidKey:E(c.vapidKey)}}}else if(s===3){const c=l;t={token:c.fcmToken,createTime:c.createTime,subscriptionOptions:{auth:E(c.auth),p256dh:E(c.p256dh),endpoint:c.endpoint,swScope:c.swScope,vapidKey:E(c.vapidKey)}}}else if(s===4){const c=l;t={token:c.fcmToken,createTime:c.createTime,subscriptionOptions:{auth:E(c.auth),p256dh:E(c.p256dh),endpoint:c.endpoint,swScope:c.swScope,vapidKey:E(c.vapidKey)}}}}}})).close(),await Ie(Se),await Ie("fcm_vapid_details_db"),await Ie("undefined"),Bi(t)?t:null}function Bi(e){if(!e||!e.subscriptionOptions)return!1;const{subscriptionOptions:t}=e;return typeof e.createTime=="number"&&e.createTime>0&&typeof e.token=="string"&&e.token.length>0&&typeof t.auth=="string"&&t.auth.length>0&&typeof t.p256dh=="string"&&t.p256dh.length>0&&typeof t.endpoint=="string"&&t.endpoint.length>0&&typeof t.swScope=="string"&&t.swScope.length>0&&typeof t.vapidKey=="string"&&t.vapidKey.length>0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pi="firebase-messaging-database",Ui=1,B="firebase-messaging-store";let Ee=null;function qe(){return Ee||(Ee=hn(Pi,Ui,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(B)}}})),Ee}async function ze(e){const t=Je(e),r=await(await qe()).transaction(B).objectStore(B).get(t);if(r)return r;{const s=await Li(e.appConfig.senderId);if(s)return await Ge(e,s),s}}async function Ge(e,t){const n=Je(e),s=(await qe()).transaction(B,"readwrite");return await s.objectStore(B).put(t,n),await s.done,t}async function Fi(e){const t=Je(e),r=(await qe()).transaction(B,"readwrite");await r.objectStore(B).delete(t),await r.done}function Je({appConfig:e}){return e.appId}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wi={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."},b=new se("messaging","Messaging",Wi);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ji(e,t){const n=await Ze(e),r=wn(t),s={method:"POST",headers:n,body:JSON.stringify(r)};let i;try{i=await(await fetch(Ye(e.appConfig),s)).json()}catch(o){throw b.create("token-subscribe-failed",{errorInfo:o?.toString()})}if(i.error){const o=i.error.message;throw b.create("token-subscribe-failed",{errorInfo:o})}if(!i.token)throw b.create("token-subscribe-no-token");return i.token}async function Ki(e,t){const n=await Ze(e),r=wn(t.subscriptionOptions),s={method:"PATCH",headers:n,body:JSON.stringify(r)};let i;try{i=await(await fetch(`${Ye(e.appConfig)}/${t.token}`,s)).json()}catch(o){throw b.create("token-update-failed",{errorInfo:o?.toString()})}if(i.error){const o=i.error.message;throw b.create("token-update-failed",{errorInfo:o})}if(!i.token)throw b.create("token-update-no-token");return i.token}async function mn(e,t){const r={method:"DELETE",headers:await Ze(e)};try{const i=await(await fetch(`${Ye(e.appConfig)}/${t}`,r)).json();if(i.error){const o=i.error.message;throw b.create("token-unsubscribe-failed",{errorInfo:o})}}catch(s){throw b.create("token-unsubscribe-failed",{errorInfo:s?.toString()})}}function Ye({projectId:e}){return`${ki}/projects/${e}/registrations`}async function Ze({appConfig:e,installations:t}){const n=await t.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e.apiKey,"x-goog-firebase-installations-auth":`FIS ${n}`})}function wn({p256dh:e,auth:t,endpoint:n,vapidKey:r}){const s={web:{endpoint:n,auth:t,p256dh:e}};return r!==pn&&(s.web.applicationPubKey=r),s}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hi=7*24*60*60*1e3;async function xi(e){const t=await qi(e.swRegistration,e.vapidKey),n={vapidKey:e.vapidKey,swScope:e.swRegistration.scope,endpoint:t.endpoint,auth:E(t.getKey("auth")),p256dh:E(t.getKey("p256dh"))},r=await ze(e.firebaseDependencies);if(r){if(zi(r.subscriptionOptions,n))return Date.now()>=r.createTime+Hi?Vi(e,{token:r.token,createTime:Date.now(),subscriptionOptions:n}):r.token;try{await mn(e.firebaseDependencies,r.token)}catch(s){console.warn(s)}return At(e.firebaseDependencies,n)}else return At(e.firebaseDependencies,n)}async function Tt(e){const t=await ze(e.firebaseDependencies);t&&(await mn(e.firebaseDependencies,t.token),await Fi(e.firebaseDependencies));const n=await e.swRegistration.pushManager.getSubscription();return n?n.unsubscribe():!0}async function Vi(e,t){try{const n=await Ki(e.firebaseDependencies,t),r={...t,token:n,createTime:Date.now()};return await Ge(e.firebaseDependencies,r),n}catch(n){throw n}}async function At(e,t){const r={token:await ji(e,t),createTime:Date.now(),subscriptionOptions:t};return await Ge(e,r),r.token}async function qi(e,t){const n=await e.pushManager.getSubscription();return n||e.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:Mi(t)})}function zi(e,t){const n=t.vapidKey===e.vapidKey,r=t.endpoint===e.endpoint,s=t.auth===e.auth,i=t.p256dh===e.p256dh;return n&&r&&s&&i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gi(e){const t={from:e.from,collapseKey:e.collapse_key,messageId:e.fcmMessageId};return Ji(t,e),Yi(t,e),Zi(t,e),t}function Ji(e,t){if(!t.notification)return;e.notification={};const n=t.notification.title;n&&(e.notification.title=n);const r=t.notification.body;r&&(e.notification.body=r);const s=t.notification.image;s&&(e.notification.image=s);const i=t.notification.icon;i&&(e.notification.icon=i)}function Yi(e,t){t.data&&(e.data=t.data)}function Zi(e,t){if(!t.fcmOptions&&!t.notification?.click_action)return;e.fcmOptions={};const n=t.fcmOptions?.link??t.notification?.click_action;n&&(e.fcmOptions.link=n);const r=t.fcmOptions?.analytics_label;r&&(e.fcmOptions.analyticsLabel=r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xi(e){return typeof e=="object"&&!!e&&Ri in e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qi(e){return new Promise(t=>{setTimeout(t,e)})}async function eo(e,t){const n=to(t,await e.firebaseDependencies.installations.getId());no(e,n,t.productId)}function to(e,t){const n={};return e.from&&(n.project_number=e.from),e.fcmMessageId&&(n.message_id=e.fcmMessageId),n.instance_id=t,e.notification?n.message_type=ne.DISPLAY_NOTIFICATION.toString():n.message_type=ne.DATA_MESSAGE.toString(),n.sdk_platform=Ni.toString(),n.package_name=self.origin.replace(/(^\w+:|^)\/\//,""),e.collapse_key&&(n.collapse_key=e.collapse_key),n.event=$i.toString(),e.fcmOptions?.analytics_label&&(n.analytics_label=e.fcmOptions?.analytics_label),n}function no(e,t,n){const r={};r.event_time_ms=Math.floor(Date.now()).toString(),r.source_extension_json_proto3=JSON.stringify({messaging_client_event:t}),n&&(r.compliance_data=ro(n)),e.logEvents.push(r)}function ro(e){return{privacy_context:{prequest:{origin_associated_product_id:e}}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function so(e,t){const{newSubscription:n}=e;if(!n){await Tt(t);return}const r=await ze(t.firebaseDependencies);await Tt(t),t.vapidKey=r?.subscriptionOptions?.vapidKey??pn,await xi(t)}async function io(e,t){const n=co(e);if(!n)return;t.deliveryMetricsExportedToBigQueryEnabled&&await eo(t,n);const r=await yn();if(uo(r))return fo(r,n);if(n.notification&&await ho(ao(n)),!!t&&t.onBackgroundMessageHandler){const s=Gi(n);typeof t.onBackgroundMessageHandler=="function"?await t.onBackgroundMessageHandler(s):t.onBackgroundMessageHandler.next(s)}}async function oo(e){const t=e.notification?.data?.[gn];if(t){if(e.action)return}else return;e.stopImmediatePropagation(),e.notification.close();const n=po(t);if(!n)return;const r=new URL(n,self.location.href),s=new URL(self.location.origin);if(r.host!==s.host)return;let i=await lo(r);if(i?i=await i.focus():(i=await self.clients.openWindow(n),await Qi(3e3)),!!i)return t.messageType=re.NOTIFICATION_CLICKED,t.isFirebaseMessaging=!0,i.postMessage(t)}function ao(e){const t={...e.notification};return t.data={[gn]:e},t}function co({data:e}){if(!e)return null;try{return e.json()}catch{return null}}async function lo(e){const t=await yn();for(const n of t){const r=new URL(n.url,self.location.href);if(e.host===r.host)return n}return null}function uo(e){return e.some(t=>t.visibilityState==="visible"&&!t.url.startsWith("chrome-extension://"))}function fo(e,t){t.isFirebaseMessaging=!0,t.messageType=re.PUSH_RECEIVED;for(const n of e)n.postMessage(t)}function yn(){return self.clients.matchAll({type:"window",includeUncontrolled:!0})}function ho(e){const{actions:t}=e,{maxActions:n}=Notification;return t&&n&&t.length>n&&console.warn(`This browser only supports ${n} actions. The remaining actions will not be displayed.`),self.registration.showNotification(e.title??"",e)}function po(e){const t=e.fcmOptions?.link??e.notification?.click_action;return t||(Xi(e.data)?self.location.origin:null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function go(e){if(!e||!e.options)throw Ce("App Configuration Object");if(!e.name)throw Ce("App Name");const t=["projectId","apiKey","appId","messagingSenderId"],{options:n}=e;for(const r of t)if(!n[r])throw Ce(r);return{appName:e.name,projectId:n.projectId,apiKey:n.apiKey,appId:n.appId,senderId:n.messagingSenderId}}function Ce(e){return b.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mo{constructor(t,n,r){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const s=go(t);this.firebaseDependencies={app:t,appConfig:s,installations:n,analyticsProvider:r}}_delete(){return Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wo=e=>{const t=new mo(e.getProvider("app").getImmediate(),e.getProvider("installations-internal").getImmediate(),e.getProvider("analytics-internal"));return self.addEventListener("push",n=>{n.waitUntil(io(n,t))}),self.addEventListener("pushsubscriptionchange",n=>{n.waitUntil(so(n,t))}),self.addEventListener("notificationclick",n=>{n.waitUntil(oo(n))}),t};function yo(){K(new M("messaging-sw",wo,"PUBLIC"))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function bo(){return Bt()&&await Pt()&&"PushManager"in self&&"Notification"in self&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Io(e,t){if(self.document!==void 0)throw b.create("only-available-in-sw");return e.onBackgroundMessageHandler=t,()=>{e.onBackgroundMessageHandler=null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _o(e=us()){return bo().then(t=>{if(!t)throw b.create("unsupported-browser")},t=>{throw b.create("indexed-db-unsupported")}),Fe(Ut(e),"messaging-sw").getImmediate()}function So(e,t){return e=Ut(e),Io(e,t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */yo();Yn([{"revision":"8e3a10e157f75ada21ab742c022d5430","url":"vite.svg"},{"revision":"21ae9d8aa52e4be84380c26617b94c3b","url":"test_chatbox_messages.html"},{"revision":"4b820b5d6980bd61d7f41e2d511b6859","url":"splash-poster.png"},{"revision":"5d4278abe4d9237d70abdbbc1ed60248","url":"registerSW.js"},{"revision":"ac4d10ec3ebf9a8b62eee4737bbfcbcc","url":"manifest.webmanifest"},{"revision":"c4394b72fca66ae4af6d7abd05091b23","url":"index.html"},{"revision":"e4746058442f37df1c1c54b982445730","url":"icon.png"},{"revision":"af0d6b32ee2533504a9abbf7e1737849","url":"icon-notify.png"},{"revision":"f89e98a211bf04c16f7848d2fabcc91d","url":"icon-192.png"},{"revision":"90603eba8f687e5c697d5204359c1fd2","url":"firebase-messaging-sw.js"},{"revision":"dbb3bc0b40b9df3993ae416c53696e98","url":"favicon.ico"},{"revision":"3fd09ef12fdf89f68dc07ce007816590","url":"favicon-32x32.png"},{"revision":"ee3c4564588b494544001f3c0229c1d4","url":"favicon-16x16.png"},{"revision":"f37b3e324dc1a501a69537a29688ae68","url":"badge-96.png"},{"revision":"9fb1d85ce305f07738e7919ac479d544","url":"apple-touch-icon.png"},{"revision":"d4a0caf50f119f3545109156b8df30ad","url":"404.html"},{"revision":null,"url":"assets/v4-BKrj-4V8.js"},{"revision":null,"url":"assets/UploadPost-CswYw56n.js"},{"revision":null,"url":"assets/type-bepAyrxf.js"},{"revision":null,"url":"assets/trash-2-B2rn1R9X.js"},{"revision":null,"url":"assets/StarredMessages-EppSvW7s.js"},{"revision":null,"url":"assets/SmoothCalendar-B-AxoYLT.js"},{"revision":null,"url":"assets/Signin-CHBUjCy8.js"},{"revision":null,"url":"assets/ShareTargetPage-DS0dHFcf.js"},{"revision":null,"url":"assets/share-2-BkvTVd-e.js"},{"revision":null,"url":"assets/send-DchwXoaI.js"},{"revision":null,"url":"assets/Search-CQxPThxd.js"},{"revision":null,"url":"assets/Search-CEOWdmcr.css"},{"revision":null,"url":"assets/refresh-cw-DaP1kYJ8.js"},{"revision":null,"url":"assets/RecommendedCommunities-CIBiwLlP.js"},{"revision":null,"url":"assets/PulsesTab-xYIi6gSF.js"},{"revision":null,"url":"assets/PublicBookingView-Ira53Bqk.js"},{"revision":null,"url":"assets/PublicBookingPage-DP3h6Ahv.js"},{"revision":null,"url":"assets/ProfilePage-D1NXUb_O.js"},{"revision":null,"url":"assets/play-Dc2uBzdr.js"},{"revision":null,"url":"assets/MyCommunities-CSiTDyOE.js"},{"revision":null,"url":"assets/music-QhsyDMk2.js"},{"revision":null,"url":"assets/MediaFeed-CDBS4vQa.js"},{"revision":null,"url":"assets/Login-BYq8Zwg6.js"},{"revision":null,"url":"assets/LandingPage-BUrQsraP.js"},{"revision":null,"url":"assets/LabsPage-8A2OZo_e.js"},{"revision":null,"url":"assets/index-DlDjEL4g.css"},{"revision":null,"url":"assets/index-2wnbWv5z.js"},{"revision":null,"url":"assets/ImageEditor-DHMMIRtO.css"},{"revision":null,"url":"assets/ImageEditor-D1xgttOj.js"},{"revision":null,"url":"assets/history-DO-EnXjt.js"},{"revision":null,"url":"assets/copy-C6Vaiesy.js"},{"revision":null,"url":"assets/CommunityCreationPage-DfKC3X80.js"},{"revision":null,"url":"assets/Communities-DL-sKnA1.js"},{"revision":null,"url":"assets/circle-x-C_eEPCgM.js"},{"revision":null,"url":"assets/circle-check-big-C8rpGW6n.js"},{"revision":null,"url":"assets/chevron-left-CDNbp6km.js"},{"revision":null,"url":"assets/ChatBox-C8BGQDme.css"},{"revision":null,"url":"assets/ChatBox-BTQx_nwt.js"},{"revision":null,"url":"assets/CameraCaptureModal-CEnZw5D9.js"},{"revision":null,"url":"assets/BatchMessagingPage-BZvrx3dj.js"},{"revision":null,"url":"assets/arrow-right-BWbEKFMt.js"},{"revision":"f89e98a211bf04c16f7848d2fabcc91d","url":"icon-192.png"},{"revision":"e4746058442f37df1c1c54b982445730","url":"icon.png"},{"revision":"ac4d10ec3ebf9a8b62eee4737bbfcbcc","url":"manifest.webmanifest"}]);try{Nt(new Zn(Gn("index.html")))}catch(e){console.warn("Navigation fallback setup failed:",e)}const Eo=jt({apiKey:"AIzaSyDryeR4MrHUWHByT967oI6m2cWMeV0xbXY",authDomain:"letschat-86583.firebaseapp.com",projectId:"letschat-86583",storageBucket:"letschat-86583.firebasestorage.app",messagingSenderId:"317759005455",appId:"1:317759005455:web:bcff4f930457756a8a547a",measurementId:"G-EKF9DDTJ4P"}),Co=_o(Eo),U=(()=>{try{const e=typeof self<"u"&&self.registration&&self.registration.scope?self.registration.scope:typeof location<"u"?location.origin+"/":"/",t=e.endsWith("/")?e:e+"/";return new URL("icon-notify.png",t).href}catch{return"icon-notify.png"}})(),F=(()=>{try{const e=typeof self<"u"&&self.registration&&self.registration.scope?self.registration.scope:typeof location<"u"?location.origin+"/":"/",t=e.endsWith("/")?e:e+"/";return new URL("badge-96.png",t).href}catch{return"badge-96.png"}})(),Do=16,To="2.1.1",Ao=async()=>{try{console.log("[SW] Showing background update notification"),await self.registration.showNotification("New version of LetsChat available",{body:"A new version of LetsChat is available. Tap to update.",icon:U,badge:F,tag:"app-update-available",renotify:!0,requireInteraction:!0,data:{type:"APP_UPDATE"}})}catch(e){console.warn("[SW] Failed to show update notification in SW:",e)}};self.addEventListener("install",e=>{console.log("[SW] New Service Worker installing..."),!!(self.registration&&self.registration.active)&&(console.log("[SW] Update detected during install event (active worker exists)"),e.waitUntil(Ao()))});self.addEventListener("periodicsync",e=>{e.tag==="check-update"&&(console.log("[SW] Periodic sync check-update triggered"),e.waitUntil(self.registration.update().catch(()=>{})))});self.addEventListener("message",e=>{e.data?.type==="SKIP_WAITING"?(console.log("[SW] Received SKIP_WAITING — activating now"),self.skipWaiting()):e.data?.type==="CLOSE_CHAT_NOTIFICATIONS"&&e.data?.chatId&&e.waitUntil(self.registration.getNotifications().then(t=>{for(const n of t)Sn(n.data,n.tag,e.data.chatId)&&n.close()}).catch(t=>console.warn("[SW] Failed closing chat notifications:",t)))});self.addEventListener("activate",e=>{e.waitUntil((async()=>{await self.clients.claim(),console.log("[SW] Activated & claimed clients — broadcasting SW_ACTIVATED");const t=await self.clients.matchAll({type:"window"});for(const n of t)n.postMessage({type:"SW_ACTIVATED",version:To})})())});self.addEventListener("fetch",e=>{const t=new URL(e.request.url);e.request.method==="POST"&&t.pathname.endsWith("/share-target")&&e.respondWith((async()=>{try{const n=await e.request.formData(),r=n.getAll("media"),s=n.get("title"),i=n.get("text"),o=n.get("url"),a=await new Promise((u,f)=>{const d=indexedDB.open("LetsChatDB",Do);d.onsuccess=()=>u(d.result),d.onerror=()=>f(d.error)});if(!a.objectStoreNames.contains("sharedData"))return a.close(),Response.redirect(new URL("/share-target",e.request.url).href,303);const l=a.transaction("sharedData","readwrite"),c=l.objectStore("sharedData");if(r?.length>0)for(const u of r)u.size>0&&c.add({type:"file",file:u,name:u.name,mimeType:u.type,timestamp:Date.now()});return(s||i||o)&&c.add({type:"text",title:s,text:i,url:o,timestamp:Date.now()}),await new Promise((u,f)=>{l.oncomplete=u,l.onerror=f}),a.close(),Response.redirect("./#/share-target?received=true",303)}catch(n){return console.error("[SW] Share target failed:",n),Response.redirect("./#/share-target?error=true",303)}})())});So(Co,async e=>{console.log("[SW] FCM background message received:",e);try{self.registration.update().catch(()=>{})}catch{}try{const t=e.data||{};if(t.v==="2"){const r=st(t,{icon:U,badge:F});let i=!(t.silent==="true");(t.alertKind==="mention"||t.alertKind==="reply")&&(i=!0);const o={body:r.body||"",icon:U,badge:F,tag:r.tag||"letschat-default",data:r.data||{},renotify:!!r.tag&&i,silent:!i};return i&&(o.vibrate=[200,100,200]),await self.registration.showNotification(r.title,o)}if(e.notification){console.log("[SW] Firebase notification payload detected — handled automatically by SDK.");return}const n=st(t,{icon:U,badge:F});return await self.registration.showNotification(n.title,{body:n.body||"",icon:U,badge:F,tag:n.tag||"letschat-default",data:n.data||{},renotify:!!n.tag,vibrate:[200,100,200]})}catch(t){console.error("[SW] Error displaying background notification:",t);try{const n=e?.data||{},r=n.title||n.eventTitle||"New update in LetsChat",s=n.body||n.description||"You received a new message or update.";return await self.registration.showNotification(r,{body:s,icon:U,badge:F,tag:"letschat-fallback-"+Date.now(),data:n,renotify:!0,vibrate:[200,100,200]})}catch(n){console.error("[SW] Critical fallback notification display failed:",n)}}});async function vt(e,t,n){const r=e.endsWith("/")?e:e+"/",s=r.slice(0,-1);try{const o=(await self.clients.matchAll({type:"window",includeUncontrolled:!0})).filter(a=>{try{return a.url===s||a.url.startsWith(r)||a.url.startsWith(s+"#")}catch{return!1}}).sort((a,l)=>(l.visibilityState==="visible"?1:0)-(a.visibilityState==="visible"?1:0));for(const a of o)try{const l=a.visibilityState==="visible"||a.focused,c="focus"in a?await a.focus().catch(()=>null):a;if(!!(c&&(c.focused||c.visibilityState==="visible"))||l){const f=c||a;if(n&&f.postMessage(n),!l&&t&&"navigate"in f&&f.url!==t)try{await f.navigate(t)}catch{}return f}}catch(l){console.warn("[SW] Error focusing client:",l)}}catch(i){console.warn("[SW] Error matching clients:",i)}if(self.clients.openWindow){const i=t||r;try{return await self.clients.openWindow(i)}catch(o){if(console.error("[SW] openWindow failed, retrying base scope:",o),i!==r)try{return await self.clients.openWindow(r)}catch{}}}return null}self.addEventListener("notificationclick",e=>{e.notification.close();const t=e.notification.data||{},n=e.notification.tag,r=self.registration.scope;if(t.type==="APP_UPDATE"||n==="app-update-available"){console.log("[SW] Update notification clicked — activating new version and updating client"),self.skipWaiting(),e.waitUntil(vt(r,null,{type:"APPLY_UPDATE"}));return}const i=(typeof t.path=="string"&&t.path.trim()?t.path.trim():kt(t)).replace(/^#?\/+/,"")||"chats",o="/"+i,a=r.endsWith("/")?r:r+"/",l=new URL("#/"+i,a).href;e.waitUntil(vt(r,l,{type:"NOTIFICATION_CLICK",path:o,url:l}))});
