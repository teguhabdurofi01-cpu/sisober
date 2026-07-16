import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"SISOBER · Safety Inspection",description:"Safety Inspection Unit and Behavior Driver"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
