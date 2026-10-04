/**
 * Optional, device-local teacher activities. This module is deliberately independent
 * of the simulation, completion, score and unlock systems. The host persists only
 * onSave(state) in its separate local activity store; no identities or requests.
 */
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const part of Object.values(value)) freeze(part);
    Object.freeze(value);
  }
  return value;
};
export const LEARNING_SOURCES = freeze({
  textbook: { title: '과학 4학년 2학기 · 생물과 환경 · 교과서', publisher: '아이스크림미디어', pages: [38, 61] },
  workbook: { title: '과학 4학년 2학기 · 생물과 환경 · 실험관찰', publisher: '아이스크림미디어', pages: [20, 35] }
});
const source = (book, pages) => ({ book, pages, label: `${book === 'textbook' ? '교과서' : '실험관찰'} ${pages.join('·')}쪽`, title: LEARNING_SOURCES[book].title, publisher: LEARNING_SOURCES[book].publisher });
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const MODEL_LIMITATION = '게임 기록은 가상 모형의 사건이며 실제 자연을 현장 관찰한 자료가 아닙니다. 먹기 목표·도약 회복·위기 탈출·목적지·속도·몸집·고정 공격선은 게임 규칙입니다. 점수는 과학 성적이나 생태계 건강도가 아닙니다.';
export const LEARNING_POLICY = freeze({ optional: true, requiresPlay: false, requiresSuccess: false, automaticScoring: false, unlocksGameplay: false, deviceLocalOnly: true, collectsIdentity: false });

