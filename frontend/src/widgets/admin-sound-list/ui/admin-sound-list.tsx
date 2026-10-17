import { Play, Upload } from 'lucide-react'
import { useRef } from 'react'
import type { SoundSlot } from '@/shared/api'
import { useI18n, type TKey } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { useToast } from '@/shared/ui/toast'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { previewSound, useSounds } from '@/entities/sound'
import { useDeleteSound, useUploadSound } from '@/features/manage-sounds'

const SLOTS: SoundSlot[] = ['success', 'error', 'row_5', 'row_10', 'row_15', 'finish', 'finish_perfect']
const MAX_BYTES = 1 << 20

const formatSize = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`

export function AdminSoundList() {
  const { t } = useI18n()
  const confirm = useConfirm()
  const toast = useToast()
  const { data, isPending, error } = useSounds()
  const upload = useUploadSound()
  const del = useDeleteSound()
  const input = useRef<HTMLInputElement>(null)
  // The slot the file picker was opened for.
  const target = useRef<SoundSlot>('success')

  const pick = (slot: SoundSlot) => {
    target.current = slot
    input.current?.click()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">{t('admin.sounds')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('sound.hint')}</p>
      </div>

      <input
        ref={input}
        type="file"
        accept="audio/mpeg,.mp3"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          if (file.size > MAX_BYTES) return toast.error(t('sound.fileTooBig'))
          upload.mutate({ slot: target.current, file })
        }}
      />

      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : (
        <ul className="space-y-3">
          {SLOTS.map((slot) => {
            const sound = data.find((s) => s.slot === slot)
            const busy = upload.isPending && upload.variables?.slot === slot
            return (
              <li key={slot}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 py-4">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="font-extrabold">{t(`sound.slot.${slot}` as TKey)}</p>
                      <p className="text-sm text-muted-foreground">{sound ? formatSize(sound.size) : t('sound.none')}</p>
                    </div>
                    {sound && (
                      <Button variant="ghost" size="sm" onClick={() => void previewSound(sound)}>
                        <Play size={14} /> {t('asset.preview')}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" loading={busy} disabled={upload.isPending} onClick={() => pick(slot)}>
                      <Upload size={14} /> {sound ? t('sound.replace') : t('sound.upload')}
                    </Button>
                    {sound && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        loading={del.isPending && del.variables === slot}
                        disabled={del.isPending}
                        onClick={async () => {
                          if (await confirm({ message: t('sound.deleteConfirm'), confirmLabel: t('admin.confirmDelete'), destructive: true })) del.mutate(slot)
                        }}
                      >
                        {t('admin.delete')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
