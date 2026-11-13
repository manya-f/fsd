import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import hackpulseRoutes from './routes/hackpulse.js';
import { config } from './config.js';
import { authenticate } from './middleware/auth.js';

export function createApp(){
  const app=express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({origin(origin,cb){if(!origin||config.origins.includes(origin))return cb(null,true);return cb(new Error('Origin not allowed by CORS'));},methods:['GET','POST','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization']}));
  app.use(express.json({limit:'1mb'}));
  app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:100,standardHeaders:true,legacyHeaders:false}),authRoutes);
  app.use('/api/hackpulse',hackpulseRoutes);
  app.get('/api/health',(req,res)=>res.json({ok:true,service:'HackPulse API',timestamp:new Date().toISOString()}));
  app.get('/api/private-health',authenticate,(req,res)=>res.json({ok:true,user:{id:req.user.id,role:req.user.role}}));
  const here=path.dirname(fileURLToPath(import.meta.url));
  const frontendDist=path.resolve(here,'../../frontend/dist');
  if(fs.existsSync(frontendDist)){
    app.use(express.static(frontendDist));
    app.get('/{*splat}',(req,res,next)=>{ if(req.path.startsWith('/api/')) return next(); res.sendFile(path.join(frontendDist,'index.html')); });
  }
  app.use((req,res)=>res.status(404).json({error:'Route not found'}));
  app.use((err,req,res,next)=>{
    if(err.code===11000)return res.status(409).json({error:'A record with this value already exists'});
    if(err.name==='ValidationError')return res.status(400).json({error:err.message});
    if(err.name==='CastError')return res.status(400).json({error:'Invalid identifier'});
    if(err.message==='Origin not allowed by CORS')return res.status(403).json({error:err.message});
    console.error(err);
    res.status(500).json({error:config.nodeEnv==='production'?'Internal server error':err.message});
  });
  return app;
}
