import { Router } from 'express';
import { z } from 'zod';
import { ZipArchive } from 'archiver';
import { Event,Team,Registration,User,JudgeAssignment,Score,Rubric,Schedule,Ticket,Announcement,Checkin,Coupon,Certificate,Project } from '../models/index.js';
import { authenticate,allowRoles,managerOnly } from '../middleware/auth.js';
import { makeId,makeCertificateId,emitEvent,audit } from '../services/common.js';

const router=Router();
const manager=[authenticate,allowRoles('manager')];
const staff=[authenticate,allowRoles('manager','judge','mentor','volunteer')];
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const eventExists=async id=>Event.exists({eventId:id});
const isMember=async(user,eventId,teamId)=>Registration.exists({eventId,email:user.email,...(teamId?{teamCode:teamId}:{}),status:{$ne:'Rejected'}});
const registrationState=e=>{
  if(e.status==='Completed')return 'Event completed';
  if(e.status==='Archived')return 'Registration closed';
  if(!e.registrationOpen)return 'Registration closed';
  if(e.registrationDeadline&&e.registrationDeadline.getTime()<=Date.now())return 'Registration deadline has passed';
  return e.status==='Draft'?'Registration opens soon':'Registration is open';
};
const canRegister=e=>e.status!=='Completed'&&e.status!=='Archived'&&e.status!=='Live'&&e.registrationOpen&&(!e.registrationDeadline||e.registrationDeadline.getTime()>Date.now());
const eventSummary=async e=>({id:e.eventId,name:e.name,date:e.date,venue:e.venue,status:e.status,registrationOpen:e.registrationOpen,registrationDeadline:e.registrationDeadline,registrationState:registrationState(e),canRegister:canRegister(e),resultsReleased:e.resultsReleased,teamSizeMin:e.teamSizeMin,teamSizeMax:e.teamSizeMax,tracks:e.tracks,teams:await Team.countDocuments({event_id:e.eventId}),participants:await Registration.countDocuments({eventId:e.eventId,status:{$ne:'Rejected'}})});
async function recomputeTeamScores(event_id){
  const scores=await Score.find({event_id});
  const byJudge=new Map();
  for(const s of scores){if(!byJudge.has(String(s.judge_id)))byJudge.set(String(s.judge_id),[]);byJudge.get(String(s.judge_id)).push(s.value);}
  const stats=new Map();
  for(const [j,vals] of byJudge){
    const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
    const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length);
    stats.set(j,{mean,sd:Math.max(sd,0.5)});
  }
  const byTeam=new Map();
  for(const s of scores){if(!byTeam.has(s.team_id))byTeam.set(s.team_id,[]);byTeam.get(s.team_id).push(s);}
  const ops=[];
  for(const [team_id,list] of byTeam){
    const raw=list.reduce((a,s)=>a+s.value,0)/list.length*10;
    const cal=list.reduce((a,s)=>{const st=stats.get(String(s.judge_id));return a+Math.max(0,Math.min(10,7+(s.value-st.mean)/st.sd));},0)/list.length*10;
    ops.push({updateOne:{filter:{id:team_id,event_id},update:{score:Number(raw.toFixed(1)),calibratedScore:Number(cal.toFixed(1))}}});
  }
  if(ops.length)await Team.bulkWrite(ops);
}

router.get('/state',authenticate,asyncRoute(async(req,res)=>{
  let eventFilter={},teamFilter={},ticketFilter={},announcementFilter={};
  if(req.user.role==='student'){
    const regs=await Registration.find({userId:req.user._id,status:{$ne:'Rejected'}});
    const ids=[...new Set(regs.map(r=>r.eventId))];
    eventFilter={eventId:{$in:ids}};teamFilter={memberIds:req.user._id};ticketFilter={createdBy:req.user._id};announcementFilter={event_id:{$in:ids}};
  } else if(req.user.role==='judge'){
    const assignments=await JudgeAssignment.find({judge_id:req.user._id,status:{$ne:'Cancelled'}});
    const teamIds=assignments.map(a=>a.team_id);teamFilter={id:{$in:teamIds}};
    eventFilter={eventId:{$in:[...new Set(assignments.map(a=>a.event_id))]}};
    ticketFilter={_id:null};announcementFilter={event_id:{$in:[...new Set(assignments.map(a=>a.event_id))]}};
  } else if(req.user.role==='mentor'){
    ticketFilter={$or:[{assignedMentor:req.user._id},{status:'Open'}]};eventFilter={};teamFilter={_id:null};announcementFilter={};
  } else if(req.user.role==='volunteer'){
    eventFilter={status:{$in:['Registration','Live']}};teamFilter={_id:null};ticketFilter={_id:null};announcementFilter={};
  }
  const [eventDocs,teams,judges,tickets,announcements,registrations,assignments]=await Promise.all([
    Event.find(eventFilter).sort({createdAt:-1}),Team.find(teamFilter).sort({createdAt:-1}),
    req.user.role==='manager'?User.find({role:'judge',active:true}).select('name email skills'):Promise.resolve([]),
    Ticket.find(ticketFilter).sort({createdAt:-1}).limit(100),
    Announcement.find(announcementFilter).sort({createdAt:-1}).limit(50),
    req.user.role==='student'?Registration.find({userId:req.user._id,status:{$ne:'Rejected'}}):Promise.resolve([]),
    req.user.role==='judge'?JudgeAssignment.find({judge_id:req.user._id,status:{$ne:'Cancelled'}}).sort({slot:1}):Promise.resolve([])
  ]);
  res.json({events:await Promise.all(eventDocs.map(eventSummary)),teams:teams.map(t=>({...t.toObject(),id:t.id})),
    judges:judges.map(j=>({id:j.id,name:j.name,specialty:j.skills.join(', '),avg:0,assigned:0})),
    tickets:tickets.map(t=>({...t.toObject(),id:t.id})),announcements:announcements.map(a=>a.text),registrations,assignments});
}));

