BEGIN;

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_allocations_sum_check;

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_total_matches_allocations_check;

COMMIT;

-- Optional verification:
-- SELECT conname
-- FROM pg_constraint
-- WHERE conrelid = 'submissions'::regclass
--   AND conname IN (
--     'submissions_allocations_sum_check',
--     'submissions_total_matches_allocations_check'
--   );
