// Turns the election sheet (CSV) into merged calendar events.
function parseCSV(text){
  const rows=[]; let row=[], f="", q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=ch; }
    else if(ch==='"') q=true;
    else if(ch===','){ row.push(f); f=""; }
    else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=""; }
    else f+=ch;
  }
  if(f!==""||row.length){ row.push(f); rows.push(row); }
  return rows;
}
const MONTHS=["january","february","march","april","may","june","july","august","september","october","november","december"];
function parseDate(s){
  s=(s||"").trim(); let m;
  if((m=s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/))){ const mo=MONTHS.findIndex(x=>x.startsWith(m[2].toLowerCase().slice(0,3))); if(mo>=0) return new Date(+m[3],mo,+m[1]); }
  if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return new Date(+m[1],+m[2]-1,+m[3]);
  if((m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/))) return new Date(+m[3],+m[2]-1,+m[1]); // day first
  return null;
}
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const clean=s=>(s||"").replace(/\s+/g," ").trim();
function seqLabel(q){
  q=q.toLowerCase(); const out=[]; let m;
  if((m=q.match(/(first|second|third|fourth) round/))) out.push("Round "+(["first","second","third","fourth"].indexOf(m[1])+1)+(q.includes("potential")?" if needed":""));
  if((m=q.match(/(first|second) day/))) out.push("day "+(m[1]==="first"?"1":"2"));
  if(q.includes("multi-round")) out.push("session");
  return out.join(", ");
}
function buildEvents(table){
  const head=table[0].map(h=>clean(h).toLowerCase());
  const col=name=>head.findIndex(h=>h.includes(name));
  const C={c:col("country"),s:col("specification"),t:col("type"),m:col("mode"),q:col("sequence"),d:col("date)")>=0?col("date)"):col("date"),ok:col("status"),n:col("comment")};
  const rows=[];
  for(const r of table.slice(1)){
    const d=parseDate(r[C.d]); if(!d||!clean(r[C.c])) continue;
    rows.push({c:clean(r[C.c]),s:clean(r[C.s]),t:clean(r[C.t]),m:clean(r[C.m]),q:clean(r[C.q]),d,ok:clean(r[C.ok])==="Confirmed",n:clean(r[C.n])});
  }
  // 1. join rounds and voting days of one contest
  const by=new Map();
  rows.forEach(x=>{const k=[x.c,x.s,x.t,x.m,x.n].join("|"); if(!by.has(k)) by.set(k,[]); by.get(k).push(x);});
  const contests=[];
  for(const lst of by.values()){
    lst.sort((a,b)=>a.d-b.d); let cur=null;
    for(const x of lst){
      const multi=x.q!=="single vote";
      if(cur && (x.d-cur.last)/864e5<=45 && multi && cur.multi) cur.rows.push(x);
      else { cur={x,rows:[x],multi}; contests.push(cur); }
      cur.last=x.d;
    }
  }
  contests.forEach(c=>{
    const seen=new Map();
    c.rows.forEach(x=>{const l=seqLabel(x.q),k=iso(x.d)+"|"+l; if(seen.has(k)) seen.get(k).ok&&=x.ok; else seen.set(k,{d:iso(x.d),l,ok:x.ok});});
    c.P=[...seen.values()];
  });
  // 2. join same-day contests of one type in one country
  const g=new Map();
  contests.forEach(c=>{const x=c.x; const k=[x.c,x.t,x.m,x.n,c.P.map(p=>p.d+p.l).join(","),x.s===""].join("|"); if(!g.has(k)) g.set(k,[]); g.get(k).push(c);});
  const events=[];
  for(const lst of g.values()){
    const x=lst[0].x, specs=[];
    lst.forEach(c=>{ if(c.x.s && !specs.some(z=>z.n===c.x.s)) specs.push({n:c.x.s,ok:c.P.every(p=>p.ok)}); });
    const P=lst[0].P.map(p=>({d:p.d,l:p.l,ok:lst.every(c=>c.P.filter(q=>q.d===p.d&&q.l===p.l).every(q=>q.ok))}));
    const merged=[];
    P.forEach(p=>{ const base=p.l.replace(/,? ?day \d/,""); const last=merged[merged.length-1];
      if(last && last.l===base && /day/.test(p.l)){ last.e=p.d; last.ok=last.ok&&p.ok; } else merged.push({d:p.d,l:base,ok:p.ok}); });
    const e={c:x.c,t:x.t,p:merged.map(p=>{const o={d:p.d}; if(p.e) o.e=p.e; if(p.l) o.l=p.l; if(!p.ok) o.ok=0; return o;})};
    if(specs.length) e.s=specs.map(z=>z.ok?{n:z.n}:{n:z.n,ok:0});
    if(x.m==="indirect") e.i=1;
    if(x.n==="Not Free/Fair") e.f=1;
    if(x.n==="Impact on European Council") e.u=1;
    events.push(e);
  }
  events.sort((a,b)=>a.p[0].d<b.p[0].d?-1:a.p[0].d>b.p[0].d?1:a.c.localeCompare(b.c));
  return events;
}
export { parseCSV, buildEvents };
