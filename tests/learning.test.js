import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LEARNING_SOURCES, LEARNING_POLICY, LEARNING_TOPICS, GLOSSARY, TRANSFER_ITEMS, CURRICULUM, MODEL_LIMITATION, createActivityState, updateActivityState, normalizeLearningRecords, describeLearningRecord, renderLearningPanel } from '../src/learning.js';

const allText = JSON.stringify({ LEARNING_TOPICS, GLOSSARY, TRANSFER_ITEMS, CURRICULUM, MODEL_LIMITATION });
const at = '2026-10-04T10:00:00.000Z';
const act = (state, type, args = {}) => updateActivityState(state, { type, ...args }, at);

test('all 40 printed textbook and workbook pages are covered by optional topics', () => {
  assert.equal(CURRICULUM.totalPages, 40);
  assert.equal(CURRICULUM.printedPages, true);
  for (const book of ['textbook', 'workbook']) {
    const covered = new Set(LEARNING_TOPICS.flatMap(topic => topic.sources.filter(s => s.book === book).flatMap(s => s.pages)));
    assert.deepEqual([...covered].sort((a, b) => a - b), CURRICULUM.scope[book]);
  }
});

test('the teacher module has no game gate, assessment score, account, or network dependency', () => {
  assert.deepEqual(LEARNING_POLICY, { optional: true, requiresPlay: false, requiresSuccess: false, automaticScoring: false, unlocksGameplay: false, deviceLocalOnly: true, collectsIdentity: false });
  const code = fs.readFileSync(new URL('../src/learning.js', import.meta.url), 'utf8');
  assert.doesNotMatch(code, /\bimport\s|\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|innerHTML|insertAdjacentHTML|document\.cookie/);
  const state = createActivityState({ name: 'not retained', email: 'not retained', score: 1000, unlocked: ['A'], progress: { complete: true } });
  assert.deepEqual(Object.keys(state).sort(), ['conservation', 'responses', 'topicNotes', 'version']);
  assert.doesNotMatch(JSON.stringify(state), /not retained|score|unlocked|complete/);
});

