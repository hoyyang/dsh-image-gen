import { useSyncExternalStore, useState } from 'react'
import { Button, DisclosureRow, Input, IconSettingsOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'

export interface SettingsScope {
  subscribe(listener: () => void): () => void
  getSnapshot(): { status: string; value?: Record<string, unknown> | undefined; writable?: boolean }
  set(field: string, value: unknown): Promise<void>
}

interface CardProps {
  t: (key: string) => string
  scope: SettingsScope
}

function Field(props: { label: string; hint: string; value: string; type?: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{props.label}</div>
      <Input
        type={props.type ?? 'text'}
        autoComplete={props.type === 'password' ? 'new-password' : 'off'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.4 }}>{props.hint}</div>
    </div>
  )
}

export function SettingsCard(props: CardProps) {
  const { t, scope } = props
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const snapshot = useSyncExternalStore(scope.subscribe, scope.getSnapshot)
  const value = snapshot.value ?? {}
  const str = (key: string) => String(value[key] ?? '')

  const [draft, setDraft] = useState<Record<string, string>>({})
  const draftOr = (key: string) => (key in draft ? draft[key] : str(key))
  const setField = (key: string, v: string) => setDraft((d) => ({ ...d, [key]: v }))

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      for (const key of ['baseUrl', 'model', 'imagesPath', 'apiKey', 'outputDirectory', 'timeoutMs'] as const) {
        if (!(key in draft)) continue
        const raw = draft[key].trim()
        if (key === 'timeoutMs') await scope.set(key, Number(raw) >= 1000 ? Number(raw) : Number(str('timeoutMs')) || 300000)
        else await scope.set(key, raw)
      }
      setDraft({})
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const configured = str('baseUrl') !== '' && str('apiKey') !== ''

  return (
    <DisclosureRow
      icon={<IconSettingsOutline16 size={14} />}
      title={t('title') + (configured ? ' · ✓' : '')}
      open={open}
      expandable
      onToggle={() => setOpen((o) => !o)}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 8px' }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{t('empty')}</div>
        <Field label={t('baseUrl')} hint={t('baseUrlHint')} value={draftOr('baseUrl')} onChange={(v) => setField('baseUrl', v)} />
        <Field label={t('model')} hint={t('modelHint')} value={draftOr('model')} onChange={(v) => setField('model', v)} />
        <Field label={t('apiKey')} hint={t('apiKeyHint')} type="password" value={draftOr('apiKey')} onChange={(v) => setField('apiKey', v)} />
        <Field label={t('imagesPath')} hint={t('imagesPathHint')} value={draftOr('imagesPath')} onChange={(v) => setField('imagesPath', v)} />
        <Field label={t('outputDir')} hint={t('outputDirHint')} value={draftOr('outputDir')} onChange={(v) => setField('outputDir', v)} />
        <Field label={t('timeoutMs')} hint={''} value={draftOr('timeoutMs')} onChange={(v) => setField('timeoutMs', v)} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button variant="primary" size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? t('saving') : t('save')}
          </Button>
          {saved && <span style={{ fontSize: 12, color: '#22c55e' }}>{t('saved')}</span>}
        </div>
        <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.5 }}>{t('scopeHint')}</div>
      </div>
    </DisclosureRow>
  )
}