export const LEARNING_TOPICS = freeze([
  {
    id: 'traces', title: '흔적: 본 것과 추리한 것', sources: [source('textbook', range(38, 41))],
    intro: '교사가 준비한 흔적 사진이나 안전하게 관찰한 주변 자료를 살펴봅니다. 게임 그림과 현장 자료는 서로 구분합니다.',
    prompts: ['“잎에 구멍이 있다”처럼 눈으로 확인한 사실만 먼저 말해 보세요.', '“어떤 동물이 먹었을까?”라는 추리와 다른 가능한 설명을 나누어 보세요.', '설명을 확인하려면 어떤 추가 자료가 필요할까요?'],
    fields: [['observed', '직접 확인한 사실'], ['inferred', '가능한 설명·다른 설명'], ['verify', '더 알아볼 것·자료 출처']],
    caution: '흔적만으로 동물의 이름이나 행동을 확정하지 않습니다. 배설물·사체·모르는 물질은 맨손으로 만지지 않습니다.'
  },
  {
    id: 'components', title: '생태계의 구성 요소와 크기', sources: [source('textbook', range(42, 45)), source('workbook', [20, 21])],
    intro: '쓰러진 나무 아래, 숲, 강, 바다처럼 종류와 크기가 다른 생태계에서 생물 요소와 비생물 요소가 서로 주는 영향을 찾습니다.',
    prompts: ['풀·버섯·개구리·햇빛·물·공기를 두 무리로 나누고 기준을 설명해 보세요.', '햇빛이나 물이 풀에 주는 영향, 풀이 주변 환경에 주는 영향을 한 가지씩 찾아보세요.', '작은 공간과 큰 공간을 비교해도 생물과 비생물의 관계를 함께 볼 수 있을까요?'],
    fields: [['classification', '분류와 기준'], ['interaction', '생물·비생물의 상호 영향'], ['scale', '크기가 다른 생태계 비교']],
    caution: '움직임만으로 생물 여부를 판단하지 않습니다. 움직이지 않는 버섯도 생물입니다.'
  },
  {
    id: 'roles', title: '양분을 얻는 세 가지 역할', sources: [source('textbook', [46, 47]), source('workbook', [22, 23])],
    intro: '생산자·소비자·분해자를 양분을 얻는 방식으로 비교합니다. 개구리와 메뚜기는 모두 소비자입니다.',
    prompts: ['풀, 메뚜기, 곰팡이는 각각 어떻게 양분을 얻나요?', '낙엽·죽은 생물체·배출물이 오랜 시간에 걸쳐 분해될 때 다른 생물의 양분 이용과 어떻게 연결될까요?', '분해자가 줄어든다면 어떤 변화가 생길 수 있을까요?'],
    fields: [['roles', '생산자·소비자·분해자와 이유'], ['change', '분해 뒤의 변화·다른 생물의 이용']],
    caution: '분해자는 플라스틱이나 모든 쓰레기를 즉시 없애는 장치가 아닙니다. 양분과 에너지를 같은 말로 바꾸거나 에너지가 끝없이 순환한다고 설명하지 않습니다.'
  },
  {
    id: 'food-relations', title: '먹이에서 먹는 생물로', sources: [source('textbook', [48, 49]), source('workbook', [24, 25])],
    intro: '제공된 먹이 정보로 먹이사슬과 먹이그물을 표현합니다. 화살표는 먹이 → 먹는 생물 방향입니다.',
    prompts: ['게임에 실제로 기록된 섭식 관계와 교재에서 확인한 관계를 따로 적어 보세요.', '서로 겹치는 먹이사슬을 찾아 먹이그물로 연결해 보세요.', '오리는 메뚜기와 개구리를 먹고 매에게 잡아먹힙니다. 새 카드 배치에서도 방향을 설명할 수 있나요?'],
    fields: [['game', '게임 모형에서 기록된 관계'], ['book', '교재에서 확인한 관계·쪽수'], ['reason', '화살표 방향의 이유·새 자료 적용']],
    caution: '공격·이동 방향과 먹이 관계 화살표는 다릅니다. 실험관찰 24쪽 카드 활동, 25쪽 비교 모형, 34쪽 정리 자료를 한 정답망으로 합치지 않습니다. 그림에 없는 관계를 현실에도 절대 없다고 단정하지 않습니다.'
  },
  {
    id: 'web-comparison', title: '서로 다른 두 먹이그물 비교', sources: [source('workbook', [25, 34])],
    intro: '실험관찰 25쪽의 단순 모형과 복잡 모형을 나란히 비교합니다. 34쪽 정리 자료는 별도 출처로 확인합니다.',
    prompts: ['각 모형에서 개구리가 사라지면 그림에 제시된 매의 먹이가 무엇이 남나요?', '복잡 모형의 다른 먹이 경로를 실제 화살표로 짚어 보세요.', '“복잡하면 언제나 안정적이다”라고 말할 수 있을까요? 어떤 영향은 남을까요?'],
    fields: [['simple', '25쪽 단순 모형에 남는 경로'], ['complex', '25쪽 복잡 모형에 남는 경로'], ['separate', '34쪽 자료와 비교·출처 구분']],
    caution: '25쪽 단순 모형에서는 제시된 매의 먹이가 남지 않고, 복잡 모형에는 직박구리·오리·족제비가 남습니다. 다른 먹이 경로가 영향을 줄이는 데 도움이 될 수 있지만 모든 생물이 영향을 안 받는다는 뜻은 아닙니다.'
  },
  {
    id: 'human-impact', title: '오염과 서식지 변화', sources: [source('textbook', [50, 51]), source('workbook', [26])],
    intro: '매연·폐수·지나친 농약 사례에서 인간 활동 → 환경 변화 → 생물 영향을 자료로 연결합니다.',
    prompts: ['대기오염·수질오염·토양오염 사례를 골라 원인, 영향, 자료의 출처를 정리해 보세요.', '서식지가 줄어드는 일과 오염되는 일은 어떻게 다를까요? 함께 생기는 경우도 있을까요?', '2·4단계는 은신처, 3·5단계는 먹이 분포를 비교하는 별개의 가상 상황입니다. 조작·경로·제한시간의 차이도 살펴보세요.'],
    fields: [['case', '사례·원인·환경 변화'], ['effect', '생물 영향·자료 출처와 시점'], ['heard', '다른 발표에서 새로 안 점']],
    caution: '4단계와 5단계는 실제 자연을 연속 관찰한 자료가 아닙니다. 5단계의 메뚜기 6→2는 설계값이며 시간도 30초 늘어납니다. 실제 개체 수 감소량이나 변화 원인을 이 게임으로 검증할 수 없습니다.'
  },
  {
    id: 'conservation-discussion', title: '문제에 맞는 보전 방법', sources: [source('textbook', [52, 53]), source('workbook', [27])],
    intro: '바다거북과 플라스틱, 생태통로, 새 충돌 방지, 보호 구역 사례에서 해결하려는 문제와 방법을 연결합니다.',
    prompts: ['어떤 생물과 어떤 문제가 관련되나요? 출처가 있는 근거를 찾아보세요.', '제안한 행동이 그 문제에 어떻게 도움이 되나요? 한계도 있나요?', '친구의 의견을 듣고 생각을 바꾸거나 보탠 부분은 무엇인가요?'],
    fields: [['problem', '문제·사례·출처'], ['proposal', '보전 제안과 이유·한계'], ['revision', '친구 의견 뒤 바꾸거나 보탠 생각']],
    caution: '사람도 생태계의 일부입니다. 특정 찬반이나 외운 문장만으로 판단하지 않고 문제와 근거의 연결을 살핍니다.'
  },
  {
    id: 'conservation-action', title: '계획과 실제 실천을 따로', sources: [source('textbook', [54, 55]), source('workbook', [28, 29])],
    intro: '작은 보전 행동을 계획하고 이후 실제로 한 일의 날짜·내용·느낀 점을 따로 남깁니다.',
    prompts: ['실천할 일, 기간, 역할, 확인 방법을 정해 보세요. 역할에는 사람 이름 대신 할 일을 적으세요.', '실제로 한 날짜와 행동은 무엇인가요? 아직 하지 않았다면 계획만 남겨도 됩니다.', '실천하며 느낀 점과 공유하고 싶은 내용을 정리해 보세요.'],
    fields: [],
    caution: '계획 입력·게임 엔딩·버튼 누르기는 실제 실천 완료가 아닙니다. 현장 활동은 교사의 안전 안내와 학교 규칙에 따라 합니다.'
  },
  {
    id: 'local-investigation', title: '우리 주변 생물 조사', sources: [source('textbook', [56, 57]), source('workbook', [30, 31])],
    intro: '직접 관찰한 내용과 다른 사람이 남긴 기존 기록을 구분해서 소개합니다. 종명, 대략적인 장소, 시점, 특징, 출처, 보호 노력을 정리합니다.',
    prompts: ['직접 관찰했나요, 기존 기록을 조사했나요? 생물 이름과 특징을 어떻게 확인했나요?', '언제·어디의 기록인지, 작성자 대신 기관·자료 제목·발행 시점을 적어 보세요.', '과거 기록만으로 현재도 같은 생물이 같은 수만큼 있다고 할 수 있을까요? 어떤 추가 확인이 필요할까요?'],
    fields: [['firsthand', '직접 관찰: 생물·대략적인 장소·시점·특징'], ['historical', '기존 기록: 자료 제목·기관·기록 시점·출처'], ['protection', '보호 노력·아직 모르는 것']],
    caution: '과거 관찰·황새 개체 수를 최신 통계로 바꾸지 않습니다. 개인 주소·학생 이름·얼굴·희귀종의 정확한 위치를 입력하거나 공개하지 않습니다. 생물을 잡아 옮기지 않습니다.'
  },
  {
    id: 'tracking', title: '위치 추적: 알 수 있는 것과 한계', sources: [source('textbook', [58, 59])],
    intro: '황새 위치 추적 사례를 통해 이동 경로 자료의 쓰임과 동물을 대하는 책임을 생각합니다.',
    prompts: ['어떤 동물의 어떤 점을 알고 싶나요? 연구 질문을 정해 보세요.', '위치 점과 시간으로 예상할 수 있는 정보는 무엇인가요? 먹이나 이동 이유를 알려면 무엇이 더 필요할까요?', '장치가 동물에게 주는 부담, 서식지 방해, 위치 공개의 위험을 어떻게 줄일까요?'],
    fields: [['question', '연구 질문·까닭'], ['information', '예상 정보·추가 자료·해석의 한계'], ['ethics', '동물을 대하는 주의점·위치 정보 보호']],
    caution: '위치 점만으로 무엇을 먹었는지, 왜 이동했는지 확정하지 않습니다. 학생이 임의로 야생동물을 포획하거나 추적 장치를 붙이는 활동은 하지 않습니다.'
  },
  {
    id: 'robot', title: '오염 해결 로봇을 구상한다면', sources: [source('textbook', [60, 61]), source('workbook', [32, 33, 34])],
    intro: '단원 개념을 다시 연결하고 특정 오염 문제를 해결할 로봇의 방법과 한계를 설명합니다.',
    prompts: ['어떤 오염 문제를 해결하려 하나요? 자료를 근거로 정해 보세요.', '로봇은 어떻게 찾아내고 처리하나요? 생물을 해치지 않도록 무엇을 고려해야 하나요?', '로봇이 해결하지 못하는 원인, 에너지·처리 뒤의 폐기물 문제, 사람이 해야 할 일은 무엇인가요?'],
    fields: [['problem', '해결할 문제·자료 근거'], ['method', '로봇의 방법·생물 보호'], ['limits', '한계·사람이 함께 해야 할 일']],
    caution: '구상은 실제 효과가 검증된 발명품이 아닙니다. 로봇이나 분해자가 모든 오염을 즉시 없앤다고 설명하지 않습니다.'
  },
  {
    id: 'wildlife-pond', title: '야생동물과 두꺼비 연못', sources: [source('textbook', range(50, 55)), source('workbook', [35])],
    intro: '야생동물을 집에 데려와 기르는 것이 보전인지 따져 보고, 두꺼비 산란 연못 개발 의견을 근거로 검토합니다.',
    prompts: ['야생동물은 서식지에서 어떤 먹이와 다른 생물 관계를 맺나요? 집으로 데려오면 무엇이 달라질까요?', '연못을 없애고 공장을 짓자는 의견에 대해 입장·산란 장소·서식지·생물 관계의 영향을 연결해 보세요.', '어떤 자료를 더 확인해야 하나요? 문제에 맞는 대안과 실제 실천 계획은 무엇인가요?'],
    fields: [['keeping', '개인 사육이 보전이라는 생각 검토'], ['claim', '연못 개발에 대한 주장과 근거'], ['evidence', '예상 영향·확인할 자료·보전 대안']],
    caution: '동물을 집에 데려오면 해결된다고 보지 않습니다. 공장에 대한 찬반 자체가 답은 아닙니다. 산란 장소와 생물 관계에 대한 근거, 대안의 영향을 함께 살핍니다.'
  }
]);

