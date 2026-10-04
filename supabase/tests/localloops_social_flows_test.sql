BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(11);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('61111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'social-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('62222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'social-b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('63333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'social-outsider@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

INSERT INTO public.localloops_profiles (id, display_name, discoverable)
VALUES
  ('61111111-1111-4111-8111-111111111111', 'Social A', false),
  ('62222222-2222-4222-8222-222222222222', 'Social B', true),
  ('63333333-3333-4333-8333-333333333333', 'Social outsider', false);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '61111111-1111-4111-8111-111111111111';

SELECT ok(
  public.localloops_send_connection_request('62222222-2222-4222-8222-222222222222') IS NOT NULL,
  'a member can send a connection request'
);
SELECT is(
  (SELECT count(*)::integer FROM public.localloops_friendships
   WHERE requester_id = '61111111-1111-4111-8111-111111111111'
     AND addressee_id = '62222222-2222-4222-8222-222222222222'),
  1,
  'the request is stored once'
);
SELECT ok(
  public.localloops_send_connection_request('62222222-2222-4222-8222-222222222222') IS NOT NULL,
  'repeating a request is safe'
);
SELECT is(
  (SELECT count(*)::integer FROM public.localloops_friendships
   WHERE least(requester_id, addressee_id) = least('61111111-1111-4111-8111-111111111111'::uuid, '62222222-2222-4222-8222-222222222222'::uuid)
     AND greatest(requester_id, addressee_id) = greatest('61111111-1111-4111-8111-111111111111'::uuid, '62222222-2222-4222-8222-222222222222'::uuid)),
  1,
  'repeated requests do not create another friendship row'
);
SELECT is(
  (SELECT status FROM public.localloops_friendships
   WHERE requester_id = '61111111-1111-4111-8111-111111111111'
     AND addressee_id = '62222222-2222-4222-8222-222222222222'),
  'pending',
  'the first request remains pending until accepted'
);

SET LOCAL request.jwt.claim.sub = '62222222-2222-4222-8222-222222222222';
SELECT ok(
  public.localloops_send_connection_request('61111111-1111-4111-8111-111111111111') IS NOT NULL,
  'a reverse request accepts the existing pending request'
);
SELECT is(
  (SELECT status FROM public.localloops_friendships
   WHERE requester_id = '61111111-1111-4111-8111-111111111111'
     AND addressee_id = '62222222-2222-4222-8222-222222222222'),
  'accepted',
  'mutual requests resolve to one accepted connection'
);

UPDATE public.localloops_profiles SET discoverable = false
WHERE id = '62222222-2222-4222-8222-222222222222';
SET LOCAL request.jwt.claim.sub = '61111111-1111-4111-8111-111111111111';
SELECT is(
  (SELECT count(*)::integer FROM public.localloops_profiles
   WHERE id = '62222222-2222-4222-8222-222222222222'),
  1,
  'accepted friends can still see a profile after public discovery is turned off'
);

SET LOCAL request.jwt.claim.sub = '61111111-1111-4111-8111-111111111111';
INSERT INTO public.localloops_messages (friendship_id, sender_id, body)
SELECT id, '61111111-1111-4111-8111-111111111111', 'Hello from the social flow test.'
FROM public.localloops_friendships
WHERE requester_id = '61111111-1111-4111-8111-111111111111'
  AND addressee_id = '62222222-2222-4222-8222-222222222222';
SELECT is((SELECT count(*)::integer FROM public.localloops_messages), 1, 'the sender can read their message');

SET LOCAL request.jwt.claim.sub = '62222222-2222-4222-8222-222222222222';
SELECT is((SELECT count(*)::integer FROM public.localloops_messages), 1, 'the accepted friend can read the conversation');

SET LOCAL request.jwt.claim.sub = '63333333-3333-4333-8333-333333333333';
SELECT is((SELECT count(*)::integer FROM public.localloops_messages), 0, 'an unrelated member cannot read the conversation');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
