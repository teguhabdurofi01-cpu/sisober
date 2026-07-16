import * as XLSX from "xlsx";
export const monthMap:Record<string,number>={JANUARI:1,FEBRUARI:2,MARET:3,APRIL:4,MEI:5,JUNE:6,JUNI:6,JULI:7,AGUSTUS:8,SEPTEMBER:9,OKTOBER:10,NOVEMBER:11,DECEMBER:12,DESEMBER:12};
export type LegacyRow={sourceRow:number;originalNumber:string;date:string|null;category:string;description:string;company:string;section:string;status:"OPEN"|"CLOSED"|null;original:unknown[]};
export function parseSummary(file:string){
 const wb=XLSX.readFile(file,{cellDates:true}),ws=wb.Sheets.SUMMARY;if(!ws)throw new Error("SUMMARY sheet not found");
 const raw=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,defval:null,raw:true}),rows:LegacyRow[]=[];
 const report={rowsRead:0,rowsImported:0,rowsSkipped:0,possibleDuplicates:[] as number[],invalidDates:[] as number[],unknownCategories:[] as string[],unknownCompanies:[] as string[],unknownSections:[] as string[],statusMappingIssues:[] as number[]},fingerprints=new Map<string,number>();
 for(let i=1;i<raw.length;i++){const r=raw[i];if(!r.slice(1,11).some(v=>v!=null&&v!==""))continue;report.rowsRead++;
  const day=Number(r[3]),month=monthMap[String(r[4]??"").trim().toUpperCase()],year=Number(r[5]);let date:string|null=null;
  if(day&&month&&year){const d=new Date(Date.UTC(year,month-1,day));if(d.getUTCDate()===day&&d.getUTCMonth()===month-1)date=d.toISOString().slice(0,10);}if(!date)report.invalidDates.push(i+1);
  const statusRaw=String(r[10]??"").trim().toUpperCase(),status:LegacyRow["status"]=statusRaw==="OPEN"?"OPEN":statusRaw==="CLOSE"||statusRaw==="CLOSED"?"CLOSED":null;if(!status)report.statusMappingIssues.push(i+1);
  const row:LegacyRow={sourceRow:i+1,originalNumber:String(r[2]??r[1]??""),date,category:String(r[6]??"").trim(),description:String(r[7]??"").trim(),company:String(r[8]??"").trim(),section:String(r[9]??"").trim().toUpperCase(),status,original:r};
  const fp=[date,row.category,row.description.toLowerCase(),row.company,row.section].join("|");if(fingerprints.has(fp))report.possibleDuplicates.push(i+1);else fingerprints.set(fp,i+1);rows.push(row);
 }
 return{rows,report,workbookName:file.replace(/^.*[\\/]/,"")};
}
