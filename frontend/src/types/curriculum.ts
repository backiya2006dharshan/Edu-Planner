export interface DepartmentRead {
  id: number
  name: string
  code: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SemesterRead {
  id: number
  department_id: number
  number: number
  name: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface SubjectRead {
  id: number
  semester_id: number
  name: string
  code: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface UnitRead {
  id: number
  subject_id: number
  name: string
  order_index: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface TopicRead {
  id: number
  unit_id: number
  name: string
  order_index: number | null
  description: string | null
  document_id: number | null
  source_type: string | null
  page_number: number | null
  source_reference: string | null
  created_at: string
  updated_at: string
}

export interface LearningObjectiveRead {
  id: number
  topic_id: number
  name: string
  order_index: number | null
  description: string | null
  document_id: number | null
  source_type: string | null
  page_number: number | null
  source_reference: string | null
  created_at: string
  updated_at: string
}

export interface TopicTreeRead extends TopicRead {
  learning_objectives: LearningObjectiveRead[]
}

export interface UnitTreeRead extends UnitRead {
  topics: TopicTreeRead[]
}

export interface SubjectTreeRead extends SubjectRead {
  units: UnitTreeRead[]
}

export interface SemesterTreeRead extends SemesterRead {
  subjects: SubjectTreeRead[]
}

export interface DepartmentTreeRead extends DepartmentRead {
  semesters: SemesterTreeRead[]
}

export interface CurriculumTreeResponse {
  departments: DepartmentTreeRead[]
}

export interface DepartmentCreate {
  name: string
  code?: string
  description?: string
  is_active?: boolean
}

export interface SemesterCreate {
  department_id: number
  number: number
  name?: string
  description?: string
}

export interface SubjectCreate {
  semester_id: number
  name: string
  code?: string
  description?: string
}

export interface UnitCreate {
  subject_id: number
  name: string
  order_index?: number
  description?: string
}

export interface TopicCreate {
  unit_id: number
  name: string
  order_index?: number
  description?: string
  document_id?: number
  source_type?: string
  page_number?: number
  source_reference?: string
}

export interface TopicUpdate {
  name?: string
  order_index?: number
  description?: string
  document_id?: number
  source_type?: string
  page_number?: number
  source_reference?: string
}

export interface LearningObjectiveCreate {
  topic_id: number
  name: string
  order_index?: number
  description?: string
  document_id?: number
  source_type?: string
  page_number?: number
  source_reference?: string
}
