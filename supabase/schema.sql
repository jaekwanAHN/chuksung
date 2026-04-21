-- JobReady / planner — Supabase SQL Editor에서 순서대로 실행하세요.
-- Phase 2 작업지시서 기준

-- 1. 사용자 프로필 테이블
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
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
CREATE VIEW public.completed_tasks_history AS
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
