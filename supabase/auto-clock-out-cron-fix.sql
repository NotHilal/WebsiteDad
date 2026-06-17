-- Drop the two conflicting jobs
select cron.unschedule('auto-clock-out-nzst');
select cron.unschedule('auto-clock-out-nzdt');

-- Single job: runs at 09:00 UTC and 10:00 UTC every day.
-- The WHERE clause checks NZ local time >= 22:00, so whichever firing
-- is the "wrong" season does nothing (NZ time will be 21:00 or 23:00
-- and clock_out is already set by the correct firing).
select cron.schedule(
  'auto-clock-out-nz',
  '0 9,10 * * *',
  $$
  UPDATE timesheets
  SET clock_out = (
    (clock_in AT TIME ZONE 'Pacific/Auckland')::date + interval '22 hours'
  ) AT TIME ZONE 'Pacific/Auckland'
  WHERE clock_out IS NULL
    AND (now() AT TIME ZONE 'Pacific/Auckland')::time >= time '22:00:00';
  $$
);

-- Verify:
-- select jobid, schedule, jobname, active from cron.job;
