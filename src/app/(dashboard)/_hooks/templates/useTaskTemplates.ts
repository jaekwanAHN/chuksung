'use client'

import { useCallback } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { format } from 'date-fns'
import apiClient from '@/lib/axios'
import type {
  CreateTaskTemplateInput,
  Task,
  TaskTemplate,
  TaskTemplateMutationResult,
  UpdateTaskTemplateInput,
} from '@/types'
import { taskKeys } from '../tasks/useTasks'

const templateKeys = {
  all: ['task-templates'] as const,
}

/** 서버 측 시딩 게이트 판정용 로컬 현재시각. 일간 GET 이 보내는 것과 같은 값이다. */
const clientNowParams = () => ({
  client_now: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
})

/**
 * 일간 목록의 서버 정렬(priority, created_at 오름차순)을 그대로 재현해 병합한다.
 * 뒤에 이어 붙이기만 하면 우선순위 1짜리 시딩 태스크가 목록 맨 끝에 붙는다.
 */
function mergeSeededTasks(prev: Task[], seeded: Task[]): Task[] {
  const known = new Set(prev.map((task) => task.id))
  const added = seeded.filter((task) => !known.has(task.id))
  if (added.length === 0) return prev
  return [...prev, ...added].sort(
    (a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at)
  )
}

export function useTaskTemplates() {
  const queryClient = useQueryClient()

  /**
   * 뮤테이션 결과를 목록 캐시에 직접 쓴다. 재조회가 없으므로 "낡은 응답이 신선한
   * 데이터로 안착하는" 창이 열리지 않는다.
   *
   * cancelQueries 가 남아 있는 이유는 PR #65 때와 다르다. 예전에는 재요청이 진행 중인
   * 요청으로 dedupe 되는 것을 막으려는 것이었고, 지금은 **뮤테이션 이전에 이미 날아간
   * 조회의 응답이 이 쓰기를 덮어쓰는 것**을 막는다. 그 응답은 변경 이전에 계산된
   * 목록이다. (docs/task-race-guards.md)
   *
   * 캐시가 아직 없으면(첫 조회가 진행 중이거나 그 키를 아무도 안 본 상태) 쓸 바탕이
   * 없으므로 재조회에 맡긴다. 이 재조회는 뮤테이션 이후에 나가므로 서버가 변경을 본다.
   * **취소만 하고 끝내면 안 된다** — 취소는 되돌리기만 할 뿐 재요청을 걸지 않아
   * 목록이 빈 채로 남는다.
   */
  const writeListCache = useCallback(
    async <T>(key: QueryKey, update: (prev: T[]) => T[]) => {
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<T[]>(key)
      if (!prev) {
        await queryClient.invalidateQueries({ queryKey: key })
        return
      }
      queryClient.setQueryData<T[]>(key, update(prev))
    },
    [queryClient]
  )

  /** 템플릿 추가·수정의 결과(그 자리에서 시딩된 태스크)를 일간 캐시에 반영한다. */
  const applySeeding = useCallback(
    async ({ seeded_tasks, target_date }: TaskTemplateMutationResult) => {
      if (!target_date || !seeded_tasks) {
        // 게이트 미통과이거나 시딩이 실패한 경우 — 무엇이 심겼는지 알 수 없으니
        // 재조회에 맡긴다. 이때도 진행 중인 낡은 조회부터 끊어야 재요청이 실제로 나간다.
        await queryClient.cancelQueries({ queryKey: taskKeys.scope('daily') })
        await queryClient.invalidateQueries({ queryKey: taskKeys.scope('daily') })
        return
      }
      // 새로 심긴 것이 없으면 일간 목록도 그대로다 — 진행 중인 조회를 끊을 이유가 없다.
      if (seeded_tasks.length === 0) return

      await writeListCache<Task>(
        taskKeys.byScope('daily', target_date),
        (prev) => mergeSeededTasks(prev, seeded_tasks)
      )
    },
    [queryClient, writeListCache]
  )

  /**
   * 템플릿 목록 캐시 갱신. **덧붙이기가 아니라 upsert 다** — 진행 중이던 목록 조회가
   * 서버의 생성 이후에 도착하면 그 응답에 이미 새 템플릿이 들어 있고, 거기에 또 붙이면
   * 같은 항목이 두 벌 남는다(React 가 같은 key 로 경고한다). POST 가 시딩까지 하면서
   * 그 창이 넓어져 E2E 에서 실제로 재현됐다.
   */
  const upsertTemplate =
    (template: TaskTemplate) =>
    (prev: TaskTemplate[]): TaskTemplate[] =>
      prev.some((t) => t.id === template.id)
        ? prev.map((t) => (t.id === template.id ? template : t))
        : [...prev, template]

  const {
    data: templates = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: templateKeys.all,
    queryFn: async (): Promise<TaskTemplate[]> => {
      const { data } = await apiClient.get<TaskTemplate[]>('/task-templates')
      return data
    },
  })

  const addMutation = useMutation({
    mutationFn: async (input: CreateTaskTemplateInput) => {
      const { data } = await apiClient.post<TaskTemplateMutationResult>(
        '/task-templates',
        input,
        { params: clientNowParams() }
      )
      return data
    },
    onSuccess: async (result) => {
      await writeListCache<TaskTemplate>(
        templateKeys.all,
        upsertTemplate(result.template)
      )
      await applySeeding(result)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTaskTemplateInput }) => {
      const { data } = await apiClient.patch<TaskTemplateMutationResult>(
        `/task-templates/${id}`,
        input,
        { params: clientNowParams() }
      )
      return data
    },
    onSuccess: async (result) => {
      await writeListCache<TaskTemplate>(
        templateKeys.all,
        upsertTemplate(result.template)
      )
      await applySeeding(result)
    },
  })

  // 삭제는 일간 목록을 바꿀 수 없어 캐시를 건드리지 않는다 (근거는 라우트 주석).
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/task-templates/${id}`)
    },
    onSuccess: async (_data, id) => {
      await writeListCache<TaskTemplate>(templateKeys.all, (prev) =>
        prev.filter((t) => t.id !== id)
      )
    },
  })

  const { mutateAsync: addAsync } = addMutation
  const { mutateAsync: updateAsync } = updateMutation
  const { mutateAsync: removeAsync } = removeMutation

  // 기존 소비처 시그니처(Promise<void>)를 유지하기 위한 얇은 래퍼
  const add = useCallback(
    async (input: CreateTaskTemplateInput): Promise<void> => {
      await addAsync(input)
    },
    [addAsync]
  )

  const update = useCallback(
    async (id: string, input: UpdateTaskTemplateInput): Promise<void> => {
      await updateAsync({ id, input })
    },
    [updateAsync]
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await removeAsync(id)
    },
    [removeAsync]
  )

  return { templates, loading, error, add, update, remove }
}
