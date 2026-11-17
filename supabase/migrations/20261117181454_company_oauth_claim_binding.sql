create or replace function public.company_connector_access_token(event jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare claims jsonb;target text;
begin
 claims:=(event->'claims')-'resource';
 select resource into target from company_connector_private.oauth_clients
 where client_id::text=coalesce(event->'claims'->>'client_id',event->>'client_id');
 if target is not null then claims:=jsonb_set(claims,'{resource}',to_jsonb(target));end if;
 return jsonb_build_object('claims',claims);
end;$$;
revoke all on function public.company_connector_access_token(jsonb) from public,anon,authenticated;
grant execute on function public.company_connector_access_token(jsonb) to supabase_auth_admin;
