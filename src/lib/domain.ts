import { z } from "zod";
export const roles = ["VIEWER","CONTRACTOR","VERIFIER","SUPER_ADMIN"] as const;
export type Role = typeof roles[number];
export const findingStatuses = ["OPEN","PENDING_VERIFICATION","REVISION_REQUIRED","CLOSED"] as const;
export type FindingStatus = typeof findingStatuses[number];
export const allowedTransitions: Record<FindingStatus, readonly FindingStatus[]> = { OPEN:["PENDING_VERIFICATION"], PENDING_VERIFICATION:["CLOSED","REVISION_REQUIRED"], REVISION_REQUIRED:["PENDING_VERIFICATION"], CLOSED:["REVISION_REQUIRED"] };
export function canTransition(from: FindingStatus,to: FindingStatus,role: Role){ return allowedTransitions[from].includes(to) && (to==="CLOSED" ? ["VERIFIER","SUPER_ADMIN"].includes(role) : from==="CLOSED" ? role==="SUPER_ADMIN" : true); }
export function canAccessCompany(role:Role, companyId:string, allowed:string[]){ return role!=="CONTRACTOR" || allowed.includes(companyId); }
export const closureSchema=z.object({correctiveAction:z.string().trim().min(10).max(5000),completionDate:z.coerce.date(),submitterNote:z.string().max(2000).optional()});
export function validateEvidenceRequirement(requirement:"NONE"|"OPTIONAL"|"REQUIRED", uploads:{status:string}[]){ if(requirement==="REQUIRED" && (!uploads.some(x=>x.status==="UPLOADED") || uploads.some(x=>x.status!=="UPLOADED"))) throw new Error("Required evidence must finish uploading"); }
