import Image from "next/image";
import Link from "next/link";

type BrandProps = {className?: string; priority?: boolean};

export function CompanyMark({className = "", priority = false}: BrandProps) {
  return <Image src="/images/scm-mark.jpeg" alt="PT Sulawesi Cahaya Mineral" width={1563} height={1563} priority={priority} className={`object-contain ${className}`} />;
}

export function CompanyWordmark({className = "", priority = false}: BrandProps) {
  return <Image src="/images/scm-wordmark.jpeg" alt="PT Sulawesi Cahaya Mineral" width={1600} height={400} priority={priority} className={`h-auto object-contain ${className}`} />;
}

export function AuthBrand() {
  return <Link href="/login" aria-label="SISOBER — PT Sulawesi Cahaya Mineral" className="mb-6 block w-fit max-w-[280px] rounded-xl bg-white p-2 transition hover:opacity-90">
    <CompanyWordmark priority className="w-full" />
  </Link>;
}
