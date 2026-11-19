import { useState } from 'react'
import { supabase } from './supabase'
import './Auth.css'

type AuthMode = 'login' | 'signup' | 'recovery'

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [address, setAddress] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [message, setMessage] = useState('')
  const [funMessage, setFunMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const funMessages = [
    "You're awesome! 🌟",
    "Welcome to Jeet's Gallery! 📸",
    'Keep smiling! 😊',
    'Today is a great day! ☀️',
    'Stay creative! 🎨',
    'You are one of a kind! ❤️',
  ]

  const handleFun = () => {
    const random = Math.floor(Math.random() * funMessages.length)
    setFunMessage(funMessages[random])
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // LOGIN
      if (mode === 'login') {
        const { data: loginData, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          })

        if (loginError) throw loginError

        if (!loginData.user) {
          throw new Error('Login succeeded, but no user was returned.')
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, approved, rejected, role')
          .eq('id', loginData.user.id)
          .maybeSingle()

        if (profileError) {
          await supabase.auth.signOut()
          throw new Error('Profile database error: ' + profileError.message)
        }

        if (!profile) {
          await supabase.auth.signOut()
          throw new Error(
            'No profile found for account ID: ' + loginData.user.id
          )
        }

        if (profile.rejected) {
          await supabase.auth.signOut()
          throw new Error('Your registration has been rejected.')
        }

        if (!profile.approved) {
          await supabase.auth.signOut()
          throw new Error(
            'Your account is waiting for admin approval.'
          )
        }

        window.location.reload()
      }

      // SIGNUP
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone,
              date_of_birth: dateOfBirth,
              address,
            },
          },
        })

        if (error) throw error

        setMessage(
          'Registration successful! Your account is awaiting admin approval.'
        )
      }

      // PASSWORD RECOVERY
      if (mode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo: window.location.origin,
          }
        )

        if (error) throw error

        setMessage(
          'Password recovery email sent! Open the latest email and click the Reset Password link. You can then create a new password on our website.'
        )
      }
    } catch (error: any) {
      setMessage(error.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-content">
        <h1>Jeet's Gallery</h1>
        <p>Where moments become memories.</p>

        {mode !== 'recovery' && (
          <div className="auth-tabs">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setMessage('')
              }}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setMessage('')
              }}
            >
              Create Account
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SIGNUP FIELDS */}

          {mode === 'signup' && (
            <>
              <label>First Name</label>
              <input
                type="text"
                placeholder="Enter your first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />

              <label>Last Name</label>
              <input
                type="text"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />

              <label>Mobile Number</label>
              <input
                type="tel"
                placeholder="Enter your mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <label>Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />

              <label>Address</label>
              <textarea
                placeholder="Enter your address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={3}
              />

              <button
                type="button"
                onClick={handleFun}
                className="fun-button"
              >
                🎉 Tap this button for fun!
              </button>

              {funMessage && (
                <p className="fun-message">{funMessage}</p>
              )}
            </>
          )}

          {/* PASSWORD RECOVERY */}

          {mode === 'recovery' ? (
            <>
              <h2>Reset Your Password</h2>
              <p>Enter your registered email to receive a reset link.</p>

              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                className="forgot-button"
                onClick={() => {
                  setMode('login')
                  setMessage('')
                }}
              >
                ← Back to Login
              </button>
            </>
          ) : (
            <>
              {/* LOGIN */}

              {mode === 'login' && (
                <>
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <label>Password</label>

                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="forgot-button"
                    onClick={() => {
                      setMode('recovery')
                      setMessage('')
                    }}
                  >
                    Forgot Password?
                  </button>
                </>
              )}

              {/* SIGNUP EMAIL AND PASSWORD */}

              {mode === 'signup' && (
                <>
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <label>Password</label>

                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </>
              )}

              <button type="submit" disabled={loading}>
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Login'
                    : 'Create Account'}
              </button>
            </>
          )}
        </form>

        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  )
}