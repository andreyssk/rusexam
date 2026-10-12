import { Link } from 'react-router-dom'
import { useI18n } from '@/shared/lib/i18n'

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="py-16 text-center">
      <p className="text-xl font-semibold">{t('common.notFound')}</p>
      <Link to="/" className="mt-2 inline-block text-primary hover:underline">
        {t('result.backHome')}
      </Link>
    </div>
  )
}