router.post('/events',...manager,asyncRoute(async(req,res)=>{
  const p=z.object({id:z.string().optional(),name:z.string().trim().min(2).max(140),date:z.string().optional(),venue:z.string().optional(),description:z.string().max(5000).optional(),status:z.enum(['Draft','Registration','Live','Completed','Archived']).optional(),registrationOpen:z.boolean().optional(),registrationDeadline:z.coerce.date().nullable().optional(),teamSizeMin:z.number().int().min(1).max(20).optional(),teamSizeMax:z.number().int().min(1).max(20).optional(),tracks:z.array(z.string()).optional()}).safeParse(req.body);
  if(!p.success)return res.status(400).json({error:p.error.issues[0].message});
  if(p.data.teamSizeMin&&p.data.teamSizeMax&&p.data.teamSizeMin>p.data.teamSizeMax)return res.status(400).json({error:'Minimum team size cannot exceed maximum'});
  const event=await Event.create({eventId:p.data.id||makeId('EVT'),...p.data,createdBy:req.user._id});
  await audit(req,'event.create',event.eventId,'Event',event.eventId);
  emitEvent(req,event.eventId,{event_created:event.eventId});
  res.status(201).json({event:{id:event.eventId,name:event.name,date:event.date,venue:event.venue,status:event.status}});
}));
router.patch('/events/:eventId',...manager,asyncRoute(async(req,res)=>{
  const allowed=['name','date','venue','description','status','registrationOpen','registrationDeadline','teamSizeMin','teamSizeMax','tracks','resultsReleased','settings'];
  const update=Object.fromEntries(Object.entries(req.body||{}).filter(([k])=>allowed.includes(k)));
  if(!Object.keys(update).length)return res.status(400).json({error:'No editable event fields supplied'});
  const event=await Event.findOneAndUpdate({eventId:req.params.eventId},update,{new:true,runValidators:true});
  if(!event)return res.status(404).json({error:'Event not found'});
  await audit(req,'event.update',event.eventId,'Event',event.eventId,update);
  emitEvent(req,event.eventId,{event_updated:{id:event.eventId,status:event.status,resultsReleased:event.resultsReleased}});
  res.json({event});
}));
router.delete('/events/:eventId',...manager,asyncRoute(async(req,res)=>{
  const event=await Event.findOneAndUpdate({eventId:req.params.eventId},{status:'Archived'},{new:true});
  if(!event)return res.status(404).json({error:'Event not found'});
  await audit(req,'event.archive',event.eventId,'Event',event.eventId);
  res.json({ok:true,message:'Event archived'});
}));

