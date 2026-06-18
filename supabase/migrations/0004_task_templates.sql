-- 일간 태스크 템플릿 (매일 자동 추가) — Supabase SQL Editor에 전체를 붙여넣고 실행하세요.
--
-- ⚠️ 주의: 아래 두 템플릿 테이블은 매번 DROP 후 재생성합니다.
--   기존 테이블이 (잘못된 스키마로) 남아 있어도 항상 올바른 구조가 보장됩니다.
--   단, 재실행 시 task_templates / task_template_applications 데이터는 초기화됩니다.
--   (day_start_time 추가는 멱등 — 데이터에 영향 없음)

-- 1. 하루 시작 시각 (전체 공통, 시간 게이트 기준)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS day_start_time TIME NOT NULL DEFAULT '06:00';

-- 2. 기존(잘못된) 테이블 제거 후 재생성
DROP TABLE IF EXISTS public.task_template_applications CASCADE;
DROP TABLE IF EXISTS public.task_templates CASCADE;

-- 3. 템플릿 테이블
CREATE TABLE public.task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  priority INTEGER DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_templates_select ON public.task_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY task_templates_insert ON public.task_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY task_templates_update ON public.task_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY task_templates_delete ON public.task_templates
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. 템플릿 적용 기록 ((템플릿, 날짜) 당 1회만 적용 — 멱등)
CREATE TABLE public.task_template_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.task_templates(id) ON DELETE CASCADE NOT NULL,
  applied_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (template_id, applied_date)
);

ALTER TABLE public.task_template_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tta_select ON public.task_template_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY tta_insert ON public.task_template_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY tta_delete ON public.task_template_applications
  FOR DELETE USING (auth.uid() = user_id);
