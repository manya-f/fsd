import http from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createApp } from './app.js';
import { config } from './config.js';
import { connectDatabase } from './database.js';
import { User,Registration,JudgeAssignment,Event } from './models/index.js';

await connectDatabase();
const app=createApp();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:config.origins,methods:['GET','POST']}});
io.use(async(socket,next)=>{
  try{
    const token=socket.handshake.auth?.token;
    if(!token)return next(new Error('Authentication required'));
    const payload=jwt.verify(token,config.jwtSecret);
    const user=await User.findById(payload.sub);
    if(!user||!user.active)return next(new Error('Account unavailable'));
    socket.user=user;next();
  }catch{next(new Error('Invalid socket token'));}
});
io.on('connection',socket=>{
  socket.on('event:join',async eventId=>{
    try{
      if(typeof eventId!=='string'||!eventId)return;
      const event=await Event.findOne({eventId});if(!event)return;
      const role=socket.user.role;
      let allowed=['manager','mentor','volunteer'].includes(role);
      if(role==='student')allowed=Boolean(await Registration.exists({eventId,userId:socket.user._id}));
      if(role==='judge')allowed=Boolean(await JudgeAssignment.exists({event_id:eventId,judge_id:socket.user._id}));
      if(!allowed)return;
      for(const room of socket.rooms){if(room!==socket.id)socket.leave(room);}
      socket.join(eventId);
    }catch(err){console.error('event:join failed',err.message);}
  });
});
app.set('io',io);
server.listen(config.port,()=>console.log(`HackPulse API listening on ${config.port}`));
