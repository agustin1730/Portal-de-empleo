export function allowedDestination(value:string|null){return value==="/password"?"/password":"/";}
export function authSiteUrl(){
 const configured=process.env.SITE_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?"https://"+process.env.VERCEL_PROJECT_PRODUCTION_URL:"http://localhost:3000");
 const url=new URL(configured);
 if(url.protocol!=="https:"&&!(url.protocol==="http:"&&url.hostname==="localhost"))throw new Error("Invalid authentication origin");
 return url.origin;
}
export function ownerEmailMatches(value:string){return !!process.env.OWNER_EMAIL&&value.trim().toLowerCase()===process.env.OWNER_EMAIL.trim().toLowerCase();}
export function validNewPassword(password:string,confirmation:string){return password.length>=12&&password.length<=128&&password===confirmation;}
