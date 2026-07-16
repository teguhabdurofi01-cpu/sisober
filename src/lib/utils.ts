import { clsx,type ClassValue } from "clsx"; import { twMerge } from "tailwind-merge";
export function cn(...x:ClassValue[]){return twMerge(clsx(x));}
export function formatDate(v:string|null|undefined){return v?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium"}).format(new Date(v)):"—";}