export const GLOSSARY = freeze([
  { term: '생태계', definition: '한 지역의 생물 요소와 비생물 요소가 서로 영향을 주고받는 관계를 함께 이르는 말입니다. 크기와 종류는 다양합니다.', sources: [source('textbook', [42, 43, 60])] },
  { term: '생물 요소·비생물 요소', definition: '생물 요소는 풀·버섯·개구리처럼 살아 있는 요소, 비생물 요소는 햇빛·물·공기·흙 같은 요소입니다. 움직임이 분류 기준은 아닙니다.', sources: [source('textbook', [44, 45]), source('workbook', [20, 21])] },
  { term: '생산자', definition: '햇빛 등을 이용해 스스로 양분을 만들어 살아가는 생물입니다. 햇빛은 먹이 생물이 아닙니다.', sources: [source('textbook', [46, 47])] },
  { term: '소비자', definition: '다른 생물을 먹이로 하여 살아가는 생물입니다. 풀을 먹는 메뚜기와 곤충을 먹는 개구리는 모두 소비자입니다.', sources: [source('textbook', [46, 47])] },
  { term: '분해자', definition: '주로 죽은 생물체나 배출물을 분해하여 양분을 얻으며 다른 생물이 양분을 이용하는 데도 이어집니다. 버섯·곰팡이·일부 세균이 예입니다.', sources: [source('textbook', [46, 47]), source('workbook', [22, 23])] },
  { term: '먹이사슬', definition: '먹고 먹히는 관계가 사슬처럼 이어진 것입니다. 화살표는 먹이에서 먹는 생물로 향합니다. 강함의 순위가 아닙니다.', sources: [source('textbook', [48, 49])] },
  { term: '먹이그물', definition: '여러 먹이사슬이 서로 얽힌 관계입니다. 자료에 없는 관계를 임의로 추가하거나 서로 다른 모형을 합치지 않습니다.', sources: [source('textbook', [48, 49]), source('workbook', [24, 25, 34])] },
  { term: '생태계의 변화', definition: '다른 먹이 경로는 변화의 영향을 줄이는 데 도움이 될 수 있습니다. 복잡한 먹이그물도 언제나 안정적인 것은 아니며 아무 생물도 영향을 받지 않는다는 뜻도 아닙니다.', sources: [source('workbook', [25, 34])] },
  { term: '서식지 감소·환경오염', definition: '살아갈 공간이 줄어드는 일과 공기·물·토양이 오염되는 일은 구분합니다. 같은 활동으로 함께 생길 수도 있으므로 원인과 영향을 확인합니다.', sources: [source('textbook', [50, 51])] },
  { term: '보전', definition: '사람도 생태계의 일부임을 알고 생물과 환경의 관계를 지키려는 노력입니다. 계획과 실제 실천, 실천 효과의 확인은 서로 다른 기록입니다.', sources: [source('textbook', [52, 53, 54, 55])] },
  { term: '관찰·추론·게임 기록', definition: '직접 확인한 사실, 자료로부터 생각한 설명, 가상 모형에서 일어난 사건을 구분합니다. 공격 예고 기록은 실제 섭식 기록이 아닙니다.', sources: [source('textbook', [38, 39, 40, 41, 56, 57])] }
]);

