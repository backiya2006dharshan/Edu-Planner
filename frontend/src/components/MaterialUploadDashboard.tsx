import { useRef, useState } from 'react'

import type { UserPublic } from '../types/auth'
import { uploadMaterial } from '../services/api'

type Props = { user: UserPublic; token: string }

type AcademicProfile = {
  college: string
  semester: string
  regulation: string
}

type UploadItem = {
  id: string
  file: File
  state: 'ready' | 'processing'
}

const acceptedTypes = '.pdf,.docx,.txt,.md,.rst'

export default function MaterialUploadDashboard({ user, token }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [profile, setProfile] = useState<AcademicProfile>({
    college: 'Northbridge College of Engineering',
    semester: 'Semester 6',
    regulation: '2024 Regulation',
  })
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [notice, setNotice] = useState('')

  const addFiles = (files: File[]) => {
    const supported = files.filter((file) => /\.(pdf|docx|txt|md|rst)$/i.test(file.name))
    setNotice(supported.length !== files.length ? 'Some files were skipped. Use PDF, DOCX, TXT, MD, or RST files.' : '')
    setUploads((current) => [
      ...current,
      ...supported.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, state: 'ready' as const })),
    ])
  }

  const startIndexing = async () => {
    if (!uploads.length) {
      setNotice('Add at least one document before indexing.')
      return
    }

    if (user.role !== 'teacher') {
      setNotice('Only teacher accounts can upload material documents for indexing.')
      return
    }

    setUploads((current) => current.map((item) => ({ ...item, state: 'processing' })))
    setNotice(`Uploading ${uploads.length} document${uploads.length === 1 ? '' : 's'} for ${profile.semester}...`)

    try {
      for (const item of uploads) {
        const formData = new FormData()
        formData.append('file', item.file)
        formData.append('college', profile.college)
        formData.append('semester', profile.semester)
        formData.append('regulation', profile.regulation)

        await uploadMaterial(token, formData)
      }

      setUploads([])
      setNotice(`Indexed ${uploads.length} document${uploads.length === 1 ? '' : 's'} for ${profile.college} / ${profile.semester} / ${profile.regulation}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Material indexing failed.'
      setUploads((current) => current.map((item) => ({ ...item, state: 'ready' })))
      setNotice(message)
    }
  }

  return (
    <section className="upload-dashboard">
      <div className="upload-heading">
        <div>
          <p className="eyebrow">Student workspace / materials</p>
          <h2>Build your study library</h2>
          <p className="upload-subtitle">Drop in lecture notes, reading packs, and handouts. Your academic profile will guide how they are organized.</p>
        </div>
        <div className="profile-chip">
          <span className="profile-avatar">{user.full_name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.full_name}</strong><span>{user.email}</span></div>
        </div>
      </div>

      <div className="upload-layout">
        <div
          className={`drop-zone${isDragging ? ' drop-zone--active' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(Array.from(event.dataTransfer.files)) }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}
        >
          <input ref={inputRef} type="file" accept={acceptedTypes} multiple hidden onChange={(event) => addFiles(Array.from(event.target.files ?? []))} />
          <div className="upload-mark">↑</div>
          <h3>Drop documents here</h3>
          <p>or browse from your device</p>
          <span className="file-hint">PDF, DOCX, TXT, MD, RST · up to 25 MB each</span>
        </div>

        <aside className="profile-panel">
          <div className="panel-kicker">Index destination</div>
          <h3>Academic profile</h3>
          <p>Every chunk will be tagged with this context for faster, more relevant retrieval.</p>
          <label className="field"><span>College</span><input value={profile.college} onChange={(event) => setProfile((current) => ({ ...current, college: event.target.value }))} /></label>
          <label className="field"><span>Semester</span><select value={profile.semester} onChange={(event) => setProfile((current) => ({ ...current, semester: event.target.value }))}>{[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => <option key={semester}>Semester {semester}</option>)}</select></label>
          <label className="field"><span>Regulation</span><select value={profile.regulation} onChange={(event) => setProfile((current) => ({ ...current, regulation: event.target.value }))}><option>2024 Regulation</option><option>2023 Regulation</option><option>2022 Regulation</option></select></label>
        </aside>
      </div>

      <div className="upload-queue">
        <div className="queue-header"><div><span className="panel-kicker">{uploads.length ? `${uploads.length} selected` : 'Ready when you are'}</span><h3>Upload queue</h3></div><button className="upload-button" type="button" onClick={startIndexing}>Index documents <span>→</span></button></div>
        {notice ? <p className="upload-notice">{notice}</p> : null}
        {uploads.length ? uploads.map((item) => <div className="file-row" key={item.id}><span className="file-icon">{item.file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOC'}</span><div className="file-details"><strong>{item.file.name}</strong><span>{(item.file.size / 1024 / 1024).toFixed(2)} MB · {item.state === 'processing' ? 'Queued for indexing' : 'Ready to index'}</span></div><button className="remove-button" type="button" onClick={() => setUploads((current) => current.filter((upload) => upload.id !== item.id))} aria-label={`Remove ${item.file.name}`}>×</button></div>) : <div className="empty-queue"><span>01</span><p>Your uploaded documents will appear here before they are indexed.</p></div>}
      </div>
    </section>
  )
}