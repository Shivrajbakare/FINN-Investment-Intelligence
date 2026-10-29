import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link, useParams } from 'wouter';
import { useHealthCheck, getHealthCheckQueryKey } from '@workspace/api-client-react';
import { Activity, Archive, ArrowDown, ArrowUp, ArrowUpRight, Bell, Bookmark, BookmarkCheck, BriefcaseBusiness, Building2, Check, ChevronDown, CircleAlert, FileText, Filter, Gauge, Info, Menu, Search, Settings as SettingsIcon, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';

const queryClient = new QueryClient();
type Holding = { symbol:string; company:string; sector:string; shares:number; price:number; dailyChangePct:number; alertSeverity:'watch'|'normal'|'elevated'; sparkline:number[] };
type Announcement = { id:string; symbol:string; company:string; category:string; priority:string; publishedAt:string; summary:string; implication:string; sourceTitle:string; sourceUrl:string; isRead:boolean; isSaved:boolean };
type Settings = { decline:number; rise:number; email:boolean; inApp:boolean; dailyBrief:boolean; showSparklines:boolean; archivedSources:boolean; citations:boolean };
const defaultSettings:Settings={decline:5,rise:8,email:false,inApp:true,dailyBrief:true,showSparklines:true,archivedSources:true,citations:true};

const holdings: Holding[] = [
 {symbol:'INFY',company:'Infosys Limited',sector:'Information Technology',shares:18400,price:1482.65,dailyChangePct:1.24,alertSeverity:'normal',sparkline:[26,31,28,34,32,38,36,42,40,47,45,52]},
 {symbol:'MSFT',company:'Microsoft Corporation',sector:'Software',shares:7200,price:418.72,dailyChangePct:-0.63,alertSeverity:'watch',sparkline:[48,45,49,43,46,41,44,38,42,37,40,36]},
 {symbol:'NVDA',company:'NVIDIA Corporation',sector:'Semiconductors',shares:5100,price:121.37,dailyChangePct:2.18,alertSeverity:'elevated',sparkline:[30,27,34,32,40,36,43,39,48,44,53,58]},
 {symbol:'JPM',company:'JPMorgan Chase & Co.',sector:'Financials',shares:3900,price:205.44,dailyChangePct:0.38,alertSeverity:'normal',sparkline:[43,41,45,40,44,42,46,44,49,45,48,50]},
 {symbol:'AMZN',company:'Amazon.com, Inc.',sector:'Consumer Discretionary',shares:6400,price:186.92,dailyChangePct:-1.14,alertSeverity:'watch',sparkline:[52,54,49,51,45,48,42,46,40,43,37,35]},
 {symbol:'LLY',company:'Eli Lilly and Company',sector:'Health Care',shares:1150,price:795.1,dailyChangePct:0.91,alertSeverity:'normal',sparkline:[35,37,36,40,39,44,42,46,45,49,47,52]},
];
const documents = {
 q4: {id:'infy-q4-fy25',title:'Q4 FY25 earnings-call transcript',period:'Q4 FY25 · 17 Apr 2025',date:'17 Apr 2025',url:'https://www.infosys.com/investors/reports-filings/quarterly-results/2024-2025/q4/documents/transcripts/earningscall.pdf'},
 q1: {id:'infy-q1-fy26',title:'Q1 FY26 earnings-call transcript',period:'Q1 FY26 · 23 Jul 2025',date:'23 Jul 2025',url:'https://www.infosys.com/investors/reports-filings/quarterly-results/2025-2026/q1/documents/transcripts/earningscall.pdf'},
 results: {id:'infy-q1-results',title:'Audited Q1 FY26 financial results',period:'Quarter ended 30 Jun 2025',date:'23 Jul 2025',url:'https://www.infosys.com/investors/reports-filings/quarterly-results/2025-2026/q1/documents/q1-fy26-financial-results-auditorsreports.pdf'}
};
const trendData = {
 '1W':[32,34,31,37,35,40,38], '1M':[24,27,25,30,33,29,36,34,39,42,38,45], '3M':[19,23,21,27,25,31,35,32,38,36,43,47,44,53,49,57], '1Y':[20,25,23,28,31,29,34,38,35,42,45,43,50,47,55,58]
};
const storage = <T,>(key:string, fallback:T):T => { try { const val=localStorage.getItem(key); return val ? JSON.parse(val) as T : fallback; } catch { return fallback; } };
function persist(key:string,value:unknown) { try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* local storage may be unavailable */ } }
const money=(n:number)=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const moneyShort=(n:number)=>'$'+(n/1000000).toFixed(2)+'M';