export const TRANSFER_ITEMS = freeze([
  { id: 'A', title: '생물과 비생물을 나누는 기준', sources: [source('textbook', range(42, 45)), source('workbook', [20, 21])],
    material: '토끼풀 · 버섯 · 개구리 · 물 · 햇빛 · 공기',
    prompt: '두 무리로 나누고 기준을 설명해 보세요. 두 무리의 요소가 서로 관련되는 예를 하나 덧붙여 보세요.',
    guide: ['토끼풀·버섯·개구리와 물·햇빛·공기를 살아 있음에 따라 구분했는지 살핍니다.', '생물과 물·햇빛 등의 관계를 연결했는지 듣습니다. 분류 선택과 이유 설명을 따로 살핍니다.', '“버섯은 움직이지 않으니 비생물”이라는 생각이 있다면 다시 자료를 확인합니다.'] },
  { id: 'B', title: '역할과 분해를 설명하기', sources: [source('textbook', [46, 47]), source('workbook', [22, 23])],
    material: '토끼풀은 햇빛 등을 이용해 양분을 만들고, 메뚜기는 풀을 먹습니다. 곰팡이는 죽은 생물체·배출물을 분해하여 양분을 얻습니다.',
    prompt: '각 생물의 역할과 까닭을 말해 보세요. 분해자가 없어진다면 무엇이 달라질까요?',
    guide: ['생산자·소비자·분해자를 양분을 얻는 방식과 연결합니다.', '죽은 생물체·배출물이 쌓이는 일과 다른 생물의 양분 이용에 미치는 영향을 설명하는지 살핍니다.', '“쓰레기를 빨리 지운다”만으로는 분해 과정을 설명한 것이 아닙니다. 제공되지 않은 부록 카드 뒷면을 정답 근거로 만들지 않습니다.'] },
  { id: 'C', title: '새로운 배치에서 먹이 화살표', sources: [source('textbook', [49]), source('workbook', [24])],
    material: '오리는 메뚜기와 개구리를 먹고 매에게 잡아먹힙니다. 교재 그림을 보지 않고 매 · 메뚜기 · 오리 · 개구리 카드를 새로 배치해 보세요.',
    prompt: '관계 세 개를 화살표로 표현하고 방향의 이유를 설명해 보세요. 종이나 말로 설명한 것을 짧게 기록해도 됩니다.',
    guide: ['메뚜기 → 오리, 개구리 → 오리, 오리 → 매를 확인합니다.', '먹이에서 먹는 생물로 향하는 까닭을 설명하는지, 공격 방향과 혼동하지 않는지 살핍니다.', '원본 화살표를 그대로 베끼는 과제 대신 관계 정보로 새 배치에 적용합니다. 게임 성공 여부와 무관합니다.'] },
  { id: 'D', title: '개구리가 사라진 두 모형', sources: [source('workbook', [25, 34])],
    material: '실험관찰 25쪽의 단순 모형과 복잡 모형을 각각 봅니다. 34쪽 정리 자료는 별도로 확인합니다.',
    prompt: '개구리가 사라졌을 때, 각 그림에서 매가 먹을 수 있다고 제시된 생물을 찾아보세요. 남은 경로에는 어떤 차이가 있나요?',
    guide: ['25쪽 단순 모형에는 제시된 매의 먹이가 남지 않고, 복잡 모형에는 직박구리·오리·족제비가 남습니다.', '남은 화살표 경로를 근거로 설명하도록 돕습니다. 서로 다른 모형을 합치지 않습니다.', '“복잡하니까 안정”만으로는 근거가 부족합니다. 다른 경로가 도움 될 수 있어도 모든 생물이 영향을 피하는 것은 아닙니다.'] },
  { id: 'E', title: '가상 환경 변화의 근거와 한계', sources: [source('textbook', [50, 51]), source('workbook', [26])],
    material: '2·4단계는 같은 메뚜기·풀·목적지·천적·제한시간에서 은신처 두 곳의 차이를 둔 게임 모형입니다. 3·5단계는 다른 비교이고 시간도 다릅니다.',
    prompt: '4단계에서 같은 조건과 달라진 조건은 무엇인가요? 자신의 경로·노출 기록으로 설명해 보세요. 이 결과만으로 현실의 메뚜기 수가 얼마나 줄지 알 수 있을까요?',
    guide: ['은신처와 노출을 실제 게임 기록에 연결합니다. 플레이하지 않았다면 조건 자료만 비교해도 됩니다.', '조작 숙련·경로 선택도 결과에 영향을 줄 수 있습니다. 어려워지지 않은 경우에도 선택과 근거를 듣습니다.', '게임만으로 현실 개체 수를 정확히 예측할 수 없습니다. 5단계의 6→2를 외운 것을 이해의 증거로 삼지 않습니다.'] },
  { id: 'F', title: '두꺼비 연못에 대한 근거 있는 선택', sources: [source('textbook', range(50, 55)), source('workbook', [35])],
    material: '두꺼비가 알을 낳는 연못을 없애고 공장을 짓자는 의견이 있습니다.',
    prompt: '자신의 입장을 정하고 산란 장소·서식지·생물 관계에 생길 변화와 더 확인할 자료를 연결해 보세요. 가능한 보전 대안도 생각해 보세요.',
    guide: ['찬반 자체보다 주장, 생태계 영향, 자료의 연결을 살핍니다.', '“공장은 무조건 나쁘다” 또는 “동물을 집에 데려오면 해결된다”는 설명을 자료와 다시 비교합니다.', '산란 장소와 서식지·생물 관계에 맞는 보전 방안, 계획, 이후 실제 실천 기록으로 이어갈 수 있습니다.'] }
]);

