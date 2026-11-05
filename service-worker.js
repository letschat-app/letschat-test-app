function I(e,t){if(!e)return"";const n=new Date(e);if(isNaN(n.getTime()))return"";const r=t&&t.timeZone||"Asia/Kolkata";return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",hour12:!0,timeZone:r}).format(n)}function q(e,t){if(!e)return"";const n=new Date(e);if(isNaN(n.getTime()))return"";const r=t&&t.timeZone||"Asia/Kolkata";return new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:r}).format(n)}function et(e,t){if(!e)return"";const n=new Date(e);if(isNaN(n.getTime()))return"";const r=t&&t.timeZone||"Asia/Kolkata",s=t&&t.now?new Date(t.now):new Date,o=u=>new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:r}).format(u),i=o(n),a=o(s),l=new Date(s.getTime()+24*60*60*1e3),c=o(l);return i===a?"Today":i===c?"Tomorrow":q(e,t)}function In(e,t){if(!e)return"soon";const n=new Date(e);if(isNaN(n.getTime()))return"soon";const r=t&&t.now?new Date(t.now):new Date,s=n.getTime()-r.getTime(),o=Math.round(s/(1e3*60*60)),i=t&&t.timeZone||"Asia/Kolkata",a=c=>new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:i}).format(c);if(o>0&&o<24&&a(n)===a(r))return o===1?"in 1 hour":`in ${o} hours`;const l=new Date(r.getTime()+24*60*60*1e3);return a(n)===a(l)?"tomorrow":a(n)===a(r)?"today":`on ${q(e,t)}`}function tt(e,t){return e?e.length<=t?e:e.slice(0,t-1)+"…":""}function nt(e){if(e&&e.icon)return e.icon;try{const t=typeof self<"u"&&self.registration&&self.registration.scope?self.registration.scope:typeof location<"u"?location.origin+"/":"/",n=t.endsWith("/")?t:t+"/";return new URL("icon-notify.png",n).href}catch{return"icon-notify.png"}}function rt(e){if(e&&e.badge)return e.badge;try{const t=typeof self<"u"&&self.registration&&self.registration.scope?self.registration.scope:typeof location<"u"?location.origin+"/":"/",n=t.endsWith("/")?t:t+"/";return new URL("badge-96.png",n).href}catch{return"badge-96.png"}}function P(e,t){const n=(e||"text").toLowerCase(),r=t||"";switch(n){case"text":return r;case"assignment":return r?`📚 Assignment: ${r}`:"📚 Assignment";case"poll":return"📊 Poll";case"image":return"📷 Photo";case"video":return"🎥 Video";case"audio":case"voice":return"🎤 Voice message";case"file":return"📁 File";default:return r||"New message"}}function st(e,t){if(!e){const c=nt(t),u=rt(t);return{title:"LetsChat",body:"New notification",icon:c,badge:u,tag:"letschat-default",data:{},renotify:!0,silent:!1,vibrate:[200,100,200]}}const n=e.type||"CHAT",r=e.silent==="true";let s="LetsChat",o="",i="letschat-default";if(n==="CHAT"){const c=e.chatId||"",u=tt(e.chatName||e.senderName||"Chat",40),h=e.chatKind||"group",f=e.alertKind||"message",m=e.senderName||"Someone",p=e.msgType||"text",g=e.preview||"",E=parseInt(e.newCount||"1",10),y=parseInt(e.unread||"1",10),G=e.msgId||"";if(f==="mention"?i=`mention-${c}-${G||Date.now()}`:f==="reply"?i=`reply-${c}-${G||Date.now()}`:i=`chat-${c}`,f==="mention")s=h==="dm"?m:`${m} mentioned you in ${u}`,o=P(p,g);else if(f==="reply")s=h==="dm"?m:`${m} replied to you in ${u}`,o=P(p,g);else if(y>1||E>1||e.items&&(()=>{try{return JSON.parse(e.items).length>1}catch{return!1}})()){const J=y>1?y:E;s=`${u} · ${J} new messages`;let Y=[];if(e.items)try{Y=JSON.parse(e.items)}catch{Y=[]}if(Y.length===0)o=P(p,g);else{const Xe=Y.slice(-3).map(Z=>{const Qe=P(Z.t,Z.x),bn=h!=="dm"&&Z.s?`${Z.s}: ${Qe}`:Qe;return tt(bn,90)});J>3&&Xe.push(`+${J-3} more`),o=Xe.join(`
`)}}else h==="dm"?(s=u,o=P(p,g)):(s=u,o=`${m}: ${P(p,g)}`)}else if(n==="EVENT"){i=`event-reminder-${e.eventId||""}`;const u=e.eventTitle||"Event",h=e.minutesBefore||"15";s=`${u} starts in ${h} min`;const f=[],m=I(e.startTime,t);m&&f.push(m),e.location&&f.push(e.location),e.chatName&&f.push(e.chatName),o=f.join(" · ")||e.title||"Event starts soon"}else if(n==="EVENT_CHANGED"){i=`event-changed-${e.eventId||""}`;const u=(e.action||"updated").toLowerCase(),h=e.eventTitle||"Event",f=e.chatName||"",m=e.location||"",p=e.startTime||"";if(u==="created"||u==="scheduled"){s=`New event: ${h}`;const g=et(p,t),E=I(p,t),y=[`${g}, ${E}`];m&&y.push(m),f&&y.push(f),o=y.join(" · ")}else if(u==="rescheduled"||u==="postponed"){s=`${h} was rescheduled`;let g="";if(e.changes)try{const y=JSON.parse(e.changes).find(G=>G.field==="time");y&&y.from&&y.to&&(g=`Time: ${I(y.from,t)} → ${I(y.to,t)}`)}catch{}!g&&p&&(g=`Time: ${I(p,t)}`),o=f?`${g}
${f}`:g}else if(u==="cancelled"){s=`${h} was cancelled`;const g=et(p,t).toLowerCase(),E=I(p,t);o=f?`Was ${g} at ${E} · ${f}`:`Was ${g} at ${E}`}else u==="booking_request"?(s=`Meeting request from ${e.personName||"A user"}`,o=`${q(p,t)} · ${I(p,t)}`):u==="booking_approved"?(s=`Meeting confirmed with ${e.personName||"Host"}`,o=`${q(p,t)} · ${I(p,t)}`):u==="booking_declined"?(s=`Meeting declined by ${e.personName||"Host"}`,o=`${q(p,t)} · ${I(p,t)}`):(s=`${h} updated`,o=f||"Event details updated.")}else if(n==="DAILY"){const c=parseInt(e.total||"0",10);i=`daily-summary-${e.date||"today"}`,s=`Today: ${c} ${c===1?"event":"events"}`;let u=[];if(e.eventsV2)try{u=JSON.parse(e.eventsV2)}catch{u=[]}o=u.map(f=>`${I(f.startTime,t)} ${f.title}`).join(`
`)||(c>0?`You have ${c} events scheduled for today.`:"Check your schedule for today.")}else if(n==="ASSIGNMENT_MISSING"){const c=parseInt(e.total||"0",10);i="assignment-missing",s=`${c} ${c===1?"assignment":"assignments"} due soon`;let u=[];if(e.assignmentsV2)try{u=JSON.parse(e.assignmentsV2)}catch{u=[]}o=u.map(f=>`${f.title} · due ${In(f.deadline,t)}`).join(`
`)}const a=nt(t),l=rt(t);return{title:s,body:o,icon:a,badge:l,tag:i,data:{...e,path:vt(e),alertTs:Date.now()},renotify:!r,silent:r,vibrate:r?[]:[200,100,200]}}function vt(e){if(!e)return"/";const t=e.type;if(t==="EVENT"||t==="EVENT_CHANGED")return e.action==="cancelled"?"/calendar":e.eventId?`/calendar?eventId=${e.eventId}&viewInfo=true`:"/calendar";if(t==="DAILY")return"/calendar";if(t==="ASSIGNMENT_MISSING"){if(e.chatId){const n=e.assignmentId?`&assignmentId=${e.assignmentId}`:"";return`/chat/${e.chatId}?space=1${n}`}if(e.assignmentsV2)try{const n=typeof e.assignmentsV2=="string"?JSON.parse(e.assignmentsV2):e.assignmentsV2;if(Array.isArray(n)&&n.length>0&&n[0].chatId){const r=n[0],s=r.id?`&assignmentId=${r.id}`:"";return`/chat/${r.chatId}?space=1${s}`}}catch{}return"/chats"}if(e.chatId){const n=`/chat/${e.chatId}`,r=[];return e.spaceId&&e.spaceId!=="0"&&r.push(`space=${e.spaceId}`),e.msgId&&r.push(`msgId=${e.msgId}`),r.length>0?`${n}?${r.join("&")}`:n}return"/"}try{self["workbox:core:7.4.0"]&&_()}catch{}const _n=(e,...t)=>{let n=e;return t.length>0&&(n+=` :: ${JSON.stringify(t)}`),n},En=_n;class w extends Error{constructor(t,n){const r=En(t,n);super(r),this.name=t,this.details=n}}const C={googleAnalytics:"googleAnalytics",precache:"precache-v2",prefix:"workbox",runtime:"runtime",suffix:typeof registration<"u"?registration.scope:""},ae=e=>[C.prefix,e,C.suffix].filter(t=>t&&t.length>0).join("-"),Sn=e=>{for(const t of Object.keys(C))e(t)},Be={updateDetails:e=>{Sn(t=>{typeof e[t]=="string"&&(C[t]=e[t])})},getGoogleAnalyticsName:e=>e||ae(C.googleAnalytics),getPrecacheName:e=>e||ae(C.precache),getPrefix:()=>C.prefix,getRuntimeName:e=>e||ae(C.runtime),getSuffix:()=>C.suffix};function ot(e,t){const n=t();return e.waitUntil(n),n}try{self["workbox:precaching:7.4.0"]&&_()}catch{}const Cn="__WB_REVISION__";function Dn(e){if(!e)throw new w("add-to-cache-list-unexpected-type",{entry:e});if(typeof e=="string"){const o=new URL(e,location.href);return{cacheKey:o.href,url:o.href}}const{revision:t,url:n}=e;if(!n)throw new w("add-to-cache-list-unexpected-type",{entry:e});if(!t){const o=new URL(n,location.href);return{cacheKey:o.href,url:o.href}}const r=new URL(n,location.href),s=new URL(n,location.href);return r.searchParams.set(Cn,t),{cacheKey:r.href,url:s.href}}class Tn{constructor(){this.updatedURLs=[],this.notUpdatedURLs=[],this.handlerWillStart=async({request:t,state:n})=>{n&&(n.originalRequest=t)},this.cachedResponseWillBeUsed=async({event:t,state:n,cachedResponse:r})=>{if(t.type==="install"&&n&&n.originalRequest&&n.originalRequest instanceof Request){const s=n.originalRequest.url;r?this.notUpdatedURLs.push(s):this.updatedURLs.push(s)}return r}}}class An{constructor({precacheController:t}){this.cacheKeyWillBeUsed=async({request:n,params:r})=>{const s=r?.cacheKey||this._precacheController.getCacheKeyForURL(n.url);return s?new Request(s,{headers:n.headers}):n},this._precacheController=t}}let H;function vn(){if(H===void 0){const e=new Response("");if("body"in e)try{new Response(e.body),H=!0}catch{H=!1}H=!1}return H}async function Rn(e,t){let n=null;if(e.url&&(n=new URL(e.url).origin),n!==self.location.origin)throw new w("cross-origin-copy-response",{origin:n});const r=e.clone(),o={headers:new Headers(r.headers),status:r.status,statusText:r.statusText},i=vn()?r.body:await r.blob();return new Response(i,o)}const kn=e=>new URL(String(e),location.href).href.replace(new RegExp(`^${location.origin}`),"");function it(e,t){const n=new URL(e);for(const r of t)n.searchParams.delete(r);return n.href}async function Nn(e,t,n,r){const s=it(t.url,n);if(t.url===s)return e.match(t,r);const o=Object.assign(Object.assign({},r),{ignoreSearch:!0}),i=await e.keys(t,o);for(const a of i){const l=it(a.url,n);if(s===l)return e.match(a,r)}}let $n=class{constructor(){this.promise=new Promise((t,n)=>{this.resolve=t,this.reject=n})}};const Mn=new Set;async function On(){for(const e of Mn)await e()}function Ln(e){return new Promise(t=>setTimeout(t,e))}try{self["workbox:strategies:7.4.0"]&&_()}catch{}function X(e){return typeof e=="string"?new Request(e):e}class Bn{constructor(t,n){this._cacheKeys={},Object.assign(this,n),this.event=n.event,this._strategy=t,this._handlerDeferred=new $n,this._extendLifetimePromises=[],this._plugins=[...t.plugins],this._pluginStateMap=new Map;for(const r of this._plugins)this._pluginStateMap.set(r,{});this.event.waitUntil(this._handlerDeferred.promise)}async fetch(t){const{event:n}=this;let r=X(t);if(r.mode==="navigate"&&n instanceof FetchEvent&&n.preloadResponse){const i=await n.preloadResponse;if(i)return i}const s=this.hasCallback("fetchDidFail")?r.clone():null;try{for(const i of this.iterateCallbacks("requestWillFetch"))r=await i({request:r.clone(),event:n})}catch(i){if(i instanceof Error)throw new w("plugin-error-request-will-fetch",{thrownErrorMessage:i.message})}const o=r.clone();try{let i;i=await fetch(r,r.mode==="navigate"?void 0:this._strategy.fetchOptions);for(const a of this.iterateCallbacks("fetchDidSucceed"))i=await a({event:n,request:o,response:i});return i}catch(i){throw s&&await this.runCallbacks("fetchDidFail",{error:i,event:n,originalRequest:s.clone(),request:o.clone()}),i}}async fetchAndCachePut(t){const n=await this.fetch(t),r=n.clone();return this.waitUntil(this.cachePut(t,r)),n}async cacheMatch(t){const n=X(t);let r;const{cacheName:s,matchOptions:o}=this._strategy,i=await this.getCacheKey(n,"read"),a=Object.assign(Object.assign({},o),{cacheName:s});r=await caches.match(i,a);for(const l of this.iterateCallbacks("cachedResponseWillBeUsed"))r=await l({cacheName:s,matchOptions:o,cachedResponse:r,request:i,event:this.event})||void 0;return r}async cachePut(t,n){const r=X(t);await Ln(0);const s=await this.getCacheKey(r,"write");if(!n)throw new w("cache-put-with-no-response",{url:kn(s.url)});const o=await this._ensureResponseSafeToCache(n);if(!o)return!1;const{cacheName:i,matchOptions:a}=this._strategy,l=await self.caches.open(i),c=this.hasCallback("cacheDidUpdate"),u=c?await Nn(l,s.clone(),["__WB_REVISION__"],a):null;try{await l.put(s,c?o.clone():o)}catch(h){if(h instanceof Error)throw h.name==="QuotaExceededError"&&await On(),h}for(const h of this.iterateCallbacks("cacheDidUpdate"))await h({cacheName:i,oldResponse:u,newResponse:o.clone(),request:s,event:this.event});return!0}async getCacheKey(t,n){const r=`${t.url} | ${n}`;if(!this._cacheKeys[r]){let s=t;for(const o of this.iterateCallbacks("cacheKeyWillBeUsed"))s=X(await o({mode:n,request:s,event:this.event,params:this.params}));this._cacheKeys[r]=s}return this._cacheKeys[r]}hasCallback(t){for(const n of this._strategy.plugins)if(t in n)return!0;return!1}async runCallbacks(t,n){for(const r of this.iterateCallbacks(t))await r(n)}*iterateCallbacks(t){for(const n of this._strategy.plugins)if(typeof n[t]=="function"){const r=this._pluginStateMap.get(n);yield o=>{const i=Object.assign(Object.assign({},o),{state:r});return n[t](i)}}}waitUntil(t){return this._extendLifetimePromises.push(t),t}async doneWaiting(){for(;this._extendLifetimePromises.length;){const t=this._extendLifetimePromises.splice(0),r=(await Promise.allSettled(t)).find(s=>s.status==="rejected");if(r)throw r.reason}}destroy(){this._handlerDeferred.resolve(null)}async _ensureResponseSafeToCache(t){let n=t,r=!1;for(const s of this.iterateCallbacks("cacheWillUpdate"))if(n=await s({request:this.request,response:n,event:this.event})||void 0,r=!0,!n)break;return r||n&&n.status!==200&&(n=void 0),n}}class Pn{constructor(t={}){this.cacheName=Be.getRuntimeName(t.cacheName),this.plugins=t.plugins||[],this.fetchOptions=t.fetchOptions,this.matchOptions=t.matchOptions}handle(t){const[n]=this.handleAll(t);return n}handleAll(t){t instanceof FetchEvent&&(t={event:t,request:t.request});const n=t.event,r=typeof t.request=="string"?new Request(t.request):t.request,s="params"in t?t.params:void 0,o=new Bn(this,{event:n,request:r,params:s}),i=this._getResponse(o,r,n),a=this._awaitComplete(i,o,r,n);return[i,a]}async _getResponse(t,n,r){await t.runCallbacks("handlerWillStart",{event:r,request:n});let s;try{if(s=await this._handle(n,t),!s||s.type==="error")throw new w("no-response",{url:n.url})}catch(o){if(o instanceof Error){for(const i of t.iterateCallbacks("handlerDidError"))if(s=await i({error:o,event:r,request:n}),s)break}if(!s)throw o}for(const o of t.iterateCallbacks("handlerWillRespond"))s=await o({event:r,request:n,response:s});return s}async _awaitComplete(t,n,r,s){let o,i;try{o=await t}catch{}try{await n.runCallbacks("handlerDidRespond",{event:s,request:r,response:o}),await n.doneWaiting()}catch(a){a instanceof Error&&(i=a)}if(await n.runCallbacks("handlerDidComplete",{event:s,request:r,response:o,error:i}),n.destroy(),i)throw i}}class A extends Pn{constructor(t={}){t.cacheName=Be.getPrecacheName(t.cacheName),super(t),this._fallbackToNetwork=t.fallbackToNetwork!==!1,this.plugins.push(A.copyRedirectedCacheableResponsesPlugin)}async _handle(t,n){const r=await n.cacheMatch(t);return r||(n.event&&n.event.type==="install"?await this._handleInstall(t,n):await this._handleFetch(t,n))}async _handleFetch(t,n){let r;const s=n.params||{};if(this._fallbackToNetwork){const o=s.integrity,i=t.integrity,a=!i||i===o;r=await n.fetch(new Request(t,{integrity:t.mode!=="no-cors"?i||o:void 0})),o&&a&&t.mode!=="no-cors"&&(this._useDefaultCacheabilityPluginIfNeeded(),await n.cachePut(t,r.clone()))}else throw new w("missing-precache-entry",{cacheName:this.cacheName,url:t.url});return r}async _handleInstall(t,n){this._useDefaultCacheabilityPluginIfNeeded();const r=await n.fetch(t);if(!await n.cachePut(t,r.clone()))throw new w("bad-precaching-response",{url:t.url,status:r.status});return r}_useDefaultCacheabilityPluginIfNeeded(){let t=null,n=0;for(const[r,s]of this.plugins.entries())s!==A.copyRedirectedCacheableResponsesPlugin&&(s===A.defaultPrecacheCacheabilityPlugin&&(t=r),s.cacheWillUpdate&&n++);n===0?this.plugins.push(A.defaultPrecacheCacheabilityPlugin):n>1&&t!==null&&this.plugins.splice(t,1)}}A.defaultPrecacheCacheabilityPlugin={async cacheWillUpdate({response:e}){return!e||e.status>=400?null:e}};A.copyRedirectedCacheableResponsesPlugin={async cacheWillUpdate({response:e}){return e.redirected?await Rn(e):e}};class Un{constructor({cacheName:t,plugins:n=[],fallbackToNetwork:r=!0}={}){this._urlsToCacheKeys=new Map,this._urlsToCacheModes=new Map,this._cacheKeysToIntegrities=new Map,this._strategy=new A({cacheName:Be.getPrecacheName(t),plugins:[...n,new An({precacheController:this})],fallbackToNetwork:r}),this.install=this.install.bind(this),this.activate=this.activate.bind(this)}get strategy(){return this._strategy}precache(t){this.addToCacheList(t),this._installAndActiveListenersAdded||(self.addEventListener("install",this.install),self.addEventListener("activate",this.activate),this._installAndActiveListenersAdded=!0)}addToCacheList(t){const n=[];for(const r of t){typeof r=="string"?n.push(r):r&&r.revision===void 0&&n.push(r.url);const{cacheKey:s,url:o}=Dn(r),i=typeof r!="string"&&r.revision?"reload":"default";if(this._urlsToCacheKeys.has(o)&&this._urlsToCacheKeys.get(o)!==s)throw new w("add-to-cache-list-conflicting-entries",{firstEntry:this._urlsToCacheKeys.get(o),secondEntry:s});if(typeof r!="string"&&r.integrity){if(this._cacheKeysToIntegrities.has(s)&&this._cacheKeysToIntegrities.get(s)!==r.integrity)throw new w("add-to-cache-list-conflicting-integrities",{url:o});this._cacheKeysToIntegrities.set(s,r.integrity)}if(this._urlsToCacheKeys.set(o,s),this._urlsToCacheModes.set(o,i),n.length>0){const a=`Workbox is precaching URLs without revision info: ${n.join(", ")}
This is generally NOT safe. Learn more at https://bit.ly/wb-precache`;console.warn(a)}}}install(t){return ot(t,async()=>{const n=new Tn;this.strategy.plugins.push(n);for(const[o,i]of this._urlsToCacheKeys){const a=this._cacheKeysToIntegrities.get(i),l=this._urlsToCacheModes.get(o),c=new Request(o,{integrity:a,cache:l,credentials:"same-origin"});await Promise.all(this.strategy.handleAll({params:{cacheKey:i},request:c,event:t}))}const{updatedURLs:r,notUpdatedURLs:s}=n;return{updatedURLs:r,notUpdatedURLs:s}})}activate(t){return ot(t,async()=>{const n=await self.caches.open(this.strategy.cacheName),r=await n.keys(),s=new Set(this._urlsToCacheKeys.values()),o=[];for(const i of r)s.has(i.url)||(await n.delete(i),o.push(i.url));return{deletedURLs:o}})}getURLsToCacheKeys(){return this._urlsToCacheKeys}getCachedURLs(){return[...this._urlsToCacheKeys.keys()]}getCacheKeyForURL(t){const n=new URL(t,location.href);return this._urlsToCacheKeys.get(n.href)}getIntegrityForCacheKey(t){return this._cacheKeysToIntegrities.get(t)}async matchPrecache(t){const n=t instanceof Request?t.url:t,r=this.getCacheKeyForURL(n);if(r)return(await self.caches.open(this.strategy.cacheName)).match(r)}createHandlerBoundToURL(t){const n=this.getCacheKeyForURL(t);if(!n)throw new w("non-precached-url",{url:t});return r=>(r.request=new Request(t),r.params=Object.assign({cacheKey:n},r.params),this.strategy.handle(r))}}let ce;const Pe=()=>(ce||(ce=new Un),ce);try{self["workbox:routing:7.4.0"]&&_()}catch{}const Rt="GET",Q=e=>e&&typeof e=="object"?e:{handle:e};class U{constructor(t,n,r=Rt){this.handler=Q(n),this.match=t,this.method=r}setCatchHandler(t){this.catchHandler=Q(t)}}class Fn extends U{constructor(t,n,r){const s=({url:o})=>{const i=t.exec(o.href);if(i&&!(o.origin!==location.origin&&i.index!==0))return i.slice(1)};super(s,n,r)}}class Kn{constructor(){this._routes=new Map,this._defaultHandlerMap=new Map}get routes(){return this._routes}addFetchListener(){self.addEventListener("fetch",t=>{const{request:n}=t,r=this.handleRequest({request:n,event:t});r&&t.respondWith(r)})}addCacheListener(){self.addEventListener("message",t=>{if(t.data&&t.data.type==="CACHE_URLS"){const{payload:n}=t.data,r=Promise.all(n.urlsToCache.map(s=>{typeof s=="string"&&(s=[s]);const o=new Request(...s);return this.handleRequest({request:o,event:t})}));t.waitUntil(r),t.ports&&t.ports[0]&&r.then(()=>t.ports[0].postMessage(!0))}})}handleRequest({request:t,event:n}){const r=new URL(t.url,location.href);if(!r.protocol.startsWith("http"))return;const s=r.origin===location.origin,{params:o,route:i}=this.findMatchingRoute({event:n,request:t,sameOrigin:s,url:r});let a=i&&i.handler;const l=t.method;if(!a&&this._defaultHandlerMap.has(l)&&(a=this._defaultHandlerMap.get(l)),!a)return;let c;try{c=a.handle({url:r,request:t,event:n,params:o})}catch(h){c=Promise.reject(h)}const u=i&&i.catchHandler;return c instanceof Promise&&(this._catchHandler||u)&&(c=c.catch(async h=>{if(u)try{return await u.handle({url:r,request:t,event:n,params:o})}catch(f){f instanceof Error&&(h=f)}if(this._catchHandler)return this._catchHandler.handle({url:r,request:t,event:n});throw h})),c}findMatchingRoute({url:t,sameOrigin:n,request:r,event:s}){const o=this._routes.get(r.method)||[];for(const i of o){let a;const l=i.match({url:t,sameOrigin:n,request:r,event:s});if(l)return a=l,(Array.isArray(a)&&a.length===0||l.constructor===Object&&Object.keys(l).length===0||typeof l=="boolean")&&(a=void 0),{route:i,params:a}}return{}}setDefaultHandler(t,n=Rt){this._defaultHandlerMap.set(n,Q(t))}setCatchHandler(t){this._catchHandler=Q(t)}registerRoute(t){this._routes.has(t.method)||this._routes.set(t.method,[]),this._routes.get(t.method).push(t)}unregisterRoute(t){if(!this._routes.has(t.method))throw new w("unregister-route-but-not-found-with-method",{method:t.method});const n=this._routes.get(t.method).indexOf(t);if(n>-1)this._routes.get(t.method).splice(n,1);else throw new w("unregister-route-route-not-registered")}}let x;const jn=()=>(x||(x=new Kn,x.addFetchListener(),x.addCacheListener()),x);function kt(e,t,n){let r;if(typeof e=="string"){const o=new URL(e,location.href),i=({url:a})=>a.href===o.href;r=new U(i,t,n)}else if(e instanceof RegExp)r=new Fn(e,t,n);else if(typeof e=="function")r=new U(e,t,n);else if(e instanceof U)r=e;else throw new w("unsupported-route-type",{moduleName:"workbox-routing",funcName:"registerRoute",paramName:"capture"});return jn().registerRoute(r),r}function Hn(e,t=[]){for(const n of[...e.searchParams.keys()])t.some(r=>r.test(n))&&e.searchParams.delete(n);return e}function*xn(e,{ignoreURLParametersMatching:t=[/^utm_/,/^fbclid$/],directoryIndex:n="index.html",cleanURLs:r=!0,urlManipulation:s}={}){const o=new URL(e,location.href);o.hash="",yield o.href;const i=Hn(o,t);if(yield i.href,n&&i.pathname.endsWith("/")){const a=new URL(i.href);a.pathname+=n,yield a.href}if(r){const a=new URL(i.href);a.pathname+=".html",yield a.href}if(s){const a=s({url:o});for(const l of a)yield l.href}}class Wn extends U{constructor(t,n){const r=({request:s})=>{const o=t.getURLsToCacheKeys();for(const i of xn(s.url,n)){const a=o.get(i);if(a){const l=t.getIntegrityForCacheKey(a);return{cacheKey:a,integrity:l}}}};super(r,t.strategy)}}function Vn(e){const t=Pe(),n=new Wn(t,e);kt(n)}function qn(e){return Pe().createHandlerBoundToURL(e)}function zn(e){Pe().precache(e)}function Gn(e,t){zn(e),Vn(t)}class Jn extends U{constructor(t,{allowlist:n=[/./],denylist:r=[]}={}){super(s=>this._match(s),t),this._allowlist=n,this._denylist=r}_match({url:t,request:n}){if(n&&n.mode!=="navigate")return!1;const r=t.pathname+t.search;for(const s of this._denylist)if(s.test(r))return!1;return!!this._allowlist.some(s=>s.test(r))}}const Yn=()=>{};var at={};/**
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
 */const Nt=function(e){const t=[];let n=0;for(let r=0;r<e.length;r++){let s=e.charCodeAt(r);s<128?t[n++]=s:s<2048?(t[n++]=s>>6|192,t[n++]=s&63|128):(s&64512)===55296&&r+1<e.length&&(e.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(e.charCodeAt(++r)&1023),t[n++]=s>>18|240,t[n++]=s>>12&63|128,t[n++]=s>>6&63|128,t[n++]=s&63|128):(t[n++]=s>>12|224,t[n++]=s>>6&63|128,t[n++]=s&63|128)}return t},Zn=function(e){const t=[];let n=0,r=0;for(;n<e.length;){const s=e[n++];if(s<128)t[r++]=String.fromCharCode(s);else if(s>191&&s<224){const o=e[n++];t[r++]=String.fromCharCode((s&31)<<6|o&63)}else if(s>239&&s<365){const o=e[n++],i=e[n++],a=e[n++],l=((s&7)<<18|(o&63)<<12|(i&63)<<6|a&63)-65536;t[r++]=String.fromCharCode(55296+(l>>10)),t[r++]=String.fromCharCode(56320+(l&1023))}else{const o=e[n++],i=e[n++];t[r++]=String.fromCharCode((s&15)<<12|(o&63)<<6|i&63)}}return t.join("")},$t={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(e,t){if(!Array.isArray(e))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=t?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<e.length;s+=3){const o=e[s],i=s+1<e.length,a=i?e[s+1]:0,l=s+2<e.length,c=l?e[s+2]:0,u=o>>2,h=(o&3)<<4|a>>4;let f=(a&15)<<2|c>>6,m=c&63;l||(m=64,i||(f=64)),r.push(n[u],n[h],n[f],n[m])}return r.join("")},encodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?btoa(e):this.encodeByteArray(Nt(e),t)},decodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?atob(e):Zn(this.decodeStringToByteArray(e,t))},decodeStringToByteArray(e,t){this.init_();const n=t?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<e.length;){const o=n[e.charAt(s++)],a=s<e.length?n[e.charAt(s)]:0;++s;const c=s<e.length?n[e.charAt(s)]:64;++s;const h=s<e.length?n[e.charAt(s)]:64;if(++s,o==null||a==null||c==null||h==null)throw new Xn;const f=o<<2|a>>4;if(r.push(f),c!==64){const m=a<<4&240|c>>2;if(r.push(m),h!==64){const p=c<<6&192|h;r.push(p)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let e=0;e<this.ENCODED_VALS.length;e++)this.byteToCharMap_[e]=this.ENCODED_VALS.charAt(e),this.charToByteMap_[this.byteToCharMap_[e]]=e,this.byteToCharMapWebSafe_[e]=this.ENCODED_VALS_WEBSAFE.charAt(e),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]]=e,e>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)]=e,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)]=e)}}};class Xn extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Qn=function(e){const t=Nt(e);return $t.encodeByteArray(t,!0)},Mt=function(e){return Qn(e).replace(/\./g,"")},er=function(e){try{return $t.decodeString(e,!0)}catch(t){console.error("base64Decode failed: ",t)}return null};/**
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
 */function tr(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const nr=()=>tr().__FIREBASE_DEFAULTS__,rr=()=>{if(typeof process>"u"||typeof at>"u")return;const e=at.__FIREBASE_DEFAULTS__;if(e)return JSON.parse(e)},sr=()=>{if(typeof document>"u")return;let e;try{e=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const t=e&&er(e[1]);return t&&JSON.parse(t)},or=()=>{try{return Yn()||nr()||rr()||sr()}catch(e){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);return}},Ot=()=>or()?.config;/**
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
 */class ir{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((t,n)=>{this.resolve=t,this.reject=n})}wrapCallback(t){return(n,r)=>{n?this.reject(n):this.resolve(r),typeof t=="function"&&(this.promise.catch(()=>{}),t.length===1?t(n):t(n,r))}}}function Lt(){try{return typeof indexedDB=="object"}catch{return!1}}function Bt(){return new Promise((e,t)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),n||self.indexedDB.deleteDatabase(r),e(!0)},s.onupgradeneeded=()=>{n=!1},s.onerror=()=>{t(s.error?.message||"")}}catch(n){t(n)}})}/**
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
 */const ar="FirebaseError";class j extends Error{constructor(t,n,r){super(n),this.code=t,this.customData=r,this.name=ar,Object.setPrototypeOf(this,j.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,se.prototype.create)}}class se{constructor(t,n,r){this.service=t,this.serviceName=n,this.errors=r}create(t,...n){const r=n[0]||{},s=`${this.service}/${t}`,o=this.errors[t],i=o?cr(o,r):"Error",a=`${this.serviceName}: ${i} (${s}).`;return new j(s,a,r)}}function cr(e,t){return e.replace(lr,(n,r)=>{const s=t[r];return s!=null?String(s):`<${r}?>`})}const lr=/\{\$([^}]+)}/g;function De(e,t){if(e===t)return!0;const n=Object.keys(e),r=Object.keys(t);for(const s of n){if(!r.includes(s))return!1;const o=e[s],i=t[s];if(ct(o)&&ct(i)){if(!De(o,i))return!1}else if(o!==i)return!1}for(const s of r)if(!n.includes(s))return!1;return!0}function ct(e){return e!==null&&typeof e=="object"}/**
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
 */function Pt(e){return e&&e._delegate?e._delegate:e}class M{constructor(t,n,r){this.name=t,this.instanceFactory=n,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(t){return this.instantiationMode=t,this}setMultipleInstances(t){return this.multipleInstances=t,this}setServiceProps(t){return this.serviceProps=t,this}setInstanceCreatedCallback(t){return this.onInstanceCreated=t,this}}/**
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
 */class ur{constructor(t,n){this.name=t,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(t){const n=this.normalizeInstanceIdentifier(t);if(!this.instancesDeferred.has(n)){const r=new ir;if(this.instancesDeferred.set(n,r),this.isInitialized(n)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:n});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(t){const n=this.normalizeInstanceIdentifier(t?.identifier),r=t?.optional??!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(s){if(r)return null;throw s}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(t){if(t.name!==this.name)throw Error(`Mismatching Component ${t.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=t,!!this.shouldAutoInitialize()){if(hr(t))try{this.getOrInitializeService({instanceIdentifier:N})}catch{}for(const[n,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(n);try{const o=this.getOrInitializeService({instanceIdentifier:s});r.resolve(o)}catch{}}}}clearInstance(t=N){this.instancesDeferred.delete(t),this.instancesOptions.delete(t),this.instances.delete(t)}async delete(){const t=Array.from(this.instances.values());await Promise.all([...t.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...t.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(t=N){return this.instances.has(t)}getOptions(t=N){return this.instancesOptions.get(t)||{}}initialize(t={}){const{options:n={}}=t,r=this.normalizeInstanceIdentifier(t.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:n});for(const[o,i]of this.instancesDeferred.entries()){const a=this.normalizeInstanceIdentifier(o);r===a&&i.resolve(s)}return s}onInit(t,n){const r=this.normalizeInstanceIdentifier(n),s=this.onInitCallbacks.get(r)??new Set;s.add(t),this.onInitCallbacks.set(r,s);const o=this.instances.get(r);return o&&t(o,r),()=>{s.delete(t)}}invokeOnInitCallbacks(t,n){const r=this.onInitCallbacks.get(n);if(r)for(const s of r)try{s(t,n)}catch{}}getOrInitializeService({instanceIdentifier:t,options:n={}}){let r=this.instances.get(t);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:fr(t),options:n}),this.instances.set(t,r),this.instancesOptions.set(t,n),this.invokeOnInitCallbacks(r,t),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,t,r)}catch{}return r||null}normalizeInstanceIdentifier(t=N){return this.component?this.component.multipleInstances?t:N:t}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function fr(e){return e===N?void 0:e}function hr(e){return e.instantiationMode==="EAGER"}/**
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
 */class dr{constructor(t){this.name=t,this.providers=new Map}addComponent(t){const n=this.getProvider(t.name);if(n.isComponentSet())throw new Error(`Component ${t.name} has already been registered with ${this.name}`);n.setComponent(t)}addOrOverwriteComponent(t){this.getProvider(t.name).isComponentSet()&&this.providers.delete(t.name),this.addComponent(t)}getProvider(t){if(this.providers.has(t))return this.providers.get(t);const n=new ur(t,this);return this.providers.set(t,n),n}getProviders(){return Array.from(this.providers.values())}}/**
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
 */var d;(function(e){e[e.DEBUG=0]="DEBUG",e[e.VERBOSE=1]="VERBOSE",e[e.INFO=2]="INFO",e[e.WARN=3]="WARN",e[e.ERROR=4]="ERROR",e[e.SILENT=5]="SILENT"})(d||(d={}));const pr={debug:d.DEBUG,verbose:d.VERBOSE,info:d.INFO,warn:d.WARN,error:d.ERROR,silent:d.SILENT},gr=d.INFO,mr={[d.DEBUG]:"log",[d.VERBOSE]:"log",[d.INFO]:"info",[d.WARN]:"warn",[d.ERROR]:"error"},wr=(e,t,...n)=>{if(t<e.logLevel)return;const r=new Date().toISOString(),s=mr[t];if(s)console[s](`[${r}]  ${e.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`)};class yr{constructor(t){this.name=t,this._logLevel=gr,this._logHandler=wr,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(t){if(!(t in d))throw new TypeError(`Invalid value "${t}" assigned to \`logLevel\``);this._logLevel=t}setLogLevel(t){this._logLevel=typeof t=="string"?pr[t]:t}get logHandler(){return this._logHandler}set logHandler(t){if(typeof t!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=t}get userLogHandler(){return this._userLogHandler}set userLogHandler(t){this._userLogHandler=t}debug(...t){this._userLogHandler&&this._userLogHandler(this,d.DEBUG,...t),this._logHandler(this,d.DEBUG,...t)}log(...t){this._userLogHandler&&this._userLogHandler(this,d.VERBOSE,...t),this._logHandler(this,d.VERBOSE,...t)}info(...t){this._userLogHandler&&this._userLogHandler(this,d.INFO,...t),this._logHandler(this,d.INFO,...t)}warn(...t){this._userLogHandler&&this._userLogHandler(this,d.WARN,...t),this._logHandler(this,d.WARN,...t)}error(...t){this._userLogHandler&&this._userLogHandler(this,d.ERROR,...t),this._logHandler(this,d.ERROR,...t)}}const br=(e,t)=>t.some(n=>e instanceof n);let lt,ut;function Ir(){return lt||(lt=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function _r(){return ut||(ut=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Ut=new WeakMap,Te=new WeakMap,Ft=new WeakMap,le=new WeakMap,Ue=new WeakMap;function Er(e){const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("success",o),e.removeEventListener("error",i)},o=()=>{n(v(e.result)),s()},i=()=>{r(e.error),s()};e.addEventListener("success",o),e.addEventListener("error",i)});return t.then(n=>{n instanceof IDBCursor&&Ut.set(n,e)}).catch(()=>{}),Ue.set(t,e),t}function Sr(e){if(Te.has(e))return;const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("complete",o),e.removeEventListener("error",i),e.removeEventListener("abort",i)},o=()=>{n(),s()},i=()=>{r(e.error||new DOMException("AbortError","AbortError")),s()};e.addEventListener("complete",o),e.addEventListener("error",i),e.addEventListener("abort",i)});Te.set(e,t)}let Ae={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return Te.get(e);if(t==="objectStoreNames")return e.objectStoreNames||Ft.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return v(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function Cr(e){Ae=e(Ae)}function Dr(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const r=e.call(ue(this),t,...n);return Ft.set(r,t.sort?t.sort():[t]),v(r)}:_r().includes(e)?function(...t){return e.apply(ue(this),t),v(Ut.get(this))}:function(...t){return v(e.apply(ue(this),t))}}function Tr(e){return typeof e=="function"?Dr(e):(e instanceof IDBTransaction&&Sr(e),br(e,Ir())?new Proxy(e,Ae):e)}function v(e){if(e instanceof IDBRequest)return Er(e);if(le.has(e))return le.get(e);const t=Tr(e);return t!==e&&(le.set(e,t),Ue.set(t,e)),t}const ue=e=>Ue.get(e);function Ar(e,t,{blocked:n,upgrade:r,blocking:s,terminated:o}={}){const i=indexedDB.open(e,t),a=v(i);return r&&i.addEventListener("upgradeneeded",l=>{r(v(i.result),l.oldVersion,l.newVersion,v(i.transaction),l)}),n&&i.addEventListener("blocked",l=>n(l.oldVersion,l.newVersion,l)),a.then(l=>{o&&l.addEventListener("close",()=>o()),s&&l.addEventListener("versionchange",c=>s(c.oldVersion,c.newVersion,c))}).catch(()=>{}),a}const vr=["get","getKey","getAll","getAllKeys","count"],Rr=["put","add","delete","clear"],fe=new Map;function ft(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(fe.get(t))return fe.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,s=Rr.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(s||vr.includes(n)))return;const o=async function(i,...a){const l=this.transaction(i,s?"readwrite":"readonly");let c=l.store;return r&&(c=c.index(a.shift())),(await Promise.all([c[n](...a),s&&l.done]))[0]};return fe.set(t,o),o}Cr(e=>({...e,get:(t,n,r)=>ft(t,n)||e.get(t,n,r),has:(t,n)=>!!ft(t,n)||e.has(t,n)}));/**
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
 */class kr{constructor(t){this.container=t}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(Nr(n)){const r=n.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(n=>n).join(" ")}}function Nr(e){return e.getComponent()?.type==="VERSION"}const ve="@firebase/app",ht="0.14.11";/**
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
 */const T=new yr("@firebase/app"),$r="@firebase/app-compat",Mr="@firebase/analytics-compat",Or="@firebase/analytics",Lr="@firebase/app-check-compat",Br="@firebase/app-check",Pr="@firebase/auth",Ur="@firebase/auth-compat",Fr="@firebase/database",Kr="@firebase/data-connect",jr="@firebase/database-compat",Hr="@firebase/functions",xr="@firebase/functions-compat",Wr="@firebase/installations",Vr="@firebase/installations-compat",qr="@firebase/messaging",zr="@firebase/messaging-compat",Gr="@firebase/performance",Jr="@firebase/performance-compat",Yr="@firebase/remote-config",Zr="@firebase/remote-config-compat",Xr="@firebase/storage",Qr="@firebase/storage-compat",es="@firebase/firestore",ts="@firebase/ai",ns="@firebase/firestore-compat",rs="firebase";/**
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
 */const Re="[DEFAULT]",ss={[ve]:"fire-core",[$r]:"fire-core-compat",[Or]:"fire-analytics",[Mr]:"fire-analytics-compat",[Br]:"fire-app-check",[Lr]:"fire-app-check-compat",[Pr]:"fire-auth",[Ur]:"fire-auth-compat",[Fr]:"fire-rtdb",[Kr]:"fire-data-connect",[jr]:"fire-rtdb-compat",[Hr]:"fire-fn",[xr]:"fire-fn-compat",[Wr]:"fire-iid",[Vr]:"fire-iid-compat",[qr]:"fire-fcm",[zr]:"fire-fcm-compat",[Gr]:"fire-perf",[Jr]:"fire-perf-compat",[Yr]:"fire-rc",[Zr]:"fire-rc-compat",[Xr]:"fire-gcs",[Qr]:"fire-gcs-compat",[es]:"fire-fst",[ns]:"fire-fst-compat",[ts]:"fire-vertex","fire-js":"fire-js",[rs]:"fire-js-all"};/**
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
 */const ee=new Map,os=new Map,ke=new Map;function dt(e,t){try{e.container.addComponent(t)}catch(n){T.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`,n)}}function K(e){const t=e.name;if(ke.has(t))return T.debug(`There were multiple attempts to register component ${t}.`),!1;ke.set(t,e);for(const n of ee.values())dt(n,e);for(const n of os.values())dt(n,e);return!0}function Fe(e,t){const n=e.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),e.container.getProvider(t)}/**
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
 */const is={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},R=new se("app","Firebase",is);/**
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
 */class as{constructor(t,n,r){this._isDeleted=!1,this._options={...t},this._config={...n},this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new M("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(t){this.checkDestroyed(),this._automaticDataCollectionEnabled=t}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(t){this._isDeleted=t}checkDestroyed(){if(this.isDeleted)throw R.create("app-deleted",{appName:this._name})}}function Kt(e,t={}){let n=e;typeof t!="object"&&(t={name:t});const r={name:Re,automaticDataCollectionEnabled:!0,...t},s=r.name;if(typeof s!="string"||!s)throw R.create("bad-app-name",{appName:String(s)});if(n||(n=Ot()),!n)throw R.create("no-options");const o=ee.get(s);if(o){if(De(n,o.options)&&De(r,o.config))return o;throw R.create("duplicate-app",{appName:s})}const i=new dr(s);for(const l of ke.values())i.addComponent(l);const a=new as(n,r,i);return ee.set(s,a),a}function cs(e=Re){const t=ee.get(e);if(!t&&e===Re&&Ot())return Kt();if(!t)throw R.create("no-app",{appName:e});return t}function F(e,t,n){let r=ss[e]??e;n&&(r+=`-${n}`);const s=r.match(/\s|\//),o=t.match(/\s|\//);if(s||o){const i=[`Unable to register library "${r}" with version "${t}":`];s&&i.push(`library name "${r}" contains illegal characters (whitespace or "/")`),s&&o&&i.push("and"),o&&i.push(`version name "${t}" contains illegal characters (whitespace or "/")`),T.warn(i.join(" "));return}K(new M(`${r}-version`,()=>({library:r,version:t}),"VERSION"))}/**
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
 */const ls="firebase-heartbeat-database",us=1,z="firebase-heartbeat-store";let he=null;function jt(){return he||(he=Ar(ls,us,{upgrade:(e,t)=>{switch(t){case 0:try{e.createObjectStore(z)}catch(n){console.warn(n)}}}}).catch(e=>{throw R.create("idb-open",{originalErrorMessage:e.message})})),he}async function fs(e){try{const n=(await jt()).transaction(z),r=await n.objectStore(z).get(Ht(e));return await n.done,r}catch(t){if(t instanceof j)T.warn(t.message);else{const n=R.create("idb-get",{originalErrorMessage:t?.message});T.warn(n.message)}}}async function pt(e,t){try{const r=(await jt()).transaction(z,"readwrite");await r.objectStore(z).put(t,Ht(e)),await r.done}catch(n){if(n instanceof j)T.warn(n.message);else{const r=R.create("idb-set",{originalErrorMessage:n?.message});T.warn(r.message)}}}function Ht(e){return`${e.name}!${e.options.appId}`}/**
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
 */const hs=1024,ds=30;class ps{constructor(t){this.container=t,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new ms(n),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){try{const n=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),r=gt();if(this._heartbeatsCache?.heartbeats==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null)||this._heartbeatsCache.lastSentHeartbeatDate===r||this._heartbeatsCache.heartbeats.some(s=>s.date===r))return;if(this._heartbeatsCache.heartbeats.push({date:r,agent:n}),this._heartbeatsCache.heartbeats.length>ds){const s=ws(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(s,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(t){T.warn(t)}}async getHeartbeatsHeader(){try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=gt(),{heartbeatsToSend:n,unsentEntries:r}=gs(this._heartbeatsCache.heartbeats),s=Mt(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,r.length>0?(this._heartbeatsCache.heartbeats=r,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return T.warn(t),""}}}function gt(){return new Date().toISOString().substring(0,10)}function gs(e,t=hs){const n=[];let r=e.slice();for(const s of e){const o=n.find(i=>i.agent===s.agent);if(o){if(o.dates.push(s.date),mt(n)>t){o.dates.pop();break}}else if(n.push({agent:s.agent,dates:[s.date]}),mt(n)>t){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}class ms{constructor(t){this.app=t,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Lt()?Bt().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await fs(this.app);return n?.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(t){if(await this._canUseIndexedDBPromise){const r=await this.read();return pt(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:t.heartbeats})}else return}async add(t){if(await this._canUseIndexedDBPromise){const r=await this.read();return pt(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...t.heartbeats]})}else return}}function mt(e){return Mt(JSON.stringify({version:2,heartbeats:e})).length}function ws(e){if(e.length===0)return-1;let t=0,n=e[0].date;for(let r=1;r<e.length;r++)e[r].date<n&&(n=e[r].date,t=r);return t}/**
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
 */function ys(e){K(new M("platform-logger",t=>new kr(t),"PRIVATE")),K(new M("heartbeat",t=>new ps(t),"PRIVATE")),F(ve,ht,e),F(ve,ht,"esm2020"),F("fire-js","")}ys("");var bs="firebase",Is="12.12.0";/**
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
 */F(bs,Is,"app");const _s=(e,t)=>t.some(n=>e instanceof n);let wt,yt;function Es(){return wt||(wt=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Ss(){return yt||(yt=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const xt=new WeakMap,Ne=new WeakMap,Wt=new WeakMap,de=new WeakMap,Ke=new WeakMap;function Cs(e){const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("success",o),e.removeEventListener("error",i)},o=()=>{n(k(e.result)),s()},i=()=>{r(e.error),s()};e.addEventListener("success",o),e.addEventListener("error",i)});return t.then(n=>{n instanceof IDBCursor&&xt.set(n,e)}).catch(()=>{}),Ke.set(t,e),t}function Ds(e){if(Ne.has(e))return;const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("complete",o),e.removeEventListener("error",i),e.removeEventListener("abort",i)},o=()=>{n(),s()},i=()=>{r(e.error||new DOMException("AbortError","AbortError")),s()};e.addEventListener("complete",o),e.addEventListener("error",i),e.addEventListener("abort",i)});Ne.set(e,t)}let $e={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return Ne.get(e);if(t==="objectStoreNames")return e.objectStoreNames||Wt.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return k(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function Ts(e){$e=e($e)}function As(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const r=e.call(pe(this),t,...n);return Wt.set(r,t.sort?t.sort():[t]),k(r)}:Ss().includes(e)?function(...t){return e.apply(pe(this),t),k(xt.get(this))}:function(...t){return k(e.apply(pe(this),t))}}function vs(e){return typeof e=="function"?As(e):(e instanceof IDBTransaction&&Ds(e),_s(e,Es())?new Proxy(e,$e):e)}function k(e){if(e instanceof IDBRequest)return Cs(e);if(de.has(e))return de.get(e);const t=vs(e);return t!==e&&(de.set(e,t),Ke.set(t,e)),t}const pe=e=>Ke.get(e);function Rs(e,t,{blocked:n,upgrade:r,blocking:s,terminated:o}={}){const i=indexedDB.open(e,t),a=k(i);return r&&i.addEventListener("upgradeneeded",l=>{r(k(i.result),l.oldVersion,l.newVersion,k(i.transaction),l)}),n&&i.addEventListener("blocked",l=>n(l.oldVersion,l.newVersion,l)),a.then(l=>{o&&l.addEventListener("close",()=>o()),s&&l.addEventListener("versionchange",c=>s(c.oldVersion,c.newVersion,c))}).catch(()=>{}),a}const ks=["get","getKey","getAll","getAllKeys","count"],Ns=["put","add","delete","clear"],ge=new Map;function bt(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(ge.get(t))return ge.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,s=Ns.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(s||ks.includes(n)))return;const o=async function(i,...a){const l=this.transaction(i,s?"readwrite":"readonly");let c=l.store;return r&&(c=c.index(a.shift())),(await Promise.all([c[n](...a),s&&l.done]))[0]};return ge.set(t,o),o}Ts(e=>({...e,get:(t,n,r)=>bt(t,n)||e.get(t,n,r),has:(t,n)=>!!bt(t,n)||e.has(t,n)}));const Vt="@firebase/installations",je="0.6.21";/**
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
 */const qt=1e4,zt=`w:${je}`,Gt="FIS_v2",$s="https://firebaseinstallations.googleapis.com/v1",Ms=60*60*1e3,Os="installations",Ls="Installations";/**
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
 */const Bs={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},O=new se(Os,Ls,Bs);function Jt(e){return e instanceof j&&e.code.includes("request-failed")}/**
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
 */function Yt({projectId:e}){return`${$s}/projects/${e}/installations`}function Zt(e){return{token:e.token,requestStatus:2,expiresIn:Us(e.expiresIn),creationTime:Date.now()}}async function Xt(e,t){const r=(await t.json()).error;return O.create("request-failed",{requestName:e,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function Qt({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function Ps(e,{refreshToken:t}){const n=Qt(e);return n.append("Authorization",Fs(t)),n}async function en(e){const t=await e();return t.status>=500&&t.status<600?e():t}function Us(e){return Number(e.replace("s","000"))}function Fs(e){return`${Gt} ${e}`}/**
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
 */async function Ks({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const r=Yt(e),s=Qt(e),o=t.getImmediate({optional:!0});if(o){const c=await o.getHeartbeatsHeader();c&&s.append("x-firebase-client",c)}const i={fid:n,authVersion:Gt,appId:e.appId,sdkVersion:zt},a={method:"POST",headers:s,body:JSON.stringify(i)},l=await en(()=>fetch(r,a));if(l.ok){const c=await l.json();return{fid:c.fid||n,registrationStatus:2,refreshToken:c.refreshToken,authToken:Zt(c.authToken)}}else throw await Xt("Create Installation",l)}/**
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
 */function tn(e){return new Promise(t=>{setTimeout(t,e)})}/**
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
 */function js(e){return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_")}/**
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
 */const Hs=/^[cdef][\w-]{21}$/,Me="";function xs(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const n=Ws(e);return Hs.test(n)?n:Me}catch{return Me}}function Ws(e){return js(e).substr(0,22)}/**
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
 */function oe(e){return`${e.appName}!${e.appId}`}/**
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
 */const nn=new Map;function rn(e,t){const n=oe(e);sn(n,t),Vs(n,t)}function sn(e,t){const n=nn.get(e);if(n)for(const r of n)r(t)}function Vs(e,t){const n=qs();n&&n.postMessage({key:e,fid:t}),zs()}let $=null;function qs(){return!$&&"BroadcastChannel"in self&&($=new BroadcastChannel("[Firebase] FID Change"),$.onmessage=e=>{sn(e.data.key,e.data.fid)}),$}function zs(){nn.size===0&&$&&($.close(),$=null)}/**
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
 */const Gs="firebase-installations-database",Js=1,L="firebase-installations-store";let me=null;function He(){return me||(me=Rs(Gs,Js,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(L)}}})),me}async function te(e,t){const n=oe(e),s=(await He()).transaction(L,"readwrite"),o=s.objectStore(L),i=await o.get(n);return await o.put(t,n),await s.done,(!i||i.fid!==t.fid)&&rn(e,t.fid),t}async function on(e){const t=oe(e),r=(await He()).transaction(L,"readwrite");await r.objectStore(L).delete(t),await r.done}async function ie(e,t){const n=oe(e),s=(await He()).transaction(L,"readwrite"),o=s.objectStore(L),i=await o.get(n),a=t(i);return a===void 0?await o.delete(n):await o.put(a,n),await s.done,a&&(!i||i.fid!==a.fid)&&rn(e,a.fid),a}/**
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
 */async function xe(e){let t;const n=await ie(e.appConfig,r=>{const s=Ys(r),o=Zs(e,s);return t=o.registrationPromise,o.installationEntry});return n.fid===Me?{installationEntry:await t}:{installationEntry:n,registrationPromise:t}}function Ys(e){const t=e||{fid:xs(),registrationStatus:0};return an(t)}function Zs(e,t){if(t.registrationStatus===0){if(!navigator.onLine){const s=Promise.reject(O.create("app-offline"));return{installationEntry:t,registrationPromise:s}}const n={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},r=Xs(e,n);return{installationEntry:n,registrationPromise:r}}else return t.registrationStatus===1?{installationEntry:t,registrationPromise:Qs(e)}:{installationEntry:t}}async function Xs(e,t){try{const n=await Ks(e,t);return te(e.appConfig,n)}catch(n){throw Jt(n)&&n.customData.serverCode===409?await on(e.appConfig):await te(e.appConfig,{fid:t.fid,registrationStatus:0}),n}}async function Qs(e){let t=await It(e.appConfig);for(;t.registrationStatus===1;)await tn(100),t=await It(e.appConfig);if(t.registrationStatus===0){const{installationEntry:n,registrationPromise:r}=await xe(e);return r||n}return t}function It(e){return ie(e,t=>{if(!t)throw O.create("installation-not-found");return an(t)})}function an(e){return eo(e)?{fid:e.fid,registrationStatus:0}:e}function eo(e){return e.registrationStatus===1&&e.registrationTime+qt<Date.now()}/**
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
 */async function to({appConfig:e,heartbeatServiceProvider:t},n){const r=no(e,n),s=Ps(e,n),o=t.getImmediate({optional:!0});if(o){const c=await o.getHeartbeatsHeader();c&&s.append("x-firebase-client",c)}const i={installation:{sdkVersion:zt,appId:e.appId}},a={method:"POST",headers:s,body:JSON.stringify(i)},l=await en(()=>fetch(r,a));if(l.ok){const c=await l.json();return Zt(c)}else throw await Xt("Generate Auth Token",l)}function no(e,{fid:t}){return`${Yt(e)}/${t}/authTokens:generate`}/**
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
 */async function We(e,t=!1){let n;const r=await ie(e.appConfig,o=>{if(!cn(o))throw O.create("not-registered");const i=o.authToken;if(!t&&oo(i))return o;if(i.requestStatus===1)return n=ro(e,t),o;{if(!navigator.onLine)throw O.create("app-offline");const a=ao(o);return n=so(e,a),a}});return n?await n:r.authToken}async function ro(e,t){let n=await _t(e.appConfig);for(;n.authToken.requestStatus===1;)await tn(100),n=await _t(e.appConfig);const r=n.authToken;return r.requestStatus===0?We(e,t):r}function _t(e){return ie(e,t=>{if(!cn(t))throw O.create("not-registered");const n=t.authToken;return co(n)?{...t,authToken:{requestStatus:0}}:t})}async function so(e,t){try{const n=await to(e,t),r={...t,authToken:n};return await te(e.appConfig,r),n}catch(n){if(Jt(n)&&(n.customData.serverCode===401||n.customData.serverCode===404))await on(e.appConfig);else{const r={...t,authToken:{requestStatus:0}};await te(e.appConfig,r)}throw n}}function cn(e){return e!==void 0&&e.registrationStatus===2}function oo(e){return e.requestStatus===2&&!io(e)}function io(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+Ms}function ao(e){const t={requestStatus:1,requestTime:Date.now()};return{...e,authToken:t}}function co(e){return e.requestStatus===1&&e.requestTime+qt<Date.now()}/**
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
 */async function lo(e){const t=e,{installationEntry:n,registrationPromise:r}=await xe(t);return r?r.catch(console.error):We(t).catch(console.error),n.fid}/**
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
 */async function uo(e,t=!1){const n=e;return await fo(n),(await We(n,t)).token}async function fo(e){const{registrationPromise:t}=await xe(e);t&&await t}/**
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
 */function ho(e){if(!e||!e.options)throw we("App Configuration");if(!e.name)throw we("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw we(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}function we(e){return O.create("missing-app-config-values",{valueName:e})}/**
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
 */const ln="installations",po="installations-internal",go=e=>{const t=e.getProvider("app").getImmediate(),n=ho(t),r=Fe(t,"heartbeat");return{app:t,appConfig:n,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},mo=e=>{const t=e.getProvider("app").getImmediate(),n=Fe(t,ln).getImmediate();return{getId:()=>lo(n),getToken:s=>uo(n,s)}};function wo(){K(new M(ln,go,"PUBLIC")),K(new M(po,mo,"PRIVATE"))}wo();F(Vt,je);F(Vt,je,"esm2020");const yo=(e,t)=>t.some(n=>e instanceof n);let Et,St;function bo(){return Et||(Et=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Io(){return St||(St=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const un=new WeakMap,Oe=new WeakMap,fn=new WeakMap,ye=new WeakMap,Ve=new WeakMap;function _o(e){const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("success",o),e.removeEventListener("error",i)},o=()=>{n(D(e.result)),s()},i=()=>{r(e.error),s()};e.addEventListener("success",o),e.addEventListener("error",i)});return t.then(n=>{n instanceof IDBCursor&&un.set(n,e)}).catch(()=>{}),Ve.set(t,e),t}function Eo(e){if(Oe.has(e))return;const t=new Promise((n,r)=>{const s=()=>{e.removeEventListener("complete",o),e.removeEventListener("error",i),e.removeEventListener("abort",i)},o=()=>{n(),s()},i=()=>{r(e.error||new DOMException("AbortError","AbortError")),s()};e.addEventListener("complete",o),e.addEventListener("error",i),e.addEventListener("abort",i)});Oe.set(e,t)}let Le={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return Oe.get(e);if(t==="objectStoreNames")return e.objectStoreNames||fn.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return D(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function So(e){Le=e(Le)}function Co(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const r=e.call(be(this),t,...n);return fn.set(r,t.sort?t.sort():[t]),D(r)}:Io().includes(e)?function(...t){return e.apply(be(this),t),D(un.get(this))}:function(...t){return D(e.apply(be(this),t))}}function Do(e){return typeof e=="function"?Co(e):(e instanceof IDBTransaction&&Eo(e),yo(e,bo())?new Proxy(e,Le):e)}function D(e){if(e instanceof IDBRequest)return _o(e);if(ye.has(e))return ye.get(e);const t=Do(e);return t!==e&&(ye.set(e,t),Ve.set(t,e)),t}const be=e=>Ve.get(e);function hn(e,t,{blocked:n,upgrade:r,blocking:s,terminated:o}={}){const i=indexedDB.open(e,t),a=D(i);return r&&i.addEventListener("upgradeneeded",l=>{r(D(i.result),l.oldVersion,l.newVersion,D(i.transaction),l)}),n&&i.addEventListener("blocked",l=>n(l.oldVersion,l.newVersion,l)),a.then(l=>{o&&l.addEventListener("close",()=>o()),s&&l.addEventListener("versionchange",c=>s(c.oldVersion,c.newVersion,c))}).catch(()=>{}),a}function Ie(e,{blocked:t}={}){const n=indexedDB.deleteDatabase(e);return t&&n.addEventListener("blocked",r=>t(r.oldVersion,r)),D(n).then(()=>{})}const To=["get","getKey","getAll","getAllKeys","count"],Ao=["put","add","delete","clear"],_e=new Map;function Ct(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(_e.get(t))return _e.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,s=Ao.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(s||To.includes(n)))return;const o=async function(i,...a){const l=this.transaction(i,s?"readwrite":"readonly");let c=l.store;return r&&(c=c.index(a.shift())),(await Promise.all([c[n](...a),s&&l.done]))[0]};return _e.set(t,o),o}So(e=>({...e,get:(t,n,r)=>Ct(t,n)||e.get(t,n,r),has:(t,n)=>!!Ct(t,n)||e.has(t,n)}));/**
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
 */const dn="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",vo="https://fcmregistrations.googleapis.com/v1",pn="FCM_MSG",Ro="google.c.a.c_id",ko=3,No=1;var ne;(function(e){e[e.DATA_MESSAGE=1]="DATA_MESSAGE",e[e.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION"})(ne||(ne={}));/**
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
 */function S(e){const t=new Uint8Array(e);return btoa(String.fromCharCode(...t)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function $o(e){const t="=".repeat((4-e.length%4)%4),n=(e+t).replace(/\-/g,"+").replace(/_/g,"/"),r=atob(n),s=new Uint8Array(r.length);for(let o=0;o<r.length;++o)s[o]=r.charCodeAt(o);return s}/**
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
 */const Ee="fcm_token_details_db",Mo=5,Dt="fcm_token_object_Store";async function Oo(e){if("databases"in indexedDB&&!(await indexedDB.databases()).map(o=>o.name).includes(Ee))return null;let t=null;return(await hn(Ee,Mo,{upgrade:async(r,s,o,i)=>{if(s<2||!r.objectStoreNames.contains(Dt))return;const a=i.objectStore(Dt),l=await a.index("fcmSenderId").get(e);if(await a.clear(),!!l){if(s===2){const c=l;if(!c.auth||!c.p256dh||!c.endpoint)return;t={token:c.fcmToken,createTime:c.createTime??Date.now(),subscriptionOptions:{auth:c.auth,p256dh:c.p256dh,endpoint:c.endpoint,swScope:c.swScope,vapidKey:typeof c.vapidKey=="string"?c.vapidKey:S(c.vapidKey)}}}else if(s===3){const c=l;t={token:c.fcmToken,createTime:c.createTime,subscriptionOptions:{auth:S(c.auth),p256dh:S(c.p256dh),endpoint:c.endpoint,swScope:c.swScope,vapidKey:S(c.vapidKey)}}}else if(s===4){const c=l;t={token:c.fcmToken,createTime:c.createTime,subscriptionOptions:{auth:S(c.auth),p256dh:S(c.p256dh),endpoint:c.endpoint,swScope:c.swScope,vapidKey:S(c.vapidKey)}}}}}})).close(),await Ie(Ee),await Ie("fcm_vapid_details_db"),await Ie("undefined"),Lo(t)?t:null}function Lo(e){if(!e||!e.subscriptionOptions)return!1;const{subscriptionOptions:t}=e;return typeof e.createTime=="number"&&e.createTime>0&&typeof e.token=="string"&&e.token.length>0&&typeof t.auth=="string"&&t.auth.length>0&&typeof t.p256dh=="string"&&t.p256dh.length>0&&typeof t.endpoint=="string"&&t.endpoint.length>0&&typeof t.swScope=="string"&&t.swScope.length>0&&typeof t.vapidKey=="string"&&t.vapidKey.length>0}/**
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
 */const Bo="firebase-messaging-database",Po=1,B="firebase-messaging-store";let Se=null;function qe(){return Se||(Se=hn(Bo,Po,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(B)}}})),Se}async function ze(e){const t=Je(e),r=await(await qe()).transaction(B).objectStore(B).get(t);if(r)return r;{const s=await Oo(e.appConfig.senderId);if(s)return await Ge(e,s),s}}async function Ge(e,t){const n=Je(e),s=(await qe()).transaction(B,"readwrite");return await s.objectStore(B).put(t,n),await s.done,t}async function Uo(e){const t=Je(e),r=(await qe()).transaction(B,"readwrite");await r.objectStore(B).delete(t),await r.done}function Je({appConfig:e}){return e.appId}/**
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
 */const Fo={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."},b=new se("messaging","Messaging",Fo);/**
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
 */async function Ko(e,t){const n=await Ze(e),r=mn(t),s={method:"POST",headers:n,body:JSON.stringify(r)};let o;try{o=await(await fetch(Ye(e.appConfig),s)).json()}catch(i){throw b.create("token-subscribe-failed",{errorInfo:i?.toString()})}if(o.error){const i=o.error.message;throw b.create("token-subscribe-failed",{errorInfo:i})}if(!o.token)throw b.create("token-subscribe-no-token");return o.token}async function jo(e,t){const n=await Ze(e),r=mn(t.subscriptionOptions),s={method:"PATCH",headers:n,body:JSON.stringify(r)};let o;try{o=await(await fetch(`${Ye(e.appConfig)}/${t.token}`,s)).json()}catch(i){throw b.create("token-update-failed",{errorInfo:i?.toString()})}if(o.error){const i=o.error.message;throw b.create("token-update-failed",{errorInfo:i})}if(!o.token)throw b.create("token-update-no-token");return o.token}async function gn(e,t){const r={method:"DELETE",headers:await Ze(e)};try{const o=await(await fetch(`${Ye(e.appConfig)}/${t}`,r)).json();if(o.error){const i=o.error.message;throw b.create("token-unsubscribe-failed",{errorInfo:i})}}catch(s){throw b.create("token-unsubscribe-failed",{errorInfo:s?.toString()})}}function Ye({projectId:e}){return`${vo}/projects/${e}/registrations`}async function Ze({appConfig:e,installations:t}){const n=await t.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e.apiKey,"x-goog-firebase-installations-auth":`FIS ${n}`})}function mn({p256dh:e,auth:t,endpoint:n,vapidKey:r}){const s={web:{endpoint:n,auth:t,p256dh:e}};return r!==dn&&(s.web.applicationPubKey=r),s}/**
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
 */const Ho=7*24*60*60*1e3;async function xo(e){const t=await Vo(e.swRegistration,e.vapidKey),n={vapidKey:e.vapidKey,swScope:e.swRegistration.scope,endpoint:t.endpoint,auth:S(t.getKey("auth")),p256dh:S(t.getKey("p256dh"))},r=await ze(e.firebaseDependencies);if(r){if(qo(r.subscriptionOptions,n))return Date.now()>=r.createTime+Ho?Wo(e,{token:r.token,createTime:Date.now(),subscriptionOptions:n}):r.token;try{await gn(e.firebaseDependencies,r.token)}catch(s){console.warn(s)}return At(e.firebaseDependencies,n)}else return At(e.firebaseDependencies,n)}async function Tt(e){const t=await ze(e.firebaseDependencies);t&&(await gn(e.firebaseDependencies,t.token),await Uo(e.firebaseDependencies));const n=await e.swRegistration.pushManager.getSubscription();return n?n.unsubscribe():!0}async function Wo(e,t){try{const n=await jo(e.firebaseDependencies,t),r={...t,token:n,createTime:Date.now()};return await Ge(e.firebaseDependencies,r),n}catch(n){throw n}}async function At(e,t){const r={token:await Ko(e,t),createTime:Date.now(),subscriptionOptions:t};return await Ge(e,r),r.token}async function Vo(e,t){const n=await e.pushManager.getSubscription();return n||e.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:$o(t)})}function qo(e,t){const n=t.vapidKey===e.vapidKey,r=t.endpoint===e.endpoint,s=t.auth===e.auth,o=t.p256dh===e.p256dh;return n&&r&&s&&o}/**
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
 */function zo(e){const t={from:e.from,collapseKey:e.collapse_key,messageId:e.fcmMessageId};return Go(t,e),Jo(t,e),Yo(t,e),t}function Go(e,t){if(!t.notification)return;e.notification={};const n=t.notification.title;n&&(e.notification.title=n);const r=t.notification.body;r&&(e.notification.body=r);const s=t.notification.image;s&&(e.notification.image=s);const o=t.notification.icon;o&&(e.notification.icon=o)}function Jo(e,t){t.data&&(e.data=t.data)}function Yo(e,t){if(!t.fcmOptions&&!t.notification?.click_action)return;e.fcmOptions={};const n=t.fcmOptions?.link??t.notification?.click_action;n&&(e.fcmOptions.link=n);const r=t.fcmOptions?.analytics_label;r&&(e.fcmOptions.analyticsLabel=r)}/**
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
 */function Zo(e){return typeof e=="object"&&!!e&&Ro in e}/**
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
 */function Xo(e){return new Promise(t=>{setTimeout(t,e)})}async function Qo(e,t){const n=ei(t,await e.firebaseDependencies.installations.getId());ti(e,n,t.productId)}function ei(e,t){const n={};return e.from&&(n.project_number=e.from),e.fcmMessageId&&(n.message_id=e.fcmMessageId),n.instance_id=t,e.notification?n.message_type=ne.DISPLAY_NOTIFICATION.toString():n.message_type=ne.DATA_MESSAGE.toString(),n.sdk_platform=ko.toString(),n.package_name=self.origin.replace(/(^\w+:|^)\/\//,""),e.collapse_key&&(n.collapse_key=e.collapse_key),n.event=No.toString(),e.fcmOptions?.analytics_label&&(n.analytics_label=e.fcmOptions?.analytics_label),n}function ti(e,t,n){const r={};r.event_time_ms=Math.floor(Date.now()).toString(),r.source_extension_json_proto3=JSON.stringify({messaging_client_event:t}),n&&(r.compliance_data=ni(n)),e.logEvents.push(r)}function ni(e){return{privacy_context:{prequest:{origin_associated_product_id:e}}}}/**
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
 */async function ri(e,t){const{newSubscription:n}=e;if(!n){await Tt(t);return}const r=await ze(t.firebaseDependencies);await Tt(t),t.vapidKey=r?.subscriptionOptions?.vapidKey??dn,await xo(t)}async function si(e,t){const n=ai(e);if(!n)return;t.deliveryMetricsExportedToBigQueryEnabled&&await Qo(t,n);const r=await wn();if(li(r))return ui(r,n);if(n.notification&&await fi(ii(n)),!!t&&t.onBackgroundMessageHandler){const s=zo(n);typeof t.onBackgroundMessageHandler=="function"?await t.onBackgroundMessageHandler(s):t.onBackgroundMessageHandler.next(s)}}async function oi(e){const t=e.notification?.data?.[pn];if(t){if(e.action)return}else return;e.stopImmediatePropagation(),e.notification.close();const n=hi(t);if(!n)return;const r=new URL(n,self.location.href),s=new URL(self.location.origin);if(r.host!==s.host)return;let o=await ci(r);if(o?o=await o.focus():(o=await self.clients.openWindow(n),await Xo(3e3)),!!o)return t.messageType=re.NOTIFICATION_CLICKED,t.isFirebaseMessaging=!0,o.postMessage(t)}function ii(e){const t={...e.notification};return t.data={[pn]:e},t}function ai({data:e}){if(!e)return null;try{return e.json()}catch{return null}}async function ci(e){const t=await wn();for(const n of t){const r=new URL(n.url,self.location.href);if(e.host===r.host)return n}return null}function li(e){return e.some(t=>t.visibilityState==="visible"&&!t.url.startsWith("chrome-extension://"))}function ui(e,t){t.isFirebaseMessaging=!0,t.messageType=re.PUSH_RECEIVED;for(const n of e)n.postMessage(t)}function wn(){return self.clients.matchAll({type:"window",includeUncontrolled:!0})}function fi(e){const{actions:t}=e,{maxActions:n}=Notification;return t&&n&&t.length>n&&console.warn(`This browser only supports ${n} actions. The remaining actions will not be displayed.`),self.registration.showNotification(e.title??"",e)}function hi(e){const t=e.fcmOptions?.link??e.notification?.click_action;return t||(Zo(e.data)?self.location.origin:null)}/**
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
 */function di(e){if(!e||!e.options)throw Ce("App Configuration Object");if(!e.name)throw Ce("App Name");const t=["projectId","apiKey","appId","messagingSenderId"],{options:n}=e;for(const r of t)if(!n[r])throw Ce(r);return{appName:e.name,projectId:n.projectId,apiKey:n.apiKey,appId:n.appId,senderId:n.messagingSenderId}}function Ce(e){return b.create("missing-app-config-values",{valueName:e})}/**
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
 */class pi{constructor(t,n,r){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const s=di(t);this.firebaseDependencies={app:t,appConfig:s,installations:n,analyticsProvider:r}}_delete(){return Promise.resolve()}}/**
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
 */const gi=e=>{const t=new pi(e.getProvider("app").getImmediate(),e.getProvider("installations-internal").getImmediate(),e.getProvider("analytics-internal"));return self.addEventListener("push",n=>{n.waitUntil(si(n,t))}),self.addEventListener("pushsubscriptionchange",n=>{n.waitUntil(ri(n,t))}),self.addEventListener("notificationclick",n=>{n.waitUntil(oi(n))}),t};function mi(){K(new M("messaging-sw",gi,"PUBLIC"))}/**
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
 */async function wi(){return Lt()&&await Bt()&&"PushManager"in self&&"Notification"in self&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}/**
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
 */function yi(e,t){if(self.document!==void 0)throw b.create("only-available-in-sw");return e.onBackgroundMessageHandler=t,()=>{e.onBackgroundMessageHandler=null}}/**
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
 */function bi(e=cs()){return wi().then(t=>{if(!t)throw b.create("unsupported-browser")},t=>{throw b.create("indexed-db-unsupported")}),Fe(Pt(e),"messaging-sw").getImmediate()}function Ii(e,t){return e=Pt(e),yi(e,t)}/**
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
 */mi();Gn([{"revision":"8e3a10e157f75ada21ab742c022d5430","url":"vite.svg"},{"revision":"21ae9d8aa52e4be84380c26617b94c3b","url":"test_chatbox_messages.html"},{"revision":"4b820b5d6980bd61d7f41e2d511b6859","url":"splash-poster.png"},{"revision":"5d4278abe4d9237d70abdbbc1ed60248","url":"registerSW.js"},{"revision":"ac4d10ec3ebf9a8b62eee4737bbfcbcc","url":"manifest.webmanifest"},{"revision":"d957fd67f44929ceb637d45e7b0f8b4b","url":"index.html"},{"revision":"e4746058442f37df1c1c54b982445730","url":"icon.png"},{"revision":"af0d6b32ee2533504a9abbf7e1737849","url":"icon-notify.png"},{"revision":"f89e98a211bf04c16f7848d2fabcc91d","url":"icon-192.png"},{"revision":"90603eba8f687e5c697d5204359c1fd2","url":"firebase-messaging-sw.js"},{"revision":"dbb3bc0b40b9df3993ae416c53696e98","url":"favicon.ico"},{"revision":"3fd09ef12fdf89f68dc07ce007816590","url":"favicon-32x32.png"},{"revision":"ee3c4564588b494544001f3c0229c1d4","url":"favicon-16x16.png"},{"revision":"f37b3e324dc1a501a69537a29688ae68","url":"badge-96.png"},{"revision":"9fb1d85ce305f07738e7919ac479d544","url":"apple-touch-icon.png"},{"revision":"d4a0caf50f119f3545109156b8df30ad","url":"404.html"},{"revision":null,"url":"assets/v4-B0WsJg05.js"},{"revision":null,"url":"assets/UploadPost-CMx33-fl.js"},{"revision":null,"url":"assets/type-DgkIik3Y.js"},{"revision":null,"url":"assets/trash-2-BE6sYM_K.js"},{"revision":null,"url":"assets/StarredMessages-BAcFgt7a.js"},{"revision":null,"url":"assets/SmoothCalendar-BEUDnkXG.js"},{"revision":null,"url":"assets/Signin-C_4Icmf9.js"},{"revision":null,"url":"assets/ShareTargetPage-B0XHl7jw.js"},{"revision":null,"url":"assets/share-2-gcJoYEbs.js"},{"revision":null,"url":"assets/send-u9BLVnTG.js"},{"revision":null,"url":"assets/Search-DobYaNFg.js"},{"revision":null,"url":"assets/Search-CEOWdmcr.css"},{"revision":null,"url":"assets/refresh-cw-BvjOumSX.js"},{"revision":null,"url":"assets/RecommendedCommunities-IsvS_OY7.js"},{"revision":null,"url":"assets/PulsesTab-Bi0BFaxT.js"},{"revision":null,"url":"assets/PublicBookingView-1AXlGori.js"},{"revision":null,"url":"assets/PublicBookingPage-X3eL6ith.js"},{"revision":null,"url":"assets/ProfilePage-hNag2QoJ.js"},{"revision":null,"url":"assets/play-FZuOvzZM.js"},{"revision":null,"url":"assets/MyCommunities-YLIJGOzD.js"},{"revision":null,"url":"assets/music-DieEXJZR.js"},{"revision":null,"url":"assets/message-circle-DmJWJHJD.js"},{"revision":null,"url":"assets/MediaFeed-DpJWxDZU.js"},{"revision":null,"url":"assets/Login-CyLmT6Ig.js"},{"revision":null,"url":"assets/LandingPage-BBK85axr.js"},{"revision":null,"url":"assets/LabsPage-CNqQCVYV.js"},{"revision":null,"url":"assets/index-DO4YOdAX.css"},{"revision":null,"url":"assets/index-CNE4tqh0.js"},{"revision":null,"url":"assets/ImageEditor-DHMMIRtO.css"},{"revision":null,"url":"assets/ImageEditor-BcDcl-3y.js"},{"revision":null,"url":"assets/history-Bjt2EXsF.js"},{"revision":null,"url":"assets/copy-fOaPbtc5.js"},{"revision":null,"url":"assets/CommunityCreationPage-DvufsYUs.js"},{"revision":null,"url":"assets/Communities-9xnDqOLS.js"},{"revision":null,"url":"assets/circle-x-DbSy1U3F.js"},{"revision":null,"url":"assets/circle-check-big-CGZ213eX.js"},{"revision":null,"url":"assets/chevron-left-BziAwkgL.js"},{"revision":null,"url":"assets/ChatBox-sHjpDIsz.css"},{"revision":null,"url":"assets/ChatBox-DkiY0M6f.js"},{"revision":null,"url":"assets/CameraCaptureModal-XjWjl48g.js"},{"revision":null,"url":"assets/BatchMessagingPage-DDnN_dWa.js"},{"revision":null,"url":"assets/arrow-right-BlIub7Gy.js"},{"revision":"f89e98a211bf04c16f7848d2fabcc91d","url":"icon-192.png"},{"revision":"e4746058442f37df1c1c54b982445730","url":"icon.png"},{"revision":"ac4d10ec3ebf9a8b62eee4737bbfcbcc","url":"manifest.webmanifest"}]);try{kt(new Jn(qn("index.html")))}catch(e){console.warn("Navigation fallback setup failed:",e)}const _i=Kt({apiKey:"AIzaSyDryeR4MrHUWHByT967oI6m2cWMeV0xbXY",authDomain:"letschat-86583.firebaseapp.com",projectId:"letschat-86583",storageBucket:"letschat-86583.firebasestorage.app",messagingSenderId:"317759005455",appId:"1:317759005455:web:bcff4f930457756a8a547a",measurementId:"G-EKF9DDTJ4P"}),Ei=bi(_i),W=(()=>{try{const e=typeof self<"u"&&self.registration&&self.registration.scope?self.registration.scope:typeof location<"u"?location.origin+"/":"/",t=e.endsWith("/")?e:e+"/";return new URL("icon-notify.png",t).href}catch{return"icon-notify.png"}})(),V=(()=>{try{const e=typeof self<"u"&&self.registration&&self.registration.scope?self.registration.scope:typeof location<"u"?location.origin+"/":"/",t=e.endsWith("/")?e:e+"/";return new URL("badge-96.png",t).href}catch{return"badge-96.png"}})(),Si=16,Ci="2.1.1",Di=async()=>{try{console.log("[SW] Showing background update notification"),await self.registration.showNotification("New version of LetsChat available",{body:"A new version of LetsChat is available. Tap to update.",icon:W,badge:V,tag:"app-update-available",renotify:!0,requireInteraction:!0,data:{type:"APP_UPDATE"}})}catch(e){console.warn("[SW] Failed to show update notification in SW:",e)}};self.addEventListener("install",e=>{console.log("[SW] New Service Worker installing..."),!!(self.registration&&self.registration.active)&&(console.log("[SW] Update detected during install event (active worker exists)"),e.waitUntil(Di()))});self.addEventListener("periodicsync",e=>{e.tag==="check-update"&&(console.log("[SW] Periodic sync check-update triggered"),e.waitUntil(self.registration.update().catch(()=>{})))});self.addEventListener("message",e=>{e.data?.type==="SKIP_WAITING"&&(console.log("[SW] Received SKIP_WAITING — activating now"),self.skipWaiting())});self.addEventListener("activate",e=>{e.waitUntil((async()=>{await self.clients.claim(),console.log("[SW] Activated & claimed clients — broadcasting SW_ACTIVATED");const t=await self.clients.matchAll({type:"window"});for(const n of t)n.postMessage({type:"SW_ACTIVATED",version:Ci})})())});self.addEventListener("fetch",e=>{const t=new URL(e.request.url);e.request.method==="POST"&&t.pathname.endsWith("/share-target")&&e.respondWith((async()=>{try{const n=await e.request.formData(),r=n.getAll("media"),s=n.get("title"),o=n.get("text"),i=n.get("url"),a=await new Promise((u,h)=>{const f=indexedDB.open("LetsChatDB",Si);f.onsuccess=()=>u(f.result),f.onerror=()=>h(f.error)});if(!a.objectStoreNames.contains("sharedData"))return a.close(),Response.redirect(new URL("/share-target",e.request.url).href,303);const l=a.transaction("sharedData","readwrite"),c=l.objectStore("sharedData");if(r?.length>0)for(const u of r)u.size>0&&c.add({type:"file",file:u,name:u.name,mimeType:u.type,timestamp:Date.now()});return(s||o||i)&&c.add({type:"text",title:s,text:o,url:i,timestamp:Date.now()}),await new Promise((u,h)=>{l.oncomplete=u,l.onerror=h}),a.close(),Response.redirect("./#/share-target?received=true",303)}catch(n){return console.error("[SW] Share target failed:",n),Response.redirect("./#/share-target?error=true",303)}})())});Ii(Ei,async e=>{console.log("[SW] FCM background message received:",e);try{self.registration.update().catch(()=>{})}catch{}const t=e.data||{};if(t.v==="2"){const r=st(t,{icon:W,badge:V});let o=!(t.silent==="true");(t.alertKind==="mention"||t.alertKind==="reply")&&(o=!0);const i={body:r.body||"",icon:W,badge:V,tag:r.tag||"letschat-default",data:r.data||{},renotify:!!r.tag&&o,silent:!o};return o&&(i.vibrate=[200,100,200]),self.registration.showNotification(r.title,i)}if(e.notification){console.log("[SW] Firebase notification payload detected — handled automatically by SDK.");return}const n=st(t,{icon:W,badge:V});return self.registration.showNotification(n.title,{body:n.body,icon:W,badge:V,tag:n.tag||"letschat-default",data:n.data||{},renotify:!!n.tag,vibrate:[200,100,200]})});self.addEventListener("notificationclick",e=>{e.notification.close();const t=e.notification.data||{},n=e.notification.tag,r=self.registration.scope;if(t.type==="APP_UPDATE"||n==="app-update-available"){console.log("[SW] Update notification clicked — activating new version and updating client"),self.skipWaiting(),e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:!0}).then(async o=>{for(const i of o)try{if(new URL(i.url).origin===location.origin){"focus"in i&&await i.focus(),i.postMessage({type:"APPLY_UPDATE"});return}}catch(a){console.error("[SW] Error focusing/navigating client on update:",a)}if(self.clients.openWindow)return self.clients.openWindow(r)}));return}const s=vt(t);e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:!0}).then(async o=>{const i=new URL("#"+s,r).href;for(const a of o)try{if(new URL(a.url).origin===location.origin){"focus"in a&&await a.focus(),a.postMessage({type:"NOTIFICATION_CLICK",path:s});return}}catch(l){console.warn("[SW] Error focusing/messaging client:",l);try{a.postMessage({type:"NOTIFICATION_CLICK",path:s});return}catch{}}if(self.clients.openWindow)return self.clients.openWindow(i)}))});
