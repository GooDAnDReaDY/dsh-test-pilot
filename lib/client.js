window.__ModuleLoader__.load({
  id: '@goodandready/dsh-test-pilot',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const NS = '@goodandready/dsh-test-pilot'
    const h = React.createElement
    const EMPTY = { status: 'loading', value: undefined, revision: undefined, writable: false }
    const RUNNERS = ['auto', 'pytest', 'jest', 'vitest', 'go', 'rust', 'tap', 'tsc', 'deno', 'npm']
    const TEXT = {
      en: {
        title: 'Test Pilot', subtitle: 'Automatic test runs for the active workspace.', enabled: 'Run tests automatically',
        enabledHelp: 'Runs after successful file changes and does not block the agent.', runScope: 'Automatic run scope',
        auto: 'Related tests when safe', full: 'Full suite after every change',
        autoHelp: 'Uses related tests only when every changed file maps safely; otherwise runs the full suite.',
        fullHelp: 'Runs the configured full test command after each detected file change.',
        runner: 'Default runner', command: 'Default command', cwd: 'Default workspace directory',
        rules: 'Workspace rules', rulesHelp: 'The most specific matching path wins. Leave a rule command empty to use runner defaults or detection.',
        path: 'Workspace path', ruleEnabled: 'Enabled for this workspace', remove: 'Remove rule', add: 'Add workspace rule',
        timeout: 'Timeout (milliseconds)', outputLimit: 'Output limit per stream (bytes)',
        save: 'Save changes', discard: 'Discard', saving: 'Saving…', saved: 'Settings saved.',
        saveFailed: 'Could not save settings. Check that the settings provider is writable and try again.',
        conflict: 'Settings changed elsewhere. Discard this draft and reload before saving.',
        readOnly: 'Settings are read-only in this connection.', loading: 'Loading settings…',
        unavailable: 'Settings are unavailable. Check that the Test Pilot settings namespace is registered.',
        invalidPath: 'Every workspace rule needs a path.', invalidLimits: 'Timeout and output limit must be positive whole numbers.',
      },
      zh: {
        title: 'Test Pilot', subtitle: '自动测试当前工作区的代码更改。', enabled: '自动运行测试',
        enabledHelp: '检测到文件成功修改后运行，不会阻塞智能体。', runScope: '自动运行范围',
        auto: '安全时仅运行相关测试', full: '每次更改后运行完整套件',
        autoHelp: '仅当每个更改文件都能安全映射时运行相关测试；否则运行完整套件。',
        fullHelp: '每次检测到文件更改后运行配置的完整测试命令。',
        runner: '默认运行器', command: '默认命令', cwd: '默认工作区目录',
        rules: '工作区规则', rulesHelp: '优先采用路径最具体的规则。命令留空时使用运行器默认值或自动检测。',
        path: '工作区路径', ruleEnabled: '在此工作区启用', remove: '删除规则', add: '添加工作区规则',
        timeout: '超时时间（毫秒）', outputLimit: '每个输出流的上限（字节）',
        save: '保存更改', discard: '放弃更改', saving: '正在保存…', saved: '设置已保存。',
        saveFailed: '无法保存设置。请确认设置提供方可写后重试。',
        conflict: '设置已在其他位置更改。请放弃当前草稿并重新加载后再保存。',
        readOnly: '当前连接中的设置为只读。', loading: '正在加载设置…',
        unavailable: '设置不可用。请确认已注册 Test Pilot 设置命名空间。',
        invalidPath: '每条工作区规则都必须填写路径。', invalidLimits: '超时时间和输出上限必须为正整数。',
      },
    }
    const CSS = [
      '.dtp-card{list-style:none;margin:0 0 12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;color:var(--dsw-alias-label-primary)}',
      '.dtp-head{appearance:none;width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;border:0;border-radius:12px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.dtp-head:focus-visible,.dtp-input:focus-visible,.dtp-select:focus-visible,.dtp-btn:focus-visible{outline:2px solid var(--dsw-alias-state-focus-primary,var(--dsw-alias-label-primary));outline-offset:2px}',
      '.dtp-title{font-size:15px;font-weight:600;line-height:1.4}.dtp-sub,.dtp-help{font-size:13px;color:var(--dsw-alias-label-secondary);line-height:1.45}',
      '.dtp-chevron{margin-left:auto;color:var(--dsw-alias-label-tertiary);transition:transform .16s}.dtp-chevron-open{transform:rotate(180deg)}',
      '.dtp-body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding:16px 0 12px;display:flex;flex-direction:column;gap:14px}',
      '.dtp-field{display:flex;flex-direction:column;gap:6px;min-width:0}.dtp-label{font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary)}',
      '.dtp-input,.dtp-select{box-sizing:border-box;min-height:36px;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;padding:7px 10px}',
      '.dtp-check{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:var(--dsw-alias-label-primary)}.dtp-check input{margin-top:3px;accent-color:var(--dsw-alias-state-success-primary)}',
      '.dtp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.dtp-rule{display:grid;grid-template-columns:minmax(160px,1.4fr) minmax(120px,.7fr) minmax(120px,.8fr) minmax(160px,1fr) auto;align-items:end;gap:10px;padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px}',
      '.dtp-rule-toggle{padding:0 0 9px}.dtp-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dtp-btn{appearance:none;min-height:34px;padding:6px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer}',
      '.dtp-btn-primary{border-color:transparent;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.dtp-btn:disabled{opacity:.55;cursor:not-allowed}',
      '.dtp-note{font-size:13px;color:var(--dsw-alias-state-success-primary)}.dtp-error{font-size:13px;color:var(--dsw-alias-state-error-primary)}.dtp-footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--dsw-alias-border-l2);padding-top:12px}',
      '@media(max-width:760px){.dtp-grid{grid-template-columns:1fr}.dtp-rule{grid-template-columns:1fr 1fr}.dtp-rule-path,.dtp-rule-command{grid-column:1/-1}.dtp-rule-toggle{padding-bottom:0}}',
      '@media(prefers-reduced-motion:reduce){.dtp-chevron{transition:none}}',
    ].join('')
    function ensureStyles() {
      if (typeof document === 'undefined' || document.getElementById('dsh-test-pilot-client-style')) return () => {}
      const style = document.createElement('style')
      style.id = 'dsh-test-pilot-client-style'
      style.setAttribute('data-dsh-plugin', 'dsh-test-pilot')
      style.textContent = CSS
      document.head.appendChild(style)
      return () => { if (style.parentNode) style.parentNode.removeChild(style) }
    }
    function draftFromStored(source) {
      const value = source && typeof source === 'object' ? source : {}
      return {
        enabled: value.enabled !== false,
        runScope: value.runScope === 'full' ? 'full' : 'auto',
        runner: String(value.runner || 'auto'),
        command: String(value.command || ''),
        cwd: String(value.cwd || ''),
        workspaceRules: Array.isArray(value.workspaceRules) ? value.workspaceRules.map((rule) => ({
          path: String(rule && rule.path || ''), enabled: !rule || rule.enabled !== false,
          runner: String(rule && rule.runner || 'auto'), command: String(rule && rule.command || ''),
        })) : [],
        timeoutMs: Number(value.timeoutMs) > 0 ? Number(value.timeoutMs) : 120000,
        maxOutputBytes: Number(value.maxOutputBytes) > 0 ? Number(value.maxOutputBytes) : 200000,
      }
    }
    function useLanguage(ctx) {
      const locale = ctx && ctx.locale
      const subscribe = React.useCallback((listener) => locale && typeof locale.subscribe === 'function' ? locale.subscribe(listener) : () => {}, [locale])
      const read = React.useCallback(() => {
        const current = locale && typeof locale.getSnapshot === 'function' ? locale.getSnapshot() : null
        return String(current && (current.active || current.locale) || 'en').startsWith('zh') ? 'zh' : 'en'
      }, [locale])
      return React.useSyncExternalStore(subscribe, read, () => 'en')
    }
    function Field(props) {
      return h('label', { className: 'dtp-field' }, h('span', { className: 'dtp-label' }, props.label), props.control,
        props.help ? h('span', { className: 'dtp-help' }, props.help) : null)
    }
    function SettingsForm(props) {
      const ctx = props.ctx
      const language = useLanguage(ctx)
      const text = TEXT[language]
      const scope = React.useMemo(() => {
        try { return ctx && ctx.settingsScope && ctx.settingsScope.bind ? ctx.settingsScope.bind({ namespace: NS }) : null } catch { return null }
      }, [ctx])
      const subscribe = React.useCallback((listener) => scope ? scope.subscribe(listener) : () => {}, [scope])
      const getSnapshot = React.useCallback(() => scope ? scope.getSnapshot() : EMPTY, [scope])
      const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
      const [draft, setDraft] = React.useState(null)
      const [baseline, setBaseline] = React.useState(null)
      const [baseRevision, setBaseRevision] = React.useState(undefined)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const [saved, setSaved] = React.useState(false)
      React.useEffect(() => {
        if (snapshot.status !== 'ready') return
        if (!draft || !baseline) {
          const next = draftFromStored(snapshot.value)
          setDraft(next); setBaseline(next); setBaseRevision(snapshot.revision)
        } else if (JSON.stringify(draft) === JSON.stringify(baseline) && snapshot.revision !== baseRevision) {
          const next = draftFromStored(snapshot.value)
          setDraft(next); setBaseline(next); setBaseRevision(snapshot.revision)
        }
      }, [snapshot, draft, baseline, baseRevision])
      const dirty = !!draft && !!baseline && JSON.stringify(draft) !== JSON.stringify(baseline)
      const conflicted = snapshot.status === 'ready' && baseRevision !== undefined && snapshot.revision !== baseRevision
      const change = (key, value) => { setDraft((current) => ({ ...current, [key]: value })); setSaved(false); setError('') }
      const updateRule = (index, key, value) => change('workspaceRules', draft.workspaceRules.map((rule, i) => i === index ? { ...rule, [key]: value } : rule))
      async function save() {
        if (!scope || !draft || busy) return
        setError(''); setSaved(false)
        if (conflicted) { setError(text.conflict); return }
        if (!snapshot.writable) { setError(text.readOnly); return }
        if (draft.workspaceRules.some((rule) => !rule.path.trim())) { setError(text.invalidPath); return }
        if (!Number.isSafeInteger(draft.timeoutMs) || draft.timeoutMs <= 0 || !Number.isSafeInteger(draft.maxOutputBytes) || draft.maxOutputBytes <= 0) {
          setError(text.invalidLimits); return
        }
        setBusy(true)
        try {
          const ops = Object.entries(draft).map(([key, value]) => ({ op: 'set', path: [key], value }))
          await scope.mutate(ops, baseRevision)
          const current = scope.getSnapshot()
          const next = draftFromStored(current.value)
          if (current.status !== 'ready' || JSON.stringify(next) !== JSON.stringify(draft)) throw new Error('settings write not accepted')
          setDraft(next); setBaseline(next); setBaseRevision(current.revision); setSaved(true)
        } catch { setError(text.saveFailed) }
        finally { setBusy(false) }
      }
      if (snapshot.status === 'loading') return h('p', { className: 'dtp-sub', role: 'status' }, text.loading)
      if (snapshot.status !== 'ready' || !draft) return h('p', { className: 'dtp-error', role: 'status' }, text.unavailable)
      const runnerSelect = (value, onChange) => h('select', { className: 'dtp-select', value, onChange: (event) => onChange(event.target.value) },
        RUNNERS.map((runner) => h('option', { key: runner, value: runner }, runner)))
      const textInput = (value, onChange) => h('input', { className: 'dtp-input', value, onChange: (event) => onChange(event.target.value) })
      const numberInput = (value, onChange, min) => h('input', { className: 'dtp-input', type: 'number', min, step: 1000, value, onChange: (event) => onChange(Number(event.target.value)) })
      const rules = draft.workspaceRules.map((rule, index) => h('div', { className: 'dtp-rule', key: index },
        h('div', { className: 'dtp-field dtp-rule-path' }, h('label', { className: 'dtp-label', htmlFor: 'dtp-path-' + index }, text.path),
          h('input', { id: 'dtp-path-' + index, className: 'dtp-input', value: rule.path, onChange: (event) => updateRule(index, 'path', event.target.value) })),
        h('div', { className: 'dtp-field' }, h('label', { className: 'dtp-label', htmlFor: 'dtp-runner-' + index }, text.runner),
          h('select', { id: 'dtp-runner-' + index, className: 'dtp-select', value: rule.runner, onChange: (event) => updateRule(index, 'runner', event.target.value) },
            RUNNERS.map((runner) => h('option', { key: runner, value: runner }, runner)))),
        h('label', { className: 'dtp-check dtp-rule-toggle' }, h('input', { type: 'checkbox', checked: rule.enabled, onChange: (event) => updateRule(index, 'enabled', event.target.checked) }), text.ruleEnabled),
        h('div', { className: 'dtp-field dtp-rule-command' }, h('label', { className: 'dtp-label', htmlFor: 'dtp-command-' + index }, text.command),
          h('input', { id: 'dtp-command-' + index, className: 'dtp-input', value: rule.command, onChange: (event) => updateRule(index, 'command', event.target.value) })),
        h('button', { type: 'button', className: 'dtp-btn', 'aria-label': text.remove + ' ' + (index + 1), disabled: busy,
          onClick: () => change('workspaceRules', draft.workspaceRules.filter((_, i) => i !== index)) }, text.remove)))
      return h('div', { className: 'dtp-body' },
        h('label', { className: 'dtp-check' }, h('input', { type: 'checkbox', checked: draft.enabled, onChange: (event) => change('enabled', event.target.checked) }),
          h('span', null, h('strong', null, text.enabled), h('br'), h('span', { className: 'dtp-help' }, text.enabledHelp))),
        h(Field, { label: text.runScope, help: draft.runScope === 'full' ? text.fullHelp : text.autoHelp,
          control: h('select', { className: 'dtp-select', value: draft.runScope, onChange: (event) => change('runScope', event.target.value) },
            h('option', { value: 'auto' }, text.auto), h('option', { value: 'full' }, text.full)) }),
        h('div', { className: 'dtp-grid' },
          h(Field, { label: text.runner, control: runnerSelect(draft.runner, (value) => change('runner', value)) }),
          h(Field, { label: text.command, control: textInput(draft.command, (value) => change('command', value)) }),
          h(Field, { label: text.cwd, control: textInput(draft.cwd, (value) => change('cwd', value)) }),
          h(Field, { label: text.timeout, control: numberInput(draft.timeoutMs, (value) => change('timeoutMs', value), 1) }),
          h(Field, { label: text.outputLimit, control: numberInput(draft.maxOutputBytes, (value) => change('maxOutputBytes', value), 1) })),
        h('section', { className: 'dtp-field', 'aria-label': text.rules },
          h('div', { className: 'dtp-row' }, h('strong', { className: 'dtp-label' }, text.rules),
            h('button', { type: 'button', className: 'dtp-btn', disabled: busy,
              onClick: () => change('workspaceRules', [...draft.workspaceRules, { path: '', enabled: true, runner: 'auto', command: '' }]) }, text.add)),
          h('span', { className: 'dtp-help' }, text.rulesHelp), rules.length ? h('div', { className: 'dtp-field' }, ...rules) : null),
        conflicted ? h('p', { className: 'dtp-error', role: 'alert' }, text.conflict) : null,
        error ? h('p', { className: 'dtp-error', role: 'alert' }, error) : null,
        saved ? h('p', { className: 'dtp-note', role: 'status' }, text.saved) : null,
        !snapshot.writable ? h('p', { className: 'dtp-sub', role: 'status' }, text.readOnly) : null,
        h('div', { className: 'dtp-footer' },
          h('button', { type: 'button', className: 'dtp-btn', disabled: busy || !dirty,
            onClick: () => { setDraft(baseline); setError(''); setSaved(false) } }, text.discard),
          h('button', { type: 'button', className: 'dtp-btn dtp-btn-primary', disabled: busy || !dirty || !snapshot.writable || conflicted,
            onClick: () => { void save() } }, busy ? text.saving : text.save)))
    }
    function PluginCard(props) {
      const ctx = props.ctx
      const language = useLanguage(ctx)
      const [open, setOpen] = React.useState(false)
      const text = TEXT[language]
      return h('li', { className: 'dtp-card', 'data-dsh-plugin': 'dsh-test-pilot' },
        h('button', { type: 'button', className: 'dtp-head', 'aria-expanded': open, onClick: () => setOpen((current) => !current) },
          h('div', null, h('div', { className: 'dtp-title' }, text.title), h('div', { className: 'dtp-sub' }, text.subtitle)),
          h('span', { className: 'dtp-chevron' + (open ? ' dtp-chevron-open' : ''), 'aria-hidden': true }, '⌄')),
        open ? h(SettingsForm, { ctx }) : null)
    }
    function registerLocale(ctx) {
      try { return ctx.locale.register(NS, TEXT) || (() => {}) }
      catch (error) {
        try { ctx.logger && ctx.logger.warn && ctx.logger.warn('dsh-test-pilot: locale registration failed', error) } catch {}
        return () => {}
      }
    }
    function apply(ctx) {
      if (ctx.locale && typeof ctx.locale.register === 'function') {
        if (typeof ctx.effect === 'function') ctx.effect(() => registerLocale(ctx), 'dsh-test-pilot: locale dictionaries')
        else registerLocale(ctx)
      }
      if (typeof ctx.effect === 'function') ctx.effect(() => ensureStyles(), 'dsh-test-pilot: styles')
      else ensureStyles()
      try {
        ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
          name: 'settings.plugin.item', key: NS, locale: NS, inject: () => ({ ctx }),
        }, PluginCard))
      } catch (error) {
        try { ctx.logger && ctx.logger.warn && ctx.logger.warn('dsh-test-pilot: settings card registration failed', error) } catch {}
      }
    }
    module.exports = { apply, inject: ['slots', 'locale', 'settingsScope'] }
    return module.exports
  },
})