router.post('/register-team',authenticate,allowRoles('student','manager'),asyncRoute(async(req,res)=>{
  const {event_id,participant,team}=req.body||{};
  if(!event_id||!team?.name?.trim())return res.status(400).json({error:'Event and team name are required'});
  const event=await Event.findOne({eventId:event_id});
  if(!event)return res.status(404).json({error:'Event not found'});
  if(!canRegister(event))return res.status(409).json({error:registrationState(event)});
  let owner=req.user;
  if(req.user.role==='manager'){
    const pe=String(participant?.email||'').toLowerCase().trim();
    if(!pe)return res.status(400).json({error:'Participant email is required'});
    owner=await User.findOne({email:pe});
    if(!owner)return res.status(404).json({error:'No account exists for that email. The participant must sign up first.'});
  }
  if(owner.role!=='student')return res.status(400).json({error:'Only student accounts can be registered as participants'});
  const email=owner.email;
  if(await Registration.exists({eventId:event_id,email}))return res.status(409).json({error:'This email is already registered for this event'});
  const emails=[...new Set((team.memberEmails||[]).map(x=>String(x).trim().toLowerCase()).filter(Boolean).filter(x=>x!==email))];
  if(emails.length+1>event.teamSizeMax)return res.status(409).json({error:`A team can have at most ${event.teamSizeMax} members`});
  const invitees=emails.length?await User.find({email:{$in:emails},role:'student',active:true}):[];
  if(invitees.length!==emails.length)return res.status(400).json({error:'Every teammate must have an active student account'});
  if(await Registration.exists({eventId:event_id,email:{$in:emails}}))return res.status(409).json({error:'A teammate is already registered for this event'});
  const roster=[owner,...invitees],teamId=makeId('TEAM');
  const created=await Team.create({id:teamId,event_id,name:team.name.trim(),project:team.project||'To be announced',track:team.track||'Open Innovation',members:roster.length,score:0,status:roster.length<event.teamSizeMin?'Forming':'Registered',room:'To be assigned',captainId:owner._id,memberIds:roster.map(x=>x._id),team_code:teamId,matchStatus:roster.length<event.teamSizeMin?'suggested':'approved'});
  try {
    await Registration.insertMany(roster.map((member,index)=>({eventId:event_id,teamCode:teamId,teamName:created.name,userId:member._id,name:member.name,email:member.email,college:member.college||participant?.college||'',role:index?'Member':'Captain',registrationType:'group'})));
  } catch(e) { await Team.deleteOne({_id:created._id}); throw e; }
  await audit(req,'team.register',event_id,'Team',teamId);
  emitEvent(req,event_id,{team_registered:{id:teamId,name:created.name}});
  res.status(201).json({team:created});
}));
router.post('/register-individual',authenticate,allowRoles('student'),asyncRoute(async(req,res)=>{
  const event=await Event.findOne({eventId:req.body?.event_id});
  if(!event)return res.status(404).json({error:'Event not found'});
  if(!canRegister(event))return res.status(409).json({error:registrationState(event)});
  if(await Registration.exists({eventId:event.eventId,userId:req.user._id}))return res.status(409).json({error:'You are already registered for this event'});
  const registration=await Registration.create({eventId:event.eventId,teamCode:`UNASSIGNED-${event.eventId}`,teamName:'Awaiting team formation',userId:req.user._id,name:req.user.name,email:req.user.email,college:req.user.college,role:'Captain',status:'Pending',registrationType:'individual'});
  res.status(201).json({registration});
}));
router.post('/teams/:teamId/join',authenticate,allowRoles('student'),asyncRoute(async(req,res)=>{
  const team=await Team.findOne({id:req.params.teamId});
  if(!team)return res.status(404).json({error:'Team not found'});
  const event=await Event.findOne({eventId:team.event_id});
  if(!event)return res.status(404).json({error:'Event not found'});
  if(!canRegister(event))return res.status(409).json({error:registrationState(event)});
  if(team.members>=event.teamSizeMax)return res.status(409).json({error:'Team is full'});
  if(await Registration.exists({eventId:team.event_id,email:req.user.email}))return res.status(409).json({error:'You are already registered for this event'});
  team.memberIds.push(req.user._id);team.members=team.memberIds.length;await team.save();
  await Registration.create({eventId:team.event_id,teamCode:team.id,teamName:team.name,userId:req.user._id,name:req.user.name,email:req.user.email,college:req.user.college,role:'Member'});
  emitEvent(req,team.event_id,{team_updated:{id:team.id,members:team.members}});
  res.json({team});
}));
router.get('/registrations/:eventId',...manager,asyncRoute(async(req,res)=>{
  const registrations=await Registration.find({eventId:req.params.eventId}).sort({createdAt:-1}).populate('userId','name email role college');
  res.json({registrations});
}));
router.patch('/registrations/:id/status',...manager,asyncRoute(async(req,res)=>{
  const status=z.enum(['Pending','Approved','Rejected','Waitlisted']).safeParse(req.body.status);
  if(!status.success)return res.status(400).json({error:'Invalid registration status'});
  const r=await Registration.findByIdAndUpdate(req.params.id,{status:status.data},{new:true});
  if(!r)return res.status(404).json({error:'Registration not found'});
  res.json({registration:r});
}));
router.get('/teams',authenticate,asyncRoute(async(req,res)=>{
  const filter=req.user.role==='manager'?{event_id:req.query.event_id}:req.user.role==='student'?{memberIds:req.user._id}:req.user.role==='judge'?{id:{$in:(await JudgeAssignment.find({judge_id:req.user._id})).map(a=>a.team_id)}}:{_id:null};
  res.json({teams:await Team.find(filter).sort({createdAt:-1})});
}));
router.post('/teams',...manager,asyncRoute(async(req,res)=>{
  const {event_id,name,track='Open Innovation',project='To be announced',memberIds=[]}=req.body||{};
  const event=await Event.findOne({eventId:event_id}); if(!event||!name?.trim())return res.status(400).json({error:'Valid event and team name are required'});
  const ids=[...new Set(memberIds.map(String))]; if(ids.length<1||ids.length>event.teamSizeMax)return res.status(400).json({error:`Select from 1 to ${event.teamSizeMax} registered participants`});
  const regs=await Registration.find({eventId:event_id,userId:{$in:ids},teamCode:`UNASSIGNED-${event_id}`,status:{$ne:'Rejected'}});
  if(regs.length!==ids.length)return res.status(409).json({error:'Every selected participant must be currently unassigned'});
  const teamId=makeId('TEAM'), captainId=regs[0].userId;
  const team=await Team.create({id:teamId,event_id,name:name.trim(),project,track,members:ids.length,status:ids.length<event.teamSizeMin?'Forming':'Matched',room:'To be assigned',captainId,memberIds:ids,team_code:teamId,matchStatus:ids.length<event.teamSizeMin?'suggested':'approved'});
  await Registration.updateMany({eventId:event_id,userId:{$in:ids}},{teamCode:teamId,teamName:team.name,status:'Approved',role:'Member'}); await Registration.updateOne({eventId:event_id,userId:captainId},{role:'Captain'});
  res.status(201).json({team});
}));
router.patch('/teams/:teamId',...manager,asyncRoute(async(req,res)=>{
  const allowed=['name','project','track','status','room'];
  const update=Object.fromEntries(Object.entries(req.body||{}).filter(([k])=>allowed.includes(k)));
  const team=await Team.findOneAndUpdate({id:req.params.teamId},update,{new:true,runValidators:true});
  if(!team)return res.status(404).json({error:'Team not found'});
  res.json({team});
}));
router.post('/teams/:teamId/members',...manager,asyncRoute(async(req,res)=>{
  const team=await Team.findOne({id:req.params.teamId});const user=await User.findById(req.body.userId);
  if(!team||!user)return res.status(404).json({error:'Team or user not found'});
  const event=await Event.findOne({eventId:team.event_id});
  if(team.members>=event.teamSizeMax)return res.status(409).json({error:'Team is full'});
  const registration=await Registration.findOne({eventId:team.event_id,userId:user._id});
  if(registration&&!registration.teamCode.startsWith('UNASSIGNED-'))return res.status(409).json({error:'Participant already belongs to a team'});
  team.memberIds.push(user._id);team.members=team.memberIds.length;await team.save();
  if(registration)await Registration.updateOne({_id:registration._id},{teamCode:team.id,teamName:team.name,role:'Member',status:'Approved',registrationType:'individual'});
  else await Registration.create({eventId:team.event_id,teamCode:team.id,teamName:team.name,userId:user._id,name:user.name,email:user.email,college:user.college,role:'Member',registrationType:'group'});
  res.json({team});
}));
router.delete('/teams/:teamId/members/:userId',...manager,asyncRoute(async(req,res)=>{
  const team=await Team.findOne({id:req.params.teamId}); if(!team)return res.status(404).json({error:'Team not found'});
  if(!team.memberIds.some(id=>String(id)===req.params.userId))return res.status(404).json({error:'Participant is not on this team'});
  if(team.memberIds.length===1)return res.status(409).json({error:'A team must retain one captain'});
  team.memberIds=team.memberIds.filter(id=>String(id)!==req.params.userId);team.members=team.memberIds.length;
  if(String(team.captainId)===req.params.userId){team.captainId=team.memberIds[0];await Registration.updateOne({eventId:team.event_id,userId:team.captainId},{role:'Captain'});}
  await team.save(); await Registration.updateOne({eventId:team.event_id,userId:req.params.userId},{teamCode:`UNASSIGNED-${team.event_id}`,teamName:'Awaiting team formation',role:'Captain',status:'Pending',registrationType:'individual'});
  res.json({team});
}));

