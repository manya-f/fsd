import crypto from 'node:crypto';
import { AuditLog } from '../models/index.js';
export const makeId=(prefix='HP')=>`${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
export const makeCertificateId=()=>`HP-CERT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
export function emitEvent(req,eventId,payload){req.app.get('io')?.to(String(eventId)).emit('event:update',payload);}
export async function audit(req,action,event_id,targetType='',targetId='',metadata={}) {
  await AuditLog.create({actor:req.user?._id,action,event_id,targetType,targetId,metadata,ip:req.ip});
}
export function escapeCsv(value=''){return '"'+String(value??'').replaceAll('"','""')+'"';}
