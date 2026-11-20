import{as as ie,r as a,j as e,X as Q,aD as le,aC as se,A as de}from"./index-0YeGAAou.js";const M=20,Y=25,J=200,w=[{value:"none",label:"No deadline"},{value:"1h",label:"1 hour"},{value:"1d",label:"1 day"},{value:"1w",label:"1 week"},{value:"custom",label:"Custom"}],ce=r=>{const d=new Set,i=new Map;return r.forEach((j,h)=>{const c=j.trim().toLowerCase();c&&(i.has(c)?(d.add(h),d.add(i.get(c))):i.set(c,h))}),d},pe=(r,d)=>{if(r==="none")return null;const i=new Date;if(r==="1h")i.setHours(i.getHours()+1);else if(r==="1d")i.setDate(i.getDate()+1);else if(r==="1w")i.setDate(i.getDate()+7);else if(r==="custom"&&d)return new Date(d).toISOString();return i.toISOString()},xe=()=>{const r=new Date,d=r.getFullYear(),i=String(r.getMonth()+1).padStart(2,"0"),j=String(r.getDate()).padStart(2,"0"),h=String(r.getHours()).padStart(2,"0"),c=String(r.getMinutes()).padStart(2,"0");return`${d}-${i}-${j}T${h}:${c}`},ge=({isOpen:r,onClose:d,chatId:i,currentUserId:j,onPollCreated:h,triggerRef:c})=>{ie(r,d);const[z,H]=a.useState(""),[s,D]=a.useState(["",""]),[f,W]=a.useState(!1),[y,N]=a.useState(!0),[l,X]=a.useState(!1),[u,$]=a.useState(!1),[m,k]=a.useState("none"),[S,q]=a.useState(""),[C,B]=a.useState(!1),[v,g]=a.useState(""),G=a.useRef(null),F=a.useRef(null),I=a.useRef([]),A=a.useRef(null),R=a.useRef(null),L=()=>{H(""),D(["",""]),W(!1),N(!0),X(!1),$(!1),k("none"),q(""),g("")},P=()=>{L(),d()};if(a.useEffect(()=>{if(r)R.current=document.activeElement,requestAnimationFrame(()=>{F.current?.focus()});else if(R.current)try{c?.current?c.current.focus():typeof R.current.focus=="function"&&R.current.focus()}catch{}},[r,c]),a.useEffect(()=>{if(!r)return;const t=o=>{o.key==="Escape"&&(o.stopPropagation(),P())};return window.addEventListener("keydown",t),()=>window.removeEventListener("keydown",t)},[r]),!r)return null;const _=z.trim(),O=s.map(t=>t.trim()).filter(Boolean),K=ce(s);let b="";_?O.length<2?b="Add at least 2 options":K.size>0?b="Options must be unique":u&&m==="none"?b="Pick a deadline for hidden voting":m==="custom"&&(!S||isNaN(new Date(S).getTime())||new Date(S)<=new Date)&&(b="Pick a deadline date and time"):b="Add a question";const E=!b,U=()=>{if(s.length>=M)return;const t=s.length;D(o=>[...o,""]),setTimeout(()=>{I.current[t]?.focus(),A.current&&(A.current.scrollTop=A.current.scrollHeight)},0)},Z=t=>{s.length<=2||D(o=>o.filter((n,x)=>x!==t))},ee=(t,o)=>{const n=[...s];n[t]=o.slice(0,Y),D(n),v&&g("")},te=(t,o)=>{o.key==="Enter"&&(o.preventDefault(),t<s.length-1?I.current[t+1]?.focus():s[t].trim()&&s.length<M&&U())},oe=(t,o)=>{if(t.key==="ArrowRight"||t.key==="ArrowDown"){t.preventDefault();const n=(o+1)%w.length;k(w[n].value)}else if(t.key==="ArrowLeft"||t.key==="ArrowUp"){t.preventDefault();const n=(o-1+w.length)%w.length;k(w[n].value)}},re=async t=>{if(t&&(t.preventDefault(),t.stopPropagation()),!(!E||C)){B(!0),g("");try{const o=pe(m,S),n={chatid:String(i),question:_,allow_multiple:f,allow_user_options:l?!1:y,anonymous:l,is_hidden_voting:u,expires_at:o,options:O},x=localStorage.getItem("token"),p=await fetch(`${de}/polls`,{method:"POST",headers:{"Content-Type":"application/json","User-Id":j,...x?{Authorization:`Bearer ${x}`}:{}},body:JSON.stringify(n)});if(!p.ok){const T=await p.json().catch(()=>({}));throw new Error(T.message||T.error||"Failed to create poll")}const V=await p.json();h({poll_id:V.poll_id,question:_,allow_multiple:f,allow_user_options:l?!1:y,anonymous:l,is_hidden_voting:u,expires_at:o,options:V.options||O.map((T,ae)=>({option_id:ae+100,text:T}))}),L(),d()}catch(o){console.error("[CreatePollModal] Error:",o),g(o.message||"Failed to create poll. Please try again.")}finally{B(!1)}}},ne=e.jsxs("div",{className:"create-poll-sheet-overlay",onClick:P,onMouseDown:t=>t.stopPropagation(),onTouchStart:t=>t.stopPropagation(),onTouchEnd:t=>t.stopPropagation(),children:[e.jsx("style",{children:`
        .create-poll-sheet-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 999999;
          display: flex;
        }

        @media (max-width: 639px) {
          .create-poll-sheet-overlay {
            align-items: flex-end;
            justify-content: center;
            padding: 0;
          }
          .create-poll-dialog {
            width: 100%;
            border-radius: 20px 20px 0 0 !important;
            height: min(92vh, 720px) !important;
          }
          .create-poll-grab-handle {
            display: block !important;
          }
        }

        @media (min-width: 640px) {
          .create-poll-sheet-overlay {
            align-items: center;
            justify-content: center;
            padding: 16px;
          }
          .create-poll-dialog {
            width: 100%;
            max-width: 460px;
            border-radius: 20px !important;
            height: min(86vh, 720px) !important;
            margin: auto;
          }
          .create-poll-grab-handle {
            display: none !important;
          }
        }

        .create-poll-dialog {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          overflow: hidden;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
          outline: none;
        }

        .poll-custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(128,128,128,.28) transparent;
        }
        .poll-custom-scrollbar:hover {
          scrollbar-color: rgba(128,128,128,.55) transparent;
        }
        .poll-custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .poll-custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .poll-custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(128,128,128,.28);
          border: 3px solid transparent;
          background-clip: padding-box;
          border-radius: 999px;
          min-height: 36px;
        }
        .poll-custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(128,128,128,.55);
        }
        .poll-custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--accent-color) !important;
        }

        .create-poll-input {
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .create-poll-input:focus {
          border-color: var(--accent-color) !important;
          outline: none;
          box-shadow: 0 0 0 2px var(--accent-color);
        }
        .create-poll-input-error:focus {
          border-color: var(--danger-color) !important;
          outline: none;
          box-shadow: 0 0 0 2px var(--danger-color);
        }

        .create-poll-close-btn:hover {
          background-color: var(--bg-primary) !important;
        }
        .create-poll-icon-btn:hover {
          background-color: var(--bg-primary) !important;
        }

        button:focus-visible {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }
      `}),e.jsxs("div",{ref:G,role:"dialog","aria-modal":"true","aria-label":"New poll",tabIndex:-1,className:"create-poll-dialog",onClick:t=>t.stopPropagation(),onMouseDown:t=>t.stopPropagation(),onTouchStart:t=>t.stopPropagation(),onTouchEnd:t=>t.stopPropagation(),children:[e.jsxs("div",{style:{flexShrink:0},children:[e.jsx("div",{className:"create-poll-grab-handle",style:{width:"36px",height:"4px",borderRadius:"2px",backgroundColor:"var(--border-color)",margin:"8px auto 0 auto"}}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px 8px 16px"},children:[e.jsx("span",{style:{fontSize:"17px",fontWeight:600,color:"var(--text-primary)"},children:"New poll"}),e.jsx("button",{type:"button","aria-label":"Close",onClick:P,className:"create-poll-close-btn",style:{background:"transparent",border:"none",color:"var(--text-secondary)",cursor:"pointer",padding:"8px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",transition:"background-color 0.15s ease"},children:e.jsx(Q,{size:20})})]})]}),e.jsxs("div",{ref:A,className:"poll-custom-scrollbar",style:{flex:1,minHeight:0,overflowY:"auto",padding:"4px 16px 16px 16px"},children:[v&&e.jsx("div",{role:"alert",style:{border:"1px solid var(--danger-color)",background:"var(--bg-primary)",color:"var(--danger-color)",fontSize:"13px",borderRadius:"10px",padding:"10px 12px",marginBottom:"12px"},children:v}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"poll-question-input",style:{fontSize:"13px",fontWeight:600,color:"var(--text-secondary)",display:"block",marginBottom:"6px"},children:"Question"}),e.jsxs("div",{style:{position:"relative",width:"100%"},children:[e.jsx("input",{id:"poll-question-input",ref:F,type:"text",placeholder:"Ask a question",value:z,maxLength:J,onChange:t=>{H(t.target.value.slice(0,J)),v&&g("")},onKeyDown:t=>{t.key==="Enter"&&(t.preventDefault(),I.current[0]?.focus())},className:"create-poll-input",style:{width:"100%",boxSizing:"border-box",padding:"11px 12px",paddingRight:"62px",fontSize:"16px",background:"var(--bg-primary)",border:"1px solid var(--border-color)",borderRadius:"10px",color:"var(--text-primary)",outline:"none"}}),e.jsxs("span",{"aria-hidden":"true",style:{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none",fontSize:"12px",fontVariantNumeric:"tabular-nums",color:z.length>=180?"var(--warning-color)":"var(--text-secondary)",transition:"color 0.15s ease"},children:[z.length,"/200"]})]})]}),e.jsxs("div",{style:{marginTop:"16px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"},children:[e.jsx("span",{style:{fontSize:"13px",fontWeight:600,color:"var(--text-secondary)"},children:"Options"}),e.jsxs("span",{style:{fontSize:"12px",color:"var(--text-secondary)"},children:[s.length," of 20"]})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"8px"},children:s.map((t,o)=>{const n=K.has(o),x=t.length>=22;return e.jsxs("div",{style:{display:"flex",flexDirection:"column"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px"},children:[e.jsxs("div",{style:{position:"relative",flex:1},children:[e.jsx("input",{ref:p=>I.current[o]=p,type:"text",placeholder:`Option ${o+1}`,"aria-label":`Option ${o+1}`,value:t,maxLength:Y,onChange:p=>ee(o,p.target.value),onKeyDown:p=>te(o,p),className:`create-poll-input ${n?"create-poll-input-error":""}`,style:{width:"100%",boxSizing:"border-box",padding:"11px 12px",paddingRight:"56px",fontSize:"16px",background:"var(--bg-primary)",border:n?"1px solid var(--danger-color)":"1px solid var(--border-color)",borderRadius:"10px",color:"var(--text-primary)",outline:"none"}}),e.jsxs("span",{"aria-hidden":"true",style:{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none",fontSize:"12px",fontVariantNumeric:"tabular-nums",color:x?"var(--warning-color)":"var(--text-secondary)",transition:"color 0.15s ease"},children:[t.length,"/25"]})]}),s.length>2&&e.jsx("button",{type:"button","aria-label":`Remove option ${o+1}`,onClick:()=>Z(o),className:"create-poll-icon-btn",style:{background:"transparent",border:"none",padding:"8px",borderRadius:"50%",color:"var(--text-secondary)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background-color 0.15s ease"},children:e.jsx(Q,{size:18})})]}),n&&e.jsx("div",{style:{fontSize:"12px",color:"var(--danger-color)",marginTop:"4px",paddingLeft:"4px"},children:"Already added"})]},o)})}),e.jsx("div",{style:{marginTop:"8px"},children:s.length<M?e.jsxs("button",{type:"button",onClick:U,style:{background:"none",border:"none",color:"var(--accent-color)",fontSize:"14px",fontWeight:600,cursor:"pointer",padding:"6px 0",display:"flex",alignItems:"center",gap:"6px",fontFamily:"inherit"},children:[e.jsx(le,{size:16,color:"var(--accent-color)"}),"Add option"]}):e.jsx("div",{style:{fontSize:"12px",color:"var(--text-secondary)",padding:"6px 0"},children:"Maximum 20 options"})})]}),e.jsxs("div",{style:{marginTop:"16px"},children:[e.jsx("div",{style:{fontSize:"13px",fontWeight:600,color:"var(--text-secondary)"},children:"Settings"}),e.jsxs("div",{style:{background:"var(--bg-primary)",borderRadius:"14px",marginTop:"8px",overflow:"hidden"},children:[e.jsxs("div",{style:{padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",borderBottom:"1px solid var(--border-color)"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"15px",color:"var(--text-primary)",fontWeight:500},children:"Allow multiple answers"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--text-secondary)",marginTop:"2px"},children:"Voters can pick more than one option"})]}),e.jsx("button",{type:"button",role:"switch","aria-checked":f,"aria-label":"Allow multiple answers",onClick:()=>W(!f),style:{width:"42px",height:"26px",borderRadius:"999px",padding:"3px",border:"none",background:f?"var(--accent-gradient)":"rgba(128,128,128,.4)",cursor:"pointer",display:"flex",alignItems:"center",boxSizing:"border-box",transition:"background 0.2s ease",flexShrink:0},children:e.jsx("div",{style:{width:"20px",height:"20px",borderRadius:"50%",backgroundColor:"#fff",boxShadow:"0 1px 3px rgba(0, 0, 0, 0.3)",transform:f?"translateX(16px)":"translateX(0)",transition:"transform 0.2s ease"}})})]}),e.jsxs("div",{style:{padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",borderBottom:"1px solid var(--border-color)"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"15px",color:"var(--text-primary)",fontWeight:500},children:"Allow Other answer"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--text-secondary)",marginTop:"2px"},children:l?"Not available for anonymous polls":"Members can write their own answer. It does not add an option."})]}),e.jsx("button",{type:"button",role:"switch","aria-checked":!l&&y,"aria-label":"Allow Other answer",disabled:l,onClick:()=>N(!y),style:{width:"42px",height:"26px",borderRadius:"999px",padding:"3px",border:"none",background:!l&&y?"var(--accent-gradient)":"rgba(128,128,128,.4)",opacity:l?.45:1,cursor:l?"not-allowed":"pointer",display:"flex",alignItems:"center",boxSizing:"border-box",transition:"background 0.2s ease, opacity 0.2s ease",flexShrink:0},children:e.jsx("div",{style:{width:"20px",height:"20px",borderRadius:"50%",backgroundColor:"#fff",boxShadow:"0 1px 3px rgba(0, 0, 0, 0.3)",transform:!l&&y?"translateX(16px)":"translateX(0)",transition:"transform 0.2s ease"}})})]}),e.jsxs("div",{style:{padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",borderBottom:"1px solid var(--border-color)"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"15px",color:"var(--text-primary)",fontWeight:500},children:"Anonymous voting"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--text-secondary)",marginTop:"2px"},children:"Nobody can see who voted, not even you"})]}),e.jsx("button",{type:"button",role:"switch","aria-checked":l,"aria-label":"Anonymous voting",onClick:()=>{const t=!l;X(t),t&&N(!1)},style:{width:"42px",height:"26px",borderRadius:"999px",padding:"3px",border:"none",background:l?"var(--accent-gradient)":"rgba(128,128,128,.4)",cursor:"pointer",display:"flex",alignItems:"center",boxSizing:"border-box",transition:"background 0.2s ease",flexShrink:0},children:e.jsx("div",{style:{width:"20px",height:"20px",borderRadius:"50%",backgroundColor:"#fff",boxShadow:"0 1px 3px rgba(0, 0, 0, 0.3)",transform:l?"translateX(16px)":"translateX(0)",transition:"transform 0.2s ease"}})})]}),e.jsxs("div",{style:{padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"15px",color:"var(--text-primary)",fontWeight:500},children:"Hidden voting"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--text-secondary)",marginTop:"2px"},children:"Hide vote counts and voters until deadline expires"})]}),e.jsx("button",{type:"button",role:"switch","aria-checked":u,"aria-label":"Hidden voting",onClick:()=>{const t=!u;$(t),t&&m==="none"&&k("1d")},style:{width:"42px",height:"26px",borderRadius:"999px",padding:"3px",border:"none",background:u?"var(--accent-gradient)":"rgba(128,128,128,.4)",cursor:"pointer",display:"flex",alignItems:"center",boxSizing:"border-box",transition:"background 0.2s ease",flexShrink:0},children:e.jsx("div",{style:{width:"20px",height:"20px",borderRadius:"50%",backgroundColor:"#fff",boxShadow:"0 1px 3px rgba(0, 0, 0, 0.3)",transform:u?"translateX(16px)":"translateX(0)",transition:"transform 0.2s ease"}})})]})]})]}),e.jsxs("div",{style:{marginTop:"16px"},children:[e.jsx("div",{id:"deadline-section-label",style:{fontSize:"13px",fontWeight:600,color:"var(--text-secondary)"},children:"Deadline"}),e.jsx("div",{role:"radiogroup","aria-labelledby":"deadline-section-label",style:{display:"flex",flexWrap:"wrap",gap:"8px",marginTop:"8px"},children:w.map((t,o)=>{const n=m===t.value;return e.jsx("button",{type:"button",role:"radio","aria-checked":n,onClick:()=>{k(t.value),v&&g("")},onKeyDown:x=>oe(x,o),style:{borderRadius:"999px",padding:"6px 14px",fontSize:"14px",fontFamily:"inherit",cursor:"pointer",background:n?"var(--accent-gradient)":"transparent",color:n?"#fff":"var(--text-primary)",border:n?"1px solid transparent":"1px solid var(--border-color)",transition:"background 0.15s ease, color 0.15s ease, border-color 0.15s ease"},children:t.label},t.value)})}),m==="custom"&&e.jsx("input",{type:"datetime-local","aria-label":"Deadline date and time",value:S,min:xe(),onChange:t=>{q(t.target.value),v&&g("")},className:"create-poll-input",style:{width:"100%",boxSizing:"border-box",marginTop:"8px",padding:"11px 12px",fontSize:"16px",background:"var(--bg-primary)",border:"1px solid var(--border-color)",borderRadius:"10px",color:"var(--text-primary)",outline:"none"}})]})]}),e.jsxs("div",{style:{flexShrink:0,borderTop:"1px solid var(--border-color)",padding:"10px 16px 14px 16px"},children:[e.jsx("div",{style:{fontSize:"13px",color:"var(--text-secondary)",minHeight:"20px",textAlign:"center",marginBottom:"6px",display:"flex",alignItems:"center",justifyContent:"center"},children:b}),e.jsx("button",{type:"button",onClick:re,disabled:!E||C,style:{width:"100%",height:"46px",borderRadius:"12px",background:"var(--accent-gradient)",color:"#fff",fontSize:"16px",fontWeight:600,border:"none",opacity:!E||C?.45:1,cursor:!E||C?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",transition:"opacity 0.15s ease"},children:C?"Creating poll...":"Create poll"})]})]})]});return se.createPortal(ne,document.body)};export{ge as default};