router.post('/matchmaker/generate',...manager,asyncRoute(async(req,res)=>{
  const {event_id,teamSize=4}=req.body||{};
  const regs=await Registration.find({eventId:event_id,status:{$ne:'Rejected'}}).populate('userId','name skills preferredRoles');
  const pool=regs.filter(r=>r.userId);
  const roleOf=skills=>{const s=(skills||[]).join(' ').toLowerCase();if(/react|frontend|ui|css/.test(s))return'Frontend';if(/node|express|api|backend/.test(s))return'Backend';if(/python|ml|ai|data/.test(s))return'AI / Data';if(/security|burp|network/.test(s))return'Security';return'Generalist';};
  const buckets=[];
  for(const reg of pool){const role=roleOf(reg.userId.skills);let target=buckets.find(b=>b.members.length<teamSize&&!b.roles.includes(role));if(!target)target=buckets.find(b=>b.members.length<teamSize);if(!target){target={name:`Suggested Team ${buckets.length+1}`,members:[],roles:[]};buckets.push(target);}target.members.push({userId:reg.userId.id,name:reg.userId.name,skills:reg.userId.skills,role});target.roles.push(role);}
  const suggestions=buckets.map((b,i)=>({...b,name:`Suggested Team ${i+1}`,rationale:'Rule-based grouping balances declared skill categories. Review and approve before applying.'}));
  res.json({suggestions,algorithm:'Skill-category balancing (rule-based; not a trained AI model)'});
}));
router.post('/matchmaker/approve',...manager,asyncRoute(async(req,res)=>{
  const {event_id,suggestions=[]}=req.body||{};
  if(!await eventExists(event_id))return res.status(404).json({error:'Event not found'});
  if(!Array.isArray(suggestions)||!suggestions.length)return res.status(400).json({error:'Suggestions are required'});
  const approved=[];
  for(const group of suggestions){
    const memberIds=(group.members||[]).map(m=>String(m.userId)).filter(Boolean);
    if(memberIds.length<1)continue;
    const oldTeams=await Team.find({event_id,memberIds:{$in:memberIds}});
    for(const t of oldTeams){
      t.memberIds=t.memberIds.filter(id=>!memberIds.includes(String(id)));
      if(!t.memberIds.length){await t.deleteOne();continue;}
      t.members=t.memberIds.length;
      if(!t.memberIds.some(id=>String(id)===String(t.captainId))){t.captainId=t.memberIds[0];await Registration.updateOne({eventId:event_id,userId:t.captainId},{role:'Captain'});}
      await t.save();
    }
    const teamId=makeId('TEAM');
    let name=group.name||`Matched ${teamId}`;
    if(await Team.exists({event_id,name}))name=`${name} (${teamId})`;
    const team=await Team.create({id:teamId,event_id,name,members:memberIds.length,memberIds,captainId:memberIds[0],team_code:teamId,matchStatus:'approved',status:'Matched'});
    await Registration.updateMany({eventId:event_id,userId:{$in:memberIds}},{teamCode:teamId,teamName:team.name,role:'Member'});
    approved.push(team);
  }
  res.status(201).json({teams:approved});
}));

