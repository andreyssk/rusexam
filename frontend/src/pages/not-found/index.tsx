import { Link } from 'react-router-dom'
import { useI18n } from '@/shared/lib/i18n'

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="py-16 text-center">
      <p className="text-xl font-extrabold">{t('common.notFound')}</p>
      <Link to="/" className="mt-2 inline-block font-bold text-accent hover:underline">
        {t('result.backHome')}
      </Link>
    </div>
  )
}
