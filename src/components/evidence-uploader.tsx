"use client";

import {type FormEvent,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {CheckCircle2,FileUp,LoaderCircle} from "lucide-react";

export function EvidenceUploader({submissionId}:{submissionId:string}){
  const router=useRouter(),formRef=useRef<HTMLFormElement>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[progress,setProgress]=useState(0),[filename,setFilename]=useState(""),[stage,setStage]=useState("");

  async function legacyUpload(formData:FormData){formData.set("submission_id",submissionId);const response=await fetch("/api/evidence",{method:"POST",body:formData}),body=await response.json();if(!response.ok)throw new Error(body.error||"Unggah bukti gagal");}

  async function upload(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    const formData=new FormData(event.currentTarget),file=formData.get("file");
    if(!(file instanceof File)||!file.size)return;
    setBusy(true);setError("");setProgress(3);setFilename(file.name);setStage("Menyiapkan unggahan");
    try{
      const init=await fetch("/api/evidence/init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({submissionId,evidenceType:formData.get("evidence_type"),filename:file.name,mimeType:file.type,fileSize:file.size})}),prepared=await init.json();
      if(init.status===409){setStage("Mengunggah bukti");setProgress(12);await legacyUpload(formData);setProgress(100);}
      else{
        if(!init.ok)throw new Error(prepared.error||"Tidak dapat menyiapkan unggahan");
        setStage("Mengunggah ke penyimpanan");setProgress(15);
        await new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open("PUT",prepared.url);Object.entries(prepared.headers as Record<string,string>).forEach(([key,value])=>xhr.setRequestHeader(key,value));xhr.upload.onprogress=(e)=>{if(e.lengthComputable)setProgress(15+Math.round(e.loaded/e.total*75));};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error("R2 menolak unggahan"));xhr.onerror=()=>reject(new Error("Koneksi unggahan terputus"));xhr.send(file);});
        setStage("Memverifikasi file");setProgress(92);
        const complete=await fetch("/api/evidence/complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({evidenceId:prepared.evidenceId})}),done=await complete.json();
        if(!complete.ok)throw new Error(done.error||"Verifikasi unggahan gagal");setProgress(100);
      }
      setStage("Unggahan selesai");formRef.current?.reset();router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Unggah bukti gagal");setStage("Unggahan gagal");}
    finally{setBusy(false);}
  }

  return <form ref={formRef} onSubmit={upload} className="rounded-xl border border-dashed border-[var(--line)] bg-slate-50/70 p-4" aria-busy={busy}>
    <div className="flex items-center gap-2"><FileUp size={18} className="text-[var(--accent)]"/><h3 className="text-sm font-bold">Unggah bukti penyelesaian</h3></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_11rem_auto]"><input aria-label="File bukti" className="field" type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm" required disabled={busy} onChange={e=>setFilename(e.target.files?.[0]?.name||"")}/><select aria-label="Jenis bukti" className="field" name="evidence_type" defaultValue="AFTER" disabled={busy}><option value="AFTER">Setelah perbaikan</option><option value="BEFORE">Sebelum perbaikan</option><option value="DOCUMENT">Dokumen</option><option value="OTHER">Lainnya</option></select><button className="btn submit-feedback" disabled={busy}>{busy?<><LoaderCircle className="animate-spin" size={16}/>{progress}%</>:"Unggah"}</button></div>
    {filename?<p className="mt-2 truncate text-xs font-bold text-[var(--ink)]">File: {filename}</p>:null}
    {(busy||progress===100)?<div className="upload-progress" role="status" aria-live="polite"><div className="flex items-center justify-between gap-3 text-xs font-bold"><span className="flex items-center gap-2">{progress===100?<CheckCircle2 size={15} className="text-emerald-700"/>:<LoaderCircle size={15} className="animate-spin text-[var(--accent)]"/>}{stage}</span><span>{progress}%</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200" style={{width:`${progress}%`}}/></div></div>:null}
    <p className="mt-2 text-xs text-[var(--muted)]">JPG, PNG, WebP, PDF, MP4, MOV, atau WebM. Maksimum 250 MB dengan R2.</p>{error?<p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>:null}
  </form>;
}
