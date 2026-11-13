import { FormEvent, useEffect, useState } from 'react';
import { Command, LogOut, Award, Radio, ShieldCheck, MoreHorizontal, Moon, Sun, UserRound } from 'lucide-react';
import { ManagerWorkspace } from './App';
import { api, clearAuthSession, getApiBase, getToken, setApiBase, setToken } from './lib/api';

type Role = 'manager' | 'student' | 'judge' | 'mentor' | 'volunteer';
type User = { id:string; name:string; email:string; role:Role; college?:string; skills?:string[] };
type Item = { id:string; name:string; date?:string; venue?:string; status?:string; event_id?:string; project?:string; track?:string; registrationOpen?:boolean; registrationDeadline?:string; registrationState?:string; canRegister?:boolean; resultsReleased?:boolean; teamSizeMin?:number; teamSizeMax?:number; tracks?:string[]; room?:string; members?:number };
type Ticket = { id:string; topic?:string; detail?:string; status?:string; team?:string };

export default function PortalRouter() {
  const [user,setUser]=useState<User|null>(null);
  const [apiUrl,setApiUrl]=useState(getApiBase());
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [college,setCollege]=useState('');
  const [register,setRegister]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{ if(getToken()) api.get('/api/auth/me').then(r=>setUser(r.data.user)).catch(()=>clearAuthSession()); },[]);

  async function submit(e:FormEvent) {
    e.preventDefault(); setError(''); setBusy(true); setApiBase(apiUrl);
    try {
      const {data}=await api.post(register?'/api/auth/register':'/api/auth/login',register?{name,email,password,college}:{email,password});
      setToken(data.token); setUser(data.user);
    } catch(err) { setError(err instanceof Error?err.message:'Sign in failed'); }
    finally { setBusy(false); }
  }
  function logout(){clearAuthSession();setUser(null);setPassword('');}

  if(!user) return <main className="portal-screen"><div className="portal-wrap" style={{maxWidth:520}}>
    <div className="portal-brand"><span className="portal-mark"><Command size={22}/></span><div><strong>hackpulse<span style={{color:'#8da85d'}}>.</span></strong><small>EVENT OPERATING SYSTEM</small></div></div>
    <div className="portal-card"><div className="eyebrow">SECURE WORKSPACE ACCESS</div><h1 className="portal-heading">Welcome to HackPulse</h1><p className="portal-muted">Sign in to your workspace. Your assigned role determines which portal opens.</p>
      <form onSubmit={submit}>
        <div className="portal-field"><label>Express API URL (optional)</label><input value={apiUrl} onChange={e=>setApiUrl(e.target.value)} placeholder="Leave blank to use this app’s server"/><small className="portal-muted">Local development uses the configured localhost API. Leave blank when frontend and backend share one server.</small></div>
        {register&&<><div className="portal-field"><label>Full name</label><input required value={name} onChange={e=>setName(e.target.value)}/></div><div className="portal-field"><label>College</label><input value={college} onChange={e=>setCollege(e.target.value)}/></div></>}
        <div className="portal-field"><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div>
        <div className="portal-field"><label>Password</label><input type="password" required minLength={register?10:1} value={password} onChange={e=>setPassword(e.target.value)}/></div>
        {error&&<div className="portal-error">{error}</div>}
        <button className="portal-btn lime" style={{width:'100%'}} disabled={busy}>{busy?'Please wait…':register?'Create student account':'Sign in'}</button>
      </form>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,marginTop:18,alignItems:'center'}}><button className="portal-btn ghost" onClick={()=>{setRegister(v=>!v);setError('')}}>{register?'Back to sign in':'Create student account'}</button><small className="portal-muted">Manager accounts are provisioned by an administrator.</small></div>
    </div></div></main>;

  if(user.role==='manager') return <ManagerWorkspace user={user} onLogout={logout}/>;
  return <RolePortal user={user} logout={logout}/>;
}