router.post('/rubrics',...manager,asyncRoute(async(req,res)=>{
  const {event_id,criteria=[],maxScore=10}=req.body||{};
  if(!event_id||!Array.isArray(criteria)||!criteria.length)return res.status(400).json({error:'Event and rubric criteria are required'});
  const total=criteria.reduce((s,c)=>s+Number(c.weight||0),0);
  if(Math.abs(total-100)>0.01)return res.status(400).json({error:'Rubric weights must total 100'});
  const rubric=await Rubric.findOneAndUpdate({event_id},{event_id,criteria,maxScore},{upsert:true,new:true,runValidators:true});
  res.json({rubric});
}));
router.get('/rubrics/:eventId',authenticate,asyncRoute(async(req,res)=>{
  if(req.user.role==='student'&&!await Registration.exists({eventId:req.params.eventId,email:req.user.email}))return res.status(403).json({error:'Not registered for this event'});
  const rubric=await Rubric.findOne({event_id:req.params.eventId});
  res.json({rubric});
}));
router.post('/assignments',...manager,asyncRoute(async(req,res)=>{
  const {event_id,judge_id,team_id,room='',slot=''}=req.body||{};
  if(!event_id||!judge_id||!team_id)return res.status(400).json({error:'Event, judge and team are required'});
  const [judge,team]=await Promise.all([User.findOne({_id:judge_id,role:'judge',active:true}),Team.findOne({id:team_id,event_id})]);
  if(!judge||!team)return res.status(404).json({error:'Judge or team not found'});
  if(slot&&await JudgeAssignment.exists({event_id,judge_id,slot,status:'Assigned'}))return res.status(409).json({error:'Judge already has an assignment in this slot'});
  const assignment=await JudgeAssignment.create({event_id,judge_id,team_id,room,slot});
  res.status(201).json({assignment});
}));
router.get('/assignments',authenticate,asyncRoute(async(req,res)=>{
  const filter=req.user.role==='manager'?{event_id:req.query.event_id}:req.user.role==='judge'?{judge_id:req.user._id}:{_id:null};
  res.json({assignments:await JudgeAssignment.find(filter).populate('judge_id','name email')});
}));
router.post('/schedule',...manager,asyncRoute(async(req,res)=>{
  const {event_id}=req.body||{};
  let slots=req.body?.slots;
  if(!Array.isArray(slots)&&Array.isArray(req.body?.schedule)){
    const generated=req.body.schedule;
    const teamNames=[...new Set(generated.map(x=>x.team).filter(Boolean))];
    const judgeNames=[...new Set(generated.map(x=>x.judge).filter(Boolean))];
    const [teamDocs,judgeDocs]=await Promise.all([Team.find({event_id, name:{$in:teamNames}}),User.find({role:'judge',name:{$in:judgeNames}})]);
    const teamByName=new Map(teamDocs.map(x=>[x.name,x.id]));
    const judgeByName=new Map(judgeDocs.map(x=>[x.name,x.id]));
    slots=generated.map(x=>({team_id:teamByName.get(x.team),judge_id:judgeByName.get(x.judge),startAt:x.startAt||x.slot,room:x.room})).filter(x=>x.team_id&&x.judge_id&&x.startAt);
  }
  if(!event_id||!Array.isArray(slots))return res.status(400).json({error:'Event and schedule slots are required'});
  if(!slots.length)return res.status(400).json({error:'No schedule entries matched existing teams and judge accounts. Create judge accounts and teams first.'});
  const judgeSlot=new Set(),teamSlot=new Set();
  for(const s of slots){const j=`${s.judge_id}:${s.startAt}`,t=`${s.team_id}:${s.startAt}`;if(judgeSlot.has(j)||teamSlot.has(t))return res.status(409).json({error:'Schedule contains a judge or team time conflict'});judgeSlot.add(j);teamSlot.add(t);}
  const schedule=await Schedule.findOneAndUpdate({event_id},{event_id,slots},{upsert:true,new:true});
  res.json({schedule});
}));
router.post('/score',authenticate,allowRoles('manager','judge'),asyncRoute(async(req,res)=>{
  const {event_id,team_id,judge_id,criterion_id='overall',value,comments=''}=req.body||{};
  if(!event_id||!team_id||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>10)return res.status(400).json({error:'Valid event, team and score from 0 to 10 are required'});
  const judge=req.user.role==='judge'?req.user._id:judge_id;
  if(!judge)return res.status(400).json({error:'Judge ID is required'});
  if(req.user.role==='judge'&&!await JudgeAssignment.exists({event_id,judge_id:judge,team_id,status:'Assigned'}))return res.status(403).json({error:'You are not assigned to this team'});
  const score=await Score.findOneAndUpdate({event_id,team_id,judge_id:judge,criterion_id},{event_id,team_id,judge_id:judge,criterion_id,value:Number(value),comments,submittedBy:req.user._id},{upsert:true,new:true,runValidators:true});
  await recomputeTeamScores(event_id);
  res.json({score});
}));
router.get('/scores/:eventId',authenticate,asyncRoute(async(req,res)=>{
  const event=await Event.findOne({eventId:req.params.eventId});if(!event)return res.status(404).json({error:'Event not found'});
  if(req.user.role==='student'){
    if(!event.resultsReleased)return res.json({scores:[],released:false});
    const regs=await Registration.find({eventId:event.eventId,userId:req.user._id});
    const teamIds=regs.map(r=>r.teamCode);
    const scores=await Team.find({id:{$in:teamIds},event_id:event.eventId}).select('id name score calibratedScore status');
    return res.json({scores,released:true});
  }
  const filter={event_id:event.eventId};
  if(req.user.role==='judge')filter.judge_id=req.user._id;
  if(!['manager','judge'].includes(req.user.role))return res.status(403).json({error:'Not permitted'});
  res.json({scores:await Score.find(filter).populate('judge_id','name email'),released:event.resultsReleased});
}));
router.post('/results/release',...manager,asyncRoute(async(req,res)=>{
  const {event_id,released=true}=req.body||{};const event=await Event.findOneAndUpdate({eventId:event_id},{resultsReleased:Boolean(released)},{new:true});
  if(!event)return res.status(404).json({error:'Event not found'});
  emitEvent(req,event_id,{results_released:event.resultsReleased});res.json({ok:true,released:event.resultsReleased});
}));
router.post('/tickets',authenticate,allowRoles('student','manager'),asyncRoute(async(req,res)=>{
  const {event_id,ticket={}}=req.body||{};
  if(!await eventExists(event_id))return res.status(404).json({error:'Event not found'});
  if(req.user.role==='student'&&!await isMember(req.user,event_id,ticket.team_id||''))return res.status(403).json({error:'You must be registered in this event to raise a team ticket'});
  if(!ticket.detail?.trim())return res.status(400).json({error:'Ticket details are required'});
  const created=await Ticket.create({id:makeId('T'),event_id,team:ticket.team||'Participant',topic:ticket.topic||'General',detail:ticket.detail,priority:ticket.priority||'Normal',createdBy:req.user._id});
  emitEvent(req,event_id,{ticket_created:created.id});res.status(201).json({ticket:created});
}));
router.get('/tickets',authenticate,asyncRoute(async(req,res)=>{
  const filter=req.user.role==='manager'?{event_id:req.query.event_id}:req.user.role==='mentor'?{$or:[{assignedMentor:req.user._id},{status:'Open'}]}:{createdBy:req.user._id};
  if(req.user.role==='volunteer'||req.user.role==='judge')return res.status(403).json({error:'Not permitted'});
  res.json({tickets:await Ticket.find(filter).sort({createdAt:-1})});
}));
router.patch('/tickets/:id/claim',authenticate,allowRoles('manager','mentor'),asyncRoute(async(req,res)=>{
  const ticket=await Ticket.findOneAndUpdate({id:req.params.id,status:'Open'}, {status:'Claimed',assignedMentor:req.user._id,mentor:req.user.name},{new:true});
  if(!ticket)return res.status(409).json({error:'Ticket is unavailable or already claimed'});
  emitEvent(req,ticket.event_id,{ticket_updated:ticket.id,status:ticket.status});res.json({ticket});
}));
router.patch('/tickets/:id/resolve',authenticate,allowRoles('manager','mentor'),asyncRoute(async(req,res)=>{
  const filter={id:req.params.id,status:'Claimed'};if(req.user.role==='mentor')filter.assignedMentor=req.user._id;
  const ticket=await Ticket.findOneAndUpdate(filter,{status:'Resolved'},{new:true});
  if(!ticket)return res.status(404).json({error:'Ticket not found or not assigned to you'});
  emitEvent(req,ticket.event_id,{ticket_updated:ticket.id,status:ticket.status});res.json({ticket});
}));
router.post('/action',authenticate,allowRoles('manager','mentor'),asyncRoute(async(req,res)=>{
  const {action,event_id,payload={}}=req.body||{};
  if(action==='ticket.claim'||action==='ticket.resolve'){
    const ticket=action.endsWith('claim')?await Ticket.findOneAndUpdate({id:payload.id,event_id,status:'Open'},{status:'Claimed',assignedMentor:req.user._id,mentor:req.user.name},{new:true}):await Ticket.findOneAndUpdate({id:payload.id,event_id,status:'Claimed',...(req.user.role==='mentor'?{assignedMentor:req.user._id}:{})},{status:'Resolved'},{new:true});
    if(!ticket)return res.status(404).json({error:'Ticket not found or not available'});
    emitEvent(req,event_id,{tickets:await Ticket.find({event_id})});return res.json({ticket});
  }
  if(action==='announcement.create'){
    if(req.user.role!=='manager')return res.status(403).json({error:'Managers only'});
    const text=String(payload.text||'').trim();if(!text)return res.status(400).json({error:'Announcement text is required'});
    const a=await Announcement.create({event_id,text,createdBy:req.user._id});emitEvent(req,event_id,{announcements:(await Announcement.find({event_id}).sort({createdAt:-1})).map(x=>x.text)});return res.status(201).json({announcement:a});
  }
  return res.status(400).json({error:'Unsupported action'});
}));
router.post('/announcements',...manager,asyncRoute(async(req,res)=>{
  const {event_id,text}=req.body||{};if(!text?.trim())return res.status(400).json({error:'Announcement text required'});
  const a=await Announcement.create({event_id,text:text.trim(),createdBy:req.user._id});emitEvent(req,event_id,{announcements:(await Announcement.find({event_id}).sort({createdAt:-1})).map(x=>x.text)});res.status(201).json({announcement:a});
}));
router.post('/checkin',authenticate,allowRoles('manager','volunteer'),asyncRoute(async(req,res)=>{
  const {code,event_id}=req.body||{};if(!code||!event_id)return res.status(400).json({error:'Code and event are required'});
  const normalized=String(code).trim().toUpperCase();
  const coupon=await Coupon.findOne({event_id,code:normalized});
  if(!coupon&&!normalized.startsWith('HP-PASS-'))return res.status(404).json({error:'Pass or coupon code not recognized'});
  if(coupon&&coupon.redeemedAt)return res.status(409).json({error:'Coupon has already been redeemed'});
  if(coupon){coupon.redeemedAt=new Date();coupon.redeemedBy=req.user._id;await coupon.save();}
  const record=await Checkin.create({event_id,code:normalized,kind:coupon?.kind||'participant',redeemedBy:req.user._id,userId:coupon?.userId});
  const checkins=await Checkin.countDocuments({event_id});emitEvent(req,event_id,{checkins});res.status(201).json({ok:true,checkins,kind:record.kind});
}));
router.post('/coupons',...manager,asyncRoute(async(req,res)=>{
  const {event_id,coupons=[]}=req.body||{};if(!Array.isArray(coupons))return res.status(400).json({error:'Coupons must be an array'});
  const docs=coupons.map(c=>({event_id,code:c.code||makeId('CPN'),kind:c.kind,userId:c.userId}));
  const created=await Coupon.insertMany(docs);res.status(201).json({coupons:created});
}));
router.get('/checkins/:eventId',...manager,asyncRoute(async(req,res)=>res.json({checkins:await Checkin.find({event_id:req.params.eventId}).sort({checkedInAt:-1})})));

