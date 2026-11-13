import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const base = { timestamps: true, versionKey: false };

const userSchema = new Schema({
  name:{type:String,required:true,trim:true,maxlength:100},
  email:{type:String,required:true,unique:true,lowercase:true,trim:true,index:true},
  passwordHash:{type:String,required:true,select:false},
  role:{type:String,enum:['manager','student','judge','mentor','volunteer'],default:'student',index:true},
  college:{type:String,trim:true,default:''},
  skills:{type:[String],default:[]},
  preferredRoles:{type:[String],default:[]},
  active:{type:Boolean,default:true},
  emailVerified:{type:Boolean,default:false},
  lastLoginAt:Date
},base);

const eventSchema = new Schema({
  eventId:{type:String,required:true,unique:true,index:true},
  name:{type:String,required:true,trim:true,maxlength:140},
  description:{type:String,default:''},
  date:{type:String,default:''}, venue:{type:String,default:''},
  status:{type:String,enum:['Draft','Registration','Live','Completed','Archived'],default:'Draft',index:true},
  registrationOpen:{type:Boolean,default:false},
  registrationDeadline:{type:Date,default:null},
  teamSizeMin:{type:Number,default:1,min:1,max:20},
  teamSizeMax:{type:Number,default:4,min:1,max:20},
  tracks:{type:[String],default:[]},
  resultsReleased:{type:Boolean,default:false},
  settings:{type:Schema.Types.Mixed,default:{}},
  createdBy:{type:Schema.Types.ObjectId,ref:'User',required:true}
},base);

const teamSchema = new Schema({
  id:{type:String,required:true,index:true},
  event_id:{type:String,required:true,index:true},
  name:{type:String,required:true,trim:true},
  project:{type:String,default:'To be announced'},
  track:{type:String,default:'Open Innovation'},
  members:{type:Number,default:1},
  score:{type:Number,default:0},
  calibratedScore:{type:Number,default:null},
  status:{type:String,default:'Registered'},
  room:{type:String,default:'To be assigned'},
  captainId:{type:Schema.Types.ObjectId,ref:'User',required:true},
  memberIds:[{type:Schema.Types.ObjectId,ref:'User'}],
  team_code:{type:String,required:true,index:true},
  matchStatus:{type:String,enum:['unmatched','suggested','approved'],default:'unmatched'}
},base);
teamSchema.index({event_id:1,name:1},{unique:true});
teamSchema.index({event_id:1,memberIds:1});

const registrationSchema = new Schema({
  eventId:{type:String,required:true,index:true},
  teamCode:{type:String,required:true,index:true},
  teamName:{type:String,required:true},
  userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  name:{type:String,required:true},
  email:{type:String,required:true,lowercase:true,index:true},
  college:{type:String,default:''},
  registrationType:{type:String,enum:['individual','group'],default:'group'},
  role:{type:String,enum:['Captain','Member'],default:'Captain'},
  status:{type:String,enum:['Pending','Approved','Rejected','Waitlisted'],default:'Approved'}
},base);
registrationSchema.index({eventId:1,email:1},{unique:true});

const assignmentSchema = new Schema({
  event_id:{type:String,required:true,index:true},
  judge_id:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  team_id:{type:String,required:true,index:true},
  room:{type:String,default:''},
  slot:{type:String,default:''},
  status:{type:String,enum:['Assigned','Completed','Cancelled'],default:'Assigned'}
},base);
assignmentSchema.index({event_id:1,judge_id:1,team_id:1},{unique:true});

const scoreSchema = new Schema({
  event_id:{type:String,required:true,index:true},
  team_id:{type:String,required:true,index:true},
  judge_id:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  criterion_id:{type:String,required:true,default:'overall'},
  value:{type:Number,required:true,min:0,max:10},
  comments:{type:String,default:''},
  submittedBy:{type:Schema.Types.ObjectId,ref:'User',required:true}
},base);
scoreSchema.index({event_id:1,team_id:1,judge_id:1,criterion_id:1},{unique:true});