function Shell({children}:{children:ReactNode}) {
 const [path]=useLocation(); const [open,setOpen]=useState(false);
 const health=useHealthCheck({query:{queryKey:getHealthCheckQueryKey(),refetchInterval:60000}});
 const nav=[['/','Portfolio',BriefcaseBusiness],['/intelligence','Intelligence',Activity],['/research','Research',FileText],['/companies/INFY','Companies',Building2],['/settings','Settings',SettingsIcon]] as const;
 const name=nav.find(([href])=>href===path)?.[1] ?? (path.startsWith('/companies/')?'Company':'Workspace');
 return <div className="app-shell"><div className={`menu-overlay ${open?'show':''}`} onClick={()=>setOpen(false)} aria-label="Close navigation" />
  <aside className={`sidebar ${open?'open':''}`}><Link href="/" className="brand" onClick={()=>setOpen(false)}><span className="brand-mark">F</span> FINN</Link>
   <div className="nav-label">Workspace</div><nav className="nav-list" aria-label="Primary navigation">{nav.map(([href,label,Icon])=><Link key={href} href={href} className={`nav-link ${path===href||(label==='Companies'&&path.startsWith('/companies/'))?'active':''}`} onClick={()=>setOpen(false)} data-testid={`nav-${label.toLowerCase()}`}><Icon aria-hidden="true"/><span>{label}</span></Link>)}</nav>
   <div className="side-foot"><div><span className="health-dot" style={{background:health.isError?'#cb766b':health.isLoading?'#c4a76d':'#73b49e'}} />Backend {health.isLoading?'checking':health.isError?'unavailable':health.data?.status??'connected'}</div><div style={{marginTop:5}}>Market data · not connected</div></div>
  </aside>
  <div className="main-area"><header className="topbar"><div style={{display:'flex',alignItems:'center',gap:12}}><button className="mobile-menu" aria-label="Open navigation" onClick={()=>setOpen(true)} data-testid="button-open-navigation"><Menu size={19}/></button><span className="crumb">FINN / {name}</span></div><div className="top-right"><span className="top-data-label">Research workspace</span><span className="tag"><ShieldCheck size={12}/> DEMO ENVIRONMENT</span></div></header><main className="workspace">{children}</main></div>
 </div>;
}
function Heading({eyebrow,title,subtitle,right}:{eyebrow:string;title:string;subtitle:string;right?:ReactNode}) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{right}</div>; }
function StatusBanner({children}:{children:ReactNode}) { return <div className="status-banner"><Info size={16}/><div>{children}</div></div>; }
function Panel({title,caption,children,tools,className=''}:{title:string;caption?:string;children:ReactNode;tools?:ReactNode;className?:string}) { return <section className={`panel ${className}`}><div className="panel-head"><div><h2 className="panel-title">{title}</h2>{caption&&<div className="panel-caption">{caption}</div>}</div>{tools}</div>{children}</section>; }

