import{W as ye,aT as Pe,r as n,aU as V,av as Oe,a as Fe,au as He,A as Q,j as e,f as Ue,t as Z,B as ge,k as Ye,ae as ue,q as fe,a8 as qe,a4 as ee,X as K,a9 as Ge,ab as be,e as Ke}from"./index-e9H98gG9.js";import{C as Xe}from"./chevron-left-Df1RI8Tu.js";import{I as Je}from"./info-2MWMTsbU.js";import{T as Ve}from"./trash-2-M5bCthqh.js";import{R as he}from"./refresh-cw-DuNxqRLB.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qe=[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]],Ze=ye("link-2",Qe);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const et=[["path",{d:"M5 12h14",key:"1ays0h"}]],tt=ye("minus",et),ct=()=>{const{bellUnread:E}=Pe();n.useEffect(()=>{V.clearCalendarUnread()},[]);const{events:y,addEvent:me,removeEvent:ve}=Oe(),_=Fe(),[rt,ot]=n.useState(new Date),[z,T]=n.useState(new Date().getMonth()),[I,D]=n.useState(new Date().getFullYear()),[ke,B]=n.useState(!1),[te,R]=n.useState(!1),[S,m]=n.useState(null),[je,W]=n.useState([]),[c,M]=n.useState({title:"",startTime:"",endTime:"",description:"",color:"var(--accent-color)"}),Se=n.useRef(null),[a,Ce]=n.useState(window.innerWidth<768);n.useEffect(()=>{const t=()=>Ce(window.innerWidth<768);return window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]);const[we,re]=n.useState(!1),[v,ze]=n.useState([]),[oe,ne]=n.useState(!1),[u,X]=n.useState("all"),[L,f]=n.useState(null),[$,P]=n.useState(""),[k,O]=n.useState({date:new Date().toISOString().split("T")[0],time:"10:00",duration:60}),[g,N]=n.useState({type:"online",link:"",address:""}),[b,ae]=n.useState(!1),[ie,se]=n.useState(null),[C,le]=n.useState(!1),Te=t=>{const r=(t||"").trim().replace(/^@/,"");return`${`${window.location.origin}/letschat-test-app/`.replace(/\/$/,"")}/#/book/${r}`},Ie=t=>{t?.stopPropagation();const r=(localStorage.getItem("username")||localStorage.getItem("userid")||"").toLowerCase(),o=Te(r);navigator.clipboard&&(navigator.clipboard.writeText(o),le(!0),setTimeout(()=>le(!1),2500))},F=async()=>{const t=localStorage.getItem("userid");if(t){ne(!0);try{const r=await fetch(`${Q}/user/event/bookings`,{headers:{"User-Id":t}});if(r.ok){const o=await r.json();ze(o||[])}}catch(r){console.error("Failed to load bookings:",r)}finally{ne(!1)}}};n.useEffect(()=>{F();const t=()=>{F()};return window.addEventListener("letschat_booking_request",t),window.addEventListener("letschat_booking_update",t),()=>{window.removeEventListener("letschat_booking_request",t),window.removeEventListener("letschat_booking_update",t)}},[]);const w=n.useMemo(()=>v.filter(t=>t.externalStatus==="cancelled"?!1:!!(t.isHost&&(t.externalStatus==="pending"||t.externalStatus==="proposed_by_guest")||!t.isHost&&(t.externalStatus==="proposed_by_host"||t.externalStatus==="location_changed_by_host"))).length,[v]),de=n.useMemo(()=>u==="pending"?v.filter(t=>t.externalStatus==="cancelled"?!1:!!(t.isHost&&(t.externalStatus==="pending"||t.externalStatus==="proposed_by_guest")||!t.isHost&&(t.externalStatus==="proposed_by_host"||t.externalStatus==="location_changed_by_host"))):u==="confirmed"?v.filter(t=>t.externalStatus==="approved"):v,[v,u]),H=async(t,r,o={})=>{ae(!0);const i=localStorage.getItem("userid");try{const x=t.bookingToken||t.eventId,p=await fetch(`${Q}/booking/respond/${x}`,{method:"POST",headers:{"Content-Type":"application/json","User-Id":i},body:JSON.stringify({action:r,message:$.trim()||void 0,...o})});if(p.ok)f(null),P(""),await F();else{const d=await p.json();alert(d.message||"Action failed")}}catch(x){console.error("Action error:",x),alert("Error updating booking")}finally{ae(!1)}},De=["var(--accent-color)","var(--danger-color)","#10b981","#f59e0b","#8b5cf6","#f97316","#06b6d4"],Re=(t,r,o=null)=>{Ke(r),_(`/chat/${r}`,{state:{scrollToMsgId:t,openGroupCalendar:!0,selectedEvent:o?{...o,chatid:r,isGroup:!0}:void 0}})},ce=t=>{if(!t)return"";const[r,o]=t.split(":"),i=parseInt(r,10),x=i>=12?"PM":"AM";return`${i%12||12}:${o} ${x}`},We=()=>{const t=[],r=new Date().getFullYear();for(let o=r-1;o<=r+12;o++)t.push(o);return t},Me=["January","February","March","April","May","June","July","August","September","October","November","December"],[nt]=n.useState(We()),Le=t=>{const r=t.getFullYear(),o=t.getMonth(),i=new Date(r,o,1),p=new Date(r,o+1,0).getDate(),d=i.getDay(),l=[];for(let s=0;s<d;s++)l.push(null);for(let s=1;s<=p;s++)l.push(new Date(r,o,s));return l},A=t=>{if(!t)return"";const r=t.getFullYear(),o=String(t.getMonth()+1).padStart(2,"0"),i=String(t.getDate()).padStart(2,"0");return`${r}-${o}-${i}`},U=t=>{if(!t)return!1;const r=new Date;return t.toDateString()===r.toDateString()},Y=t=>{if(!t)return!1;const r=new Date;r.setHours(0,0,0,0);const o=new Date(t);return o.setHours(0,0,0,0),o<r},Ee=()=>{!S||!c.title||Y(S)||(me({title:c.title,date:A(S),startTime:c.startTime,endTime:c.endTime,description:c.description,color:c.color}),M({title:"",startTime:"",endTime:"",description:"",color:"var(--accent-color)"}),B(!1),m(null))},Be=(t,r)=>{ve(r,t),te&&W(o=>o.filter(i=>i.id!==r))},Ne=t=>{const r=A(t),o=y[r]||[],i=Y(t);m(t),o.length>0?(W(o),R(!0)):i||B(!0)},j=He();n.useEffect(()=>{if(j.state?.selectedEventDate&&Object.keys(y).length>0){const t=new Date(j.state.selectedEventDate),r=A(t),o=y[r]||[];T(t.getMonth()),D(t.getFullYear()),m(t),W(o),R(!0),window.history.replaceState({},document.title)}},[j.state,y]),n.useEffect(()=>{const t=j.search||(j.hash&&j.hash.includes("?")?"?"+j.hash.split("?")[1]:""),r=new URLSearchParams(t),o=r.get("eventId"),i=r.get("viewInfo");if(o&&i==="true"){console.log("[SmoothCalendar] Deep linking to event:",o);const x=d=>{if(!d)return;const l=new Date(d.date||d.startTime);T(l.getMonth()),D(l.getFullYear()),m(l),W([d]),R(!0),_("/calendar",{replace:!0})};let p=null;for(const d in y){const l=(y[d]||[]).find(s=>String(s.id)===String(o));if(l){p=l;break}}if(p)x(p);else{const d=localStorage.getItem("userid");d&&fetch(`${Q}/user/getevents/${d}`).then(l=>l.json()).then(l=>{const s=(l||[]).find(q=>String(q.eventId)===String(o));if(s){const q=h=>{if(!h)return null;if(typeof h=="number")return new Date(h<1e11?h*1e3:h);if(typeof h=="string"&&/^\d+(\.\d+)?$/.test(h.trim())){const J=parseFloat(h.trim());return new Date(J<1e11?J*1e3:J)}const xe=new Date(h);return isNaN(xe.getTime())?null:xe},G=q(s.startTime),pe=q(s.endTime),_e=G?G.toISOString():new Date().toISOString(),$e={id:s.eventId,title:s.eventTitle,date:_e,startTime:G?G.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!1}):"",endTime:pe?pe.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!1}):"",description:s.eventDetails||"",color:s.eventColor||"var(--accent-text)",msgref:s.msgId||"",chatid:s.chatId||"",action:s.action};x($e)}}).catch(l=>console.error("Error fetching event for deep-link:",l))}}},[j,y,_]);const Ae=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return e.jsxs("div",{style:{minHeight:"100vh",overflowY:"auto",overflowX:"hidden",background:"var(--bg-primary)",padding:a?"8px 0":"12px 16px",marginTop:"10px",fontFamily:"'Inter', sans-serif",position:"relative",WebkitOverflowScrolling:"touch"},children:[e.jsx("style",{children:`

        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');



        :root {

          --radius-curvy: 32px;

          --radius-pill: 500px;

          --accent-glow: 0 0 20px rgba(59, 130, 246, 0.4);

          --glass-bg: var(--bg-card);

          --glass-blur: blur(24px) saturate(160%);

        }



        .calendar-title {

          font-family: 'Outfit', sans-serif;

          background: var(--accent-gradient);

          -webkit-background-clip: text;

          -webkit-text-fill-color: transparent;

          font-weight: 700;

          font-size: clamp(2rem, 8vw, 3.5rem);

          line-height: 1.2;

        }



        .glass-panel {

          background: var(--bg-card) !important;

          backdrop-filter: var(--glass-blur) !important;

          border: 1px solid var(--border-color) !important;

          box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.2) !important;

          border-radius: var(--radius-curvy) !important;

        }



        .day-circle {

          border-radius: 16px !important;

          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;

        }



        .day-circle:hover {

          transform: translateY(-4px) scale(1.1) !important;

          background-color: var(--nav-active-bg) !important;

          border-color: var(--accent-color) !important;

          border-radius: var(--radius-curvy) !important;

        }



        .calendar-nav-btn {

          border-radius: 14px !important;

          transition: all 0.2s ease !important;

        }



        .calendar-nav-btn:hover {

          background-color: var(--nav-active-bg) !important;

          color: var(--text-primary) !important;

          transform: scale(1.05);

        }



        /* --- MODAL REFINEMENTS --- */

        .modal-overlay {

          position: absolute;

          top: 0; left: 0; right: 0; bottom: 0;

          background-color: rgba(2, 6, 23, 0.7);

          backdrop-filter: blur(8px);

          display: flex;

          align-items: flex-start;

          padding-top: 100px;

          justify-content: center;

          z-index: 10000;

          animation: fadeIn 0.3s ease;

        }



        .modal-card {

          width: 50%;

          minWidth: 320px;

          maxWidth: 420px;

          maxHeight: 85vh;

          overflow-y: auto;

          background: var(--glass-bg);

          backdrop-filter: var(--glass-blur);

          border: 1px solid var(--border-color);

          border-radius: var(--radius-curvy);

          padding: 24px;

          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);

          animation: modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

        }



        .form-input {

          width: 100%;

          padding: 14px 18px;

          border: 1px solid var(--border-color);

          border-radius: 18px;

          backgroundColor: var(--bg-hover);

          color: #fff;

          outline: none;

          transition: all 0.2s ease;

          fontSize: 15px;

          box-sizing: border-box;

        }



        .form-input:focus {

          border-color: var(--accent-solid);

          background-color: var(--bg-hover);

          box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-solid) 45%, transparent);

        }



        .pill-button {

          padding: 14px 24px;

          border-radius: var(--radius-pill);

          font-weight: 700;

          transition: all 0.2s ease;

          border: none;

          cursor: pointer;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

        }



        .pill-button-primary {

          background-color: var(--accent-text);

          color: #fff;

          box-shadow: 0 4px 14px 0 color-mix(in srgb, var(--accent-solid) 45%, transparent);

        }



        .pill-button-primary:hover:not(:disabled) {

          transform: translateY(-2px);

          box-shadow: 0 6px 20px color-mix(in srgb, var(--accent-solid) 45%, transparent);

          background-color: var(--accent-text);

        }



        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        @keyframes modalScaleUp { 

          from { transform: scale(0.9) translateY(20px); opacity: 0; } 

          to { transform: scale(1) translateY(0); opacity: 1; } 

        }



        @media (max-width: 640px) {

          .modal-card {

            padding: 20px;

            width: 95%;

            maxHeight: 85%;

          }

          .calendar-title {

            font-size: 1.6rem;

          }

        }

      `}),e.jsxs("div",{style:{width:"100%",maxWidth:a?"none":"1100px",margin:"0 auto"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"16px",marginBottom:"20px",padding:a?"0 12px":"0"},children:[e.jsx("button",{onClick:()=>_(-1),style:{display:"flex",alignItems:"center",justifyContent:"center",width:"40px",height:"40px",borderRadius:"12px",backgroundColor:"var(--bg-card)",border:"1px solid var(--border-color)",color:"var(--text-primary)",cursor:"pointer",transition:"all 0.2s ease",flexShrink:0},title:"Go back",onMouseEnter:t=>t.currentTarget.style.backgroundColor="var(--nav-active-bg)",onMouseLeave:t=>t.currentTarget.style.backgroundColor="var(--bg-card)",children:e.jsx(Ue,{size:20})}),e.jsxs("div",{style:{flex:1,textAlign:a?"left":"center"},children:[e.jsx("h1",{className:"calendar-title mb-1",style:{margin:0},children:"Schedule"}),e.jsx("p",{style:{color:"var(--text-secondary)",fontSize:"13px",fontWeight:"500",margin:0},children:"Manage your tasks and events"})]}),e.jsx("button",{onClick:Ie,style:{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"40px",height:"40px",borderRadius:"12px",backgroundColor:C?"rgba(16, 185, 129, 0.15)":"var(--bg-card)",border:C?"1px solid rgba(16, 185, 129, 0.4)":"1px solid var(--border-color)",color:C?"var(--success-color)":"var(--text-primary)",cursor:"pointer",transition:"all 0.2s ease",flexShrink:0},title:C?"Meeting link copied to clipboard!":`Copy Public Meeting Link (@${(localStorage.getItem("username")||"username").toLowerCase()})`,onMouseEnter:t=>t.currentTarget.style.backgroundColor="var(--nav-active-bg)",onMouseLeave:t=>t.currentTarget.style.backgroundColor=C?"rgba(16, 185, 129, 0.15)":"var(--bg-card)",children:C?e.jsx(Z,{size:19,color:"var(--success-color)"}):e.jsx(Ze,{size:19})}),e.jsxs("button",{onClick:()=>{re(!0),V.clearBellUnread()},style:{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"40px",height:"40px",borderRadius:"12px",backgroundColor:w>0||E?"var(--accent-tint)":"var(--bg-card)",border:w>0||E?"1px solid var(--accent-tint-border)":"1px solid var(--border-color)",color:w>0||E?"var(--accent-text)":"var(--text-primary)",cursor:"pointer",transition:"all 0.2s ease",flexShrink:0},title:"Meeting Booking Notifications",onMouseEnter:t=>t.currentTarget.style.backgroundColor="var(--nav-active-bg)",onMouseLeave:t=>t.currentTarget.style.backgroundColor=w>0||E?"var(--accent-tint)":"var(--bg-card)",children:[e.jsx(ge,{size:20}),w>0?e.jsx("span",{style:{position:"absolute",top:"-4px",right:"-4px",backgroundColor:"var(--danger-color)",color:"#ffffff",fontSize:"11px",fontWeight:"800",borderRadius:"10px",minWidth:"18px",height:"18px",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",boxShadow:"0 2px 6px var(--danger-tint)"},children:w}):E?e.jsx("span",{style:{position:"absolute",top:"4px",right:"4px",width:"11px",height:"11px",borderRadius:"50%",backgroundColor:"var(--accent-solid)",boxShadow:"0 0 8px 2px var(--accent-text)",border:"2px solid var(--bg-card)",zIndex:5}}):null]})]}),e.jsxs("div",{style:{display:"flex",gap:a?"8px":"16px",justifyContent:"center",alignItems:"center",flexWrap:"nowrap",padding:a?"16px 12px":"24px 18px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"4px",backgroundColor:"var(--bg-card)",borderRadius:"12px",padding:"6px",border:"1px solid var(--border-color)",backdropFilter:"blur(8px)"},children:[e.jsx("button",{className:"calendar-nav-btn",onClick:()=>{z===0?(T(11),D(I-1)):T(z-1)},style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer",padding:a?"6px":"8px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"8px",outline:"none"},children:e.jsx(Xe,{size:20})}),e.jsx("span",{style:{color:"var(--text-primary)",fontFamily:"'Outfit', sans-serif",fontSize:a?"15px":"18px",fontWeight:"600",minWidth:a?"85px":"110px",textAlign:"center"},children:Me[z]}),e.jsx("button",{className:"calendar-nav-btn",onClick:()=>{z===11?(T(0),D(I+1)):T(z+1)},style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer",padding:a?"6px":"8px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"8px",outline:"none"},children:e.jsx(Ye,{size:20})})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"4px",backgroundColor:"var(--bg-card)",borderRadius:"12px",padding:"6px",border:"1px solid var(--border-color)",backdropFilter:"blur(8px)"},children:[e.jsx("button",{className:"calendar-nav-btn",onClick:()=>D(I-1),style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer",padding:a?"6px":"8px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"8px",outline:"none"},children:e.jsx(tt,{size:18})}),e.jsx("span",{style:{color:"var(--text-primary)",fontFamily:"'Outfit', sans-serif",fontSize:a?"15px":"18px",fontWeight:"600",minWidth:a?"55px":"70px",textAlign:"center"},children:I}),e.jsx("button",{className:"calendar-nav-btn",onClick:()=>D(I+1),style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer",padding:a?"6px":"8px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"8px",outline:"none"},children:e.jsx(ue,{size:18})})]})]}),e.jsx("div",{ref:Se,children:(()=>{const t=new Date(I,z,1),r=Le(t);return e.jsx("div",{style:{padding:a?"0":"0 16px",width:"100%"},children:e.jsx("div",{className:"glass-panel calendar-grid-container",style:{width:"100%",maxWidth:a?"none":"800px",position:"relative",overflow:"hidden",padding:a?"8px 4px":"32px",transition:"all 0.3s ease",boxSizing:"border-box"},children:e.jsxs("div",{style:{transition:"all 0.3s ease",width:"100%"},children:[e.jsx("div",{style:{display:"grid",gridTemplateColumns:a?"repeat(7, minmax(0, 1fr))":"repeat(7, 1fr)",marginBottom:a?"8px":"20px",gap:a?"2px":"4px",borderBottom:"1px solid var(--border-color)",paddingBottom:"12px",width:"100%"},children:Ae.map(o=>e.jsx("div",{style:{textAlign:"center",fontWeight:700,color:"var(--text-secondary)",fontSize:"12px",textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:"'Outfit', sans-serif"},children:o},o))}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:a?"repeat(7, minmax(0, 1fr))":"repeat(7, 1fr)",gap:a?"2px":"clamp(4px, 1vw, 8px)",width:"100%"},children:r.map((o,i)=>{const x=A(o),p=y[x]||[],d=Y(o),l={width:a?"100%":"44px",height:a?"auto":"44px",aspectRatio:"1 / 1",borderRadius:a?"8px":"12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:a?"13px":"15px",fontWeight:600,cursor:"pointer",position:"relative",border:U(o)?"none":"1px solid var(--border-color)",backgroundColor:U(o)?"var(--accent-color)":"var(--bg-card)",color:U(o)?"#fff":d?"var(--text-muted)":"var(--text-primary)",boxShadow:U(o)?"0 0 20px color-mix(in srgb, var(--accent-solid) 45%, transparent)":"none",boxSizing:"border-box"};return e.jsx("div",{style:{display:"flex",justifyContent:"center",padding:"4px 0"},children:o&&e.jsxs("div",{className:"day-circle",style:l,onClick:()=>Ne(o),children:[o.getDate(),p.length>0&&e.jsx("div",{style:{position:"absolute",bottom:"6px",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"2px"},children:p.slice(0,3).map(s=>e.jsx("div",{style:{width:"6px",height:"6px",borderRadius:"50%",backgroundColor:s.color,boxShadow:`0 0 5px ${s.color}`}},s.id))})]})},i)})})]})})})})()}),ke&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-card",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"28px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"14px"},children:[e.jsx("div",{style:{padding:"10px",backgroundColor:"var(--accent-tint)",borderRadius:"16px",color:"var(--accent-text)"},children:e.jsx(fe,{size:22})}),e.jsx("h3",{style:{fontSize:"22px",fontWeight:"bold",color:"#fff",margin:0,fontFamily:"'Outfit', sans-serif"},children:"New Event"})]}),e.jsx("button",{onClick:()=>{B(!1),m(null)},style:{background:"var(--bg-hover)",color:"var(--text-secondary)",border:"none",padding:"8px",borderRadius:"12px",cursor:"pointer",transition:"all 0.2s",fontSize:"18px",fontWeight:"700"},children:"X"})]}),e.jsxs("div",{style:{marginBottom:"24px",paddingLeft:"4px"},children:[e.jsx("p",{style:{color:"var(--accent-text)",margin:"0 0 4px 0",fontSize:"13px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.05em"},children:"Selected Date"}),e.jsx("p",{style:{color:"#fff",margin:0,fontSize:"16px",fontWeight:"600"},children:S?.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"24px"},children:[e.jsxs("div",{style:{position:"relative"},children:[e.jsx("label",{style:{display:"block",fontSize:"13px",fontWeight:"700",color:"var(--text-secondary)",marginBottom:"8px",paddingLeft:"4px"},children:"Event Title"}),e.jsx("input",{className:"form-input",type:"text",value:c.title,onChange:t=>M(r=>({...r,title:t.target.value})),placeholder:"Meet with the team..."})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"},children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:"13px",fontWeight:"700",color:"var(--text-secondary)",marginBottom:"8px",paddingLeft:"4px"},children:"Start Time"}),e.jsx("input",{className:"form-input",type:"time",value:c.startTime,onChange:t=>M(r=>({...r,startTime:t.target.value}))})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:"13px",fontWeight:"700",color:"var(--text-secondary)",marginBottom:"8px",paddingLeft:"4px"},children:"End Time"}),e.jsx("input",{className:"form-input",type:"time",value:c.endTime,onChange:t=>M(r=>({...r,endTime:t.target.value}))})]})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:"13px",fontWeight:"700",color:"var(--text-secondary)",marginBottom:"8px",paddingLeft:"4px"},children:"Description"}),e.jsx("textarea",{className:"form-input",value:c.description,onChange:t=>M(r=>({...r,description:t.target.value})),rows:3,style:{resize:"none"},placeholder:"Key talking points..."})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:"13px",fontWeight:"700",color:"var(--text-secondary)",marginBottom:"12px",paddingLeft:"4px"},children:"Event Category"}),e.jsx("div",{style:{display:"flex",gap:"10px",flexWrap:"wrap"},children:De.map(t=>e.jsx("button",{onClick:()=>M(r=>({...r,color:t})),style:{width:"32px",height:"32px",borderRadius:"50%",border:"2px solid transparent",borderColor:c.color===t?"#fff":"transparent",backgroundColor:t,cursor:"pointer",transition:"all 0.2s",transform:c.color===t?"scale(1.15)":"scale(1)",boxShadow:c.color===t?`0 0 12px ${t}`:"none"}},t))})]}),e.jsxs("div",{style:{display:"flex",gap:"12px",marginTop:"8px"},children:[e.jsx("button",{className:"pill-button",style:{flex:1,backgroundColor:"var(--bg-hover)",color:"#fff",border:"1px solid var(--border-color)"},onClick:()=>{B(!1),m(null)},children:"Cancel"}),e.jsxs("button",{className:"pill-button pill-button-primary",style:{flex:1.5},onClick:Ee,disabled:!c.title,children:[e.jsx(ue,{size:18})," Create Event"]})]})]})]})}),te&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-card",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"28px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"14px"},children:[e.jsx("div",{style:{padding:"10px",backgroundColor:"rgba(168, 85, 247, 0.15)",borderRadius:"16px",color:"#a855f7"},children:e.jsx(Je,{size:22})}),e.jsx("h3",{style:{fontSize:"22px",fontWeight:"bold",color:"#fff",margin:0,fontFamily:"'Outfit', sans-serif"},children:"Agenda"})]}),e.jsx("button",{onClick:()=>{R(!1),m(null),W([])},style:{background:"var(--bg-hover)",color:"var(--text-secondary)",border:"none",padding:"8px",borderRadius:"12px",cursor:"pointer",transition:"all 0.2s",fontSize:"18px",fontWeight:"700"},children:"X"})]}),e.jsxs("div",{style:{marginBottom:"24px",paddingLeft:"4px"},children:[e.jsx("p",{style:{color:"#a855f7",margin:"0 0 4px 0",fontSize:"13px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.05em"},children:"Date"}),e.jsx("p",{style:{color:"#fff",margin:0,fontSize:"16px",fontWeight:"600"},children:S?.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"16px",marginBottom:"32px"},children:je.map(t=>e.jsxs("div",{onClick:()=>{t.chatid&&Re(t.msgref,t.chatid,t)},style:{padding:"20px",borderRadius:"24px",backgroundColor:"var(--bg-hover)",border:"1px solid var(--bg-hover)",position:"relative",overflow:"hidden",cursor:t.chatid?"pointer":"default",transition:"background-color 0.2s ease, border-color 0.2s ease"},onMouseEnter:r=>{t.chatid&&(r.currentTarget.style.backgroundColor="var(--bg-hover)",r.currentTarget.style.borderColor=t.color)},onMouseLeave:r=>{r.currentTarget.style.backgroundColor="var(--bg-hover)",r.currentTarget.style.borderColor="var(--bg-hover)"},children:[e.jsx("div",{style:{position:"absolute",left:0,top:0,bottom:0,width:"4px",backgroundColor:t.color,boxShadow:`0 0 10px ${t.color}`}}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"},children:[e.jsxs("div",{style:{display:"flex",flexDirection:"column"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"},children:[e.jsx("h4",{style:{fontWeight:"700",color:"#fff",margin:0,fontSize:"18px"},children:t.title}),V.isEventChanged(t.id)&&e.jsx("span",{style:{fontSize:"11px",fontWeight:"700",color:"var(--accent-text)",backgroundColor:"var(--accent-tint)",padding:"2px 8px",borderRadius:"8px",border:"1px solid var(--accent-tint-border)"},children:"Updated"})]}),t.chatid&&(()=>{const r=qe(t.chatid);return r?e.jsxs("span",{style:{fontSize:"14px",color:"var(--text-secondary)",fontWeight:"500",paddingLeft:"4px"},children:["in ",r]}):null})()]}),e.jsx("button",{onClick:r=>{r.stopPropagation(),Be(A(S),t.id)},style:{color:"var(--danger-color)",background:"var(--danger-tint)",border:"none",padding:"6px",borderRadius:"10px",cursor:"pointer"},children:e.jsx(Ve,{size:14})})]}),(t.startTime||t.time)&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px",color:"var(--text-secondary)",marginBottom:"12px"},children:[e.jsx(ee,{size:14}),e.jsxs("span",{children:[ce(t.startTime||t.time),t.endTime?` - ${ce(t.endTime)}`:""]})]}),t.description&&e.jsx("div",{style:{fontSize:"14px",color:"var(--text-secondary)",lineHeight:"1.6",padding:"12px",backgroundColor:"rgba(0,0,0,0.25)",borderRadius:"16px"},children:t.description})]},t.id))}),e.jsxs("div",{style:{display:"flex",gap:"12px"},children:[!Y(S)&&e.jsx("button",{className:"pill-button pill-button-primary",style:{flex:1},onClick:()=>{R(!1),B(!0)},children:"Add More"}),e.jsx("button",{className:"pill-button",style:{flex:1,backgroundColor:"var(--bg-hover)",color:"#fff",border:"1px solid var(--border-color)"},onClick:()=>{R(!1),m(null),W([])},children:"Dismiss"})]})]})}),we&&e.jsx("div",{style:{position:"fixed",inset:0,backgroundColor:"rgba(0, 0, 0, 0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3,padding:"16px"},children:e.jsxs("div",{style:{width:"100%",maxWidth:"580px",maxHeight:"90vh",backgroundColor:"var(--bg-primary)",borderRadius:"24px",border:"1px solid var(--bg-secondary)",display:"flex",flexDirection:"column",boxShadow:"0 25px 50px -12px rgba(0, 0, 0, 0.7)",overflow:"hidden"},children:[e.jsxs("div",{style:{padding:"20px 24px",borderBottom:"1px solid var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"space-between",backgroundColor:"var(--bg-primary)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsx("div",{style:{width:"36px",height:"36px",borderRadius:"10px",backgroundColor:"var(--accent-tint)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent-text)"},children:e.jsx(ge,{size:20})}),e.jsxs("div",{children:[e.jsx("h2",{style:{fontSize:"18px",fontWeight:"800",margin:0,color:"#f8fafc"},children:"Meeting Bookings"}),e.jsx("span",{style:{fontSize:"12px",color:"var(--text-secondary)"},children:"Incoming requests and scheduled meetings"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px"},children:[e.jsx("button",{onClick:F,style:{background:"none",border:"1px solid var(--border-color)",borderRadius:"8px",color:"var(--text-secondary)",padding:"6px",cursor:"pointer",display:"flex",alignItems:"center"},title:"Refresh bookings",children:e.jsx(he,{size:16,className:oe?"spin-animate":""})}),e.jsx("button",{onClick:()=>{re(!1),f(null)},style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer",padding:"6px",display:"flex",alignItems:"center"},children:e.jsx(K,{size:20})})]})]}),e.jsxs("div",{style:{display:"flex",gap:"8px",padding:"12px 24px",borderBottom:"1px solid var(--bg-secondary)",backgroundColor:"var(--bg-secondary)"},children:[e.jsxs("button",{onClick:()=>X("all"),style:{padding:"6px 14px",borderRadius:"20px",border:"none",backgroundColor:u==="all"?"var(--accent-text)":"var(--bg-hover)",color:u==="all"?"#ffffff":"var(--text-secondary)",fontSize:"12px",fontWeight:"700",cursor:"pointer"},children:["All (",v.length,")"]}),e.jsxs("button",{onClick:()=>X("pending"),style:{padding:"6px 14px",borderRadius:"20px",border:"none",backgroundColor:u==="pending"?"var(--warning-color)":"var(--bg-hover)",color:u==="pending"?"#ffffff":"var(--text-secondary)",fontSize:"12px",fontWeight:"700",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:["Pending Actions (",w,")"]}),e.jsxs("button",{onClick:()=>X("confirmed"),style:{padding:"6px 14px",borderRadius:"20px",border:"none",backgroundColor:u==="confirmed"?"var(--success-color)":"var(--bg-hover)",color:u==="confirmed"?"#ffffff":"var(--text-secondary)",fontSize:"12px",fontWeight:"700",cursor:"pointer"},children:["Confirmed (",v.filter(t=>t.externalStatus==="approved").length,")"]})]}),e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:"14px"},children:oe?e.jsxs("div",{style:{textAlign:"center",padding:"40px 0",color:"var(--text-secondary)"},children:[e.jsx(he,{size:24,style:{animation:"spin 1s linear infinite",margin:"0 auto 12px"}}),e.jsx("p",{style:{margin:0,fontSize:"14px"},children:"Loading bookings..."})]}):de.length===0?e.jsxs("div",{style:{textAlign:"center",padding:"40px 0",color:"var(--text-secondary)"},children:[e.jsx(fe,{size:36,style:{margin:"0 auto 12px",opacity:.5}}),e.jsx("h4",{style:{margin:"0 0 6px 0",color:"var(--text-secondary)",fontSize:"15px"},children:"No bookings found"}),e.jsx("p",{style:{margin:0,fontSize:"13px",maxWidth:"300px",marginInline:"auto"},children:u==="pending"?"No pending requests requiring your response.":"Your meeting requests will appear here."})]}):de.map(t=>{const r=t.isHost&&(t.externalStatus==="pending"||t.externalStatus==="proposed_by_guest")||!t.isHost&&t.externalStatus==="proposed_by_host";t.externalStatus;const o=t.externalStatus==="cancelled";return e.jsxs("div",{style:{backgroundColor:"var(--bg-primary)",border:r?"1px solid rgba(245, 158, 11, 0.4)":"1px solid var(--bg-secondary)",borderRadius:"16px",padding:"16px",display:"flex",flexDirection:"column",gap:"12px"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"15px",fontWeight:"700",color:"#f8fafc"},children:t.eventTitle||"Meeting Request"}),e.jsxs("div",{style:{fontSize:"12px",color:"var(--text-secondary)",marginTop:"2px"},children:[t.isHost?"Guest: ":"Host: ",e.jsx("strong",{style:{color:"var(--text-secondary)"},children:t.otherPartyName||"Participant"}),t.otherPartyEmail&&e.jsxs("span",{style:{color:"var(--text-secondary)"},children:[" (",t.otherPartyEmail,")"]})]})]}),e.jsxs("div",{children:[t.externalStatus==="approved"&&e.jsx("span",{style:{fontSize:"11px",fontWeight:"700",color:"var(--success-color)",backgroundColor:"rgba(16, 185, 129, 0.15)",padding:"4px 10px",borderRadius:"12px",border:"1px solid rgba(16, 185, 129, 0.3)"},children:"Confirmed"}),t.externalStatus==="pending"&&e.jsx("span",{style:{fontSize:"11px",fontWeight:"700",color:"var(--warning-color)",backgroundColor:"rgba(245, 158, 11, 0.15)",padding:"4px 10px",borderRadius:"12px",border:"1px solid rgba(245, 158, 11, 0.3)"},children:"Pending"}),t.externalStatus==="proposed_by_guest"&&e.jsx("span",{style:{fontSize:"11px",fontWeight:"700",color:"var(--accent-text)",backgroundColor:"var(--accent-tint)",padding:"4px 10px",borderRadius:"12px",border:"1px solid var(--accent-tint-border)"},children:"Guest Proposed Time"}),t.externalStatus==="proposed_by_host"&&e.jsx("span",{style:{fontSize:"11px",fontWeight:"700",color:"#a78bfa",backgroundColor:"rgba(139, 92, 246, 0.15)",padding:"4px 10px",borderRadius:"12px",border:"1px solid rgba(139, 92, 246, 0.3)"},children:"Host Proposed Time"}),t.externalStatus==="cancelled"&&e.jsx("span",{style:{fontSize:"11px",fontWeight:"700",color:"var(--danger-color)",backgroundColor:"var(--danger-tint)",padding:"4px 10px",borderRadius:"12px",border:"1px solid var(--danger-tint-border)"},children:"Cancelled"})]})]}),t.changeMessage&&e.jsxs("div",{style:{backgroundColor:"rgba(0,0,0,0.2)",padding:"8px 12px",borderRadius:"8px",fontSize:"12px",color:"var(--text-secondary)",borderLeft:"3px solid var(--accent-solid)"},children:[e.jsxs("strong",{style:{color:"var(--accent-text)"},children:["Note (",t.lastModifiedBy||"Update","):"]})," ",t.changeMessage]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"6px",fontSize:"12px",color:"var(--text-secondary)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx(ee,{size:13,color:"var(--accent-text)"}),e.jsxs("span",{style:{color:"#e2e8f0"},children:[new Date(t.startTime).toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})," - ",new Date(t.endTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"6px"},children:[t.meetingType==="online"?e.jsx(Ge,{size:13,color:"var(--success-color)"}):e.jsx(be,{size:13,color:"var(--warning-color)"}),e.jsx("span",{children:t.meetingType==="online"?t.meetingLink?e.jsx("a",{href:t.meetingLink.startsWith("http")?t.meetingLink:`https://${t.meetingLink}`,target:"_blank",rel:"noopener noreferrer",style:{color:"#38bdf8",textDecoration:"none"},children:t.meetingLink}):"Virtual Meeting":t.location||"In-Person Location"})]})]}),!o&&e.jsxs("div",{style:{display:"flex",gap:"8px",flexWrap:"wrap",paddingTop:"4px",borderTop:"1px solid var(--bg-hover)"},children:[r&&e.jsxs("button",{onClick:()=>H(t,"ACCEPT"),disabled:b,style:{padding:"6px 12px",borderRadius:"8px",backgroundColor:"var(--success-color)",color:"#ffffff",border:"none",fontWeight:"700",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[e.jsx(Z,{size:13})," Accept"]}),e.jsxs("button",{onClick:()=>{f({booking:t,actionType:"reschedule"});const i=new Date(t.startTime);O({date:i.toISOString().split("T")[0],time:`${String(i.getHours()).padStart(2,"0")}:${String(i.getMinutes()).padStart(2,"0")}`,duration:60})},disabled:b,style:{padding:"6px 12px",borderRadius:"8px",backgroundColor:"var(--border-color)",color:"#f8fafc",border:"1px solid var(--text-muted)",fontWeight:"600",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[e.jsx(ee,{size:13})," Propose Time"]}),e.jsxs("button",{onClick:()=>{f({booking:t,actionType:"location"}),N({type:t.meetingType||"online",link:t.meetingLink||"",address:t.location||""})},disabled:b,style:{padding:"6px 12px",borderRadius:"8px",backgroundColor:"var(--border-color)",color:"#f8fafc",border:"1px solid var(--text-muted)",fontWeight:"600",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[e.jsx(be,{size:13})," Location"]}),e.jsxs("button",{onClick:()=>{f({booking:t,actionType:"cancel"})},disabled:b,style:{padding:"6px 12px",borderRadius:"8px",backgroundColor:"var(--danger-tint)",color:"var(--danger-color)",border:"1px solid var(--danger-tint-border)",fontWeight:"600",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[e.jsx(K,{size:13})," ",r?"Decline":"Cancel"]}),t.bookingToken&&e.jsx("button",{onClick:()=>{const i=`${window.location.origin}/booking/view/${t.bookingToken}`;navigator.clipboard.writeText(i),se(t.bookingToken),setTimeout(()=>se(null),2e3)},style:{padding:"6px 10px",borderRadius:"8px",backgroundColor:"var(--bg-hover)",color:ie===t.bookingToken?"var(--success-color)":"var(--text-secondary)",border:"1px solid var(--border-color)",fontSize:"12px",cursor:"pointer",marginLeft:"auto"},title:"Copy public management link",children:ie===t.bookingToken?"Copied Link!":"Share Link"})]})]},t.eventId||t.bookingToken)})})]})}),L?.actionType==="reschedule"&&e.jsx("div",{style:{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,padding:"16px"},children:e.jsxs("div",{style:{backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",borderRadius:"20px",padding:"24px",width:"100%",maxWidth:"420px"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"},children:[e.jsx("h3",{style:{margin:0,fontSize:"17px",fontWeight:"700",color:"#f8fafc"},children:"Propose Different Time"}),e.jsx("button",{onClick:()=>f(null),style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer"},children:e.jsx(K,{size:18})})]}),e.jsxs("div",{style:{marginBottom:"12px"},children:[e.jsx("label",{style:{display:"block",fontSize:"12px",color:"var(--text-secondary)",marginBottom:"4px"},children:"Date"}),e.jsx("input",{type:"date",value:k.date,min:new Date().toISOString().split("T")[0],onChange:t=>O(r=>({...r,date:t.target.value})),style:{width:"100%",padding:"10px",borderRadius:"10px",backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",color:"#f8fafc",fontSize:"13px"}})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"},children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:"12px",color:"var(--text-secondary)",marginBottom:"4px"},children:"Start Time"}),e.jsx("input",{type:"time",value:k.time,onChange:t=>O(r=>({...r,time:t.target.value})),style:{width:"100%",padding:"10px",borderRadius:"10px",backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",color:"#f8fafc",fontSize:"13px"}})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:"12px",color:"var(--text-secondary)",marginBottom:"4px"},children:"Duration"}),e.jsxs("select",{value:k.duration,onChange:t=>O(r=>({...r,duration:Number(t.target.value)})),style:{width:"100%",padding:"10px",borderRadius:"10px",backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",color:"#f8fafc",fontSize:"13px"},children:[e.jsx("option",{value:15,children:"15 mins"}),e.jsx("option",{value:30,children:"30 mins"}),e.jsx("option",{value:45,children:"45 mins"}),e.jsx("option",{value:60,children:"1 hour"}),e.jsx("option",{value:90,children:"1.5 hours"}),e.jsx("option",{value:120,children:"2 hours"})]})]})]}),e.jsxs("div",{style:{marginBottom:"18px"},children:[e.jsx("label",{style:{display:"block",fontSize:"12px",color:"var(--text-secondary)",marginBottom:"4px"},children:"Note / Reason (Optional)"}),e.jsx("textarea",{placeholder:"e.g., Let's move our discussion to this slot.",rows:2,value:$,onChange:t=>P(t.target.value),style:{width:"100%",padding:"10px",borderRadius:"10px",backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",color:"#f8fafc",fontSize:"13px",resize:"none"}})]}),e.jsxs("div",{style:{display:"flex",gap:"10px",justifyContent:"flex-end"},children:[e.jsx("button",{onClick:()=>f(null),style:{padding:"8px 14px",borderRadius:"8px",backgroundColor:"var(--border-color)",color:"var(--text-secondary)",border:"none",cursor:"pointer"},children:"Cancel"}),e.jsx("button",{onClick:()=>{const[t,r]=k.time.split(":").map(Number),o=t*60+r+k.duration,i=Math.floor(o/60)%24,x=o%60,p=`${String(i).padStart(2,"0")}:${String(x).padStart(2,"0")}`,d=new Date(`${k.date}T${k.time}:00`).toISOString(),l=new Date(`${k.date}T${p}:00`).toISOString();H(L.booking,"PROPOSE_TIME",{startTime:d,endTime:l})},disabled:b,style:{padding:"8px 16px",borderRadius:"8px",backgroundColor:"var(--accent-solid)",color:"var(--text-on-accent)",border:"none",fontWeight:"700",cursor:"pointer"},children:b?"Proposing...":"Submit Proposal"})]})]})}),L?.actionType==="location"&&e.jsx("div",{style:{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,padding:"16px"},children:e.jsxs("div",{style:{backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",borderRadius:"20px",padding:"24px",width:"100%",maxWidth:"420px"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"},children:[e.jsx("h3",{style:{margin:0,fontSize:"17px",fontWeight:"700",color:"#f8fafc"},children:"Update Meeting Location"}),e.jsx("button",{onClick:()=>f(null),style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer"},children:e.jsx(K,{size:18})})]}),e.jsxs("div",{style:{display:"flex",gap:"8px",marginBottom:"14px"},children:[e.jsx("button",{onClick:()=>N(t=>({...t,type:"online"})),style:{flex:1,padding:"8px",borderRadius:"8px",border:g.type==="online"?"2px solid var(--accent-solid)":"1px solid var(--border-color)",backgroundColor:g.type==="online"?"var(--accent-tint)":"var(--bg-primary)",color:"#f8fafc",fontSize:"13px",cursor:"pointer"},children:"Online / Video"}),e.jsx("button",{onClick:()=>N(t=>({...t,type:"offline"})),style:{flex:1,padding:"8px",borderRadius:"8px",border:g.type==="offline"?"2px solid var(--accent-solid)":"1px solid var(--border-color)",backgroundColor:g.type==="offline"?"var(--accent-tint)":"var(--bg-primary)",color:"#f8fafc",fontSize:"13px",cursor:"pointer"},children:"In-Person / Physical"})]}),g.type==="online"?e.jsxs("div",{style:{marginBottom:"14px"},children:[e.jsx("label",{style:{display:"block",fontSize:"12px",color:"var(--text-secondary)",marginBottom:"4px"},children:"Meeting Link"}),e.jsx("input",{type:"url",placeholder:"https://meet.google.com/...",value:g.link,onChange:t=>N(r=>({...r,link:t.target.value})),style:{width:"100%",padding:"10px",borderRadius:"10px",backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",color:"#f8fafc",fontSize:"13px"}})]}):e.jsxs("div",{style:{marginBottom:"14px"},children:[e.jsx("label",{style:{display:"block",fontSize:"12px",color:"var(--text-secondary)",marginBottom:"4px"},children:"Address / Location Name"}),e.jsx("input",{type:"text",placeholder:"Office Room 2A / Address...",value:g.address,onChange:t=>N(r=>({...r,address:t.target.value})),style:{width:"100%",padding:"10px",borderRadius:"10px",backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",color:"#f8fafc",fontSize:"13px"}})]}),e.jsxs("div",{style:{marginBottom:"18px"},children:[e.jsx("label",{style:{display:"block",fontSize:"12px",color:"var(--text-secondary)",marginBottom:"4px"},children:"Note (Optional)"}),e.jsx("textarea",{placeholder:"e.g., Updated link or venue.",rows:2,value:$,onChange:t=>P(t.target.value),style:{width:"100%",padding:"10px",borderRadius:"10px",backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",color:"#f8fafc",fontSize:"13px",resize:"none"}})]}),e.jsxs("div",{style:{display:"flex",gap:"10px",justifyContent:"flex-end"},children:[e.jsx("button",{onClick:()=>f(null),style:{padding:"8px 14px",borderRadius:"8px",backgroundColor:"var(--border-color)",color:"var(--text-secondary)",border:"none",cursor:"pointer"},children:"Cancel"}),e.jsx("button",{onClick:()=>{H(L.booking,"CHANGE_LOCATION",{meetingType:g.type,meetingLink:g.type==="online"?g.link.trim():null,location:g.type==="offline"?g.address.trim():null})},disabled:b,style:{padding:"8px 16px",borderRadius:"8px",backgroundColor:"var(--accent-solid)",color:"var(--text-on-accent)",border:"none",fontWeight:"700",cursor:"pointer"},children:b?"Saving...":"Save Location"})]})]})}),L?.actionType==="cancel"&&e.jsx("div",{style:{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,padding:"16px"},children:e.jsxs("div",{style:{backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",borderRadius:"20px",padding:"24px",width:"100%",maxWidth:"400px"},children:[e.jsx("h3",{style:{margin:"0 0 8px 0",fontSize:"17px",fontWeight:"700",color:"var(--danger-color)"},children:"Cancel Meeting?"}),e.jsx("p",{style:{fontSize:"13px",color:"var(--text-secondary)",margin:"0 0 14px 0",lineHeight:"1.5"},children:"Are you sure you want to cancel or decline this meeting?"}),e.jsxs("div",{style:{marginBottom:"18px"},children:[e.jsx("label",{style:{display:"block",fontSize:"12px",color:"var(--text-secondary)",marginBottom:"4px"},children:"Reason (Optional)"}),e.jsx("textarea",{placeholder:"Provide reason for cancellation...",rows:2,value:$,onChange:t=>P(t.target.value),style:{width:"100%",padding:"10px",borderRadius:"10px",backgroundColor:"var(--bg-primary)",border:"1px solid var(--border-color)",color:"#f8fafc",fontSize:"13px",resize:"none"}})]}),e.jsxs("div",{style:{display:"flex",gap:"10px",justifyContent:"flex-end"},children:[e.jsx("button",{onClick:()=>f(null),style:{padding:"8px 14px",borderRadius:"8px",backgroundColor:"var(--border-color)",color:"var(--text-secondary)",border:"none",cursor:"pointer"},children:"Keep"}),e.jsx("button",{onClick:()=>{H(L.booking,"CANCEL")},disabled:b,style:{padding:"8px 16px",borderRadius:"8px",backgroundColor:"var(--danger-color)",color:"#ffffff",border:"none",fontWeight:"700",cursor:"pointer"},children:b?"Cancelling...":"Confirm"})]})]})}),C&&e.jsxs("div",{style:{position:"fixed",bottom:"28px",left:"50%",transform:"translateX(-50%)",backgroundColor:"var(--success-color)",color:"#ffffff",padding:"10px 20px",borderRadius:"999px",fontSize:"13px",fontWeight:"700",boxShadow:"0 8px 24px rgba(16, 185, 129, 0.4)",zIndex:99999,display:"flex",alignItems:"center",gap:"8px",animation:"fadeIn 0.2s ease-out"},children:[e.jsx(Z,{size:16,strokeWidth:3}),e.jsxs("span",{children:["Meeting link copied (@",(localStorage.getItem("username")||"user").toLowerCase(),")"]})]})]})]})};export{ct as default};
