begin;
alter table public.jobs drop constraint jobs_status_check;
alter table public.jobs add constraint jobs_status_check check (status in ('pendiente','guardado','por_postular','postulado','contactado','entrevista','oferta','descartado'));
commit;
