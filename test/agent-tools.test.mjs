import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerTools } from '../lib/agent-tools.js'

test('registers exactly the status and manual-run tools with bounded execution', async () => {
  const definitions=[]
  let manualCall
  const state={ ready: Promise.resolve(), latest:()=>null, activeCount:()=>1, list:()=>[] }
  const fsProvider={ resolve:async (value)=>value, contains:(base,value)=>value===base||value.startsWith(base+'/'), stat:async ()=>({type:'directory'}), processPath:(value)=>value }
  const ctx={ tools:{register:(definition)=>definitions.push(definition)}, fs:fsProvider }
  registerTools(ctx,state,async (cwd, event, session)=>{ manualCall={cwd,event,session}; return {status:'passed',runner:'jest',command:'npm test',cwd,counts:{passed:2},durationMs:10} })
  assert.deepEqual(definitions.map((tool)=>tool.name),['test_pilot_status','test_pilot_run'])
  const status=await definitions[0].execute({limit:2})
  assert.match(status,/activeRuns/)
  assert.match(status,/history/)
  const session={workspace:{cwd:'/repo'},meta:{cwd:'/wrong'}}
  const result=await definitions[1].execute({}, {agent:{session}})
  assert.equal(manualCall.cwd,'/repo')
  assert.equal(manualCall.event,null)
  assert.equal(manualCall.session,session)
  assert.match(result,/passed/)
})

test('does not register agent tools when the tools service is absent', () => {
  assert.doesNotThrow(()=>registerTools({}, {}, ()=>{}))
})
