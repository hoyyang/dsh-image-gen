/**
 * dsh-image-gen client: registers the plugin-configuration card on the DSH
 * settings Plugins page. The card binds the 'dsh-image-gen' settings
 * namespace through the client settings scope, so saved fields reach the
 * host immediately (live) — no restart required.
 * Built by tsdown into client/client.js; react and the primitives module
 * are resolved through the loader module table at runtime.
 */
import { createElement as h } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { en, zh } from './locales.ts'
import { SettingsCard, type SettingsScope } from './SettingsCard.tsx'

const NS = 'dsh-image-gen'

const REQUIRED_PRIMITIVES = ['DisclosureRow', 'Input', 'Button', 'IconSettingsOutline16'] as const

interface LocaleService {
  register(namespace: string, dicts: { zh: Record<string, string>; en: Record<string, string> }): unknown
  bind(namespace: string): (key: string) => string
}

interface SlotsService {
  inject(slot: string, register: () => unknown): void
  register(meta: Record<string, unknown>, component: () => unknown): unknown
}

interface SettingsScopeService {
  bind(spec: { namespace: string }): SettingsScope
}

interface ClientContext {
  effect(callback: () => unknown, label?: string): void
  locale: LocaleService
  slots: SlotsService
  inject(services: string[], callback: (scoped: ClientContext & { settingsScope: SettingsScopeService }) => void): void
}

export const name = NS
export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  const missing = REQUIRED_PRIMITIVES.filter((n) => (primitives as unknown as Record<string, unknown>)[n] === undefined)
  if (missing.length > 0) {
    console.warn('[dsh-image-gen] host ui-primitives missing ' + missing.join(', ') + ' — settings card disabled')
    return
  }
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), NS + ': dictionaries')
  const t = ctx.locale.bind(NS)

  // Plugin configuration card (web shell >= rc.7): nested inject so older hosts skip it.
  ctx.inject(['settingsScope'], (scoped) => {
    const scope = scoped.settingsScope.bind({ namespace: NS })
    scoped.slots.inject('settings.plugin.item', () => scoped.slots.register({
      name: 'settings.plugin.item',
      key: NS,
      locale: NS,
      inject: () => ({ t }),
    }, () => h(SettingsCard, { t, scope })))
  })
}
