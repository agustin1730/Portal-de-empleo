import type {NextConfig} from "next";
const nextConfig:NextConfig={poweredByHeader:false,env:{NEXT_PUBLIC_APP_BUILD_AT:new Date().toISOString(),NEXT_PUBLIC_APP_VERSION:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7)||"local"},async headers(){return [{source:"/(.*)",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"Referrer-Policy",value:"no-referrer"},{key:"X-Frame-Options",value:"DENY"}]}];}};
export default nextConfig;
