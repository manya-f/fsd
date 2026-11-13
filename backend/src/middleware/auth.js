import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { config } from '../config.js';

export async function authenticate(req,res,next) {
  try {
    const header=req.headers.authorization||'';
    const token=header.startsWith('Bearer ')?header.slice(7):null;
    if(!token) return res.status(401).json({error:'Authentication required'});
    const payload=jwt.verify(token,config.jwtSecret);
    const user=await User.findById(payload.sub);
    if(!user||!user.active) return res.status(401).json({error:'Account is unavailable'});
    req.user=user;
    next();
  } catch { return res.status(401).json({error:'Invalid or expired access token'}); }
}
export const allowRoles=(...roles)=>(req,res,next)=>{
  if(!req.user||!roles.includes(req.user.role)) return res.status(403).json({error:'You do not have permission to perform this action'});
  next();
};
export const managerOnly=[authenticate,allowRoles('manager')];
