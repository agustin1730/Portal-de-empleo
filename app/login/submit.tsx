"use client";
import {useFormStatus} from "react-dom";
export default function AuthSubmit({children}:{children:React.ReactNode}){
 const {pending}=useFormStatus();
 return <button className="button primary full" disabled={pending}>{pending?"Un momento…":children}</button>;
}
