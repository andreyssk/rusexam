import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError, unwrap } from '@/shared/api'
import { useI18n, type TKey } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Label } from '@/shared/ui/input'
import { ErrorMessage } from '@/shared/ui/states'
import { useSettings } from '@/entities/app-settings'
import { useAuth } from '@/entities/user'

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/

function serverErrorKey(err: unknown, registering: boolean): TKey | null {
  if (!(err instanceof ApiError)) return null
  if (err.status === 401) return 'auth.invalidCredentials'
  if (err.status === 403) return registering ? 'auth.signupsClosed' : 'auth.blocked'
  if (err.status === 409) return 'auth.usernameTaken'
  if (err.status === 400) return registering ? 'auth.usernameInvalid' : 'auth.invalidCredentials'
  return null
}

export function AuthForm() {
  const { t } = useI18n()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  // An admin can close sign-ups; then the form is login-only.
  const settings = useSettings()
  const signupsOpen = settings.data?.allowSignups !== false

  const [wantsRegister, setWantsRegister] = useState(false)
  const registering = wantsRegister && signupsOpen
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ username?: TKey; password?: TKey }>({})

  const submit = useMutation({
    mutationFn: () => {
      const body = { username: username.trim(), password }
      return unwrap(registering ? api.POST('/auth/register', { body }) : api.POST('/auth/login', { body }))
    },
    onSuccess: (res) => {
      login(res.token, res.user)
      navigate(from, { replace: true })
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (submit.isPending) return
    if (registering) {
      const errs: typeof fieldErrors = {}
      if (!USERNAME_RE.test(username.trim())) errs.username = 'auth.usernameInvalid'
      if (password.length < 6) errs.password = 'auth.passwordInvalid'
      setFieldErrors(errs)
      if (errs.username || errs.password) return
    } else {
      setFieldErrors({})
    }
    submit.mutate()
  }

  const errKey = submit.isError ? serverErrorKey(submit.error, registering) : null

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>{registering ? t('auth.register') : t('auth.login')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div>
            <Label htmlFor="username">{t('auth.username')}</Label>
            <Input
              id="username"
              autoComplete="username"
              autoFocus
              required
              aria-invalid={!!fieldErrors.username}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {fieldErrors.username && (
              <p id="username-error" className="mt-1 text-xs text-destructive">
                {t(fieldErrors.username)}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="password">{t('auth.password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={registering ? 'new-password' : 'current-password'}
                required
                className="pr-10"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-2xl text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password ? (
              <p id="password-error" className="mt-1 text-xs text-destructive">
                {t(fieldErrors.password)}
              </p>
            ) : (
              registering && <p className="mt-1 text-xs text-muted-foreground">{t('auth.passwordHint')}</p>
            )}
          </div>
          {submit.isError && (errKey ? <ErrorMessage message={t(errKey)} /> : <ErrorMessage error={submit.error} />)}
          <Button type="submit" className="w-full" loading={submit.isPending}>
            {registering ? t('auth.register') : t('auth.login')}
          </Button>
          {signupsOpen ? (
            <p className="text-center text-sm text-muted-foreground">
              {registering ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
              <button
                type="button"
                className="cursor-pointer font-extrabold text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setWantsRegister(!registering)
                  setFieldErrors({})
                  submit.reset()
                }}
              >
                {registering ? t('auth.login') : t('auth.register')}
              </button>
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">{t('auth.signupsClosedNote')}</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
