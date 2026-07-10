import { z } from 'zod'

// API 요청 본문 스키마. 여기 정의된 키만 DB에 전달되므로
// (parseBody가 나머지를 제거) 각 테이블의 쓰기 가능 컬럼 화이트리스트 역할을 한다.
// DB CHECK 제약(supabase/schema.sql)과 값 범위를 일치시킬 것.

const taskScope = z.enum(['daily', 'weekly', 'monthly'])
const taskCategory = z.enum([
  'application',
  'study',
  'networking',
  'interview',
  'general',
])
const taskPriority = z.union([z.literal(1), z.literal(2), z.literal(3)])

const nonEmpty = (v: object) => Object.keys(v).length > 0
const NON_EMPTY_MESSAGE = '수정할 필드가 없습니다.'

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).nullish(),
  scope: taskScope,
  target_date: z.iso.date(),
  category: taskCategory.optional(),
  priority: taskPriority.optional(),
})

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).nullish(),
    scope: taskScope.optional(),
    target_date: z.iso.date().optional(),
    category: taskCategory.optional(),
    priority: taskPriority.optional(),
    is_completed: z.boolean().optional(),
    completed_at: z.iso.datetime().nullish(),
  })
  .refine(nonEmpty, NON_EMPTY_MESSAGE)

export const createDdaySchema = z.object({
  label: z.string().trim().min(1).max(100),
  target_date: z.iso.date(),
})

export const updateDdaySchema = z
  .object({
    label: z.string().trim().min(1).max(100).optional(),
    target_date: z.iso.date().optional(),
  })
  .refine(nonEmpty, NON_EMPTY_MESSAGE)

const jobPostingStatus = z.enum([
  'saved',
  'applied',
  'interviewing',
  'passed',
  'rejected',
  'offer',
])

// url은 http(s)만 허용해 javascript: 등 위험한 스킴을 서버에서 차단한다.
const jobPostingFields = {
  title: z.string().trim().min(1).max(200),
  url: z.url({ protocol: /^https?$/ }).max(2000).nullish(),
  company: z.string().max(200).nullish(),
  status: jobPostingStatus.optional(),
  deadline: z.iso.date().nullish(),
  notes: z.string().max(5000).nullish(),
}

export const createJobPostingSchema = z.object(jobPostingFields)

export const updateJobPostingSchema = z
  .object({ ...jobPostingFields, title: jobPostingFields.title.optional() })
  .refine(nonEmpty, NON_EMPTY_MESSAGE)

export const upsertGoalSchema = z.object({
  content: z.string().max(10000),
})

export const updateProfileSchema = z.object({
  day_start_time: z.iso.time(),
})

export const createTaskTemplateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).nullish(),
  category: taskCategory.optional(),
  priority: taskPriority.optional(),
})

export const updateTaskTemplateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).nullish(),
    category: taskCategory.optional(),
    priority: taskPriority.optional(),
    is_active: z.boolean().optional(),
  })
  .refine(nonEmpty, NON_EMPTY_MESSAGE)

export const upsertQuizHistorySchema = z.object({
  question_id: z.uuid(),
  is_bookmarked: z.boolean().optional(),
})
