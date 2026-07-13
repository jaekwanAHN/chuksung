-- JobReady / planner — Supabase SQL Editor에서 순서대로 실행하세요.
-- Phase 2 작업지시서 기준

-- 1. 사용자 프로필 테이블
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  day_start_time TIME NOT NULL DEFAULT '06:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 태스크 테이블
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('daily', 'weekly', 'monthly')),
  target_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  category TEXT DEFAULT 'general',
  priority INTEGER DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 기록 뷰 (완료된 태스크만)
-- security_invoker 없으면 뷰가 소유자 권한으로 실행되어 RLS를 우회함 (전체 사용자 데이터 노출)
CREATE VIEW public.completed_tasks_history WITH (security_invoker = on) AS
SELECT
  t.*,
  p.full_name,
  p.email,
  DATE_TRUNC('week', t.completed_at) AS completed_week,
  DATE_TRUNC('month', t.completed_at) AS completed_month
FROM public.tasks t
JOIN public.profiles p ON t.user_id = p.id
WHERE t.is_completed = TRUE;

-- 4. RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- 6. 신규 사용자 프로필 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. D-day 테이블
CREATE TABLE public.ddays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  target_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ddays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ddays" ON public.ddays
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ddays" ON public.ddays
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ddays" ON public.ddays
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ddays" ON public.ddays
  FOR DELETE USING (auth.uid() = user_id);

-- 7. updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. 취업공고 테이블
CREATE TABLE public.job_postings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  company TEXT,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'interviewing', 'passed', 'rejected', 'offer')),
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job_postings" ON public.job_postings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job_postings" ON public.job_postings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job_postings" ON public.job_postings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job_postings" ON public.job_postings
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_job_postings_updated_at
  BEFORE UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. 최종목표 테이블 (유저당 1개)
CREATE TABLE public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 11. 일간 태스크 템플릿 테이블 (매일 자동 추가)
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

-- 12. 템플릿 적용 기록 ((템플릿, 날짜) 당 1회만 적용 — 멱등)
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

-- 13. CS 퀴즈 (migrations 0001·0003 반영. 문항 시드는 0002_quiz_seed.sql 참조)
CREATE TYPE quiz_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');

CREATE TABLE public.quiz_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  "order" INTEGER NOT NULL
);

CREATE TABLE public.quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id TEXT REFERENCES public.quiz_categories(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  difficulty quiz_difficulty NOT NULL DEFAULT 'beginner',
  tags TEXT[] DEFAULT '{}',
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answer TEXT,
  explanation TEXT
);

CREATE TABLE public.quiz_follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.quiz_histories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT quiz_histories_user_question_unique UNIQUE (user_id, question_id)
);

ALTER TABLE public.quiz_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_histories ENABLE ROW LEVEL SECURITY;

-- 카테고리·문항·꼬리질문은 로그인 없이도 읽기 가능
CREATE POLICY "Anyone can read quiz_categories" ON public.quiz_categories
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read quiz_questions" ON public.quiz_questions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read quiz_follow_ups" ON public.quiz_follow_ups
  FOR SELECT USING (true);

-- 출제 이력은 본인 데이터만
CREATE POLICY "Users can view own quiz_histories" ON public.quiz_histories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz_histories" ON public.quiz_histories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz_histories" ON public.quiz_histories
  FOR UPDATE USING (auth.uid() = user_id);

-- 14. 인덱스 (조회 패턴·FK 기반 — migrations 0007 반영)
-- RLS가 모든 쿼리에 user_id 필터를 붙이므로 user_id 선두 복합 인덱스를 기본으로 한다.
CREATE INDEX tasks_user_scope_target_date_idx
  ON public.tasks (user_id, scope, target_date);
CREATE INDEX tasks_user_completed_at_idx
  ON public.tasks (user_id, completed_at DESC)
  WHERE is_completed = TRUE;
CREATE INDEX ddays_user_target_date_idx
  ON public.ddays (user_id, target_date);
CREATE INDEX job_postings_user_deadline_idx
  ON public.job_postings (user_id, deadline);
CREATE INDEX task_templates_user_id_idx
  ON public.task_templates (user_id);
CREATE INDEX task_template_applications_user_applied_date_idx
  ON public.task_template_applications (user_id, applied_date);
CREATE INDEX quiz_questions_category_id_idx
  ON public.quiz_questions (category_id);
CREATE INDEX quiz_follow_ups_question_id_idx
  ON public.quiz_follow_ups (question_id);

-- 카테고리 초기 데이터
INSERT INTO public.quiz_categories (id, label, "order") VALUES
  ('frontend',         '프론트엔드',     1),
  ('network',          '네트워크',       2),
  ('data-structure',   '자료구조',       3),
  ('os',               '운영체제',       4),
  ('security',         '보안',           5),
  ('database',         '데이터베이스',   6),
  ('software-design',  '소프트웨어 설계', 7),
  ('devtools',         '개발 도구',      8);
