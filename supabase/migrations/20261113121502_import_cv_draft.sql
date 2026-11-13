begin;
create function public.import_candidate_cv(profile_patch jsonb,file_name text,file_content text,replace_existing boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_data jsonb; item record;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(profile_patch)<>'object' or octet_length(profile_patch::text)>190000 then raise exception 'Invalid profile';end if;
 insert into public.candidate_profiles(owner_id,data) values(auth.uid(),'{}') on conflict(owner_id) do nothing;
 select data into current_data from public.candidate_profiles where owner_id=auth.uid() for update;
 for item in select key,value from jsonb_each(profile_patch) loop
  if item.key not in ('name','headline','location','email','phone','summary','experience','education','skills','personalSkills','languages','cv_import') then raise exception 'Invalid field';end if;
  if item.key='cv_import' or replace_existing or not (current_data ? item.key) or current_data->item.key in ('null'::jsonb,'""'::jsonb,'[]'::jsonb) then
   current_data:=jsonb_set(current_data,array[item.key],item.value,true);
  end if;
 end loop;
 update public.candidate_profiles set data=current_data,updated_at=now() where owner_id=auth.uid();
 insert into public.candidate_files(owner_id,kind,name,mime,content) values(auth.uid(),'cv',file_name,'application/pdf',file_content)
 on conflict(owner_id,kind) do update set name=excluded.name,mime=excluded.mime,content=excluded.content,updated_at=now();
 return current_data;
end;
$$;
revoke all on function public.import_candidate_cv(jsonb,text,text,boolean) from public,anon;
grant execute on function public.import_candidate_cv(jsonb,text,text,boolean) to authenticated;
commit;
