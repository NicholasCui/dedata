import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'

/**
 * Go 后端 API Client
 * 连接到独立的 Go 后端服务 (http://localhost:8080/api)
 */

// API 配置
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
const API_TIMEOUT = 30000

// 标准响应格式（Go 后端）
export interface BackendResponse<T = any> {
  code: number
  message: string
  data: T
}

// 创建 axios 实例连接 Go 后端
const createBackendApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: BACKEND_API_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // 发送 cookies (用于 session)
  })

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      // JWT token 会通过 cookie 自动发送
      // 如果需要从 localStorage 读取，可以在这里添加
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt_token') : null
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      console.error('[Backend API] Request error:', error)
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  instance.interceptors.response.use(
    (response) => {
      // Go 后端返回统一格式: { code: 0, message: "success", data: {...} }
      const backendResponse = response.data as BackendResponse

      // code === 0 表示成功
      if (backendResponse.code === 0) {
        return backendResponse.data // 返回 data 字段
      } else {
        // code !== 0 视为业务错误
        return Promise.reject({
          message: backendResponse.message,
          code: backendResponse.code,
          data: backendResponse.data
        })
      }
    },
    async (error: AxiosError<BackendResponse>) => {
      // HTTP 错误处理
      if (error.response) {
        const status = error.response.status
        const backendResponse = error.response.data

        switch (status) {
          case 402:
            // Payment Required (X402 Protocol)
            console.log('[Backend API] Payment Required (402):', backendResponse)
            // 对于 402 状态码，不抛出错误，而是返回包含 l402_challenge 的数据
            // 将其包装成统一的成功响应格式，让业务层处理
            // 后端返回: { success: false, message: "...", l402_challenge: {...} }
            return Promise.resolve({
              success: false,
              message: backendResponse?.message || 'Payment required',
              data: {
                l402_challenge: (backendResponse as any)?.l402_challenge
              }
            })

          case 401:
            // 未认证
            console.warn('[Backend API] Unauthorized - clearing auth state')

            // 清除认证状态
            if (typeof window !== 'undefined') {
              localStorage.removeItem('jwt_token')

              // 清除 React Query 缓存
              try {
                const { queryClient } = await import('@/providers/Providers')
                queryClient.invalidateQueries({ queryKey: ['auth'] })
              } catch (e) {
                console.error('Failed to invalidate queries:', e)
              }
            }
            break

          case 400:
            // 请求参数错误
            console.error('[Backend API] Bad Request:', backendResponse?.message)
            break

          case 404:
            console.error('[Backend API] Not Found:', error.config?.url)
            break

          case 500:
            console.error('[Backend API] Server Error:', backendResponse?.message)
            break
        }

        // 返回标准化的错误信息
        return Promise.reject({
          message: backendResponse?.message || `HTTP ${status} Error`,
          code: backendResponse?.code || status,
          status
        })
      } else if (error.request) {
        // 网络错误
        console.error('[Backend API] Network error:', {
          url: error.config?.url,
          method: error.config?.method,
        })
        return Promise.reject({
          message: 'Network error - Go backend may not be running',
          code: -1
        })
      }

      return Promise.reject(error)
    }
  )

  return instance
}

// 导出单例
export const backendClient = createBackendApiInstance()

// 通用请求方法 (自动处理 BackendResponse)
export const backendRequest = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    backendClient.get<BackendResponse<T>, T>(url, config),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    backendClient.post<BackendResponse<T>, T>(url, data, config),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    backendClient.put<BackendResponse<T>, T>(url, data, config),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    backendClient.delete<BackendResponse<T>, T>(url, config),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    backendClient.patch<BackendResponse<T>, T>(url, data, config),
}
