import { useEffect, useState } from 'react'
import type { FormEvent, CSSProperties } from 'react'
import Auth from './Auth'
import Admin from './Admin'
import { supabase } from './supabase'
import './App.css'

const categories = [
  {
    name: 'Fitness',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900',
  },
  {
    name: 'Nature',
    image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=900',
  },
  {
    name: 'Travel',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900',
  },
  {
    name: 'Personal',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900',
  },
]

const menuItems = [
  { id: 'home', icon: '⌂', label: 'Overview' },
  { id: 'feed', icon: '◈', label: 'Social Feed' },
  { id: 'friends', icon: '♧', label: 'Friends' },
  { id: 'map', icon: '◎', label: 'Friendship Map' },
  { id: 'messages', icon: '✉', label: 'Messages' },
  { id: 'gallery', icon: '▧', label: 'Gallery' },
  { id: 'mystery', icon: '✧', label: 'Daily Mystery' },
  { id: 'profile', icon: '◉', label: 'My Profile' },
  { id: 'space', icon: '◇', label: 'My Space' },
]

const mysteries = [
  {
    title: 'The Mystery Photograph',
    question: 'If you could preserve one moment of your life forever, which moment would it be?',
    type: 'QUESTION OF THE DAY',
  },
  {
    title: 'A Secret Thought',
    question: 'What is something small that makes your entire day better?',
    type: 'DAILY MYSTERY',
  },
  {
    title: 'The Hidden Adventure',
    question: 'If you could disappear for 24 hours and travel anywhere, where would you go?',
    type: 'DAILY CHALLENGE',
  },
  {
    title: 'A Memory Untold',
    question: 'What is one memory that always makes you smile?',
    type: 'DAILY QUESTION',
  },
]

type GalleryPhoto = {
  id: string
  owner_id: string
  category: string
  title: string
  description: string
  storage_path: string
  created_at: string
  signedUrl: string
}

type Member = {
  id: string
  first_name: string | null
  last_name: string | null
  username: string | null
  role: string
  approved: boolean
  rejected: boolean
}

