import Crm from "./crm";
import Tracker from "./tracker";
import Setup from "./setup";
import {requireUser} from "../lib/auth";
import {isConfigured} from "../lib/config";
export const dynamic="force-dynamic";
export default async function Home({searchParams}:{searchParams:Promise<{vista?:string}>}){if(!isConfigured())return <Setup/>;const user=await requireUser();const params=await searchParams;return ["oportunidades","basura"].includes(params.vista||"")?<Tracker displayName={user.displayName} initialSection={params.vista==="basura"?"basura":"todos"}/>:<Crm displayName={user.displayName}/>;}
