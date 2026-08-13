import axios from 'axios'
import { LOGIN_SESSION_INVALID_PATH } from '@/lib/auth-redirect'

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 응답 에러 공통 처리.
// 401 은 세션 무효 마커를 달고 이동한다 — proxy 가 이 마커를 보고 /daily 로
// 되돌리지 않으므로 왕복이 끊긴다. 근거는 docs/auth-redirects.md
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = LOGIN_SESSION_INVALID_PATH
    }
    return Promise.reject(error)
  }
)

export default apiClient
