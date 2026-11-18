import {getCurrentUser} from '../../../../lib/auth';
export async function GET(){const user=await getCurrentUser();return Response.json(user?{ownerId:user.userId}:{error:'Sesión requerida.'},{status:user?200:401,headers:{'Cache-Control':'private, no-store'}});}
