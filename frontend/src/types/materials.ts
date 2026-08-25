export interface MaterialDocument {
  id: number
  college: string
  semester: string
  regulation: string
  file_name: string
  file_path: string
  mime_type?: string | null
  content_hash: string
  embedding_model: string
  chunk_count: number
  created_at: string
  updated_at: string
}

export interface MaterialSearchRequest {
  college: string
  semester: string
  regulation: string
  query: string
  limit?: number
}

export interface MaterialSearchResponse {
  documents: string[][]
  metadatas: Array<Record<string, string | number | null>>[]
  distances: number[][]
}
