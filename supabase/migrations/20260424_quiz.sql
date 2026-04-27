-- CS 퀴즈 스키마 마이그레이션

-- 1. 카테고리 테이블
CREATE TABLE public.quiz_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  "order" INTEGER NOT NULL
);

-- 2. 문항 테이블
CREATE TYPE quiz_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');

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

-- 3. 꼬리질문 테이블 (미사용, 스키마만)
CREATE TABLE public.quiz_follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0
);

-- 4. 출제 이력 테이블 (미사용, 스키마만)
CREATE TABLE public.quiz_histories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS
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

-- 6. 카테고리 초기 데이터
INSERT INTO public.quiz_categories (id, label, "order") VALUES
  ('frontend',         '프론트엔드',     1),
  ('network',          '네트워크',       2),
  ('data-structure',   '자료구조',       3),
  ('os',               '운영체제',       4),
  ('security',         '보안',           5),
  ('database',         '데이터베이스',   6),
  ('software-design',  '소프트웨어 설계', 7),
  ('devtools',         '개발 도구',      8);
