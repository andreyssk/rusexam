import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api'
import { useErrorText } from '@/shared/lib/error-text'
import { useI18n } from '@/shared/lib/i18n'
import { useToast } from '@/shared/ui/toast'

export function useUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: () => unwrap(api.GET('/admin/users')) })
}

function useFail() {
  const toast = useToast()
  const errorText = useErrorText()
  return (e: unknown) => toast.error(errorText(e))
}

export function useSetBlocked() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const fail = useFail()
  return useMutation({
    mutationFn: ({ id, blocked }: { id: number; blocked: boolean }) =>
      unwrap(api.PUT('/admin/users/{userID}/blocked', { params: { path: { userID: id } }, body: { blocked } })),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(t(v.blocked ? 'toast.userBlocked' : 'toast.userUnblocked'))
    },
    onError: fail,
  })
}

export function useResetPassword() {
  const toast = useToast()
  const { t } = useI18n()
  const fail = useFail()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.POST('/admin/users/{userID}/reset-password', { params: { path: { userID: id } } })),
    onSuccess: () => toast.success(t('toast.passwordReset')),
    onError: fail,
  })
}

export function useUpdateSignups() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const fail = useFail()
  return useMutation({
    mutationFn: (allowSignups: boolean) => unwrap(api.PUT('/admin/settings', { body: { allowSignups } })),
    onSuccess: (s) => {
      qc.setQueryData(['settings'], s)
      toast.success(t(s.allowSignups ? 'toast.signupsOn' : 'toast.signupsOff'))
    },
    onError: fail,
  })
}
