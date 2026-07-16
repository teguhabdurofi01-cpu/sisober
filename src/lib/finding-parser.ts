const COMPANY_CODES=["BMS","JAM","MIM","MRP","PMS","REAL","STM","TII"] as const;
const companyGroup=COMPANY_CODES.join("|");
const unitPatterns=[
 new RegExp(`\\bDT\\s*(?:(?:${companyGroup}|SCM|HLG|HGL|LIM|DTS)\\s*){0,4}\\d+\\b`,"i"),
 new RegExp(`\\bDT\\s*(?:(?:${companyGroup})\\s*)?(?:SCM\\s*)?(?:HLG|LIM|DTS)\\s*[-/]?\\s*\\d+\\b`,"i"),
 new RegExp(`\\b(?:${companyGroup})\\s+DTS\\s*[-/]?\\s*\\d+\\b`,"i"),
 new RegExp(`\\b(?:SCM\\s*)?(?:HLG|LIM|DTS)\\s*[-/]?\\s*\\d+\\b`,"i"),
 /\bDT\s*SCM\s*[-/]?\s*\d+\b/i,
 new RegExp(`\\bDT\\s*(?:(?:${companyGroup})\\s*)?\\d+\\b`,"i")
];

function normalizeUnit(value:string){return value.toUpperCase().replace(/DTSCM/g,"DT SCM ").replace(/SCMHLG/g,"SCM HLG ").replace(/SCMLIM/g,"SCM LIM ").replace(/([A-Z])(?=\d)/g,"$1 ").replace(/\s+/g," ").trim()}
function cleanRemark(value:string,companyCode?:string){let result=value.replace(/\bpada\s+unit\b/gi," ").replace(/^[\s,.;:&-]+|[\s,.;:&-]+$/g,"").replace(/\s+/g," ").trim();result=result.replace(/^(?:pada\s+)?unit\s+/i,"").replace(/^pada\s+/i,"").replace(/^(?:di\s*)?temukan(?:\s+kondisi)?\s+/i,"").replace(/^temuan\s+/i,"");if(companyCode)result=result.replace(new RegExp(`\\b(?:PT\\s+)?${companyCode}\\b`,"gi")," ");return result.replace(/^[\s,.;:&-]+|[\s,.;:&-]+$/g,"").replace(/\s+/g," ").trim()}

export function parseFindingDescription(description:string,companyCode?:string){const source=description.trim();const found=unitPatterns.map(pattern=>pattern.exec(source)).find(Boolean);if(!found)return{unitNumber:null,remark:cleanRemark(source,companyCode)};const unitNumber=normalizeUnit(found[0]),before=source.slice(0,found.index),after=source.slice(found.index+found[0].length);const remark=cleanRemark(`${before} ${after}`,companyCode);return{unitNumber,remark:remark||source};}