router.post('/certificates',...manager,asyncRoute(async(req,res)=>{
  const {event_id,recipients=[]}=req.body||{};if(!await eventExists(event_id)||!Array.isArray(recipients)||!recipients.length)return res.status(400).json({error:'Valid event and recipient list are required'});
  const docs=recipients.map(r=>({certificateId:makeCertificateId(),event_id,recipientName:r.name,recipientEmail:String(r.email).toLowerCase(),teamName:r.teamName||'',award:r.award||'Participant',issuedBy:req.user._id}));
  const certs=await Certificate.insertMany(docs);res.status(201).json({certificates:certs});
}));
router.get('/certificates/:eventId',authenticate,asyncRoute(async(req,res)=>{
  if(!['manager','student'].includes(req.user.role))return res.status(403).json({error:'Not permitted'});
  const filter={event_id:req.params.eventId,revokedAt:null};if(req.user.role==='student')filter.recipientEmail=req.user.email;
  res.json({certificates:await Certificate.find(filter).sort({issuedAt:-1})});
}));
router.get('/certificates/:eventId/export.zip',...manager,asyncRoute(async(req,res)=>{
  const certs=await Certificate.find({event_id:req.params.eventId,revokedAt:null});
  res.setHeader('Content-Type','application/zip');res.setHeader('Content-Disposition',`attachment; filename="hackpulse-${req.params.eventId}-certificates.zip"`);
  const archive = new ZipArchive({
  zlib: { level: 9 }
});archive.on('error',e=>res.destroy(e));archive.pipe(res);
  const rows=['Certificate ID,Recipient,Email,Team,Award,Issued At'];
  for(const c of certs){
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>${c.certificateId}</title><style>body{font-family:Georgia,serif;padding:60px;background:#f5f6f0}.cert{border:10px double #9aaf72;background:white;text-align:center;padding:70px;color:#283522}.name{font-size:38px;margin:25px}</style></head><body><main class="cert"><p>HACKPULSE · CERTIFICATE</p><h1>Certificate of Participation</h1><p>This is presented to</p><div class="name">${c.recipientName.replace(/[&<>"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]))}</div><p>for ${c.award} in ${req.params.eventId}</p><p>Team: ${c.teamName}</p><p>Certificate ID: ${c.certificateId}</p></main></body></html>`;
    archive.append(html,{name:`certificates/${c.certificateId}.html`});
    rows.push([c.certificateId,c.recipientName,c.recipientEmail,c.teamName,c.award,c.issuedAt.toISOString()].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','));
  }
  archive.append(rows.join('\n'),{name:'certificate-register.csv'});archive.append('Open each HTML file in a browser and Print > Save as PDF.',{name:'README.txt'});await archive.finalize();
}));
router.post('/certificates/:certificateId/revoke',...manager,asyncRoute(async(req,res)=>{
  const cert=await Certificate.findOneAndUpdate({certificateId:req.params.certificateId,revokedAt:null},{revokedAt:new Date()},{new:true});
  if(!cert)return res.status(404).json({error:'Active certificate not found'});res.json({ok:true,certificate:cert});
}));
router.get('/verify/:certificateId',asyncRoute(async(req,res)=>{
  const c=await Certificate.findOne({certificateId:req.params.certificateId});
  if(!c)return res.status(404).json({valid:false,message:'Certificate not found'});
  res.json({valid:!c.revokedAt,certificate:{certificateId:c.certificateId,recipientName:c.recipientName,event_id:c.event_id,award:c.award,issuedAt:c.issuedAt,revoked:Boolean(c.revokedAt)}});
}));

