-- 헤더 중앙에 노출하는 각오 한마디. 유저당 1개라 profiles 에 컬럼으로 둔다.
-- 20자 상한은 앱에서 집행한다 (근거: docs/header-motto.md).
ALTER TABLE public.profiles ADD COLUMN motto TEXT;
