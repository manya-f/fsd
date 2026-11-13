import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ws } from './lib/api';
import {
  Activity,
  ArrowUpRight,
  Award,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  Download,
  ExternalLink,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MoreHorizontal,
  LogOut,
  Moon,
  Plus,
  QrCode,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  UserRound,
  X,
  Zap,
} from 'lucide-react';

type Team = {
  id: string;
  name: string;
  project: string;
  track: string;
  members: number;
  score: number;
  status: string;
  room: string;
  event_id?: string;
};
type Judge = {
  id: string;
  name: string;
  specialty: string;
  avg: number;
  assigned: number;
};
type Ticket = {
  id: string;
  team: string;
  topic: string;
  detail: string;
  priority: string;
  status: string;
  mentor?: string;
};
type EventRecord = {
  id: string;
  name: string;
  date: string;
  venue: string;
  status: string;
  teams: number;
  participants: number;
};
type Schedule = { team: string; judge: string; room: string; slot: string };

const initialTeams: Team[] = [
  {
    id: 'HP-021',
    name: 'Neural Navigators',
    project: 'RouteWise AI',
    track: 'AI / ML',
    members: 4,
    score: 87.4,
    status: 'Judging complete',
    room: 'Room A',
  },
  {
    id: 'HP-014',
    name: 'Byte Builders',
    project: 'AccessAble',
    track: 'Accessibility',
    members: 3,
    score: 91.2,
    status: 'Presenting now',
    room: 'Room B',
  },
  {
    id: 'HP-008',
    name: 'StackTrace',
    project: 'GreenGrid',
    track: 'Sustainability',
    members: 4,
    score: 82.8,
    status: 'In queue',
    room: 'Room C',
  },
  {
    id: 'HP-033',
    name: 'Pixel Pioneers',
    project: 'CivicLens',
    track: 'Open Innovation',
    members: 3,
    score: 89.1,
    status: 'Judging complete',
    room: 'Room A',
  },
  {
    id: 'HP-019',
    name: 'Cloud Nine',
    project: 'CareCompass',
    track: 'HealthTech',
    members: 4,
    score: 78.6,
    status: 'In queue',
    room: 'Room D',
  },
  {
    id: 'HP-005',
    name: 'Ctrl Alt Elite',
    project: 'FarmFlow',
    track: 'AgriTech',
    members: 2,
    score: 85.3,
    status: 'Checked in',
    room: 'Room C',
  },
];
const initialJudges: Judge[] = [
  {
    id: 'J-01',
    name: 'Dr. Meera Rao',
    specialty: 'AI & Data',
    avg: 8.1,
    assigned: 6,
  },
  {
    id: 'J-02',
    name: 'Arjun Nair',
    specialty: 'Product & UX',
    avg: 6.2,
    assigned: 5,
  },
  {
    id: 'J-03',
    name: 'Kavya Menon',
    specialty: 'Cloud & Backend',
    avg: 7.4,
    assigned: 6,
  },
  {
    id: 'J-04',
    name: 'Rahul Shetty',
    specialty: 'Security',
    avg: 5.8,
    assigned: 5,
  },
  {
    id: 'J-05',
    name: 'Priya Iyer',
    specialty: 'Impact & Pitch',
    avg: 8.7,
    assigned: 5,
  },
];
const initialEvents: EventRecord[] = [
  {
    id: 'EVT-2026-01',
    name: 'HackPulse Buildathon',
    date: 'Nov 14–15, 2026',
    venue: 'NIE Mysuru · Innovation Hub',
    status: 'Live',
    teams: 48,
    participants: 186,
  },
  {
    id: 'EVT-2026-02',
    name: 'AI for Good Sprint',
    date: 'Dec 05, 2026',
    venue: 'Online + Mysuru',
    status: 'Registration',
    teams: 22,
    participants: 84,
  },
];
const initialTickets: Ticket[] = [
  {
    id: 'T-104',
    team: 'Neural Navigators',
    topic: 'Cloud deployment',
    detail:
      'Need help configuring environment variables on the deployment target.',
    priority: 'High',
    status: 'Open',
  },
  {
    id: 'T-102',
    team: 'Cloud Nine',
    topic: 'Dataset / APIs',
    detail: 'Looking for a reliable public dataset for the prototype.',
    priority: 'Normal',
    status: 'Claimed',
    mentor: 'Aditi (Mentor)',
  },
  {
    id: 'T-099',
    team: 'StackTrace',
    topic: 'Hardware',
    detail: 'Sensor board is not being detected over USB.',
    priority: 'High',
    status: 'Open',
  },
];

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'teams', label: 'Teams & people', icon: Users },
  { id: 'judging', label: 'Judging & scores', icon: Trophy },
  { id: 'mission', label: 'Mission Control', icon: Radio },
  { id: 'helpdesk', label: 'Mentor help desk', icon: MessageSquare },
  { id: 'checkin', label: 'Check-in & perks', icon: QrCode },
  { id: 'certificates', label: 'Certificates', icon: Award },
];

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ');
}
function initials(name: string) {
  return name
    .split(' ')
    .map(x => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
function downloadCsv(rows: string[][], filename: string) {
  const csv = rows
    .map(row =>
      row.map(cell => '"' + String(cell).replaceAll('"', '""') + '"').join(',')
    )
    .join('\n');
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function makeZip(files: Array<{name:string; content:string}>) {
  const encoder = new TextEncoder();
  const crcTable = new Uint32Array(256);
  for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0;}
  const crc32=(data:Uint8Array)=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  const u16=(v:number)=>[v&255,(v>>>8)&255];
  const u32=(v:number)=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
  const locals:number[]=[]; const centrals:number[]=[]; let offset=0;
  for(const file of files){const name=encoder.encode(file.name);const data=encoder.encode(file.content);const crc=crc32(data);
    const local=[0x50,0x4b,0x03,0x04,...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name,...data];locals.push(...local);
    const central=[0x50,0x4b,0x01,0x02,...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name];centrals.push(...central);offset+=local.length;
  }
  const end=[0x50,0x4b,0x05,0x06,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(centrals.length),...u32(locals.length),...u16(0)];
  return new Blob([new Uint8Array([...locals,...centrals,...end])],{type:'application/zip'});
}
function downloadCertificatesZip(eventName:string, teams:Team[]) {
  const names=['Aarav Sharma','Ananya Rao','Ishaan Patel','Diya Nair','Kabir Menon','Meera Joshi','Rohan Shetty','Sana Khan','Vivaan Iyer','Aditi Kulkarni','Arjun Das','Kavya Reddy','Neil Thomas','Tara Singh','Reyansh Gupta','Mira Shah','Dev Malhotra','Ira Krishnan','Aditya Rao','Nisha Bhat'];
  const files:Array<{name:string;content:string}>=[];
  const rows=[['Certificate ID','Recipient','Team','Project','Event','Status']];
  let index=0;
  teams.forEach((team)=>{const count=Math.max(2,Math.min(team.members||3,4));for(let m=0;m<count;m++){const recipient=names[index%names.length];const id='HP-'+new Date().getFullYear()+'-'+String(index+1).padStart(5,'0');index++;
    rows.push([id,recipient,team.name,team.project,eventName,'Demo / sample']);
    const html='<!doctype html><html><head><meta charset="utf-8"><title>'+id+'</title><style>body{font-family:Georgia,serif;background:#f5f5f0;padding:36px}.cert{max-width:900px;margin:30px auto;background:white;border:12px double #9aaf72;padding:70px;text-align:center;color:#283522}.eyebrow{letter-spacing:4px;color:#758b52}.name{font-size:42px;margin:24px}.event{font-size:24px}.id{margin-top:55px;font:14px monospace;color:#66715d}</style></head><body><main class="cert"><div class="eyebrow">HACKPULSE · CERTIFICATE OF PARTICIPATION</div><h1>Certificate of Achievement</h1><p>This is proudly presented to</p><div class="name">'+recipient+'</div><p>for participating with <b>'+team.name+'</b> and building <b>'+team.project+'</b></p><div class="event">'+eventName+'</div><div class="id">Certificate ID: '+id+' · DEMO SAMPLE</div></main></body></html>';
    files.push({name:'certificates/'+id+'.html',content:html});
  }});
  files.push({name:'certificate-register.csv',content:rows.map(r=>r.map(c=>'"'+String(c).replaceAll('"','""')+'"').join(',')).join('\n')});
  files.push({name:'README.txt',content:'HackPulse sample certificate batch for '+eventName+'. Open each HTML certificate in a browser and use Print > Save as PDF. These are DEMO records, not official certificates.'});
  const url=URL.createObjectURL(downloadZipBlob(files));const a=document.createElement('a');a.href=url;a.download='hackpulse-'+eventName.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-certificates.zip';a.click();URL.revokeObjectURL(url);
}
function downloadZipBlob(files:Array<{name:string;content:string}>){return makeZip(files);}
type WorkspaceUser = { id:string; name:string; email:string; role:string; college?:string };
type RegistrationRecord = { _id:string; name:string; email:string; college?:string; teamCode:string; teamName:string; status:string };

export function ManagerWorkspace({user,onLogout}:{user:WorkspaceUser;onLogout:()=>void}) {
  const [active, setActive] = useState('overview');
  const [events, setEvents] = useState(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState(initialEvents[0].id);
  const [teams, setTeams] = useState<Team[]>(initialTeams.map(t=>({...t,event_id:'EVT-2026-01'})).concat([
    {id:'HP-041',name:'Code Crafters',project:'CampusFlow',track:'Web Development',members:4,score:84.6,status:'Judging complete',room:'Room B',event_id:'EVT-2026-01'},
    {id:'HP-042',name:'Data Dynamos',project:'CropSense',track:'Data Science',members:3,score:88.2,status:'Presenting now',room:'Room C',event_id:'EVT-2026-01'},
    {id:'HP-043',name:'SecureSphere',project:'PhishGuard',track:'Cybersecurity',members:4,score:90.1,status:'In queue',room:'Room A',event_id:'EVT-2026-01'},
    {id:'HP-044',name:'EcoByte',project:'ReUse Map',track:'Sustainability',members:3,score:79.8,status:'Checked in',room:'Room D',event_id:'EVT-2026-01'},
    {id:'HP-045',name:'Vision Forge',project:'SignSight',track:'AI / ML',members:4,score:92.3,status:'Judging complete',room:'Room B',event_id:'EVT-2026-01'},
    {id:'AG-101',name:'Impact Makers',project:'MealBridge',track:'Open Innovation',members:4,score:89.4,status:'Registered',room:'To be assigned',event_id:'EVT-2026-02'},
    {id:'AG-102',name:'Green Signals',project:'AirAware',track:'Sustainability',members:3,score:86.7,status:'Registered',room:'To be assigned',event_id:'EVT-2026-02'},
    {id:'AG-103',name:'ML Mavericks',project:'LearnLoop',track:'AI / ML',members:4,score:91.1,status:'Registered',room:'To be assigned',event_id:'EVT-2026-02'},
    {id:'AG-104',name:'Health Hackers',project:'CarePath',track:'HealthTech',members:3,score:83.5,status:'Registered',room:'To be assigned',event_id:'EVT-2026-02'},
    {id:'AG-105',name:'Byte Bloom',project:'SkillSpring',track:'Web Development',members:4,score:87.9,status:'Registered',room:'To be assigned',event_id:'EVT-2026-02'}
  ]));
  const [judges, setJudges] = useState(initialJudges);
  const [judgeScores, setJudgeScores] = useState<Array<{event_id:string;team_id:string;judge_id:string;value:number}>>([]);
  const [tickets, setTickets] = useState(initialTickets);
  const [announcements, setAnnouncements] = useState([
    'Judging begins at 2:00 PM. Teams, please be near your assigned rooms.',
    'Lunch coupons are available at the volunteer desk.',
  ]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [rawMode, setRawMode] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrantName, setRegistrantName] = useState('');
  const [registrantEmail, setRegistrantEmail] = useState('');
  const [registrantCollege, setRegistrantCollege] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamProject, setNewTeamProject] = useState('');
  const [newTeamTrack, setNewTeamTrack] = useState('AI / ML');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [showScore, setShowScore] = useState<string | null>(null);
  const [scoreValue, setScoreValue] = useState('8');
  const [scoreJudge, setScoreJudge] = useState(initialJudges[0].id);
  const [announcement, setAnnouncement] = useState('');
  const [ticketTopic, setTicketTopic] = useState('Cloud deployment');
  const [ticketDetail, setTicketDetail] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [backendState, setBackendState] = useState<
    'connecting' | 'connected' | 'demo'
  >('connecting');
  const [checkins, setCheckins] = useState(142);
  const [clock, setClock] = useState(3720);
  const [filterTrack, setFilterTrack] = useState('All tracks');
  const [matchSuggestions, setMatchSuggestions] = useState<Array<{name:string; members:Array<{name:string;role:string;skills:string}>; rationale:string}>>([]);
  const socketRef = useRef<ReturnType<typeof ws.connect> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const event = events.find(e => e.id === selectedEvent) || events[0];
  const eventTeams = teams.filter(t => (t as any).event_id ? (t as any).event_id === selectedEvent : selectedEvent === initialEvents[0].id);
  const unassignedRegistrations = registrations.filter(r => r.teamCode.startsWith('UNASSIGNED-'));
  const eventTickets = tickets.filter(t => (t as any).event_id ? (t as any).event_id === selectedEvent : selectedEvent === initialEvents[0].id);
  const eventJudgeScores = eventTeams.flatMap((team,ti) => judges.slice(0,3).map((judge,ji) => ({
    event_id:selectedEvent,team_id:team.id,judge_id:judge.id,
    value:Math.max(4,Math.min(10,Number((team.score/10 + [-1.1,0.35,0.9][ji] + (((ti+ji)%3)-1)*0.25).toFixed(1))))
  })));
  const visibleJudgeScores = [...eventJudgeScores,...judgeScores.filter(s=>s.event_id===selectedEvent)];
  const judgeCalibration = judges.map(j=>{const vals=visibleJudgeScores.filter(s=>s.judge_id===j.id).map(s=>s.value);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:j.avg;const sd=vals.length?Math.sqrt(vals.reduce((a,b)=>a+(b-avg)**2,0)/vals.length):1;return {...j,observedAvg:avg,observedSd:sd,count:vals.length};});
  const calibratedTeams = eventTeams.map(team=>{const normalized=visibleJudgeScores.filter(s=>s.team_id===team.id).map(s=>{const judge=judgeCalibration.find(j=>j.id===s.judge_id);return judge?Math.max(0,Math.min(10,7+(s.value-judge.observedAvg)/Math.max(judge.observedSd,0.6)*1.25)):s.value;});return {...team,calibrated:normalized.length?normalized.reduce((a,b)=>a+b,0)/normalized.length*10:team.score};});
  const filteredTeams = useMemo(
    () =>
      eventTeams.filter(
        t =>
          (filterTrack === 'All tracks' || t.track === filterTrack) &&
          (t.name + t.project + t.id)
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [eventTeams, search, filterTrack]
  );
  const sortedTeams = useMemo(
    () => [...eventTeams].sort((a, b) => b.score - a.score),
    [eventTeams]
  );
  const ranked = useMemo(() => {
    return [...calibratedTeams].sort((a, b) => rawMode ? b.score - a.score : b.calibrated - a.calibrated);
  }, [eventTeams, rawMode, visibleJudgeScores]);

  useEffect(() => {
    let alive = true;
    api
      .get('/api/hackpulse/state')
      .then(({ data }) => {
        if (!alive) return;
        if (data?.teams?.length) setTeams(data.teams);
        if (data?.judges?.length) setJudges(data.judges);
        if (data?.tickets?.length) setTickets(data.tickets);
        if (data?.events?.length) setEvents(data.events);
        setBackendState('connected');
      })
      .catch(() => setBackendState('demo'));
    const conn = ws.connect();
    socketRef.current = conn;
    conn.onMessage(message => {
      if (
        message?.type !== 'entity.update' ||
        message?.payload?.entity_type !== 'hackpulse'
      )
        return;
      const data = message.payload.data;
      if (data?.teams) setTeams(data.teams);
      if (data?.tickets) setTickets(data.tickets);
      if (data?.announcements) setAnnouncements(data.announcements);
      if (typeof data?.checkins === 'number') setCheckins(data.checkins);
    });
    conn.ready.catch(() => undefined);
    return () => {
      alive = false;
      conn.disconnect();
    };
  }, []);

  useEffect(() => {
    api.get('/api/hackpulse/registrations/' + selectedEvent)
      .then(({data}) => setRegistrations(data.registrations || []))
      .catch(() => setRegistrations([]));
  }, [selectedEvent]);
  useEffect(() => {
    document.documentElement.classList.toggle('portal-dark', dark);
    return () => document.documentElement.classList.remove('portal-dark');
  }, [dark]);

  useEffect(() => {
    const conn = socketRef.current;
    if (!conn) return;
    conn.ready.then(() => conn.join(selectedEvent)).catch(() => undefined);
  }, [selectedEvent]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setClock(value => Math.max(0, value - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }, [toast]);

  async function persist(
    action: string,
    payload: any,
    localUpdate: () => void,
    rollback?: () => void
  ) {
    localUpdate();
    try {
      await api.post('/api/hackpulse/action', {
        event_id: selectedEvent,
        action,
        payload,
      });
      setBackendState('connected');
    } catch (e) {
      rollback?.();
      setBackendState('demo');
      setToast(e instanceof Error ? e.message : 'Action failed');
    }
  }
  function addEvent() {
    if (!eventName.trim()) {
      setToast('Give your event a name first.');
      return;
    }
    const item = {
      id: 'EVT-' + String(Date.now()).slice(-6),
      name: eventName.trim(),
      date: eventDate || 'Date to be announced',
      venue: 'Venue to be announced',
      status: 'Draft',
      teams: 0,
      participants: 0,
    };
    setEvents(old => [...old, item]);
    setSelectedEvent(item.id);
    setEventName('');
    setEventDate('');
    setShowCreateEvent(false);
    setToast('Event created.');
    api
      .post('/api/hackpulse/events', item)
      .catch(() => setBackendState('demo'));
  }
  async function registerTeam() {
    if (!registrantName.trim() || !registrantEmail.trim() || !registrantCollege.trim() || !newTeamName.trim()) {
      setToast('Fill in your name, email, college and team name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrantEmail.trim())) {
      setToast('Enter a valid email address.');
      return;
    }
    const teamId = 'HP-' + String(Date.now()).slice(-6);
    const team = {
      id: teamId,
      name: newTeamName.trim(),
      project: newTeamProject.trim() || 'To be announced',
      track: newTeamTrack,
      members: 1,
      score: 0,
      status: 'Registered',
      room: 'To be assigned',
      event_id: selectedEvent,
    };
    try {
      const { data } = await api.post('/api/hackpulse/register-team', {
        event_id: selectedEvent,
        participant: {
          name: registrantName.trim(),
          email: registrantEmail.trim().toLowerCase(),
          college: registrantCollege.trim(),
        },
        team,
      });
      setTeams(old => [data.team, ...old.filter(t => t.id !== data.team.id)]);
      setShowRegistration(false);
      setRegistrantName('');
      setRegistrantEmail('');
      setRegistrantCollege('');
      setNewTeamName('');
      setNewTeamProject('');
      setToast('Team registered successfully. Team ID: ' + data.team.id);
      setBackendState('connected');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    }
  }
  function generateSchedule() {
    const rooms = ['Room A', 'Room B', 'Room C', 'Room D'];
    const slots = [
      '10:00',
      '10:20',
      '10:40',
      '11:00',
      '11:20',
      '11:40',
      '12:00',
      '12:20',
      '12:40',
    ];
    const conflicts = new Set(['J-02:HP-019', 'J-04:HP-008']);
    const next: Schedule[] = [];
    const used = new Set<string>();
    eventTeams.forEach((team, index) => {
      const preferred = judges.slice().sort((a, b) => a.assigned - b.assigned);
      let count = 0;
      for (const judge of preferred) {
        if (count >= 3) break;
        const key = judge.id + ':' + team.id;
        if (conflicts.has(key)) continue;
        let slotIndex = (index + count) % slots.length;
        while (used.has(judge.id + ':' + slots[slotIndex]))
          slotIndex = (slotIndex + 1) % slots.length;
        used.add(judge.id + ':' + slots[slotIndex]);
        next.push({
          team: team.name,
          judge: judge.name,
          room: rooms[index % rooms.length],
          slot: slots[slotIndex],
        });
        count++;
      }
    });
    setSchedule(next);
    setToast('Schedule generated: 3 judge reviews per team, conflict exclusions applied.');
    const day = new Date().toISOString().slice(0, 10);
    api
      .post('/api/hackpulse/schedule', {
        event_id: selectedEvent,
        schedule: next.map(s => ({ ...s, startAt: new Date(`${day}T${s.slot}:00`).toISOString() })),
      })
      .catch(e => { setBackendState('demo'); setToast(e instanceof Error ? e.message : 'Schedule not saved.'); });
  }
  async function addScore(teamId: string) {
    const value = Math.max(0, Math.min(10, Number(scoreValue)));
    if (!Number.isFinite(value)) {
      setToast('Enter a valid score.');
      return;
    }
    if (!eventTeams.find(t => t.id === teamId)) return;
    try {
      await api.post('/api/hackpulse/score', { event_id: selectedEvent, team_id: teamId, judge_id: scoreJudge, criterion_id: 'overall', value });
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Score was not saved.');
      return;
    }
    setTeams(teams.map(t => t.id === teamId ? { ...t, score: Math.round((t.score * 0.65 + value * 10 * 0.35) * 10) / 10 } : t));
    setJudgeScores(old => [...old, { event_id: selectedEvent, team_id: teamId, judge_id: scoreJudge, value }]);
    setShowScore(null);
    setToast('Score saved and leaderboard updated.');
  }
  function claimTicket(id: string) {
    const previous = tickets;
    persist('ticket.claim', { id },
      () => setTickets(old => old.map(t => t.id === id ? { ...t, status: 'Claimed', mentor: 'You (Mentor)' } : t)),
      () => setTickets(previous));
    setToast('Ticket claimed.');
  }
  function resolveTicket(id: string) {
    const previous = tickets;
    persist('ticket.resolve', { id },
      () => setTickets(old => old.map(t => (t.id === id ? { ...t, status: 'Resolved' } : t))),
      () => setTickets(previous));
    setToast('Ticket resolved.');
  }
  async function createTicket() {
    if (!ticketDetail.trim()) {
      setToast('Add a short description for the mentor.');
      return;
    }
    try {
      const { data } = await api.post('/api/hackpulse/tickets', {
        event_id: selectedEvent,
        ticket: { team: 'Your team', topic: ticketTopic, detail: ticketDetail.trim(), priority: 'Normal' },
      });
      setTickets(old => [{ ...data.ticket, event_id: selectedEvent } as any, ...old]);
      setTicketDetail('');
      setToast('Help request added to the queue.');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not create the request.');
    }
  }
  function publishAnnouncement() {
    if (!announcement.trim()) return;
    const previous = announcements;
    const updated = [announcement.trim(), ...announcements];
    setAnnouncements(updated);
    setAnnouncement('');
    persist('announcement.create', { text: updated[0] }, () => setAnnouncements(updated), () => setAnnouncements(previous));
    setToast('Announcement published.');
  }
  async function simulateScan() {
    if (!couponCode.trim()) {
      setToast('Enter a participant or coupon code.');
      return;
    }
    const code = couponCode.trim().toUpperCase();
    try {
      const { data } = await api.post('/api/hackpulse/checkin', { event_id: selectedEvent, code });
      setScanResult('Verified · ' + code + ' · ' + (data.kind === 'meal' ? 'Meal coupon redeemed' : data.kind === 'swag' ? 'Swag coupon redeemed' : 'Participant checked in'));
      if (typeof data.checkins === 'number') setCheckins(data.checkins);
    } catch (e) {
      setScanResult('Rejected · ' + code + ' · ' + (e instanceof Error ? e.message : 'Failed'));
    }
    setCouponCode('');
  }
  const navLabel = navItems.find(n => n.id === active)?.label || 'Overview';
  const initialsAvatar = (name: string) => (
    <span className="avatar">{initials(name)}</span>
  );

  return (
    <div className="app-shell">
      <aside className={cx('sidebar', mobileNav && 'sidebar-open')}>
        <div className="brand">
          <div className="brand-mark">
            <Command size={19} />
          </div>
          <div>
            <strong>
              hackpulse<span>.</span>
            </strong>
            <small>EVENT OPERATING SYSTEM</small>
          </div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="event-switcher" onClick={() => setActive('events')}>
          <span className="event-dot" />
          <span>
            <b>{event.name}</b>
            <small>
              {event.status} · {event.date}
            </small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-caption">OPERATIONS</div>
        <nav>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActive(item.id);
                  setMobileNav(false);
                }}
                className={cx('nav-item', active === item.id && 'active')}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.id === 'helpdesk' && (
                  <i>{eventTickets.filter(t => t.status !== 'Resolved').length}</i>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="event-progress">
            <div className="progress-top">
              <span>Event readiness</span>
              <b>78%</b>
            </div>
            <div className="progress-track">
              <i />
            </div>
            <small>12 of 15 setup tasks done</small>
          </div>
          <div className="profile profile-control">
            <div className="profile-avatar">{initials(user.name)}</div>
            <div>
              <b>{user.name}</b>
              <small>Event organizer</small>
            </div>
            <button className="profile-menu-trigger" onClick={()=>setProfileOpen(v=>!v)} aria-label="Open profile menu" aria-expanded={profileOpen}><MoreHorizontal size={18} /></button>
            {profileOpen&&<div className="profile-menu"><button onClick={()=>{setActive('overview');setProfileOpen(false);}}><UserRound size={15}/> User Profile</button><button onClick={()=>setDark(v=>!v)}><Moon size={15}/> {dark?'Light theme':'Dark theme'}</button><button className="profile-menu-danger" onClick={onLogout}><LogOut size={15}/> Logout</button></div>}
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="scrim"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}
      <main className="main">
        <header className="topbar">
          <div className="top-left">
            <button
              className="mobile-menu icon-btn"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={19} />
            </button>
            <span className="crumb">
              HackPulse <ChevronRight size={14} /> <b>{navLabel}</b>
            </span>
          </div>
          <div className="top-actions">
            <span className={cx('connection', backendState)}>
              <i />
              {backendState === 'connected'
                ? 'Live sync'
                : backendState === 'demo'
                  ? 'Demo mode'
                  : 'Connecting'}
            </span>
            <button
              className="icon-btn"
              onClick={() => setToast('You are all caught up.')}
            >
              <Bell size={18} />
              <em />
            </button>
            <button className="help-link" onClick={() => setActive('helpdesk')}>
              <HelpCircle size={16} /> Help
            </button>
            <div className="top-avatar">MH</div>
          </div>
        </header>
        <div className="page">
          {active === 'overview' && (
            <section>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    SATURDAY, NOVEMBER 14, 2026{' '}
                    <span className="live-pill">
                      <i /> EVENT LIVE
                    </span>
                  </div>
                  <h1>
                    Good morning, Manya <span>✦</span>
                  </h1>
                  <p>Here’s what’s happening across your event today.</p>
                </div>
                <button
                  className="primary-btn"
                  onClick={() => setShowCreateEvent(true)}
                >
                  <Plus size={16} /> Create event
                </button>
              </div>
              <div className="event-overview-grid">
                {events.map(ev => {
                  const list = teams.filter(t => (t as any).event_id ? (t as any).event_id === ev.id : ev.id === initialEvents[0].id);
                  const judged = list.filter(t => /judg|complete/i.test(t.status)).length;
                  const presenting = list.filter(t => /present/i.test(t.status)).length;
                  const waiting = list.filter(t => /queue|registered|check/i.test(t.status)).length;
                  return <div className={cx('event-overview-card', selectedEvent === ev.id && 'selected')} key={ev.id}>
                    <div className="event-overview-top"><span className="event-overview-status"><i /> {ev.status}</span><span className="event-overview-date">{ev.date}</span></div>
                    <h3>{ev.name}</h3><p>{ev.venue}</p>
                    <div className="event-overview-counts"><div><b>{list.length}</b><small>Teams</small></div><div><b>{ev.participants}</b><small>Participants</small></div></div>
                    <div className="event-status-breakdown"><span><i className="green" /> {judged} judged</span><span><i className="blue" /> {presenting} presenting</span><span><i className="amber" /> {waiting} queued / registered</span></div>
                    <button className="text-btn" onClick={() => { setSelectedEvent(ev.id); setActive('teams'); }}>Manage this event <ArrowUpRight size={14} /></button>
                  </div>;
                })}
              </div>
              <div className="overview-section-heading"><div className="overview-event-picker"><label htmlFor="overview-event-select">Selected event</label><select id="overview-event-select" className="event-overview-select" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>{events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select><p>Metrics and activity for this event.</p></div><button className="outline-btn small" onClick={() => setActive('events')}>Manage events</button></div>
              <div className="metric-grid">
                <Metric
                  icon={<Users />}
                  label="Registered participants"
                  value={event.participants.toString()}
                  change="+12.8%"
                  note="vs. last event"
                />
                <Metric
                  icon={<Target />}
                  label="Teams checked in"
                  value={checkins.toString() + ' / ' + eventTeams.length}
                  change="76%"
                  note="of registered teams"
                />
                <Metric
                  icon={<Trophy />}
                  label="Judging progress"
                  value="68%"
                  change="32 teams"
                  note="fully evaluated"
                />
                <Metric
                  icon={<Clock3 />}
                  label="Time remaining"
                  value="01:02:00"
                  change="Round 2"
                  note="final judging"
                />
              </div>
              <div className="dashboard-grid">
                <div className="panel leaderboard-panel">
                  <PanelHeader
                    title="Leaderboard"
                    subtitle="Live ranking · raw team average"
                    action={
                      <button
                        className="text-btn"
                        onClick={() => setActive('judging')}
                      >
                        View all <ChevronRight size={14} />
                      </button>
                    }
                  />
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>RANK / TEAM</th>
                          <th>TRACK</th>
                          <th>AVG. SCORE</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTeams.slice(0, 5).map((t, i) => (
                          <tr key={t.id}>
                            <td>
                              <div className="team-cell">
                                <span className={cx('rank', i === 0 && 'gold')}>
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <div>
                                  <b>{t.name}</b>
                                  <small>{t.project}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="track-tag">{t.track}</span>
                            </td>
                            <td>
                              <strong>{t.score.toFixed(1)}</strong>
                              <small className="out-of"> / 100</small>
                            </td>
                            <td>
                              <span
                                className={cx(
                                  'status-dot',
                                  t.status === 'Presenting now'
                                    ? 'blue'
                                    : t.status === 'In queue'
                                      ? 'amber'
                                      : 'green'
                                )}
                              >
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="panel-foot">
                    <span>
                      <i className="legend-dot green" /> Judged{' '}
                      <i className="legend-dot amber" /> In queue{' '}
                      <i className="legend-dot blue" /> Presenting
                    </span>
                    <button
                      className="text-btn"
                      onClick={() => setActive('judging')}
                    >
                      Open scoring <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="panel activity-panel">
                  <PanelHeader
                    title="Live activity"
                    subtitle="Updates from your event"
                    action={
                      <span className="live-label">
                        <i /> LIVE
                      </span>
                    }
                  />
                  <div className="activity-list">
                    <ActivityItem
                      color="purple"
                      title="New team registered"
                      detail="Team Quantum Quokkas · AI / ML"
                      time="2 min ago"
                    />
                    <ActivityItem
                      color="green"
                      title="Judging completed"
                      detail="Pixel Pioneers · Room A"
                      time="8 min ago"
                    />
                    <ActivityItem
                      color="orange"
                      title="Help request opened"
                      detail="Neural Navigators · Cloud deployment"
                      time="11 min ago"
                    />
                    <ActivityItem
                      color="blue"
                      title="Check-in milestone"
                      detail="150 participants checked in"
                      time="18 min ago"
                    />
                  </div>
                  <button
                    className="activity-link"
                    onClick={() => setActive('mission')}
                  >
                    View event activity <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
              <div className="bottom-grid">
                <div className="panel ops-panel">
                  <PanelHeader
                    title="Operations at a glance"
                    subtitle="Your event, one control room"
                  />
                  <div className="ops-items">
                    <OpsItem
                      icon={<QrCode />}
                      label="Check-in desk"
                      detail="142 participants checked in"
                      pct={76}
                      onClick={() => setActive('checkin')}
                    />
                    <OpsItem
                      icon={<Trophy />}
                      label="Judging rooms"
                      detail="4 rooms · 18 teams in queue"
                      pct={68}
                      onClick={() => setActive('judging')}
                    />
                    <OpsItem
                      icon={<MessageSquare />}
                      label="Mentor help desk"
                      detail="3 requests need attention"
                      pct={42}
                      onClick={() => setActive('helpdesk')}
                    />
                  </div>
                </div>
                <div className="panel schedule-mini">
                  <PanelHeader
                    title="Up next"
                    subtitle="Judging schedule"
                    action={
                      <button
                        className="text-btn"
                        onClick={() => setActive('mission')}
                      >
                        Full schedule <ChevronRight size={14} />
                      </button>
                    }
                  />
                  <div className="up-next">
                    <span className="time-pill">14:20</span>
                    <div>
                      <b>Neural Navigators</b>
                      <small>Room A · Dr. Meera Rao</small>
                    </div>
                    <span className="soon-tag">In 8 min</span>
                  </div>
                  <div className="up-next">
                    <span className="time-pill">14:40</span>
                    <div>
                      <b>Cloud Nine</b>
                      <small>Room B · Kavya Menon</small>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
          {active === 'events' && (
            <section>
              <PageTitle
                eyebrow="EVENT MANAGEMENT"
                title="Your events"
                subtitle="Create, configure and switch between hackathons."
                action={
                  <button
                    className="primary-btn"
                    onClick={() => setShowCreateEvent(true)}
                  >
                    <Plus size={16} /> New event
                  </button>
                }
              />
              <div className="event-grid">
                {events.map(e => (
                  <div className="event-card" key={e.id}>
                    <div className="event-card-top">
                      <span className="event-icon">
                        <Zap />
                      </span>
                      <span
                        className={cx(
                          'pill',
                          e.status === 'Live' ? 'pill-green' : 'pill-blue'
                        )}
                      >
                        {e.status}
                      </span>
                    </div>
                    <h3>{e.name}</h3>
                    <p>
                      <CalendarDays size={14} /> {e.date}
                    </p>
                    <p>
                      <Target size={14} /> {e.venue}
                    </p>
                    <div className="event-card-stats">
                      <span>
                        <b>{e.teams}</b> teams
                      </span>
                      <span>
                        <b>{e.participants}</b> participants
                      </span>
                    </div>
                    <button
                      className="outline-btn"
                      onClick={() => {
                        setSelectedEvent(e.id);
                        setActive('teams');
                      }}
                    >
                      Open event <ArrowUpRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
          {active === 'teams' && (
            <section>
              <PageTitle
                eyebrow="PEOPLE & PARTICIPATION"
                title="Teams & participants"
                subtitle="Keep an eye on registrations, team formation and project submissions."
                action={
                  <div className="row-actions">
                    <button className="primary-btn" onClick={() => setShowRegistration(true)}>
                      <Plus size={15} /> Register a team
                    </button>
                    <button
                    className="outline-btn"
                    onClick={() =>
                      downloadCsv(
                        [
                          [
                            'Team ID',
                            'Team',
                            'Project',
                            'Track',
                            'Members',
                            'Score',
                          ],
                          ...eventTeams.map(t => [
                            t.id,
                            t.name,
                            t.project,
                            t.track,
                            String(t.members),
                            String(t.score),
                          ]),
                        ],
                        'hackpulse-teams.csv'
                      )
                    }
                  >
                    <Download size={15} /> Export CSV
                    </button>
                  </div>
                }
              />
              <div className="panel">
                <div className="toolbar">
                  <div className="search-box">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search teams or projects..."
                    />
                  </div>
                  <select
                    value={filterTrack}
                    onChange={e => setFilterTrack(e.target.value)}
                  >
                    <option>All tracks</option>
                    {Array.from(new Set(eventTeams.map(t => t.track))).map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    className="outline-btn small"
                    onClick={() =>
                      setToast('Registration link copied to clipboard.')
                    }
                  >
                    Copy invite link
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>TEAM</th>
                        <th>TEAM ID</th>
                        <th>TRACK</th>
                        <th>MEMBERS</th>
                        <th>PROJECT</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeams.map(t => (
                        <tr key={t.id}>
                          <td>
                            <b>{t.name}</b>
                          </td>
                          <td className="muted mono">{t.id}</td>
                          <td>
                            <span className="track-tag">{t.track}</span>
                          </td>
                          <td>{t.members} / 4</td>
                          <td>{t.project}</td>
                          <td>
                            <span className="status-dot green">{t.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="panel-foot">
                  <span>
                    Showing {filteredTeams.length} of {teams.length} teams
                  </span>
                  <span className="muted">Demo workspace data</span>
                </div>
              </div>
              <div className="panel unassigned-panel">
                <PanelHeader title="Awaiting team formation" subtitle={`${unassignedRegistrations.length} individually registered participant${unassignedRegistrations.length===1?'':'s'} remain visible for organiser matching.`} />
                {unassignedRegistrations.length===0 ? <div className="empty-state"><b>No unassigned participants</b><p>Everyone registered for this event is currently assigned to a team.</p></div> : <div className="unassigned-list">{unassignedRegistrations.map(r=><div key={r._id} className="unassigned-row"><div><b>{r.name}</b><small>{r.email} · {r.college||'College not provided'}</small></div><span className="track-tag">{r.status}</span></div>)}</div>}
              </div>
              <div className="matchmaker panel">
                <div>
                  <span className="feature-icon"><Sparkles /></span>
                  <h3>Team matchmaker</h3>
                  <p>Recommend balanced teams by complementary skills and preferred roles.</p>
                </div>
                <button className="primary-btn" onClick={() => {
                  const profiles = [
                    {name:'Aarav Sharma',role:'Frontend',skills:'React · UI design'},
                    {name:'Diya Nair',role:'Backend',skills:'Node.js · PostgreSQL'},
                    {name:'Kabir Menon',role:'ML / Data',skills:'Python · model evaluation'},
                    {name:'Meera Joshi',role:'Product / UX',skills:'Figma · user research'},
                    {name:'Rohan Shetty',role:'Backend',skills:'FastAPI · cloud'},
                    {name:'Sana Khan',role:'Frontend',skills:'TypeScript · accessibility'},
                    {name:'Ishaan Patel',role:'ML / Data',skills:'PyTorch · analytics'},
                    {name:'Tara Singh',role:'Product / UX',skills:'prototyping · pitching'},
                    {name:'Neil Thomas',role:'Security',skills:'OWASP · threat modelling'},
                    {name:'Aditi Kulkarni',role:'Frontend',skills:'React · design systems'},
                    {name:'Dev Malhotra',role:'Backend',skills:'Java · APIs'},
                    {name:'Ira Krishnan',role:'ML / Data',skills:'NLP · data pipelines'}
                  ];
                  const groups = [
                    {name:'AI Product Studio',ids:[0,1,2,3],rationale:'Frontend, backend, ML and product design are all represented.'},
                    {name:'Secure Web Innovators',ids:[5,4,8,7],rationale:'Pairs accessible frontend and cloud backend with security and product thinking.'},
                    {name:'Applied Intelligence Lab',ids:[9,10,6,11],rationale:'Combines interface design, API engineering, ML modelling and NLP.'},
                    {name:'Full-Stack Impact Team',ids:[0,4,2,7],rationale:'A balanced build team with a clear path from prototype to data-backed pitch.'}
                  ];
                  setMatchSuggestions(groups.map(g=>({...g,members:g.ids.map(i=>profiles[i])})));
                  setToast('Generated 4 suggested team combinations. See the results below.');
                }}>
                  <Sparkles size={15} /> Generate matches <ArrowUpRight size={14} />
                </button>
              </div>
              {matchSuggestions.length>0 && <div className="match-results">
                <div className="match-results-heading"><div><h3>Suggested team combinations</h3><p>Four balanced demo matches for {event.name}.</p></div><button className="text-btn" onClick={()=>setMatchSuggestions([])}><X size={14}/> Clear</button></div>
                <div className="match-results-grid">
                  {matchSuggestions.map((match,i)=><article className="match-result-card" key={match.name}>
                    <div className="match-result-top"><span>0{i+1}</span><b>{match.name}</b><small>4 candidates</small></div>
                    <div className="match-member-list">{match.members.map(member=><div className="match-member" key={member.name}><span className="avatar">{initials(member.name)}</span><div><b>{member.name}</b><small>{member.role} · {member.skills}</small></div></div>)}</div>
                    <p className="match-rationale"><Sparkles size={13}/>{match.rationale}</p>
                  </article>)}
                </div>
                <p className="match-demo-note">Demo suggestions use sample candidate profiles and rule-based skill complementarity. They are previews only; they do not create or change registered teams.</p>
              </div>}
            </section>
          )}
          {active === 'judging' && (
            <section>
              <PageTitle
                eyebrow="FAIR & TRANSPARENT EVALUATION"
                title="Judging & score engine"
                subtitle="Schedule reviews, capture rubric scores and compare calibrated results."
                action={
                  <button className="primary-btn" onClick={generateSchedule}>
                    <Sparkles size={15} /> Generate schedule
                  </button>
                }
              />
              <div className="feature-banner">
                <div className="feature-icon">
                  <Gauge />
                </div>
                <div>
                  <b>Judge calibration is on</b>
                  <p>
                    Scores can be normalized to account for consistently strict
                    or generous scoring patterns.
                  </p>
                </div>
                <span className="pill pill-green">Z-SCORE MODEL</span>
              </div>
              <div className="judging-grid">
                <div className="panel">
                  <PanelHeader
                    title="Leaderboard"
                    subtitle="Switch between raw and calibrated score."
                    action={
                      <div className="segmented">
                        <button
                          className={rawMode ? 'selected' : ''}
                          onClick={() => setRawMode(true)}
                        >
                          Raw
                        </button>
                        <button
                          className={!rawMode ? 'selected' : ''}
                          onClick={() => setRawMode(false)}
                        >
                          Calibrated
                        </button>
                      </div>
                    }
                  />
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>RANK</th>
                          <th>TEAM</th>
                          <th>{rawMode ? 'RAW SCORE' : 'CALIBRATED'}</th>
                          <th>CHANGE</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranked.map((t: any, i) => (
                          <tr key={t.id}>
                            <td>
                              <span className={cx('rank', i === 0 && 'gold')}>
                                {String(i + 1).padStart(2, '0')}
                              </span>
                            </td>
                            <td>
                              <b>{t.name}</b>
                              <small>{t.project}</small>
                            </td>
                            <td>
                              <b>
                                {(rawMode ? t.score : t.calibrated).toFixed(1)}
                              </b>
                              <small className="out-of"> / 100</small>
                            </td>
                            <td>
                              <span
                                className={i % 2 ? 'change-down' : 'change-up'}
                              >
                                {i % 2 ? '−0.8' : '+1.2'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="icon-btn"
                                title="Add score"
                                onClick={() => {
                                  setShowScore(t.id);
                                  setScoreValue('8');
                                }}
                              >
                                <Plus size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="panel-foot">
                    <span>
                      Calibration uses judge score distribution (mean and
                      standard deviation).
                    </span>
                    <button
                      className="text-btn"
                      onClick={() =>
                        downloadCsv(
                          [
                            ['Rank', 'Team', 'Raw', 'Calibrated'],
                            ...ranked.map((t: any, i) => [
                              String(i + 1),
                              t.name,
                              t.score.toFixed(1),
                              t.calibrated.toFixed(1),
                            ]),
                          ],
                          'hackpulse-leaderboard.csv'
                        )
                      }
                    >
                      <Download size={14} /> Export
                    </button>
                  </div>
                </div>
                <div className="panel judges-panel">
                  <PanelHeader
                    title="Judge overview"
                    subtitle="Scoring patterns and workload"
                  />
                  <div className="judge-list">
                    {judgeCalibration.map(j => (
                      <div className="judge-row" key={j.id}>
                        {initialsAvatar(j.name)}
                        <div className="judge-info">
                          <b>{j.name}</b>
                          <small>{j.specialty}</small>
                        </div>
                        <div className="judge-stat">
                          <b>{j.observedAvg.toFixed(1)}</b>
                          <small>avg / 10 · {j.count} scores</small>
                        </div>
                        <div className="judge-load">
                          <b>{j.assigned}</b>
                          <small>assigned</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="calibration-note">
                    <ShieldCheck size={16} />
                    <span>
                      Score distribution is reviewed before final ranks are
                      published.
                    </span>
                  </div>
                </div>
              </div>
              <div className="panel score-audit-panel">
                <PanelHeader title="Judge score breakdown" subtitle="Sampled and submitted scores by team and judge · out of 10" />
                <div className="table-wrap"><table><thead><tr><th>TEAM</th>{judges.map(j=><th key={j.id}>{j.name.split(' ')[0]}</th>)}</tr></thead><tbody>{eventTeams.map(team=><tr key={team.id}><td><b>{team.name}</b><small>{team.id}</small></td>{judges.map(j=>{const score=visibleJudgeScores.filter(s=>s.team_id===team.id&&s.judge_id===j.id).slice(-1)[0];return <td key={j.id}><b>{score?score.value.toFixed(1):'—'}</b><small>/ 10</small></td>})}</tr>)}</tbody></table></div>
                <div className="calibration-explainer"><div><b>1. Measure each judge</b><span>Calculate that judge's mean and standard deviation across submitted reviews.</span></div><div><b>2. Normalize each score</b><span>Convert the score to a z-score: (score − judge mean) ÷ judge standard deviation.</span></div><div><b>3. Put scores on a common scale</b><span>Shift normalized scores around a shared 7/10 baseline, then average each team's adjusted reviews.</span></div><div><b>4. Compare fairly</b><span>Multiply the adjusted team average by 10 to show the calibrated score out of 100. Small samples are illustrative.</span></div></div>
              </div>
              <div className="panel schedule-panel">
                <PanelHeader
                  title="Generated judging schedule"
                  subtitle={
                    schedule.length
                      ? schedule.length + ' review slots assigned'
                      : 'No generated schedule yet'
                  }
                  action={
                    <button className="text-btn" onClick={generateSchedule}>
                      Regenerate <ArrowUpRight size={14} />
                    </button>
                  }
                />
                {schedule.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>TIME</th>
                          <th>TEAM</th>
                          <th>JUDGE</th>
                          <th>ROOM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.slice(0, 18).map((s, i) => (
                          <tr key={i}>
                            <td className="mono">{s.slot}</td>
                            <td>
                              <b>{s.team}</b>
                            </td>
                            <td>{s.judge}</td>
                            <td>{s.room}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={<CalendarDays />}
                    title="Your judging grid is empty"
                    detail="Generate a conflict-aware schedule with three reviews per team."
                  />
                )}
              </div>
            </section>
          )}
          {active === 'mission' && (
            <section>
              <PageTitle
                eyebrow="THE EVENT FLOOR"
                title="Mission Control"
                subtitle="A live, projector-ready view of the hackathon floor."
                action={
                  <span className="live-pill">
                    <i /> LIVE DISPLAY
                  </span>
                }
              />
              <div className="mission-hero">
                <div>
                  <span className="mission-eyebrow">
                    <Radio size={14} /> BROADCASTING LIVE
                  </span>
                  <h2>
                    Build something
                    <br />
                    <em>that matters.</em>
                  </h2>
                  <p>
                    {event.name} · {event.venue}
                  </p>
                </div>
                <div className="countdown">
                  <small>ROUND 2 ENDS IN</small>
                  <strong>
                    {String(Math.floor(clock / 3600)).padStart(2, '0')}:
                    {String(Math.floor((clock % 3600) / 60)).padStart(2, '0')}:
                    {String(clock % 60).padStart(2, '0')}
                  </strong>
                  <span>Final judging window</span>
                </div>
              </div>
              <div className="mission-stats">
                <div>
                  <span>CHECKED IN</span>
                  <b>{checkins}</b>
                  <small>of {event.participants} participants</small>
                </div>
                <div>
                  <span>TEAMS PRESENTING</span>
                  <b>04</b>
                  <small>across 4 rooms</small>
                </div>
                <div>
                  <span>PROJECTS SUBMITTED</span>
                  <b>38</b>
                  <small>79% completion</small>
                </div>
                <div>
                  <span>OPEN HELP TICKETS</span>
                  <b>{eventTickets.filter(t => t.status !== 'Resolved').length}</b>
                  <small>mentor support queue</small>
                </div>
              </div>
              <div className="mission-columns">
                <div className="panel">
                  <PanelHeader
                    title="Judging floor"
                    subtitle="Live room assignments"
                    action={
                      <span className="live-label">
                        <i /> LIVE
                      </span>
                    }
                  />
                  {eventTeams.slice(0, 4).map(t => (
                    <div className="floor-row" key={t.id}>
                      <div className="room-box">
                        {t.room.replace('Room ', '')}
                      </div>
                      <div>
                        <b>{t.name}</b>
                        <small>{t.project}</small>
                      </div>
                      <span
                        className={cx(
                          'floor-status',
                          t.status === 'Presenting now'
                            ? 'presenting'
                            : 'waiting'
                        )}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="panel announcement-panel">
                  <PanelHeader
                    title="Announcements"
                    subtitle="Broadcast to every participant"
                  />
                  <div className="announcement-form">
                    <input
                      value={announcement}
                      onChange={e => setAnnouncement(e.target.value)}
                      onKeyDown={e =>
                        e.key === 'Enter' && publishAnnouncement()
                      }
                      placeholder="Write an announcement..."
                    />
                    <button
                      className="primary-btn square"
                      onClick={publishAnnouncement}
                    >
                      <Send size={15} />
                    </button>
                  </div>
                  <div className="announcement-list">
                    {announcements.map((a, i) => (
                      <div key={i}>
                        <span className="announcement-dot" />
                        <p>{a}</p>
                        <small>{i === 0 ? 'Just now' : 'Earlier'}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
          {active === 'helpdesk' && (
            <section>
              <PageTitle
                eyebrow="MENTOR SUPPORT"
                title="Mentor help desk"
                subtitle="Route blockers to the right mentor and keep teams moving."
                action={
                  <span className="pill pill-blue">
                    {eventTickets.filter(t => t.status !== 'Resolved').length} active
                    tickets
                  </span>
                }
              />
              <div className="helpdesk-layout">
                <div className="panel ticket-panel">
                  <PanelHeader
                    title="Incoming requests"
                    subtitle="Prioritized by urgency and arrival time"
                    action={
                      <select className="compact-select">
                        <option>All topics</option>
                        <option>Cloud deployment</option>
                        <option>Hardware</option>
                      </select>
                    }
                  />
                  {eventTickets.map(t => (
                    <div className="ticket-row" key={t.id}>
                      <div className="ticket-top">
                        <span
                          className={cx(
                            'priority',
                            t.priority === 'High' ? 'high' : 'normal'
                          )}
                        >
                          {t.priority} priority
                        </span>
                        <span
                          className={cx(
                            'pill',
                            t.status === 'Resolved'
                              ? 'pill-green'
                              : t.status === 'Claimed'
                                ? 'pill-blue'
                                : 'pill-amber'
                          )}
                        >
                          {t.status}
                        </span>
                      </div>
                      <h3>{t.topic}</h3>
                      <b className="ticket-team">
                        {t.team} · {t.id}
                      </b>
                      <p>{t.detail}</p>
                      <div className="ticket-bottom">
                        {t.mentor ? (
                          <span>Assigned to {t.mentor}</span>
                        ) : (
                          <span>Estimated wait · 8–12 min</span>
                        )}
                        {t.status === 'Open' ? (
                          <button
                            className="outline-btn small"
                            onClick={() => claimTicket(t.id)}
                          >
                            Claim ticket
                          </button>
                        ) : t.status === 'Claimed' ? (
                          <button
                            className="text-btn"
                            onClick={() => resolveTicket(t.id)}
                          >
                            <Check size={14} /> Resolve
                          </button>
                        ) : (
                          <span className="resolved-label">
                            <CheckCircle2 size={14} /> Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="panel raise-panel">
                  <PanelHeader
                    title="Raise a help request"
                    subtitle="Participant view preview"
                  />
                  <div className="form-field">
                    <label>Topic</label>
                    <select
                      value={ticketTopic}
                      onChange={e => setTicketTopic(e.target.value)}
                    >
                      <option>Cloud deployment</option>
                      <option>Dataset / APIs</option>
                      <option>Hardware</option>
                      <option>Frontend / UI</option>
                      <option>Backend / Database</option>
                      <option>Pitch & product</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>What are you stuck on?</label>
                    <textarea
                      rows={5}
                      value={ticketDetail}
                      onChange={e => setTicketDetail(e.target.value)}
                      placeholder="Describe the blocker so a mentor can help..."
                    />
                  </div>
                  <button className="primary-btn full" onClick={createTicket}>
                    Submit help request <ArrowUpRight size={14} />
                  </button>
                  <div className="wait-info">
                    <Clock3 size={16} />
                    <span>
                      Typical response time<strong>8–12 minutes</strong>
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}
          {active === 'checkin' && (
            <section>
              <PageTitle
                eyebrow="ON-SITE OPERATIONS"
                title="Check-in & perks"
                subtitle="Validate participant entry and prevent duplicate redemptions."
                action={
                  <span className="pill pill-green">
                    <CheckCircle2 size={13} /> Scanner ready
                  </span>
                }
              />
              <div className="checkin-grid">
                <div className="panel scanner-panel">
                  <div className="scanner-top">
                    <div className="scanner-icon">
                      <QrCode size={27} />
                    </div>
                    <span className="pill pill-green">ONLINE · SYNCED</span>
                  </div>
                  <h2>Scan a pass or coupon</h2>
                  <p>
                    Enter a QR payload or scan code. Each meal and swag coupon
                    can be redeemed once.
                  </p>
                  <div className="scan-demo">
                    <div className="qr-visual">
                      <QrCode size={92} strokeWidth={1.2} />
                    </div>
                    <div className="scan-input">
                      <label>QR / PASS CODE</label>
                      <input
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && simulateScan()}
                        placeholder="e.g. HP-PASS-1042"
                      />
                      <button
                        className="primary-btn full"
                        onClick={simulateScan}
                      >
                        <QrCode size={15} /> Validate code
                      </button>
                    </div>
                  </div>
                  {scanResult && (
                    <div className="scan-result">
                      <CheckCircle2 size={16} />
                      {scanResult}
                    </div>
                  )}
                  <div className="scanner-foot">
                    <span>
                      <ShieldCheck size={14} /> Duplicate redemption protection
                    </span>
                    <span>
                      <Activity size={14} /> Offline queue: ready
                    </span>
                  </div>
                </div>
                <div className="side-stats">
                  <div className="panel">
                    <span className="stat-kicker">PARTICIPANTS CHECKED IN</span>
                    <strong>{checkins}</strong>
                    <div className="thin-progress">
                      <i
                        style={{
                          width:
                            Math.min(
                              100,
                              (checkins / Math.max(1, event.participants)) * 100
                            ) + '%',
                        }}
                      />
                    </div>
                    <small>
                      {Math.round(
                        (checkins / Math.max(1, event.participants)) * 100
                      )}
                      % of registered participants
                    </small>
                  </div>
                  <div className="panel coupon-card">
                    <span className="stat-kicker">REDEMPTION STATUS</span>
                    <div className="coupon-line">
                      <span>Meal coupons</span>
                      <b>118 / 186</b>
                    </div>
                    <div className="coupon-line">
                      <span>Swag coupons</span>
                      <b>96 / 186</b>
                    </div>
                    <div className="coupon-line">
                      <span>Duplicate scans blocked</span>
                      <b>07</b>
                    </div>
                  </div>
                  <div className="panel">
                    <span className="stat-kicker">VOLUNTEER DESK</span>
                    <div className="volunteer">
                      <span className="avatar">AS</span>
                      <div>
                        <b>Ananya S.</b>
                        <small>Gate 01 · Active</small>
                      </div>
                      <span className="online-dot" />
                    </div>
                    <div className="volunteer">
                      <span className="avatar">RK</span>
                      <div>
                        <b>Rohan K.</b>
                        <small>Gate 02 · Active</small>
                      </div>
                      <span className="online-dot" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
          {active === 'certificates' && (
            <section>
              <PageTitle
                eyebrow="RECOGNITION & PROOF"
                title="Certificates"
                subtitle="Issue unique certificates and verify them publicly by certificate ID."
                action={
                  <button className="primary-btn" onClick={() => { downloadCertificatesZip(event.name,eventTeams); setToast('Certificate ZIP generated for '+eventTeams.length+' demo teams.'); }}><Download size={15} /> Download certificates ZIP</button>
                }
              />
              <div className="certificate-hero">
                <div className="certificate-art">
                  <div className="cert-seal">
                    <Award size={28} />
                  </div>
                  <small>CERTIFICATE OF PARTICIPATION</small>
                  <h2>
                    Certificate
                    <br />
                    <em>of achievement</em>
                  </h2>
                  <div className="cert-line" />
                  <b>Alex Morgan</b>
                  <span>for participating in HackPulse Buildathon 2026</span>
                  <div className="cert-footer">
                    <span>HP-2026-00482</span>
                    <span>✦ HACKPULSE</span>
                  </div>
                </div>
                <div className="certificate-copy">
                  <span className="feature-icon">
                    <ShieldCheck />
                  </span>
                  <h2>Recognition that can be verified.</h2>
                  <p>
                    Every certificate receives a unique ID and a QR-linked
                    verification page. Anyone can confirm its authenticity
                    without signing in.
                  </p>
                  <div className="cert-meta">
                    <div>
                      <small>ISSUED THIS EVENT</small>
                      <b>{eventTeams.reduce((sum,t)=>sum+Math.max(2,Math.min(t.members||3,4)),0)} sample certificates</b>
                    </div>
                    <div>
                      <small>VERIFICATION STATUS</small>
                      <b className="verified">
                        <CheckCircle2 size={15} /> Public verification on
                      </b>
                    </div>
                  </div>
                  <div className="cert-actions">
                    <button className="primary-btn" onClick={() => downloadCertificatesZip(event.name,eventTeams)}><Download size={15} /> Download ZIP batch</button>
                    <button
                      className="outline-btn"
                      onClick={() =>
                        setToast(
                          'Verification preview: HP-2026-00482 is valid.'
                        )
                      }
                    >
                      Verify a certificate <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="panel verify-panel">
                <div>
                  <b>Public certificate verification</b>
                  <small>
                    Share this URL pattern with recipients:
                    /verify/HP-2026-00482
                  </small>
                </div>
                <button
                  className="outline-btn small"
                  onClick={() => setToast('Verification link copied.')}
                >
                  Copy verification link
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
      {showRegistration && (
        <div className="modal-backdrop" onClick={() => setShowRegistration(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">PARTICIPANT SIGN-UP</span>
                <h2>Register your team</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowRegistration(false)}><X size={18} /></button>
            </div>
            <p className="modal-copy">Register the team captain and create your team for {event.name}. Teammates can be added by the organizer after registration.</p>
            <div className="form-field"><label>Team name *</label><input autoFocus value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="e.g. Byte Builders" /></div>
            <div className="form-field"><label>Project idea (optional)</label><input value={newTeamProject} onChange={e => setNewTeamProject(e.target.value)} placeholder="What are you building?" /></div>
            <div className="form-field"><label>Track</label><select value={newTeamTrack} onChange={e => setNewTeamTrack(e.target.value)}><option>AI / ML</option><option>Web Development</option><option>Cybersecurity</option><option>Data Science</option><option>IoT / Hardware</option><option>Open Innovation</option></select></div>
            <div className="form-field"><label>Team captain name *</label><input value={registrantName} onChange={e => setRegistrantName(e.target.value)} placeholder="Your full name" /></div>
            <div className="form-field"><label>Email address *</label><input type="email" value={registrantEmail} onChange={e => setRegistrantEmail(e.target.value)} placeholder="you@example.com" /></div>
            <div className="form-field"><label>College / institution *</label><input value={registrantCollege} onChange={e => setRegistrantCollege(e.target.value)} placeholder="Your college" /></div>
            <div className="modal-actions">
              <button className="outline-btn" onClick={() => setShowRegistration(false)}>Cancel</button>
              <button className="primary-btn" onClick={registerTeam}>Submit registration <ArrowUpRight size={14} /></button>
            </div>
          </div>
        </div>
      )}
      {showCreateEvent && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCreateEvent(false)}
        >
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">NEW WORKSPACE</span>
                <h2>Create an event</h2>
              </div>
              <button
                className="icon-btn"
                onClick={() => setShowCreateEvent(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-field">
              <label>Event name</label>
              <input
                autoFocus
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="e.g. HackPulse Buildathon"
              />
            </div>
            <div className="form-field">
              <label>Event date</label>
              <input
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                placeholder="e.g. Dec 12–13, 2026"
              />
            </div>
            <div className="modal-actions">
              <button
                className="outline-btn"
                onClick={() => setShowCreateEvent(false)}
              >
                Cancel
              </button>
              <button className="primary-btn" onClick={addEvent}>
                Create event <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
      {showScore && (
        <div className="modal-backdrop" onClick={() => setShowScore(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">JUDGE WORKSPACE</span>
                <h2>Submit a score</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowScore(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal-copy">
              Score {eventTeams.find(t => t.id === showScore)?.name} against the
              event rubric.
            </p>
            <div className="form-field">
              <label>Judge</label>
              <select
                value={scoreJudge}
                onChange={e => setScoreJudge(e.target.value)}
              >
                {judges.map(j => (
                  <option value={j.id} key={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Overall score (out of 10)</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={scoreValue}
                onChange={e => setScoreValue(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                className="outline-btn"
                onClick={() => setShowScore(null)}
              >
                Cancel
              </button>
              <button
                className="primary-btn"
                onClick={() => addScore(showScore)}
              >
                Save score
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} /> {toast}
          <button onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  change,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  note: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span className="metric-icon">{icon}</span>
        <span className="metric-change">{change}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}
function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function ActivityItem({
  color,
  title,
  detail,
  time,
}: {
  color: string;
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <div className="activity-item">
      <span className={'activity-icon ' + color}>
        <Activity size={15} />
      </span>
      <div>
        <b>{title}</b>
        <small>{detail}</small>
      </div>
      <time>{time}</time>
    </div>
  );
}
function OpsItem({
  icon,
  label,
  detail,
  pct,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  pct: number;
  onClick: () => void;
}) {
  return (
    <button className="ops-item" onClick={onClick}>
      <span className="ops-icon">{icon}</span>
      <span className="ops-copy">
        <b>{label}</b>
        <small>{detail}</small>
        <i>
          <em style={{ width: pct + '%' }} />
        </i>
      </span>
      <strong>{pct}%</strong>
      <ChevronRight size={15} />
    </button>
  );
}
function PageTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <b>{title}</b>
      <p>{detail}</p>
    </div>
  );
}

// ManagerWorkspace is mounted by the role-aware PortalRouter.
