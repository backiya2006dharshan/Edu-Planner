import { useEffect, useMemo, useState } from 'react'

import {
  createDepartment,
  createLearningObjective,
  createSemester,
  createSubject,
  createTopic,
  createUnit,
  deleteLearningObjective,
  deleteTopic,
  fetchCurriculumTree,
  updateTopic,
} from '../services/api'
import type { UserRole } from '../types/auth'
import type {
  DepartmentCreate,
  DepartmentTreeRead,
  LearningObjectiveCreate,
  SemesterCreate,
  SubjectCreate,
  TopicCreate,
  TopicTreeRead,
  TopicUpdate,
  UnitCreate,
  CurriculumTreeResponse,
} from '../types/curriculum'

type Props = {
  token: string
  role: UserRole | null
}

type SelectionState = {
  departmentId: number | null
  semesterId: number | null
  subjectId: number | null
  unitId: number | null
  topicId: number | null
}

const emptySelection: SelectionState = {
  departmentId: null,
  semesterId: null,
  subjectId: null,
  unitId: null,
  topicId: null,
}

export default function CurriculumSection({ token, role }: Props) {
  const [tree, setTree] = useState<CurriculumTreeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selection, setSelection] = useState<SelectionState>(emptySelection)
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null)
  const [departmentForm, setDepartmentForm] = useState<DepartmentCreate>({ name: '', code: '', description: '' })
  const [semesterForm, setSemesterForm] = useState<SemesterCreate>({ department_id: 0, number: 1, name: '', description: '' })
  const [subjectForm, setSubjectForm] = useState<SubjectCreate>({ semester_id: 0, name: '', code: '', description: '' })
  const [unitForm, setUnitForm] = useState<UnitCreate>({ subject_id: 0, name: '', order_index: 1, description: '' })
  const [topicForm, setTopicForm] = useState<TopicCreate>({ unit_id: 0, name: '', order_index: 1, description: '' })
  const [topicEditForm, setTopicEditForm] = useState<TopicUpdate>({})
  const [objectiveForm, setObjectiveForm] = useState<LearningObjectiveCreate>({ topic_id: 0, name: '', order_index: 1, description: '' })

  const loadTree = async () => {
    if (!token) {
      setTree(null)
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetchCurriculumTree(token)
      setTree(response)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load curriculum'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTree()
  }, [token])

  useEffect(() => {
    if (!tree?.departments.length) {
      setSelection(emptySelection)
      return
    }

    setSelection((current) => {
      const firstDepartment = current.departmentId ?? tree.departments[0].id
      const department = tree.departments.find((item) => item.id === firstDepartment) ?? tree.departments[0]
      const firstSemester = current.semesterId ?? department.semesters[0]?.id ?? null
      const semester = department.semesters.find((item) => item.id === firstSemester) ?? department.semesters[0] ?? null
      const firstSubject = current.subjectId ?? semester?.subjects[0]?.id ?? null
      const subject = semester?.subjects.find((item) => item.id === firstSubject) ?? semester?.subjects[0] ?? null
      const firstUnit = current.unitId ?? subject?.units[0]?.id ?? null
      const unit = subject?.units.find((item) => item.id === firstUnit) ?? subject?.units[0] ?? null
      const firstTopic = current.topicId ?? unit?.topics[0]?.id ?? null

      return {
        departmentId: department.id,
        semesterId: semester?.id ?? null,
        subjectId: subject?.id ?? null,
        unitId: unit?.id ?? null,
        topicId: firstTopic,
      }
    })
  }, [tree])

  const selectedDepartment = useMemo(
    () => tree?.departments.find((item) => item.id === selection.departmentId) ?? null,
    [tree, selection.departmentId],
  )
  const selectedSemester = useMemo(
    () => selectedDepartment?.semesters.find((item) => item.id === selection.semesterId) ?? null,
    [selectedDepartment, selection.semesterId],
  )
  const selectedSubject = useMemo(
    () => selectedSemester?.subjects.find((item) => item.id === selection.subjectId) ?? null,
    [selectedSemester, selection.subjectId],
  )
  const selectedUnit = useMemo(
    () => selectedSubject?.units.find((item) => item.id === selection.unitId) ?? null,
    [selectedSubject, selection.unitId],
  )
  const selectedTopic = useMemo(
    () => selectedUnit?.topics.find((item) => item.id === selection.topicId) ?? null,
    [selectedUnit, selection.topicId],
  )

  useEffect(() => {
    if (selectedDepartment) {
      setSemesterForm((current) => ({ ...current, department_id: selectedDepartment.id }))
    }
    if (selectedSemester) {
      setSubjectForm((current) => ({ ...current, semester_id: selectedSemester.id }))
    }
    if (selectedSubject) {
      setUnitForm((current) => ({ ...current, subject_id: selectedSubject.id }))
    }
    if (selectedUnit) {
      setTopicForm((current) => ({ ...current, unit_id: selectedUnit.id }))
    }
    if (selectedTopic) {
      setObjectiveForm((current) => ({ ...current, topic_id: selectedTopic.id }))
      if (editingTopicId !== selectedTopic.id) {
        setEditingTopicId(selectedTopic.id)
        setTopicEditForm({
          name: selectedTopic.name,
          order_index: selectedTopic.order_index ?? undefined,
          description: selectedTopic.description ?? undefined,
          document_id: selectedTopic.document_id ?? undefined,
          source_type: selectedTopic.source_type ?? undefined,
          page_number: selectedTopic.page_number ?? undefined,
          source_reference: selectedTopic.source_reference ?? undefined,
        })
      }
    }
  }, [selectedDepartment, selectedSemester, selectedSubject, selectedUnit, selectedTopic, editingTopicId])

  const refresh = async () => {
    await loadTree()
  }

  const submitDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createDepartment(token, departmentForm)
    setDepartmentForm({ name: '', code: '', description: '' })
    await refresh()
  }

  const submitSemester = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createSemester(token, semesterForm)
    setSemesterForm((current) => ({ ...current, name: '', description: '' }))
    await refresh()
  }

  const submitSubject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createSubject(token, subjectForm)
    setSubjectForm((current) => ({ ...current, name: '', code: '', description: '' }))
    await refresh()
  }

  const submitUnit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createUnit(token, unitForm)
    setUnitForm((current) => ({ ...current, name: '', description: '' }))
    await refresh()
  }

  const submitTopic = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createTopic(token, topicForm)
    setTopicForm((current) => ({ ...current, name: '', description: '' }))
    await refresh()
  }

  const submitTopicEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editingTopicId === null) {
      return
    }
    await updateTopic(token, editingTopicId, topicEditForm)
    await refresh()
  }

  const submitObjective = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createLearningObjective(token, objectiveForm)
    setObjectiveForm((current) => ({ ...current, name: '', description: '' }))
    await refresh()
  }

  const handleDeleteTopic = async (topicId: number) => {
    await deleteTopic(token, topicId)
    if (selection.topicId === topicId) {
      setSelection((current) => ({ ...current, topicId: null }))
      setEditingTopicId(null)
    }
    await refresh()
  }

  const handleDeleteObjective = async (objectiveId: number) => {
    await deleteLearningObjective(token, objectiveId)
    await refresh()
  }

  const setDepartment = (departmentId: number) => {
    const department = tree?.departments.find((item) => item.id === departmentId) ?? null
    setSelection({
      departmentId,
      semesterId: department?.semesters[0]?.id ?? null,
      subjectId: department?.semesters[0]?.subjects[0]?.id ?? null,
      unitId: department?.semesters[0]?.subjects[0]?.units[0]?.id ?? null,
      topicId: department?.semesters[0]?.subjects[0]?.units[0]?.topics[0]?.id ?? null,
    })
  }

  const setSemester = (semesterId: number) => {
    const semester = selectedDepartment?.semesters.find((item) => item.id === semesterId) ?? null
    setSelection({
      departmentId: selectedDepartment?.id ?? null,
      semesterId,
      subjectId: semester?.subjects[0]?.id ?? null,
      unitId: semester?.subjects[0]?.units[0]?.id ?? null,
      topicId: semester?.subjects[0]?.units[0]?.topics[0]?.id ?? null,
    })
  }

  const setSubject = (subjectId: number) => {
    const subject = selectedSemester?.subjects.find((item) => item.id === subjectId) ?? null
    setSelection({
      departmentId: selectedDepartment?.id ?? null,
      semesterId: selectedSemester?.id ?? null,
      subjectId,
      unitId: subject?.units[0]?.id ?? null,
      topicId: subject?.units[0]?.topics[0]?.id ?? null,
    })
  }

  const setUnit = (unitId: number) => {
    const unit = selectedSubject?.units.find((item) => item.id === unitId) ?? null
    setSelection({
      departmentId: selectedDepartment?.id ?? null,
      semesterId: selectedSemester?.id ?? null,
      subjectId: selectedSubject?.id ?? null,
      unitId,
      topicId: unit?.topics[0]?.id ?? null,
    })
  }

  const setTopic = (topicId: number) => {
    setSelection((current) => ({ ...current, topicId }))
    const topic = selectedUnit?.topics.find((item) => item.id === topicId) ?? null
    if (topic) {
      setEditingTopicId(topic.id)
      setTopicEditForm({
        name: topic.name,
        order_index: topic.order_index ?? undefined,
        description: topic.description ?? undefined,
        document_id: topic.document_id ?? undefined,
        source_type: topic.source_type ?? undefined,
        page_number: topic.page_number ?? undefined,
        source_reference: topic.source_reference ?? undefined,
      })
    }
  }

  if (!token) {
    return null
  }

  const renderObjectiveList = (topic: TopicTreeRead) => (
    <ul className="nested-list">
      {topic.learning_objectives.map((objective) => (
        <li key={objective.id} className="nested-item nested-item--inline">
          <span>{objective.name}</span>
          {role === 'teacher' ? (
            <button className="text-button" type="button" onClick={() => handleDeleteObjective(objective.id)}>
              Delete
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  )

  const renderTree = (department: DepartmentTreeRead) => (
    <div key={department.id} className="curriculum-block">
      <div className="curriculum-header">
        <strong>{department.name}</strong>
        <span>{department.code ?? 'No code'}</span>
      </div>
      {department.semesters.map((semester) => (
        <div key={semester.id} className="curriculum-child">
          <div className="curriculum-header">
            <strong>Semester {semester.number}</strong>
            <span>{semester.name ?? 'Unnamed semester'}</span>
          </div>
          {semester.subjects.map((subject) => (
            <div key={subject.id} className="curriculum-child">
              <div className="curriculum-header">
                <strong>{subject.name}</strong>
                <span>{subject.code ?? 'No code'}</span>
              </div>
              {subject.units.map((unit) => (
                <div key={unit.id} className="curriculum-child">
                  <div className="curriculum-header">
                    <strong>{unit.name}</strong>
                    <span>{unit.order_index ?? 'No order'}</span>
                  </div>
                  {unit.topics.map((topic) => (
                    <div key={topic.id} className="curriculum-child">
                      <div className="curriculum-header">
                        <strong>{topic.name}</strong>
                        <span>{topic.description ?? 'No description'}</span>
                      </div>
                      {renderObjectiveList(topic)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <section className="panel panel--curriculum">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Phase 3 curriculum</p>
          <h2>{role === 'teacher' ? 'Curriculum Management' : 'Curriculum'}</h2>
        </div>
        {loading ? <span className="status-label">Loading...</span> : null}
      </div>

      {error ? <p className="status-text status-text--error">{error}</p> : null}

      <div className="curriculum-layout">
        <div className="curriculum-column">
          <h3>Structure</h3>
          {tree?.departments.length ? tree.departments.map(renderTree) : <p className="status-text">No curriculum records yet.</p>}
        </div>

        {role === 'teacher' ? (
          <div className="curriculum-column">
            <h3>Manage curriculum</h3>

            <label className="field">
              <span>Department</span>
              <select value={selection.departmentId ?? ''} onChange={(event) => setDepartment(Number(event.target.value))}>
                {tree?.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Semester</span>
              <select value={selection.semesterId ?? ''} onChange={(event) => setSemester(Number(event.target.value))}>
                {selectedDepartment?.semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    Semester {semester.number}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Subject</span>
              <select value={selection.subjectId ?? ''} onChange={(event) => setSubject(Number(event.target.value))}>
                {selectedSemester?.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Unit</span>
              <select value={selection.unitId ?? ''} onChange={(event) => setUnit(Number(event.target.value))}>
                {selectedSubject?.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="curriculum-grid">
              <form className="auth-card" onSubmit={submitDepartment}>
                <h4>Add department</h4>
                <label className="field">
                  <span>Name</span>
                  <input value={departmentForm.name} onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Code</span>
                  <input value={departmentForm.code ?? ''} onChange={(event) => setDepartmentForm((current) => ({ ...current, code: event.target.value }))} />
                </label>
                <button type="submit">Create</button>
              </form>

              <form className="auth-card" onSubmit={submitSemester}>
                <h4>Add semester</h4>
                <label className="field">
                  <span>Number</span>
                  <input type="number" min="1" value={semesterForm.number} onChange={(event) => setSemesterForm((current) => ({ ...current, number: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Name</span>
                  <input value={semesterForm.name ?? ''} onChange={(event) => setSemesterForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <button type="submit">Create</button>
              </form>

              <form className="auth-card" onSubmit={submitSubject}>
                <h4>Add subject</h4>
                <label className="field">
                  <span>Name</span>
                  <input value={subjectForm.name} onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Code</span>
                  <input value={subjectForm.code ?? ''} onChange={(event) => setSubjectForm((current) => ({ ...current, code: event.target.value }))} />
                </label>
                <button type="submit">Create</button>
              </form>

              <form className="auth-card" onSubmit={submitUnit}>
                <h4>Add unit</h4>
                <label className="field">
                  <span>Name</span>
                  <input value={unitForm.name} onChange={(event) => setUnitForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Order</span>
                  <input type="number" min="1" value={unitForm.order_index ?? ''} onChange={(event) => setUnitForm((current) => ({ ...current, order_index: Number(event.target.value) }))} />
                </label>
                <button type="submit">Create</button>
              </form>

              <form className="auth-card" onSubmit={submitTopic}>
                <h4>Add topic</h4>
                <label className="field">
                  <span>Name</span>
                  <input value={topicForm.name} onChange={(event) => setTopicForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Order</span>
                  <input type="number" min="1" value={topicForm.order_index ?? ''} onChange={(event) => setTopicForm((current) => ({ ...current, order_index: Number(event.target.value) }))} />
                </label>
                <button type="submit">Create</button>
              </form>

              <form className="auth-card" onSubmit={submitObjective}>
                <h4>Add learning objective</h4>
                <label className="field">
                  <span>Name</span>
                  <input value={objectiveForm.name} onChange={(event) => setObjectiveForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Order</span>
                  <input type="number" min="1" value={objectiveForm.order_index ?? ''} onChange={(event) => setObjectiveForm((current) => ({ ...current, order_index: Number(event.target.value) }))} />
                </label>
                <button type="submit">Create</button>
              </form>
            </div>

            <div className="auth-card">
              <h4>Topics in selected unit</h4>
              <div className="nested-list">
                {selectedUnit?.topics.map((topic) => (
                  <div key={topic.id} className="nested-item nested-item--inline">
                    <button className="text-button" type="button" onClick={() => setTopic(topic.id)}>{topic.name}</button>
                    <div className="inline-actions">
                      <button className="text-button" type="button" onClick={() => setTopic(topic.id)}>Edit</button>
                      <button className="text-button" type="button" onClick={() => handleDeleteTopic(topic.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTopic ? (
                <form className="auth-card" onSubmit={submitTopicEdit}>
                  <h4>Edit topic</h4>
                  <label className="field">
                    <span>Name</span>
                    <input value={topicEditForm.name ?? ''} onChange={(event) => setTopicEditForm((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Description</span>
                    <input value={topicEditForm.description ?? ''} onChange={(event) => setTopicEditForm((current) => ({ ...current, description: event.target.value }))} />
                  </label>
                  <button type="submit">Save</button>
                </form>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
