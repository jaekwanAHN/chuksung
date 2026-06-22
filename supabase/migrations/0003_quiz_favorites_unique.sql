-- quiz_histories에 유저+문항 유니크 제약 추가 (즐겨찾기 upsert 지원)
ALTER TABLE public.quiz_histories
  ADD CONSTRAINT quiz_histories_user_question_unique UNIQUE (user_id, question_id);