function Portfolio() {
 const displaySettings=storage('finn-settings',defaultSettings);
 const [range,setRange]=useState<keyof typeof trendData>('3M');
 const [filter,setFilter]=useState(()=>storage('finn-holding-filter','All'));
 const [companyQuery,setCompanyQuery]=useState('');
 const [severityFilter,setSeverityFilter]=useState('All');
 const [sort,setSort]=useState<{key:keyof Holding;dir:'asc'|'desc'}>({key:'dailyChangePct',dir:'desc'});
 const rows=useMemo(()=>holdings.filter(h=>(filter==='All'||h.sector===filter)&&(!companyQuery||h.company.toLowerCase().includes(companyQuery.toLowerCase())||h.symbol.toLowerCase().includes(companyQuery.toLowerCase()))&&(severityFilter==='All'||h.alertSeverity===severityFilter)).sort((a,b)=>{const av=a[sort.key],bv=b[sort.key];return (av>bv?1:av<bv?-1:0)*(sort.dir==='asc'?1:-1)}),[filter,companyQuery,severityFilter,sort]);
 const attentionRows=holdings.filter(h=>h.dailyChangePct<=-displaySettings.decline||h.dailyChangePct>=displaySettings.rise);
 const total=holdings.reduce((s,h)=>s+h.shares*h.price,0);
 const toggleSort=(key:keyof Holding)=>setSort(s=>({key,dir:s.key===key&&s.dir==='desc'?'asc':'desc'}));
 const chartValues=trendData[range].map((v,i)=>({label:`${i+1}`,value:v+(range==='3M'?5:0)}));
 return <><Heading eyebrow="Portfolio overview / Demo figures" title="Portfolio" subtitle="A working view of the book, with data provenance kept in plain sight." right={<span className="date-label">AS OF DEMO SNAPSHOT · NOT LIVE</span>}/>
  <StatusBanner><strong>Synthetic portfolio data.</strong> Holdings, prices, daily changes and chart values are illustrative only—not live, verified, or investment advice. Market data is not connected.</StatusBanner>
  <div className="grid overview-metrics">
   {[['Illustrative value',moneyShort(total),'Synthetic snapshot'],['Positions',String(holdings.length),'Across 6 sectors'],['Largest position','INFY · 19.3%','Illustrative weight'],['Data status','Not live','No provider connected']].map(([l,v,n])=><div className="panel metric" key={l}><div className="metric-label">{l}</div><div className="metric-value">{v}</div><div className="metric-note">{n}</div></div>)}
  </div>
  <div className="grid portfolio-layout">
    {displaySettings.showSparklines&&<Panel title="Illustrative portfolio trend" caption="Indexed demo series · not an account valuation" tools={<div className="segmented" aria-label="Chart range">{(['1W','1M','3M','1Y'] as const).map(r=><button key={r} className={range===r?'selected':''} onClick={()=>setRange(r)} data-testid={`button-range-${r.toLowerCase()}`}>{r}</button>)}</div>}>
    <div className="panel-body"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartValues} margin={{top:8,right:5,left:-20,bottom:0}}><defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b9c86" stopOpacity={.2}/><stop offset="95%" stopColor="#5b9c86" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ece8df" vertical={false}/><XAxis dataKey="label" tick={{fontSize:9,fill:'#8a929d'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:'#8a929d'}} axisLine={false} tickLine={false}/><ChartTooltip contentStyle={{border:'1px solid #ded9ce',borderRadius:3,fontSize:11,background:'#fbfaf6'}}/><Area type="monotone" dataKey="value" stroke="#4d927d" strokeWidth={2} fill="url(#areaFill)" isAnimationActive={false}/></AreaChart></ResponsiveContainer></div><div style={{fontSize:10,color:'#828b96',marginTop:4}}>Illustrative index points only · selecting a period changes the demo series.</div></div>
    </Panel>}
    <Panel title="Desk notes" caption="Context for this synthetic view"><div className="panel-body">
    <div className="brief-fact"><span className="fact-index">01</span><span>Portfolio rows are sample holdings for demonstrating filters and navigation.</span></div>
    <div className="brief-fact"><span className="fact-index">02</span><span>Price × shares is arithmetic on synthetic inputs; the total has no real portfolio meaning.</span></div>
    <div className="brief-fact"><span className="fact-index">03</span><span>Only archived Infosys documents are source-verified in this workspace.</span></div>
    <Link className="btn" href="/research" style={{marginTop:13}}>Review archived research <ArrowUpRight size={14}/></Link>
   </div></Panel>
   </div>
   {displaySettings.inApp&&<Panel title="Needs Attention" caption="Threshold-matched demo signals · not live alerts"><div className="panel-body">{attentionRows.length?attentionRows.map(h=><div className="setting-row" key={h.symbol} data-testid={`attention-${h.symbol}`}><span><Link href={`/companies/${h.symbol}`} className="company-link">{h.company} · {h.symbol}</Link><small>Illustrative move meets the saved threshold; confirm against a connected market source.</small></span><span className={`mono ${h.dailyChangePct>=0?'up':'down'}`}>{h.dailyChangePct>0?'+':''}{h.dailyChangePct.toFixed(2)}%</span></div>):<div className="quiet-empty"><strong>No demo positions meet your thresholds</strong>Adjust the saved alert thresholds to change this illustrative view. Live alerts are unavailable without a market-data provider.</div>}</div></Panel>}
   <div style={{height:16}}/>
   <Panel title="Holdings" caption={`${rows.length} of ${holdings.length} synthetic positions`} tools={<div className="filters"><Filter size={14} color="#7b8793"/><input type="search" placeholder="Company or ticker" aria-label="Filter holdings by company" value={companyQuery} onChange={e=>setCompanyQuery(e.target.value)} data-testid="input-holdings-company"/><select aria-label="Filter holdings by alert severity" value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)} data-testid="select-holdings-severity"><option>All</option><option value="elevated">Elevated</option><option value="watch">Watch</option><option value="normal">Normal</option></select><select aria-label="Filter holdings by sector" value={filter} onChange={e=>{setFilter(e.target.value);persist('finn-holding-filter',e.target.value)}} data-testid="select-holdings-sector"><option>All</option>{Array.from(new Set(holdings.map(h=>h.sector))).map(s=><option key={s}>{s}</option>)}</select></div>}>
   <div className="table-scroll"><table className="holdings-table"><thead><tr><th><button onClick={()=>toggleSort('symbol')} data-testid="sort-holdings-symbol">Company <ChevronDown size={11}/></button></th><th>Sector</th><th><button onClick={()=>toggleSort('shares')} data-testid="sort-holdings-shares">Shares <ChevronDown size={11}/></button></th><th><button onClick={()=>toggleSort('price')} data-testid="sort-holdings-price">Price <ChevronDown size={11}/></button></th><th><button onClick={()=>toggleSort('dailyChangePct')} data-testid="sort-holdings-change">Day change <ChevronDown size={11}/></button></th><th>Alert</th></tr></thead><tbody>{rows.map(h=><tr key={h.symbol} data-testid={`row-holding-${h.symbol}`}><td><Link href={`/companies/${h.symbol}`} className="company-link"><span className="ticker">{h.symbol}</span><span style={{marginLeft:9,color:'#647182'}}>{h.company}</span></Link></td><td>{h.sector}</td><td className="mono">{h.shares.toLocaleString()}</td><td className="mono">{money(h.price)}</td><td className={`mono ${h.dailyChangePct>=0?'up':'down'}`}>{h.dailyChangePct>0?'+':''}{h.dailyChangePct.toFixed(2)}%</td><td><span className="tag">{h.alertSeverity}</span></td></tr>)}</tbody></table>{rows.length===0&&<div className="quiet-empty"><strong>No holdings in this sector</strong>Choose another sector filter.</div>}</div>
  </Panel>
 </>;
}

