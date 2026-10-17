import { useI18n } from '@/shared/lib/i18n'
import { Card, CardContent } from '@/shared/ui/card'
import { Switch } from '@/shared/ui/switch'
import { usePreferences } from '@/entities/user'

export function Settings() {
  const { t } = useI18n()
  const { prefs, ready, update } = usePreferences()
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">{t('settings.title')}</h1>
      <Card>
        <CardContent className="pt-5">
          <Switch
            checked={prefs.soundsEnabled}
            disabled={!ready}
            onChange={(v) => update({ soundsEnabled: v })}
            label={t('settings.sounds')}
            hint={t('settings.soundsHint')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