const rubricSchema = new Schema({
  event_id:{type:String,required:true,index:true},
  criteria:[{id:String,name:String,description:String,weight:{type:Number,min:0,max:100}}],
  maxScore:{type:Number,default:10}
},base);
const scheduleSchema = new Schema({
  event_id:{type:String,required:true,index:true},
  slots:[{team_id:String,judge_id:{type:Schema.Types.ObjectId,ref:'User'},room:String,startAt:Date,endAt:Date}]
},base);
const ticketSchema = new Schema({
  id:{type:String,required:true,index:true},event_id:{type:String,required:true,index:true},
  team:{type:String,default:'Participant'},topic:{type:String,required:true},detail:{type:String,required:true},
  priority:{type:String,enum:['Low','Normal','High','Urgent'],default:'Normal'},
  status:{type:String,enum:['Open','Claimed','Resolved'],default:'Open'},
  createdBy:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  assignedMentor:{type:Schema.Types.ObjectId,ref:'User',default:null},mentor:{type:String,default:''}
},base);
const announcementSchema = new Schema({event_id:{type:String,required:true,index:true},text:{type:String,required:true},createdBy:{type:Schema.Types.ObjectId,ref:'User',required:true}},base);
const checkinSchema = new Schema({event_id:{type:String,required:true,index:true},code:{type:String,required:true,uppercase:true,trim:true},kind:{type:String,enum:['participant','meal','swag'],default:'participant'},redeemedBy:{type:Schema.Types.ObjectId,ref:'User',required:true},userId:{type:Schema.Types.ObjectId,ref:'User',default:null},checkedInAt:{type:Date,default:Date.now}},base);
checkinSchema.index({event_id:1,code:1},{unique:true});
const couponSchema = new Schema({event_id:{type:String,required:true,index:true},code:{type:String,required:true,uppercase:true,trim:true},kind:{type:String,enum:['meal','swag'],required:true},userId:{type:Schema.Types.ObjectId,ref:'User'},redeemedAt:Date,redeemedBy:{type:Schema.Types.ObjectId,ref:'User'}},base);
couponSchema.index({event_id:1,code:1},{unique:true});
const certificateSchema = new Schema({
  certificateId:{type:String,required:true,unique:true,index:true},event_id:{type:String,required:true,index:true},
  recipientName:{type:String,required:true},recipientEmail:{type:String,required:true,lowercase:true,index:true},
  teamName:{type:String,default:''},award:{type:String,default:'Participant'},issuedAt:{type:Date,default:Date.now},
  revokedAt:Date,issuedBy:{type:Schema.Types.ObjectId,ref:'User',required:true}
},base);
const projectSchema = new Schema({event_id:{type:String,required:true,index:true},team_id:{type:String,required:true,index:true},title:{type:String,required:true},description:{type:String,default:''},repositoryUrl:{type:String,default:''},demoUrl:{type:String,default:''},milestones:[{title:String,description:String,status:{type:String,default:'Pending'},updatedAt:Date}],published:{type:Boolean,default:false}},base);
projectSchema.index({event_id:1,team_id:1},{unique:true});
const auditSchema = new Schema({actor:{type:Schema.Types.ObjectId,ref:'User'},action:String,event_id:String,targetType:String,targetId:String,metadata:Schema.Types.Mixed,ip:String},base);

export const User=model('User',userSchema);
export const Event=model('Event',eventSchema);
export const Team=model('Team',teamSchema);
export const Registration=model('Registration',registrationSchema);
export const JudgeAssignment=model('JudgeAssignment',assignmentSchema);
export const Score=model('Score',scoreSchema);
export const Rubric=model('Rubric',rubricSchema);
export const Schedule=model('Schedule',scheduleSchema);
export const Ticket=model('Ticket',ticketSchema);
export const Announcement=model('Announcement',announcementSchema);
export const Checkin=model('Checkin',checkinSchema);
export const Coupon=model('Coupon',couponSchema);
export const Certificate=model('Certificate',certificateSchema);
export const Project=model('Project',projectSchema);
export const AuditLog=model('AuditLog',auditSchema);
