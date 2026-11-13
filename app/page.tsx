import Panorama from "./panorama";
import {createClient} from "../lib/supabase/server";
import {emptyProfile} from "../lib/profile-data";
import CandidateProfile from "./profile";
import Crm from "./crm";
import Tracker from "./tracker";
import Setup from "./setup";
import {requireUser} from "../lib/auth";
import {isConfigured} from "../lib/config";
export const dynamic="force-dynamic";
export default async function Home({searchParams}:{searchParams:Promise<{vista?:string}>}){if(!isConfigured())return <Setup/>;const user=await requireUser();const params=await searchParams;if(params.vista==="panorama"){const db=await createClient();const {data,error}=await db.from("candidate_profiles").select("data,updated_at").eq("owner_id",user.userId).maybeSingle();return <Panorama profile={{...emptyProfile,...data?.data}} displayName={user.displayName} updatedAt={data?.updated_at||null} error={!!error}/>;}return params.vista==="perfil"?<CandidateProfile displayName={user.displayName}/>: ["oportunidades","basura"].includes(params.vista||"")?<Tracker displayName={user.displayName} initialSection={params.vista==="basura"?"basura":"todos"}/>:<Crm displayName={user.displayName}/>;}