const archiveItems:Announcement[]=[
 {id:'arch-q4',symbol:'INFY',company:'Infosys Limited',category:'Earnings',priority:'Archived',publishedAt:'17 Apr 2025',summary:'Q4 FY25 earnings-call transcript: management provided FY26 revenue growth guidance of 0%–3% in constant-currency terms and operating-margin guidance of 20%–22%.',implication:'Historical management guidance only. It is not a current company event or updated outlook.',sourceTitle:documents.q4.title,sourceUrl:documents.q4.url,isRead:false,isSaved:false},
 {id:'arch-q1',symbol:'INFY',company:'Infosys Limited',category:'Business update',priority:'Archived',publishedAt:'23 Jul 2025',summary:'Q1 FY26 earnings-call transcript: FY26 revenue guidance was revised to 1%–3% constant currency; margin outlook remained 20%–22%.',implication:'The July transcript supersedes the earlier revenue guidance for this selected reporting period.',sourceTitle:documents.q1.title,sourceUrl:documents.q1.url,isRead:false,isSaved:false}
];
function Intelligence() {
 const [filterCompany,setCompany]=useState('All'); const [category,setCategory]=useState('All'); const [priority,setPriority]=useState('All');const [window,setWindow]=useState('All archive');
 const displaySettings=storage('finn-settings',defaultSettings);
 const [read,setRead]=useState<Record<string,boolean>>(()=>storage('finn-announcement-read',{}));const [saved,setSaved]=useState<Record<string,boolean>>(()=>storage('finn-announcement-saved',{}));
 const items=displaySettings.archivedSources&&window==='All archive'?archiveItems.filter(a=>(filterCompany==='All'||filterCompany===a.symbol)&&(category==='All'||category===a.category)&&(priority==='All'||priority===a.priority)):[];
 const changeRead=(id:string)=>setRead(v=>{const n={...v,[id]:!v[id]};persist('finn-announcement-read',n);return n});
 const changeSaved=(id:string)=>setSaved(v=>{const n={...v,[id]:!v[id]};persist('finn-announcement-saved',n);return n});
 return <><Heading eyebrow="Intelligence / Event monitoring" title="Intelligence" subtitle="Prioritised company events when connected; historical source archive available below." right={<span className="tag archived"><Archive size={12}/> ARCHIVE ONLY</span>}/>
  <StatusBanner><strong>No live events feed.</strong> There is no connected market-data or announcements provider. Current company events are unavailable; this archive contains historical Infosys disclosures only.</StatusBanner>
   {displaySettings.dailyBrief&&displaySettings.archivedSources&&<div className="grid brief-grid">
   <Panel title="Daily brief" caption="Source-separated facts and analyst interpretation · archived only"><div className="panel-body">
    <div className="eyebrow">Reported fact · 23 Jul 2025</div><div className="brief-fact"><span className="fact-index">R</span><span>Infosys revised FY26 revenue growth guidance to 1%–3% in constant-currency terms; operating-margin outlook remained 20%–22%.</span></div>
    <div className="eyebrow" style={{marginTop:15}}>Interpretation · not company guidance</div><div className="brief-fact"><span className="fact-index">I</span><span>The revised range is historical management guidance from the Q1 FY26 call. It should not be presented as a current forecast.</span></div>
    <a className="source-link" href={documents.q1.url} target="_blank" rel="noreferrer">Open cited transcript <ArrowUpRight size={12}/></a>
   </div></Panel>
   <Panel title="Current coverage" caption="Live status by information type"><div className="panel-body"><div className="setting-row"><span>Current announcements</span><span className="tag">Unavailable</span></div><div className="setting-row"><span>Market prices</span><span className="tag">Unavailable</span></div><div className="setting-row"><span>Verified historical documents</span><span className="tag archived">Infosys only</span></div><div className="disclaimer">Archive entries below are not current alerts. Time filters cannot convert historical documents into recent events.</div></div></Panel>
   </div>}
   {!displaySettings.archivedSources&&<StatusBanner><strong>Historical sources are hidden.</strong> Turn on “Show archived sources” in Settings to view verified Infosys history.</StatusBanner>}
   <Panel title="Company events" caption={`${items.length} archived source${items.length===1?'':'s'} · no current feed`} tools={<div className="filters"><select value={filterCompany} onChange={e=>setCompany(e.target.value)} aria-label="Filter company" data-testid="select-event-company"><option value="All">All companies</option><option value="INFY">Infosys</option></select><select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Filter category" data-testid="select-event-category"><option>All</option><option>Earnings</option><option>Management change</option><option>Acquisition</option><option>Regulatory</option><option>Capital allocation</option><option>Business update</option><option>Other</option></select><select value={priority} onChange={e=>setPriority(e.target.value)} aria-label="Filter priority" data-testid="select-event-priority"><option>All</option><option>Archived</option><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select><select value={window} onChange={e=>setWindow(e.target.value)} aria-label="Filter date window" data-testid="select-event-window"><option>All archive</option><option>24h</option><option>3d</option><option>7d</option></select></div>}>
   {items.length?items.map(a=><article className="event-card" key={a.id} data-testid={`event-card-${a.id}`}><div className="event-top"><div><div className="event-company"><Link href={`/companies/${a.symbol}`} className="company-link">{a.company} <span className="ticker">· {a.symbol}</span></Link></div><div className="event-meta"><span className="tag archived">{a.priority}</span><span className="tag">{a.category}</span><span style={{fontSize:10,color:'#7a8490'}}>{a.publishedAt}</span>{read[a.id]&&<span className="tag">Read</span>}</div></div><button className="btn" onClick={()=>changeSaved(a.id)} aria-label={saved[a.id]?'Remove saved item':'Save item'} data-testid={`button-save-${a.id}`}>{saved[a.id]?<BookmarkCheck size={14}/>:<Bookmark size={14}/>} {saved[a.id]?'Saved':'Save'}</button></div>
    <p className="event-summary">{a.summary}</p><div className="event-implication">{a.implication}</div><div className="event-actions"><a className="btn" href={a.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-source-${a.id}`}>Source: {a.sourceTitle}<ArrowUpRight size={12}/></a><Link className="btn" href="/research" data-testid={`link-research-${a.id}`}>Open research</Link><button className="btn" onClick={()=>changeRead(a.id)} data-testid={`button-read-${a.id}`}>{read[a.id]?'Mark unread':'Mark read'}</button></div>
    </article>):<div className="quiet-empty"><strong>{window==='All archive'?(displaySettings.archivedSources?'No archived items match':'Archived items are hidden'):'No current events available'}</strong>{window==='All archive'?(displaySettings.archivedSources?'Adjust filters. Current-event coverage remains unavailable.':'The saved source preference hides historical entries. Current-event coverage remains unavailable.'):'A '+window+' window applies to current events. No live announcements provider is connected; archived disclosures are kept outside this time filter.'}</div>}
  </Panel></>;
}

function Research() {
 const [symbol,setSymbol]=useState('INFY');const [period,setPeriod]=useState<'q4'|'q1'>('q1');const [prompt,setPrompt]=useState('');const [answer,setAnswer]=useState(false);
 const displaySettings=storage('finn-settings',defaultSettings);
 const source=period==='q4'?documents.q4:documents.q1;
 const claims=period==='q4'?
  [{label:'FY26 revenue growth guidance',value:'0%–3% in constant-currency terms',kind:'Management guidance',location:'Q4 FY25 earnings-call transcript'},{label:'Operating-margin guidance',value:'20%–22%',kind:'Management guidance',location:'Q4 FY25 earnings-call transcript'}]:
  [{label:'FY26 revenue growth guidance',value:'Revised to 1%–3% in constant-currency terms',kind:'Management guidance',location:'Q1 FY26 earnings-call transcript'},{label:'Operating-margin outlook',value:'20%–22%; unchanged',kind:'Management guidance',location:'Q1 FY26 earnings-call transcript'}];
 return <><Heading eyebrow="Research / Source-grounded workspace" title="Research" subtitle="Claims remain attached to the document and reporting period that support them."/>
  <div className="filters" style={{marginBottom:16}}><label className="eyebrow" htmlFor="research-company">Company</label><select id="research-company" value={symbol} onChange={e=>{setSymbol(e.target.value);setAnswer(false)}} data-testid="select-research-company"><option value="INFY">Infosys Limited (INFY)</option><option value="MSFT">Microsoft (MSFT)</option><option value="NVDA">NVIDIA (NVDA)</option><option value="JPM">JPMorgan Chase (JPM)</option></select><span className="tag archived"><Archive size={12}/> Historical archive</span></div>
   {symbol!=='INFY'?<StatusBanner><strong>Evidence unavailable for {symbol}.</strong> This workspace has no verified source documents for this company. No claims or research answers are generated.</StatusBanner>:!displaySettings.archivedSources?<StatusBanner><strong>Historical sources are hidden.</strong> Turn on “Show archived sources” in Settings to view the research archive.</StatusBanner>:<div className="grid research-layout">
   <div className="grid">
    <Panel title="Source documents" caption="Verified historical Infosys filings only" tools={<div className="filters">{(['q4','q1'] as const).map(p=><button key={p} className={`btn ${period===p?'primary':''}`} onClick={()=>{setPeriod(p);setAnswer(false)}} data-testid={`button-period-${p}`}>{p==='q4'?'Q4 FY25 · Apr 2025':'Q1 FY26 · Jul 2025'}</button>)}</div>}>
     <div className="panel-body"><div className="source-row"><div><div className="source-title">{source.title}</div><div className="source-sub">{source.period} · archived, not current · selected claims below cite this document</div></div><a className="source-link" href={source.url} target="_blank" rel="noreferrer">Open PDF <ArrowUpRight size={12}/></a></div>
      {period==='q1'&&<div className="source-row"><div><div className="source-title">{documents.results.title}</div><div className="source-sub">{documents.results.period} · audited results PDF · INR in crore</div></div><a className="source-link" href={documents.results.url} target="_blank" rel="noreferrer">Open PDF <ArrowUpRight size={12}/></a></div>}
     </div>
     </Panel>
     <Panel title="Narrative vs Numbers" caption="Separate management outlook from reported financial results">
     <div className="tabs"><button className="tab active" data-testid="tab-narrative-numbers">Compare evidence</button><span className="tab" style={{cursor:'default'}}>Period: {period==='q4'?'Q4 FY25':'Q1 FY26'}</span></div>
     <div className="panel-body">
      <div className="eyebrow">Narrative · Management guidance</div>
      {claims.map((c,i)=><div className="claim" key={c.label}><div className="claim-label">{c.label}</div><div className="claim-value">{c.value}</div><div className="claim-meta"><span className="class-pill">{c.kind}</span><span>{source.title} · {source.date}</span><span>Transcript</span></div></div>)}
      <div className="eyebrow" style={{marginTop:16}}>Numbers · Audited reported results</div>
      {period==='q1'?<><div className="claim"><div className="claim-label">Consolidated revenue from operations</div><div className="claim-value">₹42,279 crore · quarter ended 30 Jun 2025</div><div className="claim-meta"><span className="class-pill">Reported actual</span><span>Audited Q1 FY26 results · INR · quarterly period</span><a className="source-link" href={documents.results.url} target="_blank" rel="noreferrer">Citation <ArrowUpRight size={11}/></a></div></div>
       <div className="claim"><div className="claim-label">Comparison · year-on-year</div><div className="claim-value">₹39,315 crore · quarter ended 30 Jun 2024 → ₹42,279 crore · quarter ended 30 Jun 2025</div><div className="claim-meta"><span className="class-pill derived">Derived</span><span>+7.54% · calculated from reported INR quarter values; nominal INR basis</span></div></div>
       <div className="claim"><div className="claim-label">Comparison · sequential</div><div className="claim-value">₹40,925 crore · quarter ended 31 Mar 2025 → ₹42,279 crore · quarter ended 30 Jun 2025</div><div className="claim-meta"><span className="class-pill derived">Derived</span><span>+3.31% · calculated from reported INR quarter values; nominal INR basis</span></div></div>
       <div className="disclaimer"><strong>Not a guidance variance.</strong> Quarterly reported revenue is INR and quarter-based; FY26 management guidance is full-year constant-currency growth. Currency and period are incompatible, so no direct comparison or variance is calculated.</div></>:
       <div className="quiet-empty"><strong>No Q4 FY25 audited results loaded here</strong>Q4 transcript guidance is shown with its own identity and citations. FY26 guidance is not compared with Q1 results.</div>}
     </div>
    </Panel>
   </div>
   <div className="grid">
     <Panel title="Ask the archive" caption="Source-aware research prompt"><div className="panel-body"><p className="subtitle" style={{marginBottom:10}}>The prompt is not sent to a research model. FINN has no connected retrieval or analysis service, so it will not invent an answer.</p><textarea value={prompt} onChange={e=>{setPrompt(e.target.value);setAnswer(false)}} rows={4} placeholder="Ask about the selected reporting period…" style={{width:'100%',resize:'vertical'}} data-testid="input-research-prompt"/><button className="btn primary" style={{marginTop:9}} onClick={()=>setAnswer(true)} disabled={!prompt.trim()} data-testid="button-submit-research"><Sparkles size={14}/> Check availability</button>{answer&&<div className="disclaimer" role="status" data-testid="research-evidence-output"><strong>Research answer unavailable.</strong><br/>Your prompt was not processed. Review the selected source PDFs and claims shown in this workspace.</div>}</div></Panel>
     {displaySettings.citations&&<Panel title="Claim provenance" caption="Selected-document citations"><div className="panel-body"><div className="claim"><div className="claim-label">Selected document</div><div className="claim-value">{source.title}</div><div className="claim-meta">{source.date} · archived</div></div>{claims.map(c=><div className="claim" key={c.label}><div className="claim-label">{c.label}</div><div className="claim-meta"><span className="class-pill">{c.kind}</span><span>{source.id} / transcript</span></div></div>)}<div className="disclaimer">Changing April / July changes the transcript identity, its date and every guidance citation together.</div></div></Panel>}
   </div>
  </div>}
 </>;
}

function CompanyProfile() {
 const {symbol='INFY'}=useParams<{symbol:string}>();const [period,setPeriod]=useState<'q4'|'q1'>('q1');
 const displaySettings=storage('finn-settings',defaultSettings);
 const isInfy=symbol.toUpperCase()==='INFY';const source=period==='q4'?documents.q4:documents.q1;
 return <><div className="company-hero"><div><div className="eyebrow">Company profile / {symbol.toUpperCase()}</div><h1>{isInfy?'Infosys Limited':`${symbol.toUpperCase()} company profile`}</h1><p>{isInfy?'Information Technology · India · archived evidence only':'Company research is unsupported in this workspace.'}</p>{isInfy&&<span className="tag">Synthetic demo holding · no live portfolio connection</span>}</div>{isInfy&&<Link className="btn" href="/research">Open research <ArrowUpRight size={13}/></Link>}</div>
   {!isInfy?<StatusBanner><strong>Profile unavailable.</strong> There is no verified profile or source coverage for {symbol.toUpperCase()}. Market data and current announcements are not connected.</StatusBanner>:!displaySettings.archivedSources?<StatusBanner><strong>Historical sources are hidden.</strong> Turn on “Show archived sources” in Settings to view archived company coverage.</StatusBanner>:<><StatusBanner><strong>Archived coverage only.</strong> No live company profile, current price or current event feed is available. The material below is historical.</StatusBanner>
   <div className="filters" style={{margin:'18px 0'}}><span className="eyebrow">Reporting period</span><button className={`btn ${period==='q4'?'primary':''}`} onClick={()=>setPeriod('q4')} data-testid="button-company-period-q4">Q4 FY25 · 17 Apr 2025</button><button className={`btn ${period==='q1'?'primary':''}`} onClick={()=>setPeriod('q1')} data-testid="button-company-period-q1">Q1 FY26 · 23 Jul 2025</button></div>
   <div className="grid profile-grid">
    <Panel title="Archived company narrative" caption={source.period}><div className="panel-body"><div className="eyebrow">Management guidance · archived</div><p style={{fontSize:14,lineHeight:1.6,color:'#334459'}}>{period==='q4'?'FY26 revenue growth guidance of 0%–3% in constant-currency terms.':'FY26 revenue guidance revised to 1%–3% in constant currency.'}</p><div className="eyebrow">Margin outlook</div><p style={{fontSize:14,lineHeight:1.6,color:'#334459'}}>Operating margin guidance of 20%–22%{period==='q1'?'; outlook remained unchanged.':'.'}</p><span className="tag archived"><Archive size={12}/> Historical, not current</span></div></Panel>
    <Panel title="Primary source" caption="Document and claims selected together"><div className="panel-body"><div className="source-title">{source.title}</div><div className="source-sub">{source.date} · official Infosys transcript PDF</div><a href={source.url} target="_blank" rel="noreferrer" className="btn" style={{marginTop:14}}>Open source document <ArrowUpRight size={13}/></a><div className="disclaimer">The selected report period controls the narrative and citation together. Do not treat these historical statements as current guidance.</div></div></Panel>
    {period==='q1'&&<Panel title="Audited reported revenue" caption="Nominal INR · quarterly periods"><div className="panel-body"><div className="claim"><div className="claim-label">Quarter ended 30 Jun 2025</div><div className="claim-value">₹42,279 crore</div><div className="claim-meta"><span className="class-pill">Reported actual</span><a href={documents.results.url} className="source-link" target="_blank" rel="noreferrer">Audited results PDF <ArrowUpRight size={11}/></a></div></div><div className="claim"><div className="claim-label">Comparable periods</div><div className="claim-value">₹39,315 crore · 30 Jun 2024<br/>₹40,925 crore · 31 Mar 2025</div><div className="claim-meta"><span className="class-pill derived">Derived comparisons available in Research</span></div></div><div className="disclaimer">Quarterly INR actuals cannot be directly compared with full-year constant-currency guidance.</div></div></Panel>}
   </div>
  </>}
 </>;
}

function SettingsPage() {
 const [value,setValue]=useState<Settings>(()=>storage('finn-settings',defaultSettings));const [saved,setSaved]=useState(false);const [saveError,setSaveError]=useState('');
 const update=(key:keyof Settings,next:Settings[keyof Settings])=>{setValue(v=>({...v,[key]:next}));setSaved(false);setSaveError('')};
 const toggle=(key:keyof Settings)=><button className={`switch ${value[key]?'on':''}`} role="switch" aria-checked={Boolean(value[key])} aria-label={key} onClick={()=>update(key,!value[key])} data-testid={`switch-${key}`}/>;
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(!Number.isFinite(value.decline)||!Number.isFinite(value.rise)||value.decline<0||value.decline>100||value.rise<0||value.rise>100){setSaved(false);setSaveError('Enter threshold values from 0% to 100%.');return;}persist('finn-settings',value);setSaved(true);setSaveError('')};
 return <><Heading eyebrow="Workspace / Preferences" title="Settings" subtitle="Local preferences for this browser. No server-side account settings are connected."/>
  <StatusBanner><strong>Preferences save on this device only.</strong> Alert thresholds and notification settings do not create live market alerts without a data provider.</StatusBanner>
   <form onSubmit={submit} noValidate><Panel title="Alert preferences" caption="Threshold inputs are percentage values; live alerts remain unavailable without a market-data provider"><div className="panel-body">
   <div className="form-grid"><div className="field"><label htmlFor="decline-threshold">Daily decline threshold (%)</label><input id="decline-threshold" type="number" min="0" max="100" step=".1" value={value.decline} onChange={e=>update('decline',Number(e.target.value))} data-testid="input-decline-threshold"/></div><div className="field"><label htmlFor="rise-threshold">Daily rise threshold (%)</label><input id="rise-threshold" type="number" min="0" max="100" step=".1" value={value.rise} onChange={e=>update('rise',Number(e.target.value))} data-testid="input-rise-threshold"/></div></div>
    <div className="settings-section"><div className="setting-row"><span>Email notifications<small>Email delivery is not connected; this app will not send email alerts.</small></span><span className="tag">Unavailable</span></div><div className="setting-row"><span>In-app attention panel<small>Shows synthetic threshold matches on Portfolio; this is not live monitoring.</small></span>{toggle('inApp')}</div><div className="setting-row"><span>Daily brief<small>Shows or hides the archived brief on Intelligence.</small></span>{toggle('dailyBrief')}</div></div>
   </div></Panel><div style={{height:14}}/><Panel title="Research & dashboard" caption="Display options stored locally"><div className="panel-body">{([['showSparklines','Show portfolio trend chart','The chart uses synthetic demo values.'],['archivedSources','Show archived sources','Controls historical entries on Intelligence, Research, and Companies.'],['citations','Show claim provenance panel','Controls the detailed citation panel on Research.']] as const).map(([key,label,help])=><div className="setting-row" key={key}><span>{label}<small>{help}</small></span>{toggle(key)}</div>)}</div></Panel><div style={{display:'flex',alignItems:'center',marginTop:15,flexWrap:'wrap',gap:10}}><button className="btn primary" type="submit" data-testid="button-save-settings"><Check size={14}/> Save preferences</button>{saved&&<span className="success-note" role="status" data-testid="status-settings-saved">Preferences saved to this device.</span>}{saveError&&<span className="error-note" role="alert" data-testid="status-settings-error">{saveError}</span>}</div></form>
 </>;
}
function RoutedErrorBoundary({children}:{children:ReactNode}) { const [location]=useLocation();return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function Router() {
 return <Shell><RoutedErrorBoundary><Switch><Route path="/" component={Portfolio}/><Route path="/intelligence" component={Intelligence}/><Route path="/research" component={Research}/><Route path="/companies/:symbol" component={CompanyProfile}/><Route path="/settings" component={SettingsPage}/><Route component={NotFound}/></Switch></RoutedErrorBoundary></Shell>;
}
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>; }
export default App;
