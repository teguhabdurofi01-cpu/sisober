"use client";

import type {ButtonHTMLAttributes,ReactNode} from "react";
import {useFormStatus} from "react-dom";
import {LoaderCircle} from "lucide-react";

type Props=ButtonHTMLAttributes<HTMLButtonElement>&{children:ReactNode;pendingLabel?:string};

export function SubmitButton({children,pendingLabel="Memproses…",className="",disabled,...props}:Props){
  const {pending}=useFormStatus();
  return <button {...props} className={`${className} submit-feedback`} disabled={disabled||pending} aria-busy={pending}>
    {pending?<><LoaderCircle className="animate-spin" size={16}/><span>{pendingLabel}</span></>:children}
    {pending?<span className="submit-feedback-bar" aria-hidden="true"/>:null}
  </button>;
}
