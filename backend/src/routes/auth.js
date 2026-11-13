import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/index.js';
import { authenticate,allowRoles } from '../middleware/auth.js';
import { config } from '../config.js';

const router=Router();
const credentials=z.object({email:z.string().email().max(254),password:z.string().min(10).max(128)});
function issue(user){return jwt.sign({sub:user.id,role:user.role},config.jwtSecret,{expiresIn:config.jwtExpiresIn});}
function publicUser(user){return {id:user.id,name:user.name,email:user.email,role:user.role,college:user.college,skills:user.skills,preferredRoles:user.preferredRoles};}

router.post('/register',async(req,res,next)=>{
  try{
    const parsed=credentials.extend({name:z.string().trim().min(2).max(100),college:z.string().max(150).optional(),skills:z.array(z.string().max(50)).max(30).optional(),preferredRoles:z.array(z.string().max(50)).max(10).optional()}).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:parsed.error.issues[0].message});
    const {email,password,name,college,skills,preferredRoles}=parsed.data;
    const normalized=email.toLowerCase();
    if(await User.exists({email:normalized}))return res.status(409).json({error:'An account with this email already exists'});
    const user=await User.create({name,email:normalized,passwordHash:await bcrypt.hash(password,12),role:'student',college,skills,preferredRoles});
    res.status(201).json({token:issue(user),user:publicUser(user)});
  }catch(e){next(e);}
});
router.post('/login',async(req,res,next)=>{
  try{
    const parsed=z.object({email:z.string().email(),password:z.string().min(1)}).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:'Enter a valid email and password'});
    const user=await User.findOne({email:parsed.data.email.toLowerCase()}).select('+passwordHash');
    if(!user||!user.active||!(await bcrypt.compare(parsed.data.password,user.passwordHash)))return res.status(401).json({error:'Invalid email or password'});
    user.lastLoginAt=new Date();await user.save();
    res.json({token:issue(user),user:publicUser(user)});
  }catch(e){next(e);}
});
router.get('/me',authenticate,(req,res)=>res.json({user:publicUser(req.user)}));
router.patch('/me',authenticate,async(req,res,next)=>{
  try{
    const parsed=z.object({name:z.string().trim().min(2).max(100).optional(),college:z.string().max(150).optional(),skills:z.array(z.string().max(50)).max(30).optional(),preferredRoles:z.array(z.string().max(50)).max(10).optional()}).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:parsed.error.issues[0].message});
    Object.assign(req.user,parsed.data);await req.user.save();res.json({user:publicUser(req.user)});
  }catch(e){next(e);}
});
router.post('/users',authenticate,allowRoles('manager'),async(req,res,next)=>{
  try{
    const parsed=credentials.extend({name:z.string().min(2),role:z.enum(['judge','mentor','volunteer','manager']),college:z.string().optional()}).safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:parsed.error.issues[0].message});
    const {name,email,password,role,college}=parsed.data;
    if(await User.exists({email:email.toLowerCase()}))return res.status(409).json({error:'Email already exists'});
    const user=await User.create({name,email:email.toLowerCase(),passwordHash:await bcrypt.hash(password,12),role,college});
    res.status(201).json({user:publicUser(user)});
  }catch(e){next(e);}
});
router.get('/users',authenticate,allowRoles('manager'),async(req,res,next)=>{
  try{const filter=req.query.role?{role:req.query.role}:{};const users=await User.find(filter).select('name email role college skills active createdAt').sort({createdAt:-1});res.json({users});}catch(e){next(e);}
});
router.patch('/users/:id',authenticate,allowRoles('manager'),async(req,res,next)=>{
  try{
    const allowed=z.object({role:z.enum(['manager','student','judge','mentor','volunteer']).optional(),active:z.boolean().optional(),name:z.string().min(2).optional()}).safeParse(req.body);
    if(!allowed.success)return res.status(400).json({error:'Invalid user update'});
    const user=await User.findByIdAndUpdate(req.params.id,allowed.data,{new:true}).select('name email role active college skills');
    if(!user)return res.status(404).json({error:'User not found'});
    res.json({user});
  }catch(e){next(e);}
});
export default router;
