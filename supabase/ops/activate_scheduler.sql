-- Switches scheduled measurement on. Run once, by hand, after 0004 is applied and /api/worker is live in production.
-- From then on: every minute the waiting runs are worked off, and at 06:00 KST brands set to daily measurement are queued.
-- Each daily brand costs up to 20 questions x connected engines in real API calls per day.
-- To switch off: update private.worker_config set url = null;
create extension if not exists pg_cron;
create extension if not exists pg_net;
update private.worker_config set secret = encode(extensions.gen_random_bytes(32), 'hex') where secret is null;
update private.worker_config set url = 'https://ansra.xwise.net/api/worker';
select cron.schedule('ansra-drain', '* * * * *', $$select private.worker_tick('drain')$$);
select cron.schedule('ansra-daily', '0 21 * * *', $$select private.worker_tick('schedule')$$);  -- 21:00 UTC = 06:00 KST
