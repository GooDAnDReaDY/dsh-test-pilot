import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appendDecisionContext, mutationPathForExecution, outcomeIsCompleted } from '../lib/host-events.js'

test('normalizes completion outcomes and ignores failed turns', () => {
  for (const event of [{}, { outcome: 'success' }, { data: { reason: { kind: 'completed' } } }, { result: { status: 'ok' } }]) {
    assert.equal(outcomeIsCompleted(event), true)
  }
  for (const event of [{ outcome: 'failed' }, { data: { outcome: 'cancelled' } }, { result: { status: 'error' } }]) {
    assert.equal(outcomeIsCompleted(event), false)
  }
})

test('extracts only supported file-mutation tool paths', () => {
  assert.deepEqual(mutationPathForExecution({ name: 'write', arguments: { file_path: 'src/a.js' } }), { path: 'src/a.js' })
  assert.deepEqual(mutationPathForExecution({ name: 'edit', arguments: { filePath: 'src/b.js' } }), { path: 'src/b.js' })
  assert.deepEqual(mutationPathForExecution({ name: 'str_replace_editor', arguments: { command: 'insert', path: 'src/c.js' } }), { path: 'src/c.js' })
  assert.equal(mutationPathForExecution({ name: 'read', arguments: { path: 'src/a.js' } }), null)
  assert.equal(mutationPathForExecution({ name: 'str_replace_editor', arguments: { command: 'view', path: 'src/a.js' } }), null)
  assert.equal(mutationPathForExecution({ name: 'write', arguments: null }), null)
})

test('appends decision context without mutating the original', () => {
  const original = { allow: true, additionalContexts: ['existing'] }
  const result = appendDecisionContext(original, 'new')
  assert.deepEqual(result, { allow: true, additionalContexts: ['existing', 'new'] })
  assert.deepEqual(original.additionalContexts, ['existing'])
  assert.deepEqual(appendDecisionContext({}, 'first').additionalContexts, ['first'])
})

test('appends a safe test report into the matching chat turn', async () => {
  const { appendChatReport } = await import('../lib/host-events.js')
  let call
  const session = { append: (...args) => { call = args } }
  assert.equal(appendChatReport(session, { data: { turn: '4', step: 2 } }, { status: 'passed', counts: { passed: 3 } }, 'test-provider'), true)
  assert.equal(call[0], 'assistant/message')
  assert.deepEqual(call[1].turn, 4)
  assert.deepEqual(call[1].step, 2)
  assert.equal(call[1].message.role, 'assistant')
  assert.match(call[1].message.content[0].text, /3/)
  assert.equal(call[1].message.source.provider, 'test-provider')
  assert.deepEqual(call[2], { surfaceOp: 'append' })
  assert.equal(appendChatReport(null, {}, {}, 'test-provider'), false)
  assert.equal(appendChatReport({ append() { throw new Error('closed') } }, {}, {}, 'test-provider'), false)
})
