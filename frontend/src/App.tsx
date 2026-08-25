import { useEffect, useState } from 'react'

import CurriculumSection from './components/CurriculumSection'
import MaterialUploadDashboard from './components/MaterialUploadDashboard'
import { fetchCurrentUser, fetchHealth, loginUser, registerUser } from './services/api'
import type { UserPublic } from './types/auth'
import type { HealthResponse } from './types/health'

type ViewState =
  | { status: 'loading' }
  | { status: 'ready'; data: HealthResponse }
  | { status: 'error'; message: string }

type AuthFormState = {
  email: string
  password: string
  fullName: string
  role: 'student' | 'teacher'
}

export default function App() {
  const [viewState, setViewState] = useState<ViewState>({ status: 'loading' })
  const [authMessage, setAuthMessage] = useState<string>('')
  const [authError, setAuthError] = useState<string>('')
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('authToken') ?? '')
  const [registerForm, setRegisterForm] = useState<AuthFormState>({
    email: '',
    password: '',
    fullName: '',
    role: 'student',
  })
  const [loginForm, setLoginForm] = useState<AuthFormState>({
    email: '',
    password: '',
    fullName: '',
    role: 'student',
  })

  useEffect(() => {
    let isActive = true

    const loadHealth = async () => {
      try {
        const data = await fetchHealth()
        if (isActive) {
          setViewState({ status: 'ready', data })
        }
      } catch (error) {
        if (isActive) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          setViewState({ status: 'error', message })
        }
      }
    }

    void loadHealth()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadUser = async () => {
      if (!authToken) {
        setCurrentUser(null)
        return
      }

      try {
        const user = await fetchCurrentUser(authToken)
        if (isActive) {
          setCurrentUser(user)
        }
      } catch {
        if (isActive) {
          setCurrentUser(null)
          localStorage.removeItem('authToken')
          setAuthToken('')
        }
      }
    }

    void loadUser()

    return () => {
      isActive = false
    }
  }, [authToken])

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')

    try {
      const response = await registerUser({
        email: registerForm.email,
        full_name: registerForm.fullName,
        password: registerForm.password,
        role: registerForm.role,
      })
      localStorage.setItem('authToken', response.access_token)
      setAuthToken(response.access_token)
      setCurrentUser(response.user)
      setAuthMessage(`Registered ${response.user.email}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      setAuthError(message)
    }
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')

    try {
      const response = await loginUser({
        email: loginForm.email,
        password: loginForm.password,
      })
      localStorage.setItem('authToken', response.access_token)
      setAuthToken(response.access_token)
      setCurrentUser(response.user)
      setAuthMessage(`Logged in as ${response.user.email}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      setAuthError(message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    setAuthToken('')
    setCurrentUser(null)
    setAuthMessage('Logged out')
  }

  const renderStatusCard = () => {
    if (viewState.status === 'loading') {
      return <p className="status-text status-text--loading">Checking backend connection...</p>
    }

    if (viewState.status === 'error') {
      return <p className="status-text status-text--error">Backend unavailable: {viewState.message}</p>
    }

    const { data } = viewState
    const databaseStatus = data.database.reachable ? 'Connected' : data.database.configured ? 'Degraded' : 'Not configured'

    return (
      <div className="status-grid">
        <div className="status-card status-card--primary">
          <span className="status-label">Backend</span>
          <strong>{data.status.toUpperCase()}</strong>
          <span>{data.service}</span>
        </div>
        <div className="status-card">
          <span className="status-label">Environment</span>
          <strong>{data.environment}</strong>
        </div>
        <div className="status-card">
          <span className="status-label">Database</span>
          <strong>{databaseStatus}</strong>
          <span>{data.database.details}</span>
        </div>
      </div>
    )
  }

  const renderAuthPanel = () => (
    <div className="auth-grid">
      <form className="auth-card" onSubmit={handleRegister}>
        <h2>Register</h2>
        <label className="field">
          <span>Email</span>
          <input value={registerForm.email} onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))} />
        </label>
        <label className="field">
          <span>Full name</span>
          <input value={registerForm.fullName} onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} />
        </label>
        <label className="field">
          <span>Role</span>
          <select value={registerForm.role} onChange={(event) => setRegisterForm((current) => ({ ...current, role: event.target.value as 'student' | 'teacher' }))}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </label>
        <button type="submit">Create account</button>
      </form>

      <form className="auth-card" onSubmit={handleLogin}>
        <h2>Login</h2>
        <label className="field">
          <span>Email</span>
          <input value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </div>
  )

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Phase 1 foundation</p>
          <h1>RAG-Based Multi-LLM Personalized Learning Platform</h1>
          <p className="lead">
            A production-oriented base for the student knowledge, roadmap, and progress monitoring system.
          </p>
        </div>

        <div className="panel">
          <h2>Live health check</h2>
          {renderStatusCard()}
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <h3>Frontend</h3>
          <p>React + TypeScript + Vite, wired to the backend with Axios and a development proxy.</p>
        </article>
        <article className="feature-card">
          <h3>Backend</h3>
          <p>FastAPI with a `/health` endpoint and PostgreSQL-ready configuration.</p>
        </article>
        <article className="feature-card">
          <h3>Phase 3 ready</h3>
          <p>The curriculum foundation is ready for teacher management and student read-only viewing.</p>
        </article>
      </section>

      <section className="panel panel--auth">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Phase 2 authentication</p>
            <h2>Student and teacher access</h2>
          </div>
          {currentUser ? <button className="secondary-button" type="button" onClick={handleLogout}>Logout</button> : null}
        </div>

        {authMessage ? <p className="status-text status-text--loading">{authMessage}</p> : null}
        {authError ? <p className="status-text status-text--error">{authError}</p> : null}

        {renderAuthPanel()}

        <div className="panel panel--user">
          <h3>Current user</h3>
          {currentUser ? (
            <div className="status-grid">
              <div className="status-card status-card--primary">
                <span className="status-label">Signed in as</span>
                <strong>{currentUser.full_name}</strong>
                <span>{currentUser.email}</span>
              </div>
              <div className="status-card">
                <span className="status-label">Role</span>
                <strong>{currentUser.role}</strong>
              </div>
              <div className="status-card">
                <span className="status-label">Active</span>
                <strong>{currentUser.is_active ? 'Yes' : 'No'}</strong>
              </div>
            </div>
          ) : (
            <p className="status-text">No authenticated session loaded yet.</p>
          )}
        </div>
      </section>

        {currentUser?.role === 'student' ? <MaterialUploadDashboard user={currentUser} token={authToken} /> : null}
        {currentUser ? <CurriculumSection token={authToken} role={currentUser.role} /> : null}
    </main>
  )
}