export const CURRICULUM = freeze({
  title: '생물과 환경 · 제공 40쪽 대응', pageNumberNote: 'PDF 순번이 아닌 교재 인쇄 쪽수', printedPages: true, totalPages: 40,
  sources: LEARNING_SOURCES,
  scope: { textbook: range(38, 61), workbook: range(20, 35) },
  coverage: LEARNING_TOPICS.map(({ id, title, sources }) => ({ id, title, sources })),
  teachingNotes: [
    '모든 활동은 교사가 필요할 때 선택하는 별도 활동입니다. 게임 시작·진행·재도전·완주에 답변, 반복 응답, 통과 기준은 없습니다.',
    '한 차시에는 한 학습 목표와 필요한 활동만 고릅니다. 여섯 단계와 단원 전체를 40분 안에 모두 끝내는 구성은 아닙니다.',
    '선택 질문 A–F는 말·그림·화살표·짧은 글로 표현할 수 있습니다. 말이나 종이 답변은 이름 없이 요지만 적어도 됩니다. 자동 채점은 하지 않습니다.',
    '도움말 보기 전의 첫 생각과 도움말을 본 뒤 수정한 생각을 따로 남깁니다. 도움말부터 보았다면 이후 답변을 독립 응답이라고 표시하지 않습니다.',
    '먹기·회피·시간·점수·별은 조작 기록입니다. 개념, 이유, 자료의 출처, 새 사례 적용은 별도의 학습 증거입니다.',
    '게임 모형의 사건, 교재의 관계, 현장 관찰, 예측을 구분합니다. 교재의 과거 통계는 현재 자료가 아닙니다.',
    '입력은 이 기기에서만 사용하며 학생 이름·연락처·얼굴·개인 주소·정확한 야생동물 위치를 받지 않습니다. 외부 전송·계정·공개 순위표가 없습니다.',
    '다른 학생이 사용하기 전에는 호스트의 수업 기록 초기화 기능으로 지웁니다. 기기와 브라우저를 바꾸면 기록이 이어지지 않을 수 있습니다.',
    '근거는 아이스크림미디어 과학 4학년 2학기 교재명과 인쇄 쪽수로 표시합니다. 교사가 사용할 수 있는 교재에서 확인하세요. 개인 보관 파일 주소, PDF와 원문 이미지는 게임에 재배포하지 않습니다.',
    '부록 카드 뒷면·교사용 지도서·모든 종의 식성과 감각은 확인 범위 밖입니다. 실제 학생의 재미·학습 효과·수업 소요시간이 검증됐다고 주장하지 않습니다.'
  ]
});

const asText = value => typeof value === 'string' ? value : '';
const timestamp = value => typeof value === 'string' ? value : null;
const clone = value => JSON.parse(JSON.stringify(value));
const answer = value => value && typeof value === 'object' && typeof value.text === 'string' ? { text: value.text, at: timestamp(value.at) } : null;
const itemIds = new Set(TRANSFER_ITEMS.map(item => item.id));

/** Whitelists activity fields; game progress and identities cannot enter this store. */
export function createActivityState(input = {}) {
  const state = { version: 1, responses: {}, topicNotes: {}, conservation: { plan: {}, actionDraft: {}, actions: [] } };
  for (const item of TRANSFER_ITEMS) {
    const previous = input?.responses?.[item.id] || {};
    state.responses[item.id] = { initialDraft: asText(previous.initialDraft), firstIndependent: answer(previous.firstIndependent), guideRevealed: previous.guideRevealed === true, guideRevealedAt: timestamp(previous.guideRevealedAt), revisionDraft: asText(previous.revisionDraft), revisions: (Array.isArray(previous.revisions) ? previous.revisions : []).map(answer).filter(Boolean) };
  }
  for (const topic of LEARNING_TOPICS) {
    state.topicNotes[topic.id] = {};
    for (const [key] of topic.fields) state.topicNotes[topic.id][key] = asText(input?.topicNotes?.[topic.id]?.[key]);
  }
  for (const key of ['action', 'period', 'role', 'verification', 'sharing']) state.conservation.plan[key] = asText(input?.conservation?.plan?.[key]);
  for (const key of ['date', 'action', 'reflection']) state.conservation.actionDraft[key] = asText(input?.conservation?.actionDraft?.[key]);
  state.conservation.actions = (Array.isArray(input?.conservation?.actions) ? input.conservation.actions : []).filter(value => value && typeof value === 'object').map(value => ({ date: asText(value.date), action: asText(value.action), reflection: asText(value.reflection), recordedAt: timestamp(value.recordedAt) }));
  return state;
}

/** Pure state transition helpers allow storage and answer-provenance tests. */
export function updateActivityState(input, change, now = new Date().toISOString()) {
  const state = createActivityState(input);
  const response = itemIds.has(change.id) ? state.responses[change.id] : null;
  if (change.type === 'initial-draft' && response && !response.guideRevealed && !response.firstIndependent) response.initialDraft = asText(change.text);
  if (change.type === 'save-first' && response && !response.guideRevealed && !response.firstIndependent && response.initialDraft.trim()) response.firstIndependent = { text: response.initialDraft, at: now };
  if (change.type === 'reveal-guide' && response && !response.guideRevealed) {
    if (!response.firstIndependent && response.initialDraft.trim()) response.firstIndependent = { text: response.initialDraft, at: now };
    response.guideRevealed = true;
    response.guideRevealedAt = now;
  }
  if (change.type === 'revision-draft' && response && response.guideRevealed) response.revisionDraft = asText(change.text);
  if (change.type === 'save-revision' && response && response.guideRevealed && response.revisionDraft.trim()) {
    response.revisions.push({ text: response.revisionDraft, at: now });
    response.revisionDraft = '';
  }
  const topic = LEARNING_TOPICS.find(value => value.id === change.id);
  if (change.type === 'topic-note' && topic?.fields.some(([key]) => key === change.key)) state.topicNotes[change.id][change.key] = asText(change.text);
  if (change.type === 'plan' && Object.hasOwn(state.conservation.plan, change.key)) state.conservation.plan[change.key] = asText(change.text);
  if (change.type === 'action-draft' && Object.hasOwn(state.conservation.actionDraft, change.key)) state.conservation.actionDraft[change.key] = asText(change.text);
  if (change.type === 'save-action') {
    const draft = state.conservation.actionDraft;
    if (/^\d{4}-\d{2}-\d{2}$/.test(draft.date) && draft.action.trim()) {
      state.conservation.actions.push({ ...draft, recordedAt: now });
      state.conservation.actionDraft = { date: '', action: '', reflection: '' };
    }
  }
  return state;
}

