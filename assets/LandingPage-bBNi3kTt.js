import{a as u,bb as y,as as v,r as f,j as e}from"./index-e9H98gG9.js";function j(){f.useEffect(()=>{const n=document.querySelectorAll(".reveal"),i=new IntersectionObserver(a=>{a.forEach(r=>{r.isIntersecting&&(r.target.classList.add("revealed"),i.unobserve(r.target))})},{threshold:.05,rootMargin:"0px 0px 100px 0px"}),o=setTimeout(()=>{n.forEach(a=>i.observe(a))},100),d=setTimeout(()=>{n.forEach(a=>a.classList.add("revealed"))},2e3);return()=>{clearTimeout(o),clearTimeout(d),i.disconnect()}},[])}const x={Arun:"#e74c3c",Priya:"#8e44ad",Rahul:"#2980b9",Karthik:"#27ae60",Anu:"#f39c12"},S=({isDark:n})=>{const i=[{name:"Arun",text:"Guys urgent doubt",time:"9:01"},{name:"Priya",text:"Wait",time:"9:01"},{name:"Rahul",text:"Anyone coming canteen?",time:"9:02"},{name:"Karthik",text:"Notes??",time:"9:02"},{name:"Anu",text:"Send pdf",time:"9:03"},{name:"Rahul",text:"Match going on",time:"9:03"},{name:"Priya",text:"Assignment tomorrow",time:"9:04"},{name:"Arun",text:"WHAT SUBJECT??",time:"9:04"},{name:"Karthik",text:"DBMS maybe",time:"9:05"},{name:"Anu",text:"Maybe??",time:"9:05"},{name:"Rahul",text:"😂😂😂",time:"9:05"},{name:"Priya",text:"Not funny",time:"9:06"},{name:"Arun",text:"I can't follow anything here",time:"9:06"},{name:"Karthik",text:"Same",time:"9:07"},{name:"Anu",text:"Messages lost",time:"9:07"},{name:"Rahul",text:"Who asked what??",time:"9:07"},{name:"Priya",text:"Exactly problem",time:"9:08"}];return e.jsxs("div",{style:{borderRadius:16,overflow:"hidden",boxShadow:n?"0 12px 36px rgba(0,0,0,0.5)":"0 8px 32px rgba(0,0,0,0.15)",border:n?"1px solid rgba(255,255,255,0.08)":"none",fontFamily:"Inter,sans-serif"},children:[e.jsxs("div",{style:{background:n?"#1f2c34":"#075e54",padding:"10px 14px",color:"#fff",display:"flex",alignItems:"center",gap:10},children:[e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",background:n?"#00a884":"#128c7e",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:15,flexShrink:0},children:"CS"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:700,fontSize:14},children:"CS Batch 2025 💬"}),e.jsx("div",{style:{fontSize:11,opacity:.75},children:"Arun, Priya, Rahul, Karthik, Anu +12"})]})]}),e.jsxs("div",{style:{background:n?"#0b141a":"#e5ddd5",padding:"10px 10px 6px",maxHeight:320,overflowY:"auto"},children:[e.jsx("div",{style:{textAlign:"center",marginBottom:8},children:e.jsx("span",{style:{background:n?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.12)",borderRadius:10,padding:"2px 10px",fontSize:11,color:n?"#8696a0":"#555"},children:"TODAY"})}),i.map((o,d)=>e.jsxs("div",{style:{display:"flex",gap:6,marginBottom:3,alignItems:"flex-start"},children:[e.jsx("div",{style:{width:22,height:22,borderRadius:"50%",background:x[o.name],flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:9,fontWeight:800,marginTop:2},children:o.name[0]}),e.jsxs("div",{style:{background:n?"#202c33":"#fff",borderRadius:"2px 10px 10px 10px",padding:"4px 8px",maxWidth:"82%",boxShadow:n?"0 1px 2px rgba(0,0,0,0.3)":"0 1px 1px rgba(0,0,0,0.1)"},children:[e.jsx("div",{style:{color:x[o.name],fontWeight:700,fontSize:10.5},children:o.name}),e.jsx("div",{style:{color:n?"#e9edef":"#111",fontSize:12.5,lineHeight:1.35},children:o.text}),e.jsx("div",{style:{color:n?"#8696a0":"#999",fontSize:9.5,textAlign:"right",marginTop:1},children:o.time})]})]},d)),e.jsx("div",{style:{textAlign:"center",marginTop:10},children:e.jsx("span",{style:{background:"#ef4444",color:"#fff",borderRadius:20,padding:"4px 14px",fontSize:11,fontWeight:700},children:"↓ 17 more messages below"})})]}),e.jsxs("div",{style:{background:n?"#1f2c34":"#f0f0f0",padding:"8px 10px",display:"flex",alignItems:"center",gap:8},children:[e.jsx("div",{style:{flex:1,background:n?"#2a3942":"#fff",borderRadius:20,padding:"7px 14px",color:n?"#8696a0":"#aaa",fontSize:13},children:"Message"}),e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",background:"#25d366",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16},children:"🎤"})]})]})},p=({icon:n,title:i,color:o,msgs:d})=>e.jsxs("div",{style:{background:"#1f2c34",borderRadius:12,marginBottom:10,overflow:"hidden",border:`1px solid ${o}30`},children:[e.jsxs("div",{style:{padding:"8px 12px",background:o+"18",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${o}25`},children:[e.jsx("span",{style:{fontSize:14},children:n}),e.jsx("span",{style:{fontWeight:700,fontSize:12,color:o},children:i})]}),e.jsx("div",{style:{padding:"8px 12px"},children:d.map((a,r)=>e.jsxs("div",{style:{display:"flex",gap:6,marginBottom:r<d.length-1?5:0,alignItems:"flex-start"},children:[e.jsx("div",{style:{width:18,height:18,borderRadius:"50%",background:x[a.name]||"#6366f1",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:8,fontWeight:800,marginTop:1},children:a.name[0]}),e.jsxs("div",{children:[e.jsxs("span",{style:{color:x[a.name]||"#818cf8",fontWeight:700,fontSize:10.5},children:[a.name,": "]}),e.jsx("span",{style:{color:"#e9edef",fontSize:12},children:a.text})]})]},r))})]}),w=({isDark:n})=>e.jsxs("div",{style:{background:"#0b141a",borderRadius:16,overflow:"hidden",boxShadow:n?"0 12px 40px rgba(0,0,0,0.6)":"0 8px 32px rgba(99,102,241,0.15)",border:n?"1px solid rgba(99, 102, 241, 0.35)":"1px solid #e0e7ff",fontFamily:"Inter,sans-serif"},children:[e.jsxs("div",{style:{background:"#1f2c34",padding:"11px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.06)"},children:[e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:"#fff",flexShrink:0},children:"CS"}),e.jsxs("div",{style:{flex:1},children:[e.jsx("div",{style:{fontWeight:700,fontSize:14,color:"#e9edef"},children:"CS Batch 2025"}),e.jsx("div",{style:{fontSize:11,color:"#8696a0"},children:"4 spaces · 17 members"})]}),e.jsx("div",{style:{background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:8,padding:"3px 10px",fontSize:11,color:"#818cf8",fontWeight:600},children:"Spaces ✦"})]}),e.jsx("div",{style:{display:"flex",gap:6,padding:"7px 12px",background:"#111b21",borderBottom:"1px solid rgba(255,255,255,0.05)",overflowX:"auto"},children:["📚 DBMS","❓ Doubts","💬 General","🎭 Off-topic"].map((i,o)=>e.jsx("div",{style:{padding:"4px 12px",borderRadius:20,background:o===0?"#6366f1":"rgba(255,255,255,0.06)",color:o===0?"#fff":"#8696a0",fontSize:11,fontWeight:600,whiteSpace:"nowrap",flexShrink:0},children:i},o))}),e.jsxs("div",{style:{padding:"10px 12px",background:"#0b141a"},children:[e.jsx(p,{icon:"📚",title:"DBMS Assignment",color:"#6366f1",msgs:[{name:"Priya",text:"Assignment tomorrow (DBMS)"},{name:"Karthik",text:"Topic: Normalization"},{name:"Anu",text:"Uploading PDF notes here"},{name:"Arun",text:"Got it 👍"}]}),e.jsx(p,{icon:"❓",title:"Doubts",color:"#f59e0b",msgs:[{name:"Arun",text:"Urgent doubt — what subject was the assignment?"},{name:"Priya",text:"DBMS"},{name:"Karthik",text:"Confirmed ✓"}]}),e.jsx(p,{icon:"💬",title:"General",color:"#10b981",msgs:[{name:"Rahul",text:"Anyone coming to canteen?"}]}),e.jsxs("div",{style:{background:"#1f2c34",borderRadius:12,overflow:"hidden",border:"1px solid rgba(99,102,241,0.35)",marginTop:4},children:[e.jsxs("div",{style:{padding:"10px 12px",background:"rgba(99,102,241,0.2)",borderBottom:"1px solid rgba(99,102,241,0.25)",display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:16},children:"✨"}),e.jsx("span",{style:{fontWeight:900,fontSize:14,color:"#fff",letterSpacing:"0.5px",textTransform:"uppercase"},children:"Auto-detected Events"})]}),e.jsx("div",{style:{padding:"8px 12px",display:"flex",flexDirection:"column",gap:8},children:[{title:"DBMS Assignment",when:"Tomorrow",color:"#ef4444"},{title:"Internal Test",when:"Coming soon",color:"#f59e0b"}].map((i,o)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx("div",{style:{width:8,height:8,borderRadius:"50%",background:i.color,flexShrink:0}}),e.jsx("div",{style:{flex:1,color:"#e9edef",fontSize:12,fontWeight:600},children:i.title}),e.jsx("div",{style:{background:i.color+"20",color:i.color,borderRadius:20,padding:"2px 10px",fontSize:10,fontWeight:700},children:i.when})]},o))})]})]}),e.jsxs("div",{style:{background:"#1f2c34",padding:"8px 12px",display:"flex",alignItems:"center",gap:10,borderTop:"1px solid rgba(255,255,255,0.05)"},children:[e.jsx("div",{style:{flex:1,background:"#2a3942",borderRadius:20,padding:"8px 16px",color:"#8696a0",fontSize:13},children:"Type a message"}),e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",background:"#00a884",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16},children:"➤"})]})]}),z=({isDark:n})=>e.jsxs("div",{style:{background:n?"#111827":"#fff",borderRadius:16,overflow:"hidden",boxShadow:n?"0 12px 36px rgba(0,0,0,0.4)":"0 8px 32px rgba(99,102,241,0.12)",fontFamily:"Inter,sans-serif",border:n?"1px solid rgba(99,102,241,0.25)":"1px solid #e0e7ff"},children:[e.jsxs("div",{style:{background:"linear-gradient(135deg,#4f46e5,#7c3aed)",padding:"14px 16px",color:"#fff"},children:[e.jsx("div",{style:{fontWeight:800,fontSize:15},children:"📚 DBMS Classroom"}),e.jsx("div",{style:{fontSize:11,opacity:.8,marginTop:2},children:"Organized learning + live discussion"})]}),e.jsx("div",{style:{display:"flex",background:n?"#0f172a":"#f8fafc",borderBottom:n?"1px solid #1e293b":"1px solid #e2e8f0"},children:["Announcements","Materials","Discussion"].map((i,o)=>e.jsx("div",{style:{flex:1,textAlign:"center",padding:"9px 4px",fontSize:12,fontWeight:600,color:o===2?n?"#818cf8":"#4f46e5":n?"#64748b":"#94a3b8",borderBottom:o===2?`2px solid ${n?"#818cf8":"#4f46e5"}`:"2px solid transparent",cursor:"pointer",transition:"color .15s"},children:i},o))}),e.jsxs("div",{style:{padding:"12px 14px",background:n?"#0b0f19":"#f8fafc"},children:[e.jsxs("div",{style:{background:n?"rgba(99,102,241,0.12)":"#f5f3ff",border:n?"1.5px solid rgba(139,92,246,0.35)":"2px solid #ddd6fe",borderRadius:14,padding:"12px",marginBottom:16,display:"flex",alignItems:"flex-start",gap:12,boxShadow:n?"0 4px 16px rgba(0,0,0,0.2)":"0 4px 12px rgba(99,102,241,0.06)"},children:[e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:n?"rgba(139,92,246,0.25)":"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0},children:"📢"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:900,fontSize:14,color:n?"#c7d2fe":"#4338ca",marginBottom:4},children:"New Assignment: Normalization"}),e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:8},children:[e.jsx("span",{style:{background:"#ef4444",color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:900},children:"DUE TOMORROW"}),e.jsx("span",{style:{color:n?"#a78bfa":"#6d28d9",fontSize:12,fontWeight:700},children:"Posted by Teacher"})]})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:10},children:[e.jsx("div",{style:{flex:1,height:1,background:n?"#1e293b":"#e2e8f0"}}),e.jsx("span",{style:{fontSize:10,color:n?"#64748b":"#94a3b8",fontWeight:600,whiteSpace:"nowrap"},children:"💬 Live Discussion"}),e.jsx("div",{style:{flex:1,height:1,background:n?"#1e293b":"#e2e8f0"}})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8},children:[e.jsxs("div",{style:{display:"flex",gap:7,alignItems:"flex-start"},children:[e.jsx("div",{style:{width:24,height:24,borderRadius:"50%",background:"#f59e0b",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800,flexShrink:0,marginTop:1},children:"A"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:10,color:"#f59e0b",fontWeight:700,marginBottom:2},children:"Anu"}),e.jsx("div",{style:{background:n?"#1e293b":"#fff",border:n?"1px solid #334155":"1px solid #e2e8f0",borderRadius:"2px 12px 12px 12px",padding:"7px 11px",fontSize:12.5,color:n?"#f1f5f9":"#1e293b",boxShadow:n?"0 1px 3px rgba(0,0,0,0.3)":"0 1px 3px rgba(0,0,0,0.06)"},children:"Ma'am is this for tomorrow?"}),e.jsx("div",{style:{fontSize:10,color:n?"#64748b":"#94a3b8",marginTop:2},children:"9:14 AM"})]})]}),e.jsx("div",{style:{display:"flex",justifyContent:"flex-end"},children:e.jsxs("div",{style:{maxWidth:"78%",textAlign:"right"},children:[e.jsx("div",{style:{fontSize:10,color:n?"#818cf8":"#4f46e5",fontWeight:700,marginBottom:2},children:"Teacher"}),e.jsx("div",{style:{background:"#4f46e5",borderRadius:"12px 2px 12px 12px",padding:"7px 11px",fontSize:12.5,color:"#fff",display:"inline-block",textAlign:"left"},children:"Yes, submit before 5 PM ✅"}),e.jsx("div",{style:{fontSize:10,color:n?"#64748b":"#94a3b8",marginTop:2},children:"9:15 AM ✓✓"})]})}),e.jsxs("div",{style:{display:"flex",gap:7,alignItems:"flex-start"},children:[e.jsx("div",{style:{width:24,height:24,borderRadius:"50%",background:"#27ae60",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800,flexShrink:0,marginTop:1},children:"K"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:10,color:"#27ae60",fontWeight:700,marginBottom:2},children:"Karthik"}),e.jsx("div",{style:{background:n?"#1e293b":"#fff",border:n?"1px solid #334155":"1px solid #e2e8f0",borderRadius:"2px 12px 12px 12px",padding:"7px 11px",fontSize:12.5,color:n?"#f1f5f9":"#1e293b",boxShadow:n?"0 1px 3px rgba(0,0,0,0.3)":"0 1px 3px rgba(0,0,0,0.06)"},children:"Got it, uploading now 👍"}),e.jsx("div",{style:{fontSize:10,color:n?"#64748b":"#94a3b8",marginTop:2},children:"9:16 AM"})]})]})]})]}),e.jsxs("div",{style:{background:n?"rgba(79,70,229,0.15)":"linear-gradient(135deg,rgba(79,70,229,0.08),rgba(124,58,237,0.08))",borderTop:n?"1px solid rgba(99,102,241,0.25)":"1px solid #e0e7ff",padding:"9px 14px",display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:14},children:"⚡"}),e.jsx("span",{style:{fontSize:11.5,fontWeight:600,color:n?"#c7d2fe":"#4338ca"},children:"Structured like a classroom + instant discussion"})]})]}),k=({isDark:n})=>e.jsx("div",{style:{background:n?"#111827":"#fff",borderRadius:16,overflow:"hidden",boxShadow:n?"0 12px 36px rgba(0,0,0,0.4)":"0 8px 32px rgba(0,0,0,0.08)",fontFamily:"Inter,sans-serif",border:n?"1px solid #1e293b":"1px solid #e2e8f0"},children:e.jsxs("div",{style:{display:"flex",flexDirection:window.innerWidth<480?"column":"row",minHeight:300},children:[e.jsxs("div",{style:{flex:1,background:n?"#0f172a":"#f8fafc",borderRight:n?"1px solid #1e293b":"1px solid #e2e8f0",padding:"16px"},children:[e.jsx("div",{style:{fontSize:11,fontWeight:700,color:n?"#64748b":"#94a3b8",textTransform:"uppercase",marginBottom:12,letterSpacing:"0.5px"},children:"Public Rooms"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:[{icon:"💻",name:"Web Dev",members:"1.2k",tag:"Trending",tagCol:"#ef4444",active:!0},{icon:"🎬",name:"Movies",members:"860",tag:"",tagCol:""},{icon:"📈",name:"Startups",members:"540",tag:"Active",tagCol:"#10b981"}].map((i,o)=>e.jsxs("div",{style:{background:i.active?n?"#1e293b":"#fff":"transparent",padding:"10px 12px",borderRadius:12,border:i.active?n?"1px solid #334155":"1px solid #e2e8f0":"1px solid transparent",boxShadow:i.active?n?"0 2px 8px rgba(0,0,0,0.2)":"0 2px 8px rgba(0,0,0,0.04)":"none",display:"flex",alignItems:"center",gap:10},children:[e.jsx("span",{style:{fontSize:18},children:i.icon}),e.jsxs("div",{style:{flex:1},children:[e.jsx("div",{style:{fontSize:13,fontWeight:700,color:n?"#f1f5f9":"#1e293b"},children:i.name}),e.jsxs("div",{style:{fontSize:11,color:n?"#94a3b8":"#64748b"},children:[i.members," members"]})]}),i.tag&&e.jsxs("span",{style:{fontSize:10,fontWeight:800,color:i.tagCol,background:i.tagCol+(n?"25":"15"),padding:"2px 6px",borderRadius:6},children:[i.tag==="Trending"?"🔥":"🟢"," ",i.tag]})]},o))})]}),e.jsxs("div",{style:{flex:1.2,display:"flex",flexDirection:"column",background:n?"#0b0f19":"#fff"},children:[e.jsxs("div",{style:{padding:"14px 16px",borderBottom:n?"1px solid #1e293b":"1px solid #f1f5f9",background:n?"#111827":"#fff",zIndex:1},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8},children:[e.jsx("div",{style:{fontSize:14,fontWeight:800,color:n?"#f8fafc":"#0f172a"},children:"💻 Web Dev Room"}),e.jsxs("div",{style:{background:n?"rgba(16,185,129,0.15)":"#f0fdf4",border:n?"1.5px solid rgba(16,185,129,0.35)":"1.5px solid #bbf7d0",borderRadius:20,padding:"3px 12px",fontSize:10.5,color:n?"#34d399":"#166534",fontWeight:800,display:"flex",alignItems:"center",gap:6},children:[e.jsx("span",{style:{width:6,height:6,borderRadius:"50%",background:"#10b981"}}),"Nickname Active"]})]}),e.jsxs("div",{style:{background:n?"rgba(59,130,246,0.12)":"linear-gradient(135deg, #eff6ff, #dbeafe)",border:n?"1.5px solid rgba(59,130,246,0.4)":"1.5px solid #3b82f6",borderRadius:10,padding:"8px 14px",display:"flex",alignItems:"center",gap:8,boxShadow:n?"0 2px 10px rgba(0,0,0,0.2)":"0 2px 10px rgba(59,130,246,0.1)"},children:[e.jsx("span",{style:{fontSize:14},children:"📌"}),e.jsx("span",{style:{fontSize:12.5,fontWeight:800,color:n?"#60a5fa":"#1d4ed8",letterSpacing:"0.2px"},children:"Topic: Learning React"})]})]}),e.jsx("div",{style:{flex:1,padding:"16px",display:"flex",flexDirection:"column",gap:10},children:[{nick:"ShadowCoder",text:"Best way to learn React?",col:"#6366f1"},{nick:"CodeNinja",text:"Start with small projects",col:"#ec4899"},{nick:"DevGhost",text:"Build and practice daily",col:"#10b981"}].map((i,o)=>e.jsxs("div",{style:{display:"flex",flexDirection:"column"},children:[e.jsx("span",{style:{fontSize:10,fontWeight:800,color:i.col,marginBottom:2,marginLeft:4},children:i.nick}),e.jsx("div",{style:{background:n?"#1e293b":"#f1f5f9",border:n?"1px solid #334155":"none",padding:"8px 12px",borderRadius:"2px 12px 12px 12px",fontSize:12.5,color:n?"#e2e8f0":"#334155",maxWidth:"90%"},children:i.text})]},o))}),e.jsx("div",{style:{padding:"10px 16px",background:n?"#0f172a":"#f8fafc",borderTop:n?"1px solid #1e293b":"1px solid #f1f5f9",fontSize:10,color:n?"#64748b":"#94a3b8",textAlign:"center"},children:"Your personal profile stays private"})]})]})}),W=({isDark:n})=>e.jsxs("div",{style:{background:n?"#111827":"#fff",borderRadius:16,overflow:"hidden",boxShadow:n?"0 12px 36px rgba(0,0,0,0.4)":"0 4px 20px rgba(0,0,0,0.08)",fontFamily:"Inter,sans-serif",border:n?"1px solid #1e293b":"none"},children:[e.jsxs("div",{style:{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",padding:"14px 16px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:800,fontSize:15},children:"📅 Events & Calendar"}),e.jsx("div",{style:{fontSize:11,opacity:.8},children:"May 2025"})]}),e.jsx("div",{style:{background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700},children:"3 upcoming"})]}),e.jsx("div",{style:{padding:12},children:[{day:"Mon 5",title:"Science Test",time:"10:00 AM",color:"#ef4444",tag:"Exam"},{day:"Wed 7",title:"Art Submission",time:"2:00 PM",color:"#f59e0b",tag:"Deadline"},{day:"Fri 9",title:"Math Revision",time:"4:00 PM",color:"#6366f1",tag:"Session"}].map((i,o)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:o<2?n?"1px solid #1e293b":"1px solid #f1f5f9":"none"},children:[e.jsx("div",{style:{background:i.color+(n?"25":"15"),color:i.color,borderRadius:10,padding:"6px 8px",textAlign:"center",minWidth:44,fontSize:11,fontWeight:700},children:i.day}),e.jsxs("div",{style:{flex:1},children:[e.jsx("div",{style:{fontWeight:700,fontSize:13,color:n?"#f1f5f9":"#1e293b"},children:i.title}),e.jsx("div",{style:{fontSize:11,color:n?"#94a3b8":"#64748b"},children:i.time})]}),e.jsx("div",{style:{background:i.color+(n?"25":"15"),color:i.color,borderRadius:20,padding:"2px 10px",fontSize:10,fontWeight:700},children:i.tag})]},o))})]}),l=({label:n,heading:i,sub:o,arrow:d,children:a,flip:r,isDark:t})=>e.jsxs("div",{className:`reveal section-layout ${r?"flip":""}`,children:[e.jsxs("div",{style:{flex:1,width:"100%"},children:[n&&e.jsx("div",{style:{display:"inline-block",background:t?"rgba(124, 58, 237, 0.2)":"#ede9fe",color:t?"#c084fc":"#7c3aed",border:t?"1px solid rgba(124, 58, 237, 0.35)":"none",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700,marginBottom:12,letterSpacing:"0.4px"},children:n}),e.jsxs("h2",{style:{fontSize:"clamp(26px,5vw,36px)",fontWeight:800,color:t?"#f8fafc":"#0f172a",margin:"0 0 16px",lineHeight:1.15},children:[i,d&&e.jsx("div",{style:{fontSize:"clamp(22px,4vw,28px)",color:t?"#818cf8":"#6366f1",marginTop:8,fontWeight:700},children:d})]}),e.jsx("p",{style:{fontSize:16,color:t?"#94a3b8":"#64748b",lineHeight:1.65,margin:0},children:o})]}),e.jsx("div",{style:{flex:1.15,width:"100%"},children:a})]});function A(){j();const n=u(),{deferredPrompt:i,installApp:o,isInstalled:d}=y(),{theme:a,setTheme:r}=v();f.useEffect(()=>{if(typeof window>"u"||!window.matchMedia)return;if(!localStorage.getItem("theme-manual-override")){const s=window.matchMedia("(prefers-color-scheme: light)").matches;r(s?"light":"dark")}},[r]),f.useEffect(()=>{if(typeof window>"u"||!window.matchMedia)return;const c=window.matchMedia("(prefers-color-scheme: light)"),s=m=>{localStorage.getItem("theme-manual-override")||r(m.matches?"light":"dark")};return c.addEventListener("change",s),()=>c.removeEventListener("change",s)},[r]);const t=a!=="light",g=()=>{localStorage.setItem("theme-manual-override","true"),r(t?"light":"dark")},h=()=>n("/signin"),b=async()=>{i&&!d&&await o(),n("/signin")};return e.jsxs("div",{style:{height:"100dvh",overflowY:"auto",background:t?"#090d16":"#f8fafc",fontFamily:"'Inter','Segoe UI',sans-serif",color:t?"#f8fafc":"#0f172a",transition:"background-color 0.25s ease, color 0.25s ease"},children:[e.jsx("style",{children:`
        .reveal { opacity:0; transform:translateY(32px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .revealed { opacity:1 !important; transform:translateY(0) !important; }
        .btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:14px; padding:14px 28px; font-size:15px; font-weight:700; cursor:pointer; box-shadow:0 4px 18px rgba(99,102,241,0.4); transition:transform .15s,box-shadow .15s; }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(99,102,241,0.45); }
        .btn-secondary { background:${t?"rgba(255,255,255,0.08)":"#fff"}; color:${t?"#f1f5f9":"#374151"}; border:1.5px solid ${t?"rgba(255,255,255,0.15)":"#e2e8f0"}; border-radius:14px; padding:14px 28px; font-size:15px; font-weight:600; cursor:pointer; transition:background .15s; }
        .btn-secondary:hover { background:${t?"rgba(255,255,255,0.15)":"#f1f5f9"}; }
        .lp-divider { display:flex; align-items:center; gap:16px; color:${t?"#64748b":"#94a3b8"}; font-size:13px; font-weight:600; }
        .lp-divider::before,.lp-divider::after { content:''; flex:1; height:1px; background:${t?"rgba(255,255,255,0.1)":"#e2e8f0"}; }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
          60% { transform: translateY(-3px); }
        }
        .section-layout {
          display: flex;
          flex-direction: column;
          gap: 40px;
          max-width: 500px;
          margin: 0 auto;
          width: 100%;
        }
        @media (min-width: 900px) {
          .section-layout {
            flex-direction: row;
            max-width: 1080px;
            align-items: center;
            gap: 80px;
            text-align: left;
          }
          .section-layout.flip {
            flex-direction: row-reverse;
          }
        }
        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: ${t?"rgba(9, 13, 22, 0.85)":"rgba(248, 250, 252, 0.85)"};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid ${t?"rgba(255, 255, 255, 0.08)":"#e2e8f0"};
          padding: 14px 24px;
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-sizing: border-box;
          width: 100%;
          transition: background-color 0.25s ease, border-color 0.25s ease;
        }
        .landing-nav-logo {
          font-size: 20px;
          font-weight: 800;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
          flex-shrink: 0;
          user-select: none;
        }
        .hero-gradient-text {
          background: linear-gradient(135deg, #6366f1, #a78bfa);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
          display: inline;
        }
        .hero-gradient-text.dark {
          background: linear-gradient(135deg, #818cf8, #c084fc);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
        }
        .landing-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          flex-wrap: nowrap;
        }
        .landing-nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 12px;
          padding: 8px 16px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s ease;
          text-decoration: none;
        }
        .landing-nav-theme {
          background: ${t?"rgba(255, 255, 255, 0.08)":"#ffffff"};
          color: ${t?"#e2e8f0":"#374151"};
          border: 1.5px solid ${t?"rgba(255, 255, 255, 0.15)":"#e2e8f0"};
          padding: 8px 12px;
        }
        .landing-nav-theme:hover {
          background: ${t?"rgba(255, 255, 255, 0.16)":"#f1f5f9"};
          transform: translateY(-1px);
        }
        .landing-nav-download {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #ffffff;
          border: none;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.25);
        }
        .landing-nav-download:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
        }
        .landing-nav-login {
          background: ${t?"rgba(255, 255, 255, 0.06)":"#ffffff"};
          color: ${t?"#e2e8f0":"#374151"};
          border: 1.5px solid ${t?"rgba(255, 255, 255, 0.14)":"#e2e8f0"};
        }
        .landing-nav-login:hover {
          background: ${t?"rgba(255, 255, 255, 0.12)":"#f1f5f9"};
        }
        @media (max-width: 640px) {
          .landing-nav {
            padding: 14px 18px;
            min-height: 64px;
            gap: 10px;
          }
          .landing-nav-logo {
            font-size: 20px;
          }
          .landing-nav-actions {
            gap: 8px;
          }
          .theme-btn-label,
          .download-btn-label {
            display: none !important;
          }
          .landing-nav-theme,
          .landing-nav-download {
            padding: 0;
            width: 38px;
            height: 38px;
            min-width: 38px;
            border-radius: 12px;
            box-sizing: border-box;
          }
          .landing-nav-login {
            height: 38px;
            padding: 0 16px;
            font-size: 13.5px;
            border-radius: 12px;
            box-sizing: border-box;
          }
        }
        @media (max-width: 380px) {
          .landing-nav {
            padding: 12px 14px;
            min-height: 58px;
            gap: 8px;
          }
          .landing-nav-logo {
            font-size: 18px;
          }
          .landing-nav-actions {
            gap: 6px;
          }
          .landing-nav-theme,
          .landing-nav-download {
            width: 35px;
            height: 35px;
            min-width: 35px;
            border-radius: 10px;
          }
          .landing-nav-login {
            height: 35px;
            padding: 0 13px;
            font-size: 12.5px;
            border-radius: 10px;
          }
        }
        @media (max-width: 330px) {
          .landing-nav {
            padding: 10px 10px;
            min-height: 54px;
            gap: 6px;
          }
          .landing-nav-logo {
            font-size: 17px;
          }
          .landing-nav-actions {
            gap: 5px;
          }
          .landing-nav-theme,
          .landing-nav-download {
            width: 32px;
            height: 32px;
            min-width: 32px;
            border-radius: 8px;
          }
          .landing-nav-login {
            height: 32px;
            padding: 0 10px;
            font-size: 11.5px;
            border-radius: 8px;
          }
        }
      `}),e.jsxs("nav",{className:"landing-nav",children:[e.jsx("span",{className:"landing-nav-logo",children:"LetsChat"}),e.jsxs("div",{className:"landing-nav-actions",children:[e.jsx("button",{onClick:g,className:"landing-nav-btn landing-nav-theme",title:t?"Switch to white/light theme":"Switch to dark theme","aria-label":t?"Switch to light theme":"Switch to dark theme",children:t?e.jsxs(e.Fragment,{children:[e.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.3",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("circle",{cx:"12",cy:"12",r:"5"}),e.jsx("line",{x1:"12",y1:"1",x2:"12",y2:"3"}),e.jsx("line",{x1:"12",y1:"21",x2:"12",y2:"23"}),e.jsx("line",{x1:"4.22",y1:"4.22",x2:"5.64",y2:"5.64"}),e.jsx("line",{x1:"18.36",y1:"18.36",x2:"19.78",y2:"19.78"}),e.jsx("line",{x1:"1",y1:"12",x2:"3",y2:"12"}),e.jsx("line",{x1:"21",y1:"12",x2:"23",y2:"12"}),e.jsx("line",{x1:"4.22",y1:"19.78",x2:"5.64",y2:"18.36"}),e.jsx("line",{x1:"18.36",y1:"5.64",x2:"19.78",y2:"4.22"})]}),e.jsx("span",{className:"theme-btn-label",children:"Light"})]}):e.jsxs(e.Fragment,{children:[e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.3",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("path",{d:"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"})}),e.jsx("span",{className:"theme-btn-label",children:"Dark"})]})}),e.jsxs("button",{onClick:b,className:"landing-nav-btn landing-nav-download",title:"Download LetsChat",children:[e.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),e.jsx("polyline",{points:"7 10 12 15 17 10"}),e.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]}),e.jsx("span",{className:"download-btn-label",children:"Download"})]}),e.jsx("button",{onClick:()=>n("/login"),className:"landing-nav-btn landing-nav-login",title:"Log in to LetsChat",children:"Log in"})]})]}),e.jsxs("section",{style:{padding:"72px 24px 24px",textAlign:"center",maxWidth:600,margin:"0 auto"},children:[e.jsx("div",{style:{display:"inline-block",background:t?"rgba(99, 102, 241, 0.15)":"linear-gradient(135deg,#ede9fe,#ddd6fe)",border:t?"1px solid rgba(99, 102, 241, 0.35)":"none",color:t?"#a78bfa":"#6d28d9",borderRadius:100,padding:"6px 18px",fontSize:12,fontWeight:700,marginBottom:24,letterSpacing:"0.5px"},children:"✦ CLOSED BETA"}),e.jsxs("h1",{style:{fontSize:"clamp(32px,8vw,56px)",fontWeight:800,lineHeight:1.1,marginBottom:18,color:t?"#f8fafc":"#0f172a"},children:["Chat without",e.jsx("br",{}),e.jsx("span",{className:`hero-gradient-text ${t?"dark":""}`,children:"the chaos."})]}),e.jsxs("p",{style:{fontSize:16,color:t?"#94a3b8":"#64748b",lineHeight:1.65,marginBottom:12,maxWidth:440,margin:"0 auto"},children:["Give every conversation its own place.",e.jsx("br",{}),"Organized spaces, focused rooms, and a built-in calendar — designed for communities that do more than just chat."]}),e.jsxs("div",{style:{marginTop:32,display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:t?"#64748b":"#94a3b8",animation:"bounce 2s infinite"},children:[e.jsx("span",{style:{fontSize:11,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase"},children:"Scroll to explore"}),e.jsx("span",{style:{fontSize:18},children:"↓"})]})]}),e.jsxs("div",{style:{padding:"40px 24px",display:"flex",flexDirection:"column",gap:64},children:[e.jsx("div",{className:"lp-divider reveal",children:"BEFORE"}),e.jsx(l,{label:"The Problem",heading:"From messy group chats",sub:"Homework, birthday wishes, memes, and announcements — all in one thread. Important messages disappear in days.",isDark:t,children:e.jsx(S,{isDark:t})}),e.jsx("div",{className:"reveal",style:{textAlign:"center"},children:e.jsxs("div",{style:{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:6},children:[e.jsx("div",{style:{width:2,height:20,background:t?"linear-gradient(#1e293b,#6366f1)":"linear-gradient(#e2e8f0,#6366f1)"}}),e.jsx("div",{style:{background:"#6366f1",color:"#fff",borderRadius:50,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 4px 14px rgba(99,102,241,0.4)"},children:"↓"}),e.jsx("div",{style:{fontWeight:700,color:t?"#818cf8":"#6366f1",fontSize:13},children:"LetsChat"})]})}),e.jsx("div",{className:"lp-divider reveal",children:"AFTER"}),e.jsx(l,{label:"The Solution",heading:"To organized spaces",sub:"Split conversations by subject. Homework goes in Homework. Doubts stay in Doubts. Nothing gets buried.",flip:!0,isDark:t,children:e.jsx(w,{isDark:t})}),e.jsx("div",{className:"lp-divider reveal",children:"CLASSROOMS"}),e.jsx(l,{label:"Classroom",heading:"A real classroom, not just a group",sub:"Assignments, materials, and announcements — organized like a classroom, with real-time discussion built in.",isDark:t,children:e.jsx(z,{isDark:t})}),e.jsx("div",{className:"lp-divider reveal",children:"PUBLIC ROOMS"}),e.jsx(l,{label:"Privacy First",heading:"Public discussions, without the chaos",sub:"Join topic-based rooms, explore ideas, and participate using a separate nickname—keeping your personal identity private.",arrow:"Explore freely. Discuss clearly.",flip:!0,isDark:t,children:e.jsx(k,{isDark:t})}),e.jsx("div",{className:"lp-divider reveal",children:"EVENTS & CALENDAR"}),e.jsx(l,{label:"Never miss anything",heading:"From missed updates",sub:"Track exams, deadlines, and sessions in a built-in calendar shared across your groups.",arrow:"→ to tracked events",isDark:t,children:e.jsx(W,{isDark:t})}),e.jsxs("div",{className:"reveal",style:{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:24,padding:"48px 28px",textAlign:"center",marginBottom:0,boxShadow:t?"0 16px 48px rgba(99,102,241,0.3)":"0 12px 36px rgba(99,102,241,0.2)"},children:[e.jsx("div",{style:{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.7)",letterSpacing:"0.5px",marginBottom:12},children:"✦ CLOSED BETA"}),e.jsx("h2",{style:{fontSize:"clamp(22px,5vw,34px)",fontWeight:800,color:"#fff",margin:"0 0 12px"},children:"Ready to get organized?"}),e.jsx("p",{style:{color:"rgba(255,255,255,0.8)",fontSize:15,marginBottom:28},children:"Join now and experience structured communication."}),e.jsxs("div",{style:{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"},children:[e.jsx("button",{onClick:h,style:{background:"#fff",color:"#6366f1",border:"none",borderRadius:14,padding:"14px 28px",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 20px rgba(0,0,0,0.15)"},children:"Get Started →"}),e.jsx("button",{onClick:()=>{i&&!d&&o(),n("/signin")},style:{background:"rgba(255,255,255,0.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,0.3)",borderRadius:14,padding:"14px 28px",fontSize:15,fontWeight:600,cursor:"pointer"},children:"Download LetsChat"})]})]}),e.jsxs("footer",{style:{textAlign:"center",padding:"24px 0 40px",color:t?"#64748b":"#94a3b8",fontSize:13},children:["© ",new Date().getFullYear()," LetsChat  · ",e.jsx("span",{onClick:()=>n("/login"),style:{cursor:"pointer",color:t?"#818cf8":"#6366f1",fontWeight:600,textDecoration:"none"},children:"Already have an account?"})]})]})]})}export{A as default};
