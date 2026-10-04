BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(5);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'viewer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"localloops_app":true}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'friend@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"localloops_app":true}', now(), now()),
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'stranger@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"localloops_app":true}', now(), now()),
  ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'public@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"localloops_app":true}', now(), now()),
  ('55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'pending@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"localloops_app":true}', now(), now());

INSERT INTO public.localloops_profiles (id, display_name, discoverable)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Viewer', false),
  ('22222222-2222-4222-8222-222222222222', 'Accepted friend', false),
  ('33333333-3333-4333-8333-333333333333', 'Stranger', false),
  ('44444444-4444-4444-8444-444444444444', 'Discoverable member', true),
  ('55555555-5555-4555-8555-555555555555', 'Pending contact', false);

INSERT INTO public.localloops_friendships (requester_id, addressee_id, status)
VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'accepted'),
  ('11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555555', 'pending');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

SELECT is((SELECT count(*)::integer FROM public.localloops_profiles), 3, 'viewer sees self, accepted friend, and discoverable profile');
SELECT is((SELECT count(*)::integer FROM public.localloops_profiles WHERE id = '22222222-2222-4222-8222-222222222222'), 1, 'accepted friend profile is visible');
SELECT is((SELECT count(*)::integer FROM public.localloops_profiles WHERE id = '44444444-4444-4444-8444-444444444444'), 1, 'discoverable profile is visible');
SELECT is((SELECT count(*)::integer FROM public.localloops_profiles WHERE id = '33333333-3333-4333-8333-333333333333'), 0, 'unrelated private profile is hidden');
SELECT is((SELECT count(*)::integer FROM public.localloops_profiles WHERE id = '55555555-5555-4555-8555-555555555555'), 0, 'pending contact profile is hidden');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
