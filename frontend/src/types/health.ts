export interface DatabaseHealth {
  configured: boolean
  reachable: boolean
  details: string
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  service: string
  environment: string
  apiVersion: string
  timestamp: string
  database: DatabaseHealth
}