const names = { grass: '풀', grasshopper: '메뚜기', caterpillar: '애벌레', frog: '개구리', snake: '뱀', duck: '오리', hawk: '매' };
const species = value => names[value] || (typeof value === 'string' && value ? value : '종류 미기록');
const RECORD_TYPES = new Set(['ate', 'feeding-observed', 'ai-ate', 'capture', 'captured', 'catch', 'caught', 'player-caught', 'predator-caught', 'tongue-contact', 'catch-cancelled', 'predator-warning', 'attack-warning', 'predator-attack', 'attack', 'escape-used', 'round-end']);
/** Preserve every supplied feeding/catch event, without deduplication or slicing. */
export function normalizeLearningRecords(records = []) {
  const output = [];
  const visit = (value, context = {}) => {
    if (Array.isArray(value)) { for (const entry of value) visit(entry, context); return; }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value.events)) { visit(value.events, { stageId: value.stageId ?? value.stage ?? context.stageId, role: value.role ?? context.role, segment: value.segment ?? context.segment, runId: value.runId ?? value.id ?? context.runId }); return; }
    if (!RECORD_TYPES.has(value.type)) return;
    if (value.type === 'round-end' && !['caught', 'captured'].includes(value.status)) return;
    const visible = value.onScreen === true || value.visible === true || value.observed === true || value.visibility === 'on-screen' ? true : value.onScreen === false || value.visible === false || value.observed === false || value.visibility === 'off-screen' ? false : null;
    output.push({ ...value, stageId: value.stageId ?? value.stage ?? context.stageId ?? null, role: value.role ?? context.role ?? null, segment: value.segment ?? context.segment ?? null, runId: value.runId ?? context.runId ?? null, visibilityVerified: visible });
  };
  visit(records);
  return output;
}

export function describeLearningRecord(event) {
  const time = Number.isFinite(event.time) ? `${event.time.toFixed(1)}초` : '시각 미기록';
  const segment = Number(event.stageId) === 6 && (event.segment === 0 || event.segment === 1) ? ` ${event.segment === 0 ? '개구리 전반' : '메뚜기 후반'}` : '';
  const stage = event.stageId !== null && event.stageId !== undefined ? `${event.stageId}단계${segment} · ` : '';
  const visible = event.visibilityVerified === true ? '화면 노출 기록 있음' : event.visibilityVerified === false ? '화면 밖 기록' : '화면 노출 여부 미기록';
  let action;
  if (['ate', 'ai-ate'].includes(event.type)) action = `섭식 기록: ${species(event.food)} → ${species(event.eater)}`;
  else if (event.type === 'feeding-observed') action = `먹이 행동 기록: ${species(event.food)} → ${species(event.eater)} (섭식 완료와 구분)`;
  else if (['predator-warning', 'attack-warning'].includes(event.type)) action = '공격 예고 기록 (섭식 기록 아님)';
  else if (['predator-attack', 'attack'].includes(event.type)) action = '공격 시작 기록 (포획·섭식 여부는 별도)';
  else if (event.type === 'tongue-contact') action = '혀 접촉 기록 (섭식 완료 전)';
  else if (event.type === 'catch-cancelled') action = '포획 취소 기록 (섭식 완료 아님)';
  else if (event.type === 'escape-used') action = '위기 탈출 사용 기록 (게임 규칙)';
  else action = '포획 기록 (게임 판정이며 실제 자연 관찰 아님)';
  return `${stage}${time} · ${action} · ${visible}`;
}

