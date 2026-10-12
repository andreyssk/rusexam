import { Navigate } from 'react-router-dom'
import { AuthForm } from '@/features/auth-form'
import { useAuth } from '@/entities/user'

export function LoginPage() {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return <AuthForm />
}