router.post('/projects',authenticate,allowRoles('student','manager'),asyncRoute(async(req,res)=>{
  const {event_id,team_id,title,description='',repositoryUrl='',demoUrl=''}=req.body||{};
  if(!event_id||!team_id||!title?.trim())return res.status(400).json({error:'Event, team and project title are required'});
  if(req.user.role==='student'&&!await isMember(req.user,event_id,team_id))return res.status(403).json({error:'You are not a member of this team'});
  const project=await Project.findOneAndUpdate({event_id,team_id},{event_id,team_id,title,description,repositoryUrl,demoUrl},{upsert:true,new:true,runValidators:true});
  res.json({project});
}));
router.patch('/projects/:eventId/:teamId/publish',...manager,asyncRoute(async(req,res)=>{
  const p=await Project.findOneAndUpdate({event_id:req.params.eventId,team_id:req.params.teamId},{published:Boolean(req.body.published)},{new:true});
  if(!p)return res.status(404).json({error:'Project not found'});res.json({project:p});
}));
router.get('/projects/:eventId',asyncRoute(async(req,res)=>{
  const filter={event_id:req.params.eventId,published:true};
  if(req.headers.authorization){ /* Public gallery remains public; unpublished projects are never returned here. */ }
  res.json({projects:await Project.find(filter).sort({createdAt:-1})});
}));
router.get('/projects/:eventId/mine',authenticate,allowRoles('student'),asyncRoute(async(req,res)=>{
  const regs=await Registration.find({eventId:req.params.eventId,userId:req.user._id});const ids=regs.map(r=>r.teamCode);
  res.json({projects:await Project.find({event_id:req.params.eventId,team_id:{$in:ids}})});
}));

router.get('/analytics/:eventId',...manager,asyncRoute(async(req,res)=>{
  const id=req.params.eventId;
  const [registrations,teams,judges,scores,tickets,checkins]=await Promise.all([
    Registration.countDocuments({eventId:id}),Team.countDocuments({event_id:id}),JudgeAssignment.distinct('judge_id',{event_id:id}),
    Score.find({event_id:id}),Ticket.countDocuments({event_id:id}),Checkin.countDocuments({event_id:id})
  ]);
  const avg=scores.length?scores.reduce((s,x)=>s+x.value,0)/scores.length:0;
  res.json({analytics:{registrations,teams,judges:judges.length,scoreSubmissions:scores.length,averageRawScore:Number(avg.toFixed(2)),tickets,checkins}});
}));
router.get('/audit/:eventId',...manager,asyncRoute(async(req,res)=>{
  const {AuditLog}=await import('../models/index.js');res.json({logs:await AuditLog.find({event_id:req.params.eventId}).populate('actor','name email').sort({createdAt:-1}).limit(500)});
}));
export default router;
