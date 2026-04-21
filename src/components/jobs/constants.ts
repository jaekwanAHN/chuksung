import type { CreateJobPostingInput, JobPostingStatus } from '@/types'

export const STATUS_LABEL: Record<JobPostingStatus, string> = {
  saved: '저장됨',
  applied: '지원완료',
  interviewing: '면접중',
  passed: '합격',
  rejected: '불합격',
  offer: '오퍼수락',
}

export const STATUS_COLOR: Record<JobPostingStatus, string> = {
  saved: 'bg-zinc-100 text-zinc-600',
  applied: 'bg-blue-100 text-blue-700',
  interviewing: 'bg-amber-100 text-amber-700',
  passed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
  offer: 'bg-purple-100 text-purple-700',
}

export const EMPTY_FORM: CreateJobPostingInput = {
  title: '',
  url: '',
  company: '',
  status: 'saved',
  deadline: '',
  notes: '',
}
