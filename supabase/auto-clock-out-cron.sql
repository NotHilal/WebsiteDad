-- Step 1: Enable extensions (run once)
create extension if not exists pg_cron;

-- Step 2: Winter job (NZST, April–September): 10:00 UTC = 22:00 NZ
select cron.schedule(
  'auto-clock-out-nzst',
  '0 10 * * *',
  $$
  UPDATE timesheets
  SET clock_out = (clock_in::date + time '22:00:00')::timestamptz
  WHERE clock_out IS NULL
    AND clock_in < (now()::date + time '22:00:00')::timestamptz;
  $$
);

-- Step 3: Summer job (NZDT, September–April): 09:00 UTC = 22:00 NZ
select cron.schedule(
  'auto-clock-out-nzdt',
  '0 9 * * *',
  $$
  UPDATE timesheets
  SET clock_out = (clock_in::date + time '22:00:00')::timestamptz
  WHERE clock_out IS NULL
    AND clock_in < (now()::date + time '22:00:00')::timestamptz;
  $$
);

-- To verify jobs are active:
-- select * from cron.job;

-- To remove jobs later:
-- select cron.unschedule('auto-clock-out-nzst');
-- select cron.unschedule('auto-clock-out-nzdt');
