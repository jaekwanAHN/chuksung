-- 조회 패턴·FK 기반 인덱스 추가 (평가리포트 §5-1)
--
-- 기존에는 PK/UNIQUE 외 인덱스가 전무했다. RLS가 모든 쿼리에
-- user_id 필터를 붙이므로 user_id를 선두로 하는 복합 인덱스를 기본으로 한다.

-- tasks: 일간/주간 조회(scope + target_date =), 월간 조회(scope + target_date 범위)
CREATE INDEX tasks_user_scope_target_date_idx
  ON public.tasks (user_id, scope, target_date);

-- tasks: 완료 기록 조회 (is_completed = true, completed_at 내림차순 정렬)
-- completed_tasks_history 뷰의 WHERE 조건과 일치하는 부분 인덱스
CREATE INDEX tasks_user_completed_at_idx
  ON public.tasks (user_id, completed_at DESC)
  WHERE is_completed = TRUE;

-- ddays: 목록 조회 (target_date 오름차순 정렬)
CREATE INDEX ddays_user_target_date_idx
  ON public.ddays (user_id, target_date);

-- job_postings: 목록 조회 (deadline 오름차순 정렬)
CREATE INDEX job_postings_user_deadline_idx
  ON public.job_postings (user_id, deadline);

-- task_templates: 목록 조회·일간 시딩 (user_id + is_active 필터)
CREATE INDEX task_templates_user_id_idx
  ON public.task_templates (user_id);

-- task_template_applications: 일간 시딩 시 (user_id, applied_date) 적용 여부 확인
-- (UNIQUE(template_id, applied_date)는 template_id 선두라 이 조회를 못 돕는다)
CREATE INDEX task_template_applications_user_applied_date_idx
  ON public.task_template_applications (user_id, applied_date);

-- quiz_questions: 카테고리별 문항 조회 (FK)
CREATE INDEX quiz_questions_category_id_idx
  ON public.quiz_questions (category_id);

-- quiz_follow_ups: 문항별 꼬리질문 조회 (FK)
CREATE INDEX quiz_follow_ups_question_id_idx
  ON public.quiz_follow_ups (question_id);
