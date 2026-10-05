import{c as N,a9 as J,u as q,r as i,a8 as G,j as e,a2 as W,E as Q,H as V,C as Z,f as ee}from"./index-DBN3dNpZ.js";import{C as te,I as re}from"./info-DDSo2jsC.js";import{T as oe}from"./trash-2-D6iJS2Ct.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],ne=N("chevron-left",ae);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ie=[["path",{d:"M5 12h14",key:"1ays0h"}]],se=N("minus",ie),ue=()=>{const{events:u,addEvent:M,removeEvent:I}=J(),R=q(),[le,de]=i.useState(new Date),[p,f]=i.useState(new Date().getMonth()),[x,m]=i.useState(new Date().getFullYear()),[F,b]=i.useState(!1),[T,h]=i.useState(!1),[d,c]=i.useState(null),[L,y]=i.useState([]),[n,g]=i.useState({title:"",startTime:"",endTime:"",description:"",color:"var(--accent-color)"}),B=i.useRef(null),[a,Y]=i.useState(window.innerWidth<768);i.useEffect(()=>{const t=()=>Y(window.innerWidth<768);return window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]);const O=["var(--accent-color)","var(--danger-color)","#10b981","#f59e0b","#8b5cf6","#f97316","#06b6d4"],$=(t,r)=>{ee(r),R(`/chat/${r}`,{state:{scrollToMsgId:t}})},E=t=>{if(!t)return"";const[r,o]=t.split(":"),s=parseInt(r,10),C=s>=12?"PM":"AM";return`${s%12||12}:${o} ${C}`},A=()=>{const t=[],r=new Date().getFullYear();for(let o=r-1;o<=r+12;o++)t.push(o);return t},H=["January","February","March","April","May","June","July","August","September","October","November","December"],[ce]=i.useState(A()),P=t=>{const r=t.getFullYear(),o=t.getMonth(),s=new Date(r,o,1),j=new Date(r,o+1,0).getDate(),z=s.getDay(),w=[];for(let l=0;l<z;l++)w.push(null);for(let l=1;l<=j;l++)w.push(new Date(r,o,l));return w},v=t=>{if(!t)return"";const r=t.getFullYear(),o=String(t.getMonth()+1).padStart(2,"0"),s=String(t.getDate()).padStart(2,"0");return`${r}-${o}-${s}`},k=t=>{if(!t)return!1;const r=new Date;return t.toDateString()===r.toDateString()},S=t=>{if(!t)return!1;const r=new Date;r.setHours(0,0,0,0);const o=new Date(t);return o.setHours(0,0,0,0),o<r},K=()=>{!d||!n.title||S(d)||(M({title:n.title,date:v(d),startTime:n.startTime,endTime:n.endTime,description:n.description,color:n.color}),g({title:"",startTime:"",endTime:"",description:"",color:"var(--accent-color)"}),b(!1),c(null))},U=(t,r)=>{I(r,t),T&&y(o=>o.filter(s=>s.id!==r))},X=t=>{const r=v(t),o=u[r]||[],s=S(t);c(t),o.length>0?(y(o),h(!0)):s||b(!0)},D=G();i.useEffect(()=>{if(D.state?.selectedEventDate&&Object.keys(u).length>0){const t=new Date(D.state.selectedEventDate),r=v(t),o=u[r]||[];f(t.getMonth()),m(t.getFullYear()),c(t),y(o),h(!0),window.history.replaceState({},document.title)}},[D.state,u]);const _=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return e.jsxs("div",{style:{minHeight:"100vh",overflowY:"auto",overflowX:"hidden",background:"var(--bg-primary)",padding:a?"8px 0":"12px 16px",marginTop:"10px",fontFamily:"'Inter', sans-serif",position:"relative",WebkitOverflowScrolling:"touch"},children:[e.jsx("style",{children:`
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
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-curvy);
          padding: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          animation: modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .form-input {
          width: 100%;
          padding: 14px 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          backgroundColor: rgba(255, 255, 255, 0.04);
          color: #fff;
          outline: none;
          transition: all 0.2s ease;
          fontSize: 15px;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: #3b82f6;
          background-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
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
          background-color: #3b82f6;
          color: #fff;
          box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.3);
        }

        .pill-button-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
          background-color: #2563eb;
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
      `}),e.jsxs("div",{style:{width:"100%",maxWidth:a?"none":"1100px",margin:"0 auto"},children:[e.jsxs("div",{className:"text-center mb-6",children:[e.jsx("h1",{className:"calendar-title mb-1",children:"Schedule"}),e.jsx("p",{style:{color:"#64748b",fontSize:"13px",fontWeight:"500"},children:"Manage your tasks and events"})]}),e.jsxs("div",{style:{display:"flex",gap:a?"8px":"16px",justifyContent:"center",alignItems:"center",flexWrap:"nowrap",padding:a?"16px 12px":"24px 18px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"4px",backgroundColor:"var(--bg-card)",borderRadius:"12px",padding:"6px",border:"1px solid var(--border-color)",backdropFilter:"blur(8px)"},children:[e.jsx("button",{className:"calendar-nav-btn",onClick:()=>{p===0?(f(11),m(x-1)):f(p-1)},style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer",padding:a?"6px":"8px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"8px",outline:"none"},children:e.jsx(ne,{size:20})}),e.jsx("span",{style:{color:"var(--text-primary)",fontFamily:"'Outfit', sans-serif",fontSize:a?"15px":"18px",fontWeight:"600",minWidth:a?"85px":"110px",textAlign:"center"},children:H[p]}),e.jsx("button",{className:"calendar-nav-btn",onClick:()=>{p===11?(f(0),m(x+1)):f(p+1)},style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer",padding:a?"6px":"8px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"8px",outline:"none"},children:e.jsx(te,{size:20})})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"4px",backgroundColor:"var(--bg-card)",borderRadius:"12px",padding:"6px",border:"1px solid var(--border-color)",backdropFilter:"blur(8px)"},children:[e.jsx("button",{className:"calendar-nav-btn",onClick:()=>m(x-1),style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer",padding:a?"6px":"8px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"8px",outline:"none"},children:e.jsx(se,{size:18})}),e.jsx("span",{style:{color:"var(--text-primary)",fontFamily:"'Outfit', sans-serif",fontSize:a?"15px":"18px",fontWeight:"600",minWidth:a?"55px":"70px",textAlign:"center"},children:x}),e.jsx("button",{className:"calendar-nav-btn",onClick:()=>m(x+1),style:{background:"none",border:"none",color:"var(--text-secondary)",cursor:"pointer",padding:a?"6px":"8px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"8px",outline:"none"},children:e.jsx(W,{size:18})})]})]}),e.jsx("div",{ref:B,children:(()=>{const t=new Date(x,p,1),r=P(t);return e.jsx("div",{style:{padding:a?"0":"0 16px",width:"100%"},children:e.jsx("div",{className:"glass-panel calendar-grid-container",style:{width:"100%",maxWidth:a?"none":"800px",position:"relative",overflow:"hidden",padding:a?"8px 4px":"32px",transition:"all 0.3s ease",boxSizing:"border-box"},children:e.jsxs("div",{style:{transition:"all 0.3s ease",width:"100%"},children:[e.jsx("div",{style:{display:"grid",gridTemplateColumns:a?"repeat(7, minmax(0, 1fr))":"repeat(7, 1fr)",marginBottom:a?"8px":"20px",gap:a?"2px":"4px",borderBottom:"1px solid var(--border-color)",paddingBottom:"12px",width:"100%"},children:_.map(o=>e.jsx("div",{style:{textAlign:"center",fontWeight:700,color:"var(--text-secondary)",fontSize:"12px",textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:"'Outfit', sans-serif"},children:o},o))}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:a?"repeat(7, minmax(0, 1fr))":"repeat(7, 1fr)",gap:a?"2px":"clamp(4px, 1vw, 8px)",width:"100%"},children:r.map((o,s)=>{const C=v(o),j=u[C]||[],z=S(o),w={width:a?"100%":"44px",height:a?"auto":"44px",aspectRatio:"1 / 1",borderRadius:a?"8px":"12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:a?"13px":"15px",fontWeight:600,cursor:"pointer",position:"relative",border:k(o)?"none":"1px solid var(--border-color)",backgroundColor:k(o)?"var(--accent-color)":"var(--bg-card)",color:k(o)?"#fff":z?"var(--text-muted)":"var(--text-primary)",boxShadow:k(o)?"0 0 20px rgba(59, 130, 246, 0.5)":"none",boxSizing:"border-box"};return e.jsx("div",{style:{display:"flex",justifyContent:"center",padding:"4px 0"},children:o&&e.jsxs("div",{className:"day-circle",style:w,onClick:()=>X(o),children:[o.getDate(),j.length>0&&e.jsx("div",{style:{position:"absolute",bottom:"6px",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"2px"},children:j.slice(0,3).map(l=>e.jsx("div",{style:{width:"4px",height:"4px",borderRadius:"50%",backgroundColor:l.color,boxShadow:`0 0 4px ${l.color}`}},l.id))})]})},s)})})]})})})})()}),F&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-card",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"28px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"14px"},children:[e.jsx("div",{style:{padding:"10px",backgroundColor:"rgba(59, 130, 246, 0.15)",borderRadius:"16px",color:"#60a5fa"},children:e.jsx(Q,{size:22})}),e.jsx("h3",{style:{fontSize:"22px",fontWeight:"bold",color:"#fff",margin:0,fontFamily:"'Outfit', sans-serif"},children:"New Event"})]}),e.jsx("button",{onClick:()=>{b(!1),c(null)},style:{background:"rgba(255,255,255,0.05)",color:"#94a3b8",border:"none",padding:"8px",borderRadius:"12px",cursor:"pointer",transition:"all 0.2s",fontSize:"18px",fontWeight:"700"},children:"X"})]}),e.jsxs("div",{style:{marginBottom:"24px",paddingLeft:"4px"},children:[e.jsx("p",{style:{color:"#60a5fa",margin:"0 0 4px 0",fontSize:"13px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.05em"},children:"Selected Date"}),e.jsx("p",{style:{color:"#fff",margin:0,fontSize:"16px",fontWeight:"600"},children:d?.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"24px"},children:[e.jsxs("div",{style:{position:"relative"},children:[e.jsx("label",{style:{display:"block",fontSize:"13px",fontWeight:"700",color:"#94a3b8",marginBottom:"8px",paddingLeft:"4px"},children:"Event Title"}),e.jsx("input",{className:"form-input",type:"text",value:n.title,onChange:t=>g(r=>({...r,title:t.target.value})),placeholder:"Meet with the team..."})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"},children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:"13px",fontWeight:"700",color:"#94a3b8",marginBottom:"8px",paddingLeft:"4px"},children:"Start Time"}),e.jsx("input",{className:"form-input",type:"time",value:n.startTime,onChange:t=>g(r=>({...r,startTime:t.target.value}))})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:"13px",fontWeight:"700",color:"#94a3b8",marginBottom:"8px",paddingLeft:"4px"},children:"End Time"}),e.jsx("input",{className:"form-input",type:"time",value:n.endTime,onChange:t=>g(r=>({...r,endTime:t.target.value}))})]})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:"13px",fontWeight:"700",color:"#94a3b8",marginBottom:"8px",paddingLeft:"4px"},children:"Description"}),e.jsx("textarea",{className:"form-input",value:n.description,onChange:t=>g(r=>({...r,description:t.target.value})),rows:3,style:{resize:"none"},placeholder:"Key talking points..."})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:"13px",fontWeight:"700",color:"#94a3b8",marginBottom:"12px",paddingLeft:"4px"},children:"Event Category"}),e.jsx("div",{style:{display:"flex",gap:"10px",flexWrap:"wrap"},children:O.map(t=>e.jsx("button",{onClick:()=>g(r=>({...r,color:t})),style:{width:"32px",height:"32px",borderRadius:"50%",border:"2px solid transparent",borderColor:n.color===t?"#fff":"transparent",backgroundColor:t,cursor:"pointer",transition:"all 0.2s",transform:n.color===t?"scale(1.15)":"scale(1)",boxShadow:n.color===t?`0 0 12px ${t}`:"none"}},t))})]}),e.jsxs("div",{style:{display:"flex",gap:"12px",marginTop:"8px"},children:[e.jsx("button",{className:"pill-button",style:{flex:1,backgroundColor:"rgba(255,255,255,0.05)",color:"#fff",border:"1px solid rgba(255,255,255,0.1)"},onClick:()=>{b(!1),c(null)},children:"Cancel"}),e.jsxs("button",{className:"pill-button pill-button-primary",style:{flex:1.5},onClick:K,disabled:!n.title,children:[e.jsx(W,{size:18})," Create Event"]})]})]})]})}),T&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-card",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"28px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"14px"},children:[e.jsx("div",{style:{padding:"10px",backgroundColor:"rgba(168, 85, 247, 0.15)",borderRadius:"16px",color:"#a855f7"},children:e.jsx(re,{size:22})}),e.jsx("h3",{style:{fontSize:"22px",fontWeight:"bold",color:"#fff",margin:0,fontFamily:"'Outfit', sans-serif"},children:"Agenda"})]}),e.jsx("button",{onClick:()=>{h(!1),c(null),y([])},style:{background:"rgba(255,255,255,0.05)",color:"#94a3b8",border:"none",padding:"8px",borderRadius:"12px",cursor:"pointer",transition:"all 0.2s",fontSize:"18px",fontWeight:"700"},children:"X"})]}),e.jsxs("div",{style:{marginBottom:"24px",paddingLeft:"4px"},children:[e.jsx("p",{style:{color:"#a855f7",margin:"0 0 4px 0",fontSize:"13px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.05em"},children:"Date"}),e.jsx("p",{style:{color:"#fff",margin:0,fontSize:"16px",fontWeight:"600"},children:d?.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"16px",marginBottom:"32px"},children:L.map(t=>e.jsxs("div",{onClick:()=>{t.chatid&&$(t.msgref,t.chatid)},style:{padding:"20px",borderRadius:"24px",backgroundColor:"rgba(255, 255, 255, 0.04)",border:"1px solid rgba(255, 255, 255, 0.05)",position:"relative",overflow:"hidden",cursor:t.chatid?"pointer":"default",transition:"background-color 0.2s ease, border-color 0.2s ease"},onMouseEnter:r=>{t.chatid&&(r.currentTarget.style.backgroundColor="rgba(255, 255, 255, 0.08)",r.currentTarget.style.borderColor=t.color)},onMouseLeave:r=>{r.currentTarget.style.backgroundColor="rgba(255, 255, 255, 0.04)",r.currentTarget.style.borderColor="rgba(255, 255, 255, 0.05)"},children:[e.jsx("div",{style:{position:"absolute",left:0,top:0,bottom:0,width:"4px",backgroundColor:t.color,boxShadow:`0 0 10px ${t.color}`}}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"},children:[e.jsxs("div",{style:{display:"flex",flexDirection:"column"},children:[e.jsx("h4",{style:{fontWeight:"700",color:"#fff",margin:0,fontSize:"18px"},children:t.title}),t.chatid&&(()=>{const r=V(t.chatid);return r?e.jsxs("span",{style:{fontSize:"14px",color:"#cbd5e1",fontWeight:"500",paddingLeft:"4px"},children:["in ",r]}):null})()]}),e.jsx("button",{onClick:r=>{r.stopPropagation(),U(v(d),t.id)},style:{color:"#ef4444",background:"rgba(239, 68, 68, 0.1)",border:"none",padding:"6px",borderRadius:"10px",cursor:"pointer"},children:e.jsx(oe,{size:14})})]}),(t.startTime||t.time)&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px",color:"#94a3b8",marginBottom:"12px"},children:[e.jsx(Z,{size:14}),e.jsxs("span",{children:[E(t.startTime||t.time),t.endTime?` - ${E(t.endTime)}`:""]})]}),t.description&&e.jsx("div",{style:{fontSize:"14px",color:"#cbd5e1",lineHeight:"1.6",padding:"12px",backgroundColor:"rgba(0,0,0,0.25)",borderRadius:"16px"},children:t.description})]},t.id))}),e.jsxs("div",{style:{display:"flex",gap:"12px"},children:[!S(d)&&e.jsx("button",{className:"pill-button pill-button-primary",style:{flex:1},onClick:()=>{h(!1),b(!0)},children:"Add More"}),e.jsx("button",{className:"pill-button",style:{flex:1,backgroundColor:"rgba(255,255,255,0.05)",color:"#fff",border:"1px solid rgba(255,255,255,0.1)"},onClick:()=>{h(!1),c(null),y([])},children:"Dismiss"})]})]})})]})]})};export{ue as default};