function RolePortal({user,logout}:{user:User;logout:()=>void}) {
  const [tab,setTab]=useState(user.role==='student'?'home':user.role==='judge'?'assignments':user.role==='mentor'?'helpdesk':'checkin');
  const [events,setEvents]=useState<Item[]>([]);
  const [teams,setTeams]=useState<Item[]>([]);
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [certs,setCerts]=useState<any[]>([]);
  const [scoreInputs,setScoreInputs]=useState<Record<string,string>>({});
  const [myScores,setMyScores]=useState<any[]>([]);
  const [announcements,setAnnouncements]=useState<string[]>([]);
  const [registrations,setRegistrations]=useState<any[]>([]);
  const [assignments,setAssignments]=useState<any[]>([]);
  const [registrationMode,setRegistrationMode]=useState<'individual'|'group'>('individual');
  const [memberEmails,setMemberEmails]=useState('');
  const [eventId,setEventId]=useState('');
  const [teamName,setTeamName]=useState('');
  const [project,setProject]=useState('');
  const [track,setTrack]=useState('AI / ML');
  const [topic,setTopic]=useState('Technical blocker');
  const [detail,setDetail]=useState('');
  const [code,setCode]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [profileOpen,setProfileOpen]=useState(false);
  const [dark,setDark]=useState(false);
  useEffect(()=>{document.documentElement.classList.toggle('portal-dark',dark);return()=>document.documentElement.classList.remove('portal-dark');},[dark]);

  async function refresh(){
    const {data}=await api.get('/api/hackpulse/state');
    setEvents(data.events||[]);setTeams(data.teams||[]);setTickets(data.tickets||[]);setAnnouncements(data.announcements||[]);setRegistrations(data.registrations||[]);setAssignments(data.assignments||[]);
    if(!eventId&&data.events?.[0])setEventId(data.events[0].id);
  }
  useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
  useEffect(()=>{if(user.role==='student'&&tab==='certificates'&&eventId)api.get('/api/hackpulse/certificates/'+eventId).then(r=>setCerts(r.data.certificates||[])).catch(e=>setError(e.message));},[tab,eventId]);
  useEffect(()=>{if((user.role==='judge'&&tab==='scores')||(user.role==='student'&&tab==='judging')){if(eventId)api.get('/api/hackpulse/scores/'+eventId).then(r=>setMyScores(r.data.scores||[])).catch(e=>setError(e.message));}},[tab,eventId,user.role]);
  const myTeams=teams.filter(t=>t.event_id===eventId);
  const myTeam=myTeams[0];
  const selectedEvent=events.find(e=>e.id===eventId);
  const myRegistration=registrations.find(r=>r.eventId===eventId);
  async function post(path:string,body:unknown){setError('');setMessage('');try{await api.post(path,body);setMessage('Saved successfully.');await refresh();}catch(e){setError(e instanceof Error?e.message:'Request failed');}}
  const studentNav=[['home','Dashboard'],['events','Events'],['team','My Team'],['project','Project'],['judging','Judging & results'],['mission','Mission Control'],['helpdesk','Mentor help desk'],['certificates','Certificates'],['profile','Profile']];
  const roleNav=user.role==='student'?studentNav:user.role==='judge'?[['assignments','Assigned teams'],['scores','My scores']]:user.role==='mentor'?[['helpdesk','Help queue']]:[['checkin','Check-in & coupons']];
  return <main className="portal-screen"><div className="portal-wrap">
    <div className="portal-top"><div className="portal-brand" style={{margin:0}}><span className="portal-mark"><Command size={20}/></span><div><strong>hackpulse<span style={{color:'#8da85d'}}>.</span></strong><small>{user.role.toUpperCase()} PORTAL</small></div></div><div className="portal-profile-wrap"><button className="portal-profile-trigger" onClick={()=>setProfileOpen(v=>!v)} aria-expanded={profileOpen}><span className="portal-muted">{user.name}</span><MoreHorizontal size={18}/></button>{profileOpen&&<div className="profile-menu portal-profile-menu"><button onClick={()=>{setTab('profile');setProfileOpen(false);}}><UserRound size={15}/> User Profile</button><button onClick={()=>setDark(v=>!v)}>{dark?<Sun size={15}/>:<Moon size={15}/>} {dark?'Light theme':'Dark theme'}</button><button className="profile-menu-danger" onClick={logout}><LogOut size={15}/> Logout</button></div>}</div></div>
    <nav className="portal-nav">{roleNav.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    <div className="portal-top"><div><div className="eyebrow">{user.role.toUpperCase()} WORKSPACE</div><h1 className="portal-heading">{roleNav.find(x=>x[0]===tab)?.[1]}</h1><p className="portal-muted">Only role-authorized information and actions are available here.</p></div>{events.length>0&&<select value={eventId} onChange={e=>setEventId(e.target.value)}>{events.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select>}</div>
    {error&&<div className="portal-error">{error}</div>}{message&&<div className="portal-success">{message}</div>}
    {user.role==='student'&&tab==='home'&&<div className="portal-grid"><div className="portal-card"><span className="eyebrow">MY REGISTRATION</span><h2>{myTeam?'Registered':'Not registered yet'}</h2><p className="portal-muted">{myTeam?.name||'Browse events to register your team.'}</p></div><div className="portal-card"><span className="eyebrow">MY TEAM STATUS</span><h2>{myTeam?.status||'—'}</h2><p className="portal-muted">{myTeam?.id||'No team for this event'}</p></div><div className="portal-card"><span className="eyebrow">ANNOUNCEMENTS</span>{announcements.map((a,i)=><p className="portal-muted" key={i}>{a}</p>)}</div></div>}
    {user.role==='student'&&tab==='events'&&<div className="portal-card"><h2>Available events</h2>{events.map(e=><div className="portal-row" key={e.id}><div><b>{e.name}</b><small>{e.date} · {e.venue} · {e.registrationState||e.status}{e.registrationDeadline?` · Deadline: ${new Date(e.registrationDeadline).toLocaleString()}`:''}</small></div><button className="portal-btn lime" disabled={!e.canRegister} onClick={()=>{setEventId(e.id);setTab('register')}}>{e.canRegister?'Register':'Closed'}</button></div>)}</div>}
    {user.role==='student'&&tab==='register'&&<div className="portal-card"><h2>Register for {selectedEvent?.name}</h2><p className="portal-muted">{selectedEvent?.registrationState}{selectedEvent?.registrationDeadline?` · Deadline: ${new Date(selectedEvent.registrationDeadline).toLocaleString()}`:''}</p><div className="portal-field"><label>Registration type</label><select value={registrationMode} onChange={e=>setRegistrationMode(e.target.value as 'individual'|'group')}><option value="individual">Individual registration</option><option value="group">Group registration</option></select></div>{registrationMode==='group'&&<><div className="portal-field"><label>Team name</label><input value={teamName} onChange={e=>setTeamName(e.target.value)}/></div><div className="portal-field"><label>Teammate emails (comma separated)</label><input value={memberEmails} onChange={e=>setMemberEmails(e.target.value)}/></div><div className="portal-field"><label>Project idea</label><input value={project} onChange={e=>setProject(e.target.value)}/></div><div className="portal-field"><label>Track</label><select value={track} onChange={e=>setTrack(e.target.value)}>{(selectedEvent?.tracks||['AI / ML','Web Development','Cybersecurity','Open Innovation']).map(x=><option key={x}>{x}</option>)}</select></div></>}<button className="portal-btn lime" disabled={!selectedEvent?.canRegister} onClick={()=>registrationMode==='individual'?post('/api/hackpulse/register-individual',{event_id:eventId}):post('/api/hackpulse/register-team',{event_id:eventId,team:{name:teamName,project,track,memberEmails:memberEmails.split(',')}})}>{registrationMode==='individual'?'Register individually':'Create group'}</button></div>}
    {user.role==='student'&&tab==='team'&&<div className="portal-card">{myTeam?<><h2>{myTeam.name}</h2><p className="portal-muted">Team ID: {myTeam.id} · {myTeam.track} · {myTeam.status}</p><p>Project: {myTeam.project}</p></>:<div className="portal-empty">No team registered for this event.</div>}</div>}
    {user.role==='student'&&tab==='project'&&<div className="portal-card"><h2>Project submission</h2><div className="portal-field"><label>Project title</label><input value={project} onChange={e=>setProject(e.target.value)}/></div><button className="portal-btn lime" onClick={()=>myTeam?post('/api/hackpulse/projects',{event_id:eventId,team_id:myTeam.id,title:project}):setError('Register a team first.')}>Save project</button></div>}
    {user.role==='student'&&tab==='judging'&&<div className="portal-card"><h2>Judging & released results</h2>{selectedEvent?.resultsReleased?<>{myScores.length===0?<div className="portal-empty">Results are released, but no team score is available.</div>:myScores.map((s:any)=><div className="portal-row" key={s.id}><div><b>{s.name}</b><small>{s.status}</small></div><span className="portal-tag">{s.calibratedScore??s.score}/100</span></div>)}</>:<p className="portal-muted">Results are not released yet. Confidential judge-by-judge evaluations are never shown.</p>}</div>}
    {user.role==='student'&&tab==='mission'&&<div className="portal-card"><h2><Radio size={18}/> Mission Control</h2>{announcements.map((a,i)=><div className="portal-row" key={i}>{a}</div>)}</div>}
    {user.role==='student'&&tab==='helpdesk'&&<div className="portal-grid"><div className="portal-card"><h2>Raise a help request</h2><div className="portal-field"><label>Topic</label><input value={topic} onChange={e=>setTopic(e.target.value)}/></div><div className="portal-field"><label>Details</label><textarea rows={4} value={detail} onChange={e=>setDetail(e.target.value)}/></div><button className="portal-btn lime" onClick={()=>post('/api/hackpulse/tickets',{event_id:eventId,ticket:{team:myTeam?.name||'My team',topic,detail}})}>Submit request</button></div><div className="portal-card"><h2>My requests</h2>{tickets.map(t=><div className="portal-row" key={t.id}><div><b>{t.topic}</b><small>{t.detail}</small></div><span className="portal-tag">{t.status}</span></div>)}</div></div>}
    {user.role==='student'&&tab==='certificates'&&<div className="portal-card"><h2><Award size={18}/> My certificates</h2>{certs.length===0&&<div className="portal-empty">No certificates issued yet.</div>}{certs.map(c=><div className="portal-row" key={c.certificateId}><div><b>{c.award}</b><small>{c.certificateId} · {c.teamName}</small></div></div>)}</div>}
    {tab==='profile'&&<div className="portal-card"><h2>Profile</h2><p>{user.name} · {user.email} · {user.college}</p><p className="portal-muted">Skills and preferences are stored on your account. Ask your organizer to update them until profile editing is enabled.</p></div>}
    {user.role==='judge'&&tab==='assignments'&&<div className="portal-card"><h2>Assigned teams</h2>{myTeams.length===0&&<div className="portal-empty">No teams assigned for this event yet.</div>}{myTeams.map(t=><div className="portal-row" key={t.id}><div><b>{t.name}</b><small>{t.project} · {t.track}</small></div><div style={{display:'flex',gap:8}}><input type="number" min={0} max={10} step={0.5} style={{width:80}} placeholder="0–10" value={scoreInputs[t.id]||''} onChange={e=>setScoreInputs(s=>({...s,[t.id]:e.target.value}))}/><button className="portal-btn lime" onClick={()=>{const value=Number(scoreInputs[t.id]);if(!scoreInputs[t.id]||!Number.isFinite(value)||value<0||value>10){setError('Enter a score from 0 to 10.');return;}post('/api/hackpulse/score',{event_id:eventId,team_id:t.id,value});}}>Submit</button></div></div>)}</div>}
    {user.role==='judge'&&tab==='scores'&&<div className="portal-card"><h2>My score submissions</h2>{myScores.length===0&&<div className="portal-empty">No scores submitted yet.</div>}{myScores.map((s:any)=><div className="portal-row" key={s._id}><div><b>{s.team_id}</b><small>{s.criterion_id}</small></div><span className="portal-tag">{s.value}/10</span></div>)}</div>}
    {user.role==='mentor'&&tab==='helpdesk'&&<div className="portal-card"><h2>Mentor help queue</h2>{tickets.length===0&&<div className="portal-empty">No requests right now.</div>}{tickets.map((t:any)=><div className="portal-row" key={t.id}><div><b>{t.topic} · {t.team}</b><small>{t.detail}</small></div><div style={{display:'flex',gap:8,alignItems:'center'}}><span className="portal-tag">{t.status}</span>{t.status==='Open'&&<button className="portal-btn lime" onClick={()=>post('/api/hackpulse/action',{action:'ticket.claim',event_id:t.event_id||eventId,payload:{id:t.id}})}>Claim</button>}{t.status==='Claimed'&&<button className="portal-btn ghost" onClick={()=>post('/api/hackpulse/action',{action:'ticket.resolve',event_id:t.event_id||eventId,payload:{id:t.id}})}>Resolve</button>}</div></div>)}</div>}
    {user.role==='volunteer'&&tab==='checkin'&&<div className="portal-card"><h2><ShieldCheck size={18}/> Check-in & coupon validation</h2><div className="portal-field"><label>Pass / coupon code</label><input value={code} onChange={e=>setCode(e.target.value)}/></div><button className="portal-btn lime" onClick={()=>post('/api/hackpulse/checkin',{event_id:eventId,code})}>Validate code</button></div>}
    <p className="portal-muted" style={{marginTop:24,fontSize:10}}>HackPulse · Shared event database · Role-scoped access</p>
  </div></main>;
}