type PhotoGrant = {
  id: string
  photo_id: string
  member_id: string
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState<any>(null)

  const [showAuth, setShowAuth] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [authChecking, setAuthChecking] = useState(true)

  const [recoveryMode, setRecoveryMode] = useState(false)
  const [checkingRecovery, setCheckingRecovery] = useState(true)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [activeSection, setActiveSection] = useState('home')
  const [mobileMenu, setMobileMenu] = useState(false)

  // PRIVATE GALLERY STATE
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const [galleryMessage, setGalleryMessage] = useState('')

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadCategory, setUploadCategory] = useState('Nature')
  const [uploading, setUploading] = useState(false)

  const [members, setMembers] = useState<Member[]>([])
  const [photoGrants, setPhotoGrants] = useState<PhotoGrant[]>([])
  const [permissionLoading, setPermissionLoading] = useState(false)
  const [permissionPhoto, setPermissionPhoto] = useState<string | null>(null)
  const [permissionMember, setPermissionMember] = useState('')

  async function loadUserProfile(user: any) {
    if (!user) {
      setCurrentUser(null)
      setUserRole(null)
      return
    }

    setCurrentUser(user)

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, approved, rejected')
      .eq('id', user.id)
      .maybeSingle()

    if (error || !profile || !profile.approved || profile.rejected) {
      setUserRole(null)
      return
    }

    setUserRole(profile.role)
  }

  useEffect(() => {
    let active = true

    async function initializeApp() {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.replace(/^#/, ''))

      if (params.get('type') === 'recovery') {
        setRecoveryMode(true)
      }

      const { data } = await supabase.auth.getSession()

      if (active) {
        await loadUserProfile(data.session?.user || null)
        setAuthChecking(false)
        setCheckingRecovery(false)
      }
    }

    initializeApp()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return

        if (event === 'PASSWORD_RECOVERY') {
          setRecoveryMode(true)
          setShowAuth(false)
          setShowAdmin(false)
          setRecoveryMessage('')
        }

        if (event === 'SIGNED_OUT') {
          setCurrentUser(null)
          setUserRole(null)
          setShowAdmin(false)
          setGalleryPhotos([])
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setTimeout(() => {
            if (active) loadUserProfile(session?.user || null)
          }, 0)
        }
      },
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // LOAD PRIVATE PHOTOS
  async function loadGalleryPhotos() {
    if (!currentUser || !userRole) return

    setGalleryLoading(true)
    setGalleryError('')
    setGalleryMessage('')

    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setGalleryError(error.message)
      setGalleryPhotos([])
      setGalleryLoading(false)
      return
    }

    const photosWithUrls: GalleryPhoto[] = []

    for (const photo of data || []) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('gallery-photos')
        .createSignedUrl(photo.storage_path, 60)

      if (signedError || !signedData?.signedUrl) {
        console.error('Could not create photo URL:', signedError)
        continue
      }

      photosWithUrls.push({
        ...photo,
        signedUrl: signedData.signedUrl,
      })
    }

    setGalleryPhotos(photosWithUrls)
    setGalleryLoading(false)

    if (photosWithUrls.length === 0) {
      setGalleryMessage('No photographs have been shared with you yet.')
    }

    if (userRole === 'admin') {
      await loadMembersAndGrants(data || [])
    }
  }

  async function loadMembersAndGrants(photos: any[]) {
    const { data: memberData, error: memberError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, username, role, approved, rejected')
      .eq('role', 'member')
      .eq('approved', true)
      .eq('rejected', false)
      .order('first_name')

    if (memberError) {
      console.error('Could not load members:', memberError)
    } else {
      setMembers(memberData || [])
    }

    if (photos.length === 0) {
      setPhotoGrants([])
      return
    }

    const photoIds = photos.map((photo) => photo.id)

    const { data: grants, error: grantError } = await supabase
      .from('gallery_photo_access')
      .select('id, photo_id, member_id')
      .in('photo_id', photoIds)

    if (grantError) {
      console.error('Could not load photo permissions:', grantError)
      return
    }

    setPhotoGrants(grants || [])
  }

  useEffect(() => {
    if (activeSection === 'gallery' && currentUser && userRole) {
      loadGalleryPhotos()
    }
  }, [activeSection, currentUser, userRole])

  // ADMIN PHOTO UPLOAD
  async function handlePhotoUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (userRole !== 'admin' || !currentUser) {
      setGalleryError('Only the administrator can upload photographs.')
      return
    }

    if (!uploadFile) {
      setGalleryError('Please select a photograph first.')
      return
    }

    if (!uploadTitle.trim()) {
      setGalleryError('Please enter a photo title.')
      return
    }

    setUploading(true)
    setGalleryError('')
    setGalleryMessage('')

    const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueName =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const storagePath = `${currentUser.id}/${uniqueName}-${safeName}`

    const { error: storageError } = await supabase.storage
      .from('gallery-photos')
      .upload(storagePath, uploadFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (storageError) {
      setGalleryError(storageError.message)
      setUploading(false)
      return
    }

    const { error: databaseError } = await supabase
      .from('gallery_photos')
      .insert({
        owner_id: currentUser.id,
        category: uploadCategory,
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        storage_path: storagePath,
      })

    if (databaseError) {
      await supabase.storage.from('gallery-photos').remove([storagePath])
      setGalleryError(databaseError.message)
      setUploading(false)
      return
    }

    setUploadFile(null)
    setUploadTitle('')
    setUploadDescription('')
    setGalleryMessage('Photograph uploaded successfully!')
    setUploading(false)

    await loadGalleryPhotos()
  }

  // DELETE PHOTO
  async function deletePhoto(photo: GalleryPhoto) {
    if (userRole !== 'admin') return

    const confirmed = window.confirm(
      `Delete "${photo.title}" permanently? This will also remove its access permissions.`,
    )

    if (!confirmed) return

    setGalleryError('')
    setGalleryMessage('')

    const { error: storageError } = await supabase.storage
      .from('gallery-photos')
      .remove([photo.storage_path])

    if (storageError) {
      setGalleryError(storageError.message)
      return
    }

    const { error: databaseError } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', photo.id)

    if (databaseError) {
      setGalleryError(databaseError.message)
      return
    }

    setGalleryMessage('Photograph deleted successfully.')
    setPermissionPhoto(null)
    await loadGalleryPhotos()
  }

  // GRANT ACCESS TO A MEMBER
  async function grantPhotoAccess(photoId: string) {
    if (userRole !== 'admin' || !permissionMember || !currentUser) return

    setPermissionLoading(true)
    setGalleryError('')
    setGalleryMessage('')

    const alreadyGranted = photoGrants.some(
      (grant) =>
        grant.photo_id === photoId &&
        grant.member_id === permissionMember,
    )

    if (alreadyGranted) {
      setGalleryError('This member already has access to this photograph.')
      setPermissionLoading(false)
      return
    }

    const { error } = await supabase.from('gallery_photo_access').insert({
      photo_id: photoId,
      member_id: permissionMember,
      granted_by: currentUser.id,
    })

    if (error) {
      setGalleryError(error.message)
    } else {
      setGalleryMessage('Photo access granted successfully.')
      await loadGalleryPhotos()
    }

    setPermissionLoading(false)
  }

  // REVOKE ACCESS
  async function revokePhotoAccess(photoId: string, memberId: string) {
    if (userRole !== 'admin') return

    const confirmed = window.confirm(
      'Remove this member’s access to the photograph?',
    )

    if (!confirmed) return

    setPermissionLoading(true)
    setGalleryError('')
    setGalleryMessage('')

    const { error } = await supabase
      .from('gallery_photo_access')
      .delete()
      .eq('photo_id', photoId)
      .eq('member_id', memberId)

    if (error) {
      setGalleryError(error.message)
    } else {
      setGalleryMessage('Photo access revoked.')
      await loadGalleryPhotos()
    }

    setPermissionLoading(false)
  }

  async function saveNewPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRecoveryMessage('')

    if (newPassword.length < 6) {
      setRecoveryMessage('Password must contain at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setRecoveryMessage('Passwords do not match.')
      return
    }

    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setSavingPassword(false)

    if (error) {
      setRecoveryMessage(error.message)
      return
    }

    await supabase.auth.signOut()

    setRecoveryMode(false)
    setShowAuth(true)
    setNewPassword('')
    setConfirmPassword('')
    setRecoveryMessage('Password changed successfully! Please log in.')
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(error.message)
      return
    }

    setCurrentUser(null)
    setUserRole(null)
    setShowAdmin(false)
    setShowAuth(false)
    setSelectedCategory(null)
    window.location.reload()
  }

  function navigate(section: string) {
    setActiveSection(section)
    setMobileMenu(false)
    setSelectedCategory(null)
    setGalleryError('')
    setGalleryMessage('')
  }

  function openCategory(category: any) {
    setSelectedCategory(category)
  }

  function backToCollections() {
    setSelectedCategory(null)
    setPermissionPhoto(null)
  }

  if (checkingRecovery || authChecking) {
    return <div className="loading-screen">JEET'S GALLERY</div>
  }

  if (recoveryMode) {
    return (
      <div className="auth-card">
        <div className="auth-content">
          <h1>Jeet's Gallery</h1>
          <h2>Create New Password</h2>
          <p>Choose a new password for your account.</p>

          <form onSubmit={saveNewPassword}>
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />

            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />

            <button type="submit" disabled={savingPassword}>
              {savingPassword ? 'Saving...' : 'Save New Password'}
            </button>
          </form>

          {recoveryMessage && <p>{recoveryMessage}</p>}
        </div>
      </div>
    )
  }

  if (showAdmin && userRole === 'admin') {
    return (
      <div>
        <button onClick={() => setShowAdmin(false)} style={backButton}>
          ← Back to Website
        </button>
        <Admin />
      </div>
    )
  }

  if (showAuth && !currentUser) {
    return (
      <div>
        <button onClick={() => setShowAuth(false)} style={backButton}>
          ← Back to Home
        </button>
        <Auth />
      </div>
    )
  }

  // MEMBER DASHBOARD
  if (currentUser && userRole) {
    const today = new Date()

    const dayNumber = Math.floor(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) /
        86400000,
    )

    const themes = [
      'SilentWolf',
      'MidnightSoul',
      'GoldenEagle',
      'DarkRaven',
    ]

    const theme = themes[Math.abs(dayNumber) % themes.length]

    const numericId = currentUser.id
      .replace(/-/g, '')
      .slice(-4)
      .toUpperCase()

    const mystery = mysteries[dayNumber % mysteries.length]

    const visiblePhotos = selectedCategory
      ? galleryPhotos.filter(
          (photo) => photo.category === selectedCategory.name,
        )
      : []

    return (
      <div
        className={`dashboard ${
          activeSection === 'gallery' ? 'gallery-mode' : 'social-mode'
        }`}
      >
        <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
          <div className="brand">
            <div className="brand-symbol">J</div>
            <div>
              <h2>JEET'S</h2>
              <span>GALLERY</span>
            </div>
          </div>

          <div className="sidebar-label">YOUR SPACE</div>

          <div className="sidebar-menu">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={activeSection === item.id ? 'menu-active' : ''}
                onClick={() => navigate(item.id)}
              >
                <span className="menu-icon">{item.icon}</span>
                {item.label}
                {item.id === 'mystery' && (
                  <span className="new-badge">NEW</span>
                )}
              </button>
            ))}
          </div>

          <div className="sidebar-bottom">
            <div className="online-indicator" />
            <span>Private community</span>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-header">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              ☰
            </button>

            <div className="header-date">
              YOUR PRIVATE WORLD
              <span>Welcome back</span>
            </div>

            <div className="header-actions">
              <button
                className="admin-button"
                onClick={() => setShowAdmin(true)}
                style={{ display: userRole === 'admin' ? 'block' : 'none' }}
              >
                Admin
              </button>

              <div className="identity-chip">
                <div className="avatar-small">{theme.charAt(0)}</div>
                <div>
                  <strong>
                    {theme}
                    {numericId}
                  </strong>
                  <span>
                    {userRole === 'admin' ? 'Administrator' : 'Member'}
                  </span>
                </div>
              </div>

              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>

          <div className="dashboard-content">
            {activeSection === 'home' && (
              <>
                <section className="welcome-banner">
                  <div className="welcome-text">
                    <span className="gold-label">
                      YOUR WORLD. YOUR PEOPLE.
                    </span>

                    <h1>
                      A little world
                      <br />
                      of your own.
                    </h1>

                    <p>
                      Connect with friends, share memories and discover
                      something unexpected every day.
                    </p>

                    <button onClick={() => navigate('feed')}>
                      Explore Community →
                    </button>
                  </div>

                  <div className="welcome-decoration">
                    <div className="decoration-circle">J</div>
                    <span>EST. 2026</span>
                  </div>
                </section>

                <section className="section-heading">
                  <div>
                    <span className="gold-label">YOUR COMMUNITY</span>
                    <h2>Explore your world</h2>
                  </div>
                </section>

                <div className="feature-grid">
                  {menuItems.slice(1, 7).map((item) => (
                    <button
                      className="feature-card"
                      key={item.id}
                      onClick={() => navigate(item.id)}
                    >
                      <span className="feature-icon">{item.icon}</span>
                      <h3>{item.label}</h3>
                      <span className="feature-arrow">Explore →</span>
                    </button>
                  ))}
                </div>

                <section className="mystery-preview">
                  <div>
                    <span className="gold-label">
                      ✧ TODAY'S DISCOVERY
                    </span>

                    <h2>{mystery.title}</h2>
                    <p>{mystery.question}</p>

                    <button onClick={() => navigate('mystery')}>
                      Discover Today's Mystery →
                    </button>
                  </div>

                  <div className="mystery-symbol">✧</div>
                </section>
              </>
            )}

            {activeSection === 'feed' && (
              <section className="content-panel">
                <span className="gold-label">THE COMMUNITY</span>
                <h1>Social Feed</h1>
                <p>
                  A place for photographs, thoughts, poetry and stories.
                </p>

                <div className="empty-state">
                  <span>◈</span>
                  <h2>Your community feed is coming alive.</h2>
                  <p>
                    Next we'll connect real member posts, photo uploads,
                    likes and comments.
                  </p>
                </div>
              </section>
            )}

            {activeSection === 'friends' && (
              <section className="content-panel">
                <span className="gold-label">YOUR CONNECTIONS</span>
                <h1>Friends</h1>
                <p>Meet friends and discover new connections.</p>

                <div className="empty-state">
                  <span>♧</span>
                  <h2>Your circle starts here.</h2>
                  <p>
                    Friend requests, invitations and friends-of-friends
                    discovery are coming next.
                  </p>
                </div>
              </section>
            )}

            {activeSection === 'map' && (
              <section className="content-panel">
                <span className="gold-label">YOUR SOCIAL NETWORK</span>
                <h1>Friendship Map</h1>
                <p>Discover how your community connects.</p>

                <div className="map-preview">
                  <div className="map-node map-center">YOU</div>
                  <div className="map-line line-one" />
                  <div className="map-line line-two" />
                  <div className="map-node map-one">FRIEND</div>
                  <div className="map-node map-two">FRIEND</div>
                  <div className="map-node map-three">NEW</div>
                  <p>YOUR FUTURE CONNECTION MAP</p>
                </div>
              </section>
            )}

            {activeSection === 'messages' && (
              <section className="content-panel">
                <span className="gold-label">PRIVATE CONVERSATIONS</span>
                <h1>Messages</h1>
                <p>Your private conversations will live here.</p>

                <div className="empty-state">
                  <span>✉</span>
                  <h2>Your conversations await.</h2>
                  <p>
                    One-to-one chat, group chat, photo sharing and online
                    status will be connected in the next development stage.
                  </p>
                </div>
              </section>
            )}

            {/* PRIVATE PHOTOGRAPHY GALLERY */}
            {activeSection === 'gallery' && (
              <section className="content-panel private-gallery-panel">
                {!selectedCategory ? (
                  <>
                    <span className="gold-label">JEET'S PHOTOGRAPHY</span>
                    <h1>Photography Gallery</h1>
                    <p>
                      A private collection of photographs, shared with
                      selected members.
                    </p>

                    <div className="dashboard-gallery">
                      {categories.map((category) => {
                        const count = galleryPhotos.filter(
                          (photo) => photo.category === category.name,
                        ).length

                        return (
                          <button
                            key={category.name}
                            onClick={() => openCategory(category)}
                          >
                            <img src={category.image} alt={category.name} />
                            <span>{category.name}</span>
                            <small>{count} photographs</small>
                          </button>
                        )
                      })}
                    </div>

                    {galleryLoading && (
                      <p className="gallery-status">Loading your gallery...</p>
                    )}

                    {galleryError && (
                      <div className="gallery-error">{galleryError}</div>
                    )}

                    {galleryMessage && (
                      <div className="gallery-success">{galleryMessage}</div>
                    )}

                    {userRole === 'admin' && (
                      <div className="gallery-upload-panel">
                        <span className="gold-label">ADMINISTRATION</span>
                        <h2>Upload a Photograph</h2>
                        <p>
                          Upload a photo to a collection. You can decide
                          which members are allowed to view it afterwards.
                        </p>

                        <form onSubmit={handlePhotoUpload}>
                          <label>Choose photograph</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setUploadFile(e.target.files?.[0] || null)
                            }
                            required
                          />

                          <label>Photo title</label>
                          <input
                            type="text"
                            placeholder="Enter photograph title"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            required
                          />

                          <label>Description</label>
                          <textarea
                            placeholder="Write a short description..."
                            value={uploadDescription}
                            onChange={(e) =>
                              setUploadDescription(e.target.value)
                            }
                            rows={3}
                          />

                          <label>Choose collection</label>
                          <select
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value)}
                          >
                            {categories.map((category) => (
                              <option
                                key={category.name}
                                value={category.name}
                              >
                                {category.name}
                              </option>
                            ))}
                          </select>

                          <button type="submit" disabled={uploading}>
                            {uploading ? 'Uploading...' : 'Upload Photograph'}
                          </button>
                        </form>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={backToCollections}
                      style={galleryBackButton}
                    >
                      ← Back to Collections
                    </button>

                    <span className="gold-label">JEET'S PHOTOGRAPHY</span>
                    <h1>{selectedCategory.name} Collection</h1>
                    <p>
                      Photographs in the {selectedCategory.name.toLowerCase()}{' '}
                      collection that you are allowed to view.
                    </p>

                    {galleryLoading && (
                      <p className="gallery-status">Loading photographs...</p>
                    )}

                    {galleryError && (
                      <div className="gallery-error">{galleryError}</div>
                    )}

                    {galleryMessage && (
                      <div className="gallery-success">{galleryMessage}</div>
                    )}

                    {!galleryLoading && visiblePhotos.length === 0 && (
                      <div className="gallery-empty">
                        <span>▧</span>
                        <h2>No photographs available</h2>
                        <p>
                          There are no photographs in this collection that
                          have been shared with your account.
                        </p>
                      </div>
                    )}

                    <div className="gallery-grid private-photo-grid">
                      {visiblePhotos.map((photo) => {
                        const grantsForPhoto = photoGrants.filter(
                          (grant) => grant.photo_id === photo.id,
                        )

                        return (
                          <article className="gallery-item private-photo-card" key={photo.id}>
                            <img src={photo.signedUrl} alt={photo.title} />

                            <div className="private-photo-details">
                              <h3>{photo.title}</h3>
                              {photo.description && (
                                <p>{photo.description}</p>
                              )}
                            </div>

                            {userRole === 'admin' && (
                              <div className="photo-admin-controls">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPermissionPhoto(
                                      permissionPhoto === photo.id
                                        ? null
                                        : photo.id,
                                    )
                                  }
                                >
                                  {permissionPhoto === photo.id
                                    ? 'Close Permissions'
                                    : 'Manage Access'}
                                </button>

                                <button
                                  type="button"
                                  className="delete-photo-button"
                                  onClick={() => deletePhoto(photo)}
                                >
                                  Delete Photo
                                </button>

                                {permissionPhoto === photo.id && (
                                  <div className="photo-permissions">
                                    <h4>Give access to a member</h4>

                                    <select
                                      value={permissionMember}
                                      onChange={(e) =>
                                        setPermissionMember(e.target.value)
                                      }
                                    >
                                      <option value="">
                                        Select a member
                                      </option>

                                      {members.map((member) => (
                                        <option
                                          key={member.id}
                                          value={member.id}
                                        >
                                          {[
                                            member.first_name,
                                            member.last_name,
                                          ]
                                            .filter(Boolean)
                                            .join(' ') ||
                                            member.username ||
                                            'Member'}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      type="button"
                                      disabled={
                                        permissionLoading || !permissionMember
                                      }
                                      onClick={() =>
                                        grantPhotoAccess(photo.id)
                                      }
                                    >
                                      {permissionLoading
                                        ? 'Please wait...'
                                        : 'Grant Access'}
                                    </button>

                                    <h4>Members with access</h4>

                                    {grantsForPhoto.length === 0 && (
                                      <p>No members have access yet.</p>
                                    )}

                                    {grantsForPhoto.map((grant) => {
                                      const member = members.find(
                                        (item) =>
                                          item.id === grant.member_id,
                                      )

                                      return (
                                        <div
                                          className="permission-member-row"
                                          key={grant.id}
                                        >
                                          <span>
                                            {member
                                              ? [
                                                  member.first_name,
                                                  member.last_name,
                                                ]
                                                  .filter(Boolean)
                                                  .join(' ') ||
                                                member.username ||
                                                'Member'
                                              : 'Member'}
                                          </span>

                                          <button
                                            type="button"
                                            disabled={permissionLoading}
                                            onClick={() =>
                                              revokePhotoAccess(
                                                photo.id,
                                                grant.member_id,
                                              )
                                            }
                                          >
                                            Revoke
                                          </button>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  </>
                )}
              </section>
            )}

            {activeSection === 'mystery' && (
              <section className="content-panel mystery-page">
                <span className="gold-label">
                  A NEW DISCOVERY EVERY DAY
                </span>

                <h1>Daily Mystery</h1>

                <div className="mystery-card">
                  <div className="mystery-big-icon">✧</div>
                  <span>{mystery.type}</span>
                  <h2>{mystery.title}</h2>
                  <p>{mystery.question}</p>

                  <div className="mystery-date">
                    {today.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'profile' && (
              <section className="content-panel">
                <span className="gold-label">YOUR IDENTITY</span>
                <h1>My Profile</h1>

                <div className="profile-preview">
                  <div className="profile-avatar">{theme.charAt(0)}</div>

                  <h2>
                    {theme}
                    {numericId}
                  </h2>

                  <span>YOUR DAILY IDENTITY</span>

                  <div className="profile-details">
                    <p>
                      <strong>Account:</strong> {currentUser.email}
                    </p>
                    <p>
                      <strong>Role:</strong> {userRole}
                    </p>
                    <p>
                      <strong>Daily theme:</strong> {theme}
                    </p>
                  </div>

                  <p className="profile-note">
                    This is a temporary preview identity. We'll build the
                    permanent username system and identity permissions next.
                  </p>
                </div>
              </section>
            )}

            {activeSection === 'space' && (
              <section className="content-panel">
                <span className="gold-label">PERSONAL COLLECTION</span>
                <h1>My Space</h1>
                <p>Your private digital space.</p>

                <div className="empty-state">
                  <span>◇</span>
                  <h2>Your private vault is coming.</h2>
                  <p>
                    Private folders, personal photographs and selective
                    sharing will be added here.
                  </p>
                </div>
              </section>
            )}

            <footer className="dashboard-footer">
              <span>JEET'S GALLERY</span>
              <span>A PRIVATE WORLD OF CONNECTIONS</span>
              <span>© 2026</span>
            </footer>
          </div>
        </main>

        {mobileMenu && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileMenu(false)}
          />
        )}
      </div>
    )
  }

  // PUBLIC WEBSITE
  if (selectedCategory) {
    return (
      <div className="gallery-page">
        <nav className="navbar">
          <h2>JEET'S GALLERY</h2>

          <button
            onClick={() => setSelectedCategory(null)}
            style={backButton}
          >
            ← Back
          </button>
        </nav>

        <section className="gallery-section">
          <h1>{selectedCategory.name} Collection</h1>
          <p>Explore my photography collection.</p>

          <div className="gallery-grid">
            <div className="gallery-item">
              <img
                src={selectedCategory.image}
                alt={selectedCategory.name}
              />
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="website">
      <nav className="navbar">
        <h2>JEET'S GALLERY</h2>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#collections">Collections</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>

          <button onClick={() => setShowAuth(true)}>
            Member Login
          </button>
        </div>
      </nav>

      <section className="hero" id="home">
        <div className="hero-content">
          <p>WELCOME TO MY WORLD</p>

          <h1>
            Capturing Moments.
            <br />
            Creating Memories.
          </h1>

          <p>
            Photography, friendships and memories — all in one private world.
          </p>

          <button
            onClick={() =>
              document.getElementById('collections')?.scrollIntoView({
                behavior: 'smooth',
              })
            }
          >
            Explore Collections
          </button>
        </div>
      </section>

      <section className="categories-section" id="collections">
        <h1>My Collections</h1>
        <p>Explore different moments through my lens.</p>

        <div className="category-grid">
          {categories.map((category) => (
            <div
              className="category-card"
              key={category.name}
              onClick={() => setSelectedCategory(category)}
            >
              <img src={category.image} alt={category.name} />

              <div className="category-overlay">
                <h2>{category.name}</h2>
                <p>Explore Collection →</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section" id="about">
        <h1>About Me</h1>

        <p>
          Welcome to Jeet's Gallery. A personal photography space that is
          growing into a private community for friends, memories and
          connections.
        </p>
      </section>

      <section className="contact-section" id="contact">
        <h1>Get In Touch</h1>
        <p>Thank you for visiting Jeet's Gallery.</p>

        <button onClick={() => setShowAuth(true)}>
          Become a Member
        </button>
      </section>

      <footer className="footer">
        <h2>JEET'S GALLERY</h2>
        <p>Capturing Life Through My Lens.</p>
        <p>© 2026 Jeet's Gallery. All Rights Reserved.</p>
      </footer>
    </div>
  )
}

const backButton: CSSProperties = {
  padding: '10px 18px',
  margin: '12px',
  border: 'none',
  borderRadius: '6px',
  background: '#292929',
  color: 'white',
  cursor: 'pointer',
}

const galleryBackButton: CSSProperties = {
  padding: '11px 20px',
  marginBottom: '25px',
  border: '1px solid #d8c7a5',
  borderRadius: '6px',
  background: '#fff',
  color: '#80663c',
  cursor: 'pointer',
  fontSize: '14px',
}

export default App