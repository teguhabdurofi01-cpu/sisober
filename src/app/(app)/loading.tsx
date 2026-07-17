import {LoaderCircle} from "lucide-react";

export default function Loading(){
  return <div className="route-loading" role="status" aria-live="polite">
    <span className="route-loading-bar" aria-hidden="true"/>
    <div><LoaderCircle className="animate-spin" size={18}/><span>Memuat data SISOBER…</span></div>
  </div>;
}