test('public citations retain publisher and printed pages without private material URLs', () => {
  assert.equal(LEARNING_SOURCES.textbook.publisher, '아이스크림미디어');
  assert.equal(LEARNING_SOURCES.workbook.publisher, '아이스크림미디어');
  for (const topic of LEARNING_TOPICS) for (const source of topic.sources) {
    assert.equal(source.publisher, LEARNING_SOURCES[source.book].publisher);
    assert.equal(source.title, LEARNING_SOURCES[source.book].title);
    assert.equal(Object.hasOwn(source, 'url'), false);
  }
  assert.doesNotMatch(JSON.stringify(LEARNING_SOURCES), /https?:|file\/d\//);
  assert.match(allText, /인쇄 쪽수/);
  assert.match(allText, /재배포하지 않습니다/);
});

test('required science boundaries are explicit rather than inferred from game success', () => {
  for (const phrase of ['본 것과 추리한 것', '생물 요소', '비생물 요소', '생산자', '소비자', '분해자', '양분', '햇빛', '먹이 → 먹는 생물', '에너지가 끝없이', '한 정답망으로 합치지', '서식지', '대기오염', '수질오염', '토양오염', '계획', '실제로 한 날짜', '직접 관찰', '기존 기록', '현재', '위치 점만으로', '장치', '공개', '로봇', '한계', '개인 사육', '두꺼비', '산란 장소']) assert.ok(allText.includes(phrase), phrase);
  assert.ok(LEARNING_TOPICS.length >= 11);
  assert.match(MODEL_LIMITATION, /실제 자연을 현장 관찰한 자료가 아닙니다/);
  assert.match(allText, /버섯도 생물/);
  assert.match(allText, /모두 소비자/);
  assert.match(allText, /플라스틱이나 모든 쓰레기를 즉시 없애는 장치가 아닙니다/);
  assert.match(allText, /6→2는 설계값/);
  assert.match(allText, /30초 늘어납니다/);
});

test('optional A-F transfer items carry evidence guidance and separate model sources', () => {
  assert.deepEqual(TRANSFER_ITEMS.map(item => item.id), ['A', 'B', 'C', 'D', 'E', 'F']);
  for (const item of TRANSFER_ITEMS) { assert.ok(item.prompt.length > 20); assert.ok(item.guide.length >= 3); assert.ok(item.sources.length); }
  assert.match(TRANSFER_ITEMS[2].guide.join(' '), /메뚜기 → 오리, 개구리 → 오리, 오리 → 매/);
  assert.match(TRANSFER_ITEMS[3].guide.join(' '), /직박구리·오리·족제비/);
  assert.match(TRANSFER_ITEMS[3].guide.join(' '), /서로 다른 모형을 합치지/);
  assert.match(TRANSFER_ITEMS[5].guide.join(' '), /찬반 자체보다/);
});

test('activity constants are deeply immutable', () => {
  assert.ok(Object.isFrozen(LEARNING_TOPICS));
  assert.ok(Object.isFrozen(LEARNING_TOPICS[0].sources[0].pages));
  assert.throws(() => { TRANSFER_ITEMS[0].guide.push('changed'); }, TypeError);
});

test('first independent response remains immutable through reveal, revisions and reload', () => {
  let state = createActivityState();
  state = act(state, 'initial-draft', { id: 'A', text: '버섯은 생물이다. 살아 있기 때문이다.' });
  state = act(state, 'save-first', { id: 'A' });
  const first = structuredClone(state.responses.A.firstIndependent);
  state = act(state, 'initial-draft', { id: 'A', text: 'overwrite attempt' });
  state = act(state, 'reveal-guide', { id: 'A' });
  state = act(state, 'initial-draft', { id: 'A', text: 'second overwrite attempt' });
  state = act(state, 'revision-draft', { id: 'A', text: '버섯과 물의 관계도 설명한다.' });
  state = act(state, 'save-revision', { id: 'A' });
  state = createActivityState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(state.responses.A.firstIndependent, first);
  assert.equal(state.responses.A.guideRevealed, true);
  assert.equal(state.responses.A.guideRevealedAt, at);
  assert.deepEqual(state.responses.A.revisions, [{ text: '버섯과 물의 관계도 설명한다.', at }]);
});

test('guide reveal freezes an unsaved draft; guide-first answers are never called independent', () => {
  let state = act({}, 'initial-draft', { id: 'C', text: '화살표는 먹이에서 시작한다.' });
  state = act(state, 'reveal-guide', { id: 'C' });
  assert.equal(state.responses.C.firstIndependent.text, '화살표는 먹이에서 시작한다.');
  state = act(state, 'reveal-guide', { id: 'B' });
  state = act(state, 'initial-draft', { id: 'B', text: 'now I saw the guide' });
  state = act(state, 'save-first', { id: 'B' });
  state = act(state, 'revision-draft', { id: 'B', text: '도움말을 본 뒤의 답' });
  state = act(state, 'save-revision', { id: 'B' });
  assert.equal(state.responses.B.firstIndependent, null);
  assert.equal(state.responses.B.initialDraft, '');
  assert.equal(state.responses.B.revisions[0].text, '도움말을 본 뒤의 답');
});

test('no response is necessary to reveal every guide and no scores are produced', () => {
  let state = createActivityState();
  for (const item of TRANSFER_ITEMS) state = act(state, 'reveal-guide', { id: item.id });
  for (const response of Object.values(state.responses)) { assert.equal(response.guideRevealed, true); assert.equal(response.firstIndependent, null); }
  assert.doesNotMatch(JSON.stringify(state), /score|grade|passed|unlocked|completion/);
});

test('revision history and all topic notes survive reload without mutating caller state', () => {
  const input = createActivityState();
  const before = JSON.stringify(input);
  let state = act(input, 'reveal-guide', { id: 'D' });
  for (let i = 0; i < 130; i++) { state = act(state, 'revision-draft', { id: 'D', text: `revision ${i}` }); state = act(state, 'save-revision', { id: 'D' }); }
  state = act(state, 'topic-note', { id: 'traces', key: 'observed', text: '잎에 구멍이 있다.' });
  state = act(state, 'topic-note', { id: 'traces', key: 'childName', text: 'not retained' });
  assert.equal(JSON.stringify(input), before);
  const reloaded = createActivityState(JSON.parse(JSON.stringify(state)));
  assert.equal(reloaded.responses.D.revisions.length, 130);
  assert.equal(reloaded.topicNotes.traces.observed, '잎에 구멍이 있다.');
  assert.equal(reloaded.topicNotes.traces.childName, undefined);
});

test('a conservation plan never creates actual dated actions; actual records are separate', () => {
  let state = act({}, 'plan', { key: 'action', text: '교실에서 일회용품 사용 줄이기' });
  state = act(state, 'plan', { key: 'period', text: '다음 주' });
  state = act(state, 'save-action');
  assert.equal(state.conservation.actions.length, 0);
  state = act(state, 'action-draft', { key: 'date', text: '2026-10-04' });
  state = act(state, 'save-action');
  assert.equal(state.conservation.actions.length, 0);
  state = act(state, 'action-draft', { key: 'action', text: '재사용 물병을 이용했다.' });
  state = act(state, 'action-draft', { key: 'reflection', text: '물을 다시 채워 쓸 수 있었다.' });
  state = act(state, 'save-action');
  assert.equal(state.conservation.actions.length, 1);
  assert.equal(state.conservation.actions[0].date, '2026-10-04');
  assert.equal(state.conservation.plan.period, '다음 주');
  assert.equal(state.conservation.actionDraft.date, '');
  assert.doesNotMatch(JSON.stringify(state.conservation), /complete|score/);
});

test('record normalization preserves every catch and feeding event, including repeated values', () => {
  const events = Array.from({ length: 260 }, (_, i) => ({ time: i / 10, type: i % 2 ? 'ate' : 'caught', food: 'grasshopper', eater: 'frog', observed: i % 3 === 0 }));
  events.push({ time: 99, type: 'ate', food: 'caterpillar', eater: 'frog' });
  events.push({ ...events.at(-1) });
  const input = [{ id: 'run-one', stage: 3, role: 'frog', events }];
  const before = JSON.stringify(input);
  const records = normalizeLearningRecords(input);
  assert.equal(records.length, 262);
  assert.equal(records.filter(record => record.type === 'caught').length, 130);
  assert.equal(records[0].stageId, 3);
  assert.equal(records[0].runId, 'run-one');
  assert.equal(records[0].visibilityVerified, true);
  assert.equal(records[1].visibilityVerified, false);
  assert.equal(records.at(-1).visibilityVerified, null);
  assert.equal(JSON.stringify(input), before);
});

test('attack warnings and missing visibility never become a seen feeding claim', () => {
  const records = normalizeLearningRecords([
    { type: 'predator-warning', time: 1 }, { type: 'predator-attack', time: 2, observed: false },
    { type: 'ate', food: 'grasshopper', eater: 'frog', time: 3 },
    { type: 'tongue-contact', time: 4 }, { type: 'catch-cancelled', time: 5 },
    { type: 'round-end', status: 'caught', time: 6 }, { type: 'round-end', status: 'success', time: 7 }
  ]);
  assert.equal(records.length, 6);
  assert.match(describeLearningRecord(records[0]), /공격 예고 기록 \(섭식 기록 아님\).*화면 노출 여부 미기록/);
  assert.match(describeLearningRecord(records[1]), /공격 시작 기록.*화면 밖 기록/);
  assert.match(describeLearningRecord(records[2]), /메뚜기 → 개구리.*화면 노출 여부 미기록/);
  assert.match(describeLearningRecord(records[3]), /섭식 완료 전/);
  assert.match(describeLearningRecord(records[4]), /섭식 완료 아님/);
  assert.doesNotMatch(records.map(describeLearningRecord).join(' '), /보았어요|관찰했어요|실제로 먹었어요/);
});

// A tiny DOM adapter keeps UI/state wiring tests dependency-free and offline.
class Element {
  constructor(tag, document) { this.tagName = tag.toUpperCase(); this.ownerDocument = document; this.children = []; this.attributes = {}; this.listeners = {}; this.style = {}; this.dataset = {}; this.parentNode = null; this._text = ''; this.value = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...elements) { for (const element of elements) { element.parentNode = this; this.children.push(element); } }
  replaceChildren(...elements) { for (const child of this.children) child.parentNode = null; this._text = ''; this.children = []; this.append(...elements); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
  fire(name) { for (const listener of this.listeners[name] || []) listener({ target: this }); }
  remove() { this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; }
  focus() { this.ownerDocument.activeElement = this; }
}
const documentFixture = () => { const document = { createElement: tag => new Element(tag, document) }; return new Element('div', document); };
const descendants = element => [element, ...element.children.flatMap(descendants)];
const findButton = (container, title) => descendants(container).find(el => el.tagName === 'BUTTON' && el.textContent === title);
const byClass = (container, className) => descendants(container).find(el => (el.className || '').split(' ').includes(className));
const findLabelInput = (container, label) => { const caption = descendants(container).find(el => el.tagName === 'LABEL' && el.textContent === label); return descendants(container).find(el => el.id && el.id === caption?.htmlFor); };
const input = (element, text) => { assert.ok(element); element.value = text; element.fire('input'); };

test('teacher panel opens without records and all accessible controls are at least 44px', () => {
  const container = documentFixture();
  const panel = renderLearningPanel(container);
  assert.match(container.textContent, /답하지 않아도 모든 게임을 바로/);
  assert.equal(descendants(container).filter(el => el.tagName === 'DETAILS').length, 12);
  for (const element of descendants(container).filter(el => ['BUTTON', 'SUMMARY', 'A', 'TEXTAREA', 'INPUT'].includes(el.tagName))) assert.equal(element.style.minHeight, '44px');
  for (const element of descendants(container).filter(el => ['TEXTAREA', 'INPUT'].includes(el.tagName))) assert.ok(descendants(container).some(label => label.tagName === 'LABEL' && label.htmlFor === element.id));
  findButton(container, '게임 기록').fire('click');
  assert.match(container.textContent, /아직 제공된/);
  assert.match(container.textContent, /다른 모든 활동/);
  panel.destroy(); assert.equal(container.children.length, 0);
});

test('UI saves independent and revised responses separately and restores them on reopen', () => {
  const container = documentFixture();
  let saved;
  const panel = renderLearningPanel(container, { onSave: state => { saved = state; } });
  findButton(container, '선택 질문 A–F').fire('click');
  input(findLabelInput(container, 'A · 도움말 전 내 첫 생각'), '<script>not HTML</script> 버섯은 생물');
  findButton(container, '교사용 근거 도움말 보기').fire('click');
  assert.equal(saved.responses.A.firstIndependent.text, '<script>not HTML</script> 버섯은 생물');
  assert.equal(findLabelInput(container, 'A · 도움말 전 내 첫 생각'), undefined);
  input(findLabelInput(container, 'A · 도움말을 본 뒤 보태거나 고친 생각'), '물과의 관계를 덧붙임');
  findButton(container, '수정한 생각 남기기').fire('click');
  assert.equal(saved.responses.A.revisions[0].text, '물과의 관계를 덧붙임');
  assert.equal(descendants(container).filter(el => el.tagName === 'SCRIPT').length, 0);
  const detached = panel.getState(); detached.responses.A.firstIndependent.text = 'mutated';
  assert.notEqual(panel.getState().responses.A.firstIndependent.text, 'mutated');
  panel.destroy(); renderLearningPanel(container, { activityState: saved });
  findButton(container, '선택 질문 A–F').fire('click');
  assert.match(container.textContent, /버섯은 생물/); assert.match(container.textContent, /물과의 관계를 덧붙임/);
});

test('save errors are shown truthfully and the in-memory draft is retained', () => {
  const container = documentFixture();
  const panel = renderLearningPanel(container, { onSave: () => false });
  input(findLabelInput(container, '직접 확인한 사실'), '구멍');
  assert.match(byClass(container, 'learning-save-status').textContent, /저장에 실패/);
  assert.equal(panel.getState().topicNotes.traces.observed, '구멍');
  panel.destroy();
  renderLearningPanel(container);
  input(findLabelInput(container, '직접 확인한 사실'), '아직 저장 연결 없음');
  assert.match(byClass(container, 'learning-save-status').textContent, /현재 화면에 기록/);
  assert.doesNotMatch(byClass(container, 'learning-save-status').textContent, /기기에 수업 기록을 저장했어요/);
});

test('all passed records are rendered with no eight-item or hundred-item truncation', () => {
  const container = documentFixture();
  renderLearningPanel(container, { records: Array.from({ length: 125 }, (_, i) => ({ type: 'ate', time: i, food: 'grasshopper', eater: 'frog' })) });
  findButton(container, '게임 기록').fire('click');
  const list = byClass(container, 'learning-records');
  assert.equal(list.children.length, 125);
  assert.match(list.children.at(-1).textContent, /124\.0초/);
});

test('current campaign capture events and both final-stage segments are preserved accurately', () => {
  const records = normalizeLearningRecords([
    { id: 'six-first', stage: 6, segment: 0, role: 'frog', events: [{ time: 12, type: 'capture', observed: true, eater: 'snake', food: 'frog', consumed: false }] },
    { id: 'six-second', stageId: 6, segment: 1, role: 'grasshopper', events: [{ time: 12, type: 'capture', observed: true, eater: 'frog', food: 'grasshopper', consumed: false }] }
  ]);
  assert.equal(records.length, 2);
  assert.equal(records[0].consumed, false);
  assert.match(describeLearningRecord(records[0]), /6단계 개구리 전반.*포획 기록/);
  assert.match(describeLearningRecord(records[1]), /6단계 메뚜기 후반.*포획 기록/);
  assert.doesNotMatch(records.map(describeLearningRecord).join(' '), /섭식 기록:/);
});
