import {describe,expect,it} from "vitest";import {parseFindingDescription} from "../src/lib/finding-parser";
describe("finding description parser",()=>{
 it("separates a prefixed hauling unit",()=>expect(parseFindingDescription("DT STM HLG 893 tyre no 12 mengalami aus","STM")).toEqual({unitNumber:"DT STM HLG 893",remark:"tyre no 12 mengalami aus"}));
 it("separates a unit embedded after the defect",()=>expect(parseFindingDescription("Lampu utama sebelah kiri pada unit SCM HLG 014 mati","MIM")).toEqual({unitNumber:"SCM HLG 014",remark:"Lampu utama sebelah kiri mati"}));
 it("recognizes DT SCM without a hauling section",()=>expect(parseFindingDescription("Pada unit DT SCM 559 JAM Hanya terdapat 1 wheel choke","JAM")).toEqual({unitNumber:"DT SCM 559",remark:"Hanya terdapat 1 wheel choke"}));
 it("normalizes glued unit identifiers",()=>expect(parseFindingDescription("Pada DTSCM LIM 382 Lampu depan mati satu","MRP")).toEqual({unitNumber:"DT SCM LIM 382",remark:"Lampu depan mati satu"}));
 it("keeps genuinely unit-less remarks",()=>expect(parseFindingDescription("wiring pada lampu kerja putus","STM")).toEqual({unitNumber:null,remark:"wiring pada lampu kerja putus"}));
});