let panelNumber = 0;
/** Render inside a teacher dialog opened by the host, never inside the play loop. */
export function renderLearningPanel(container, { records = [], activityState = {}, onSave = null } = {}) {
  if (!container?.ownerDocument) throw new TypeError('Teacher panel needs a DOM container');
  const document = container.ownerDocument;
  const prefix = `learning-${++panelNumber}`;
  let state = createActivityState(activityState);
  let active = 'topics';
  let destroyed = false;
  let sequence = 0;
  const root = document.createElement('section');
  root.className = 'learning-panel';
  root.setAttribute('aria-label', '교사용 선택 생태 활동실');
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const control = element => { element.style.minHeight = '44px'; element.style.minWidth = '44px'; return element; };
  const button = (text, handler) => {
    const element = control(node('button', text, 'learning-button'));
    element.type = 'button'; element.addEventListener('click', handler); return element;
  };
  const announce = message => { if (saveStatus.textContent !== message) saveStatus.textContent = message; };
  const change = event => {
    if (destroyed) return;
    state = updateActivityState(state, event);
    try {
      if (typeof onSave !== 'function') { announce('현재 화면에 기록했어요. 화면을 닫기 전 호스트의 기기 저장 설정을 확인하세요.'); return; }
      const result = onSave(clone(state));
      if (result === false) announce('기기 저장에 실패했어요. 현재 화면의 입력은 남아 있어요.');
      else if (result && typeof result.then === 'function') result.then(ok => announce(ok === false ? '기기 저장에 실패했어요. 현재 화면의 입력은 남아 있어요.' : '이 기기에 수업 기록을 저장했어요.'), () => announce('기기 저장에 실패했어요. 현재 화면의 입력은 남아 있어요.'));
      else announce('이 기기에 수업 기록을 저장했어요.');
    } catch { announce('기기 저장에 실패했어요. 현재 화면의 입력은 남아 있어요.'); }
  };
  const paragraph = (parent, text, className = '') => parent.append(node('p', text, className));
  const list = (parent, values, className) => { const ul = node('ul', undefined, className); for (const text of values) ul.append(node('li', text)); parent.append(ul); };
  const links = (parent, sources) => {
    const row = node('div', undefined, 'learning-sources');
    for (const reference of sources) {
      const citation = node('span', `${reference.publisher} · ${reference.label}`, 'learning-source');
      citation.title = reference.title;
      row.append(citation);
    }
    parent.append(row);
  };
  const field = (parent, label, value, onInput, { type = 'textarea', placeholder = '', readOnly = false } = {}) => {
    const wrapper = node('div', undefined, 'learning-field');
    const id = `${prefix}-field-${++sequence}`;
    const caption = node('label', label); caption.htmlFor = id; caption.style.display = 'block';
    const input = control(node(type === 'textarea' ? 'textarea' : 'input'));
    input.id = id; input.value = value; input.readOnly = readOnly; input.autocomplete = 'off';
    if (type === 'textarea') { input.rows = 3; input.style.width = '100%'; input.style.boxSizing = 'border-box'; }
    else input.type = type;
    if (placeholder) input.placeholder = placeholder;
    if (onInput) input.addEventListener('input', () => onInput(input.value));
    wrapper.append(caption, input); parent.append(wrapper); return input;
  };
  root.append(node('p', '교사용 선택 활동 · 답하지 않아도 모든 게임을 바로 할 수 있어요', 'learning-optional'));
  paragraph(root, '이름 없이 기록하세요. 내용은 이 기기에만 저장하며 게임 점수·완료와 별개입니다.');
  const navigation = node('nav', undefined, 'learning-nav'); navigation.setAttribute('aria-label', '생태 활동 메뉴');
  const content = node('div', undefined, 'learning-content');
  const saveStatus = node('p', '', 'learning-save-status'); saveStatus.setAttribute('role', 'status'); saveStatus.setAttribute('aria-live', 'polite');
  const tabs = [['topics', '단원 활동'], ['transfer', '선택 질문 A–F'], ['records', '게임 기록'], ['glossary', '용어'], ['teacher', '교사 안내']];
  const tabButtons = tabs.map(([id, title]) => {
    const element = button(title, () => { active = id; renderContent(); });
    element.setAttribute('aria-pressed', String(id === active)); navigation.append(element); return element;
  });
  root.append(navigation, content, saveStatus); container.replaceChildren(root);

  function renderConservation(parent) {
    parent.append(node('h4', '실천 계획'));
    for (const [key, label] of [['action', '실천할 일'], ['period', '계획한 기간'], ['role', '맡을 일 (사람 이름 없이)'], ['verification', '확인 방법'], ['sharing', '공유할 내용·안전한 교실 공유 방법']]) field(parent, label, state.conservation.plan[key], text => change({ type: 'plan', key, text }));
    parent.append(node('h4', '실제로 한 일'));
    paragraph(parent, '계획과 별도입니다. 실제로 한 날짜와 행동을 직접 남기며 자동 완료 도장은 없습니다.');
    const actionList = node('ol', undefined, 'learning-action-history');
    const refreshActions = () => {
      actionList.replaceChildren();
      for (const action of state.conservation.actions) actionList.append(node('li', `${action.date} · ${action.action}${action.reflection ? ` · 느낀 점: ${action.reflection}` : ''}`));
      if (!state.conservation.actions.length) actionList.append(node('li', '아직 실제 실천 기록이 없습니다.'));
    };
    refreshActions(); parent.append(actionList);
    const date = field(parent, '실제로 한 날짜', state.conservation.actionDraft.date, text => change({ type: 'action-draft', key: 'date', text }), { type: 'date' });
    const action = field(parent, '실제로 한 행동', state.conservation.actionDraft.action, text => change({ type: 'action-draft', key: 'action', text }));
    const reflection = field(parent, '실천 후 느낀 점', state.conservation.actionDraft.reflection, text => change({ type: 'action-draft', key: 'reflection', text }));
    parent.append(button('실제 실천 기록 남기기', () => {
      const draft = state.conservation.actionDraft;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !draft.action.trim()) { announce('실제로 한 날짜와 행동을 적어 주세요. 계획은 위에 따로 남길 수 있어요.'); return; }
      change({ type: 'save-action' }); date.value = ''; action.value = ''; reflection.value = ''; refreshActions();
    }));
  }

  function renderTopics() {
    content.append(node('h3', '필요한 주제만 골라 열어 보세요'));
    paragraph(content, '교과서 38–61쪽·실험관찰 20–35쪽의 인쇄 쪽수 기준입니다. 야외 활동은 교사와 학교의 안전 안내를 따라요.');
    for (const topic of LEARNING_TOPICS) {
      const card = node('details', undefined, 'learning-card');
      const summary = control(node('summary', topic.title)); card.append(summary);
      paragraph(card, topic.intro); list(card, topic.prompts); paragraph(card, topic.caution, 'learning-caution'); links(card, topic.sources);
      for (const [key, label] of topic.fields) field(card, label, state.topicNotes[topic.id][key], text => change({ type: 'topic-note', id: topic.id, key, text }), { placeholder: '선택 기록 · 학생 이름이나 개인 정보는 적지 않아요' });
      if (topic.id === 'conservation-action') renderConservation(card);
      content.append(card);
    }
  }

  function renderTransfer() {
    content.append(node('h3', '다른 자료에도 설명해 보는 선택 질문'));
    paragraph(content, '학습 확인용 선택 자료입니다. 답변·정답·통과 여부로 게임을 잠그지 않습니다. 말이나 그림으로 답하고 요지만 적어도 됩니다. 도움말은 답을 적지 않고도 바로 열 수 있어요.');
    for (const item of TRANSFER_ITEMS) {
      const card = node('details', undefined, 'learning-card learning-transfer');
      card.dataset.item = item.id;
      card.append(control(node('summary', `${item.id}. ${item.title}`)));
      paragraph(card, item.material, 'learning-material'); paragraph(card, item.prompt); links(card, item.sources);
      const responseArea = node('div', undefined, 'learning-response'); responseArea.tabIndex = -1; responseArea.setAttribute('aria-label', `${item.id} 선택 질문 응답과 도움말`); card.append(responseArea);
      const refresh = () => {
        responseArea.replaceChildren(); const response = state.responses[item.id];
        if (response.firstIndependent) {
          responseArea.append(node('h4', '도움말 전 첫 독립 응답 (보존)'));
          paragraph(responseArea, response.firstIndependent.text, 'learning-preserved'); responseArea.lastElementChild && (responseArea.lastElementChild.style.whiteSpace = 'pre-wrap');
        } else if (response.guideRevealed) paragraph(responseArea, '도움말을 보기 전 독립 응답은 남기지 않았습니다. 이후 기록은 도움말을 본 뒤의 응답입니다.', 'learning-caution');
        else {
          field(responseArea, `${item.id} · 도움말 전 내 첫 생각`, response.initialDraft, text => change({ type: 'initial-draft', id: item.id, text }));
          responseArea.append(button('첫 생각 남기기', () => { change({ type: 'save-first', id: item.id }); refresh(); responseArea.focus({ preventScroll: true }); }));
        }
        if (!response.guideRevealed) {
          paragraph(responseArea, '도움말을 열면 지금까지 쓴 첫 생각을 그대로 보존합니다. 빈칸으로 열어도 괜찮아요.');
          responseArea.append(button('교사용 근거 도움말 보기', () => { change({ type: 'reveal-guide', id: item.id }); refresh(); responseArea.focus({ preventScroll: true }); }));
        } else {
          responseArea.append(node('h4', '교사용 근거 도움말 · 자동 채점 없음')); list(responseArea, item.guide, 'learning-guide');
          if (response.revisions.length) {
            responseArea.append(node('h4', '도움말을 본 뒤의 수정 기록'));
            list(responseArea, response.revisions.map((revision, index) => `${index + 1}. ${revision.text}`), 'learning-revisions');
          }
          field(responseArea, `${item.id} · 도움말을 본 뒤 보태거나 고친 생각`, response.revisionDraft, text => change({ type: 'revision-draft', id: item.id, text }));
          responseArea.append(button('수정한 생각 남기기', () => { change({ type: 'save-revision', id: item.id }); refresh(); responseArea.focus({ preventScroll: true }); }));
        }
      };
      refresh(); content.append(card);
    }
  }

  function renderRecords() {
    content.append(node('h3', '게임 모형에서 실제 기록된 사건'));
    paragraph(content, MODEL_LIMITATION, 'learning-caution');
    paragraph(content, '섭식·접촉·포획·공격 예고를 따로 읽습니다. “화면 노출 기록 있음”도 학생이 그 장면을 실제로 보았다는 확인은 아닙니다. 화면 정보가 없으면 보았다고 주장하지 않습니다.');
    const events = normalizeLearningRecords(records);
    if (!events.length) paragraph(content, '아직 제공된 섭식·포획·공격 기록이 없습니다. 플레이하지 않아도 다른 모든 활동을 이용할 수 있어요.');
    else { paragraph(content, `전달받은 관련 사건 ${events.length}개를 모두 표시합니다. 서로 같은 내용도 별개 사건이면 남깁니다.`); list(content, events.map(describeLearningRecord), 'learning-records'); }
    paragraph(content, '교재에서 확인한 관계와 내가 예측한 설명은 단원 활동의 별도 칸에 남기세요. 교과서 49쪽 관계는 실제로 발생하지 않은 게임 사건을 대신하지 않습니다.');
  }

  function renderGlossary() {
    content.append(node('h3', '과학 용어와 게임 모형의 경계'));
    paragraph(content, MODEL_LIMITATION, 'learning-caution');
    const dictionary = node('dl', undefined, 'learning-glossary');
    for (const entry of GLOSSARY) { dictionary.append(node('dt', entry.term)); const detail = node('dd', entry.definition); links(detail, entry.sources); dictionary.append(detail); }
    content.append(dictionary);
    paragraph(content, '물질의 재이용은 에너지가 끝없이 되돌아오는 과정과 다릅니다. 뱀이 시각으로만 먹이를 찾는다거나 개구리가 물을 싫어한다고 이 게임에서 결론내리지 않습니다.');
  }

  function renderTeacher() {
    content.append(node('h3', '수업에서 선택해서 사용하기')); list(content, CURRICULUM.teachingNotes);
    content.append(node('h4', CURRICULUM.title));
    for (const row of CURRICULUM.coverage) { const line = node('div', undefined, 'learning-coverage'); paragraph(line, row.title); links(line, row.sources); content.append(line); }
    paragraph(content, '수업 효과를 살필 때는 이름 대신 익명 집계로 대상·인원·사전 지식·도움 설정·수업 시간·사용 문항·판단 방법·결과를 따로 기록하세요. 사용성 관찰만으로 게임이 학습 향상의 원인이라고 단정하지 않습니다.');
  }

  function renderContent() {
    content.replaceChildren();
    tabButtons.forEach((element, index) => element.setAttribute('aria-pressed', String(tabs[index][0] === active)));
    if (active === 'topics') renderTopics();
    else if (active === 'transfer') renderTransfer();
    else if (active === 'records') renderRecords();
    else if (active === 'glossary') renderGlossary();
    else renderTeacher();
  }
  renderContent();
  return { getState: () => clone(state), destroy() { destroyed = true; if (root.parentNode === container) root.remove(); } };
}
