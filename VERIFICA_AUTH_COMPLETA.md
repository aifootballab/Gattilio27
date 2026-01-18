# Verifica Completa Auth Supabase - Frontend

## Struttura Risposta Supabase Auth

### `getSession()`
Restituisce: `{ data: { session: Session | null }, error: AuthError | null }`

**Session contiene:**
- `access_token: string`
- `refresh_token: string`
- `user: { id, email, ... }`
- `expires_at: number`

---

## Verifica File per File

### ✅ `app/my-players/page.jsx` (righe 37-60)

```javascript
const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

// ✅ Gestisce errori
if (sessionError) {
  console.error('[MyPlayers] Session error:', sessionError.message)
  if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('refresh')) {
    await supabase.auth.signOut()
    router.push('/login')
    return
  }
  router.push('/login')
  return
}

// ✅ Verifica esistenza token
if (!sessionData?.session?.access_token) {
  router.push('/login')
  return
}

// ✅ Usa token
const token = sessionData.session.access_token
```

**Status**: ✅ CORRETTO - Gestisce tutti i casi

---

### ⚠️ `app/dashboard/page.jsx` (righe 28-36)

```javascript
const { data: { session } } = await supabase.auth.getSession()
if (session?.user?.email) {
  setUserEmail(session.user.email)
}
```

**Problemi**:
- ❌ Usa destructuring diretto `{ data: { session } }` - se `data` è `undefined`, crash
- ❌ Non gestisce `error` - se c'è un errore, lo ignora silenziosamente
- ❌ Non verifica `data` prima di accedere a `session`

**Fix suggerito**:
```javascript
const { data, error } = await supabase.auth.getSession()
if (error) {
  console.error('[Dashboard] Session error:', error.message)
  setUserEmail(null)
} else if (data?.session?.user?.email) {
  setUserEmail(data.session.user.email)
}
```

**Status**: ⚠️ RISCHIO - Potrebbe crashare se `data` è undefined

---

### ✅ `app/rosa/page.jsx` (righe 58-69, 84-98)

```javascript
// Riga 58
const { data, error } = await supabase.auth.getSession()

if (!data?.session?.access_token || error) {
  setAuthStatus({ ready: true, token: null })
  router.push('/login')
  return
}

setAuthStatus({
  ready: true,
  token: data.session.access_token,
})
```

**Status**: ✅ CORRETTO - Gestisce errori e verifica token

```javascript
// Riga 84 (getFreshToken)
const { data, error } = await supabase.auth.getSession()

if (!data?.session?.access_token || error) {
  router.push('/login')
  return null
}

const token = data.session.access_token

if (!token || typeof token !== 'string' || token.length < 10) {
  router.push('/login')
  return null
}

return token
```

**Status**: ✅ CORRETTO - Valida anche formato token

---

### ✅ `app/login/page.jsx` (righe 41-83)

```javascript
// SignUp
const { data, error: signUpError } = await supabase.auth.signUp({
  email: email.trim().toLowerCase(),
  password: password,
  options: {
    emailRedirectTo: undefined,
  }
})

if (signUpError) {
  setError(signUpError.message || t('signupError'))
  setLoading(false)
  return
}

if (data?.user) {
  setSuccess(t('signupSuccess'))
  setTimeout(() => {
    router.push('/dashboard')
    router.refresh()
  }, 1000)
}
```

**Status**: ✅ CORRETTO - Gestisce errori e verifica `data.user`

```javascript
// SignIn
const { data, error: signInError } = await supabase.auth.signInWithPassword({
  email: email.trim().toLowerCase(),
  password: password,
})

if (signInError) {
  setError(signInError.message || t('loginError'))
  setLoading(false)
  return
}

if (data?.user) {
  setSuccess(t('loginSuccess'))
  setTimeout(() => {
    router.push('/dashboard')
    router.refresh()
  }, 500)
}
```

**Status**: ✅ CORRETTO - Gestisce errori e verifica `data.user`

---

### ✅ `app/dashboard/page.jsx` - `handleLogout` (righe 53-63)

```javascript
const handleLogout = async () => {
  if (!supabase) return
  try {
    await supabase.auth.signOut()
    setUserEmail(null)
    router.push('/login')
    router.refresh()
  } catch (err) {
    console.error('[Dashboard] Logout error:', err)
  }
}
```

**Status**: ✅ CORRETTO - Gestisce errori con try/catch

---

### ✅ `app/dashboard/page.jsx` - `onAuthStateChange` (righe 42-48)

```javascript
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user?.email) {
    setUserEmail(session.user.email)
  } else {
    setUserEmail(null)
  }
})

return () => subscription.unsubscribe()
```

**Status**: ✅ CORRETTO - `onAuthStateChange` passa direttamente `session`, non `{ data, error }`

---

### ✅ `app/opponent-formation/page.jsx` (righe 36-47)

```javascript
const { data, error } = await supabase.auth.getSession()
if (!data?.session?.access_token || error) {
  console.log('[OpponentFormation] No session, redirecting to login')
  router.push('/login')
  return
}

setAuthStatus({
  ready: true,
  userId: data.session.user?.id || null,
  token: data.session.access_token,
})
```

**Status**: ✅ CORRETTO - Gestisce errori e verifica token

---

## Riepilogo Problemi

### ⚠️ PROBLEMA CRITICO: `app/dashboard/page.jsx` riga 28

**Codice attuale**:
```javascript
const { data: { session } } = await supabase.auth.getSession()
```

**Problema**: 
- Se `getSession()` restituisce `{ data: null, error: ... }`, `data` è `null`
- Destructuring `{ data: { session } }` quando `data` è `null` → **CRASH TypeError**

**Fix necessario**:
```javascript
const { data, error } = await supabase.auth.getSession()
if (error) {
  console.error('[Dashboard] Session error:', error.message)
  setUserEmail(null)
} else if (data?.session?.user?.email) {
  setUserEmail(data.session.user.email)
}
```

---

## Conclusione

- ✅ **7 file su 8** gestiscono correttamente auth
- ⚠️ **1 file** (`dashboard/page.jsx`) ha potenziale crash se `data` è null

**Raccomandazione**: Fix immediato per `dashboard/page.jsx` riga 28
