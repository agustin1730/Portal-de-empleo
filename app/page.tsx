import Tracker from "./tracker";
import Setup from "./setup";
import {requireUser} from "../lib/auth";
import {isConfigured} from "../lib/config";
export const dynamic="force-dynamic";
export default async function Home(){if(!isConfigured())return <Setup/>;const user=await requireUser();return <Tracker displayName={user.displayName}/>;}
