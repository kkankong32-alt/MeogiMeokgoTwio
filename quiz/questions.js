window.QUIZ_CONFIG = {
  title: '연못 탐험 입장 퀴즈', passCount: 7,
  gameUrl: 'https://kkankong32-alt.github.io/MeogiMeokgoTwio/',
  onlineGameUrl: 'https://kkankong32-alt.github.io/MeogiMeokgoTwio/',
  version: '1.0.1', essayMode: 'auto'
};
window.QUIZ_QUESTIONS = [
 {id:1,type:'ox',topic:'생태계 구성 요소',question:'생태계는 동물과 식물처럼 살아 있는 것만으로 이루어져 있어요.',options:['O','X'],answer:'X',explanation:'생태계에는 생물 요소와 비생물 요소가 함께 있어요. 생물은 물, 공기, 햇빛, 흙 등과 서로 영향을 주고받아요.',image:'assets/pond-observation.jpg',alt:'풀, 메뚜기, 개구리, 버섯과 물, 햇빛, 돌이 함께 있는 연못 주변'},
 {id:2,type:'choice',topic:'생물 요소와 비생물 요소',question:'다음 중 비생물 요소는 무엇일까요?',options:['개구리','풀','물','버섯'],answer:'물',explanation:'물은 살아 있지 않은 비생물 요소예요. 개구리, 풀, 버섯은 살아 있는 생물 요소예요.',image:'assets/pond-observation.jpg',alt:'풀, 메뚜기, 개구리, 버섯과 물, 햇빛, 돌이 함께 있는 연못 주변'},
 {id:3,type:'short',topic:'생산자',question:'식물처럼 햇빛 등을 이용해 스스로 양분을 만드는 생물을 무엇이라고 하나요?',answer:'생산자',accepted:['생산자','생산자입니다','생산자예요','생산자에요'],hint:'세 글자로 써요.',explanation:'생산자는 햇빛 등을 이용해 스스로 양분을 만들어요. 풀과 나무 같은 식물이 생산자에 속해요.'},
 {id:4,type:'choice',topic:'분해자',question:'버섯이나 곰팡이 같은 분해자의 역할로 알맞은 것은 무엇일까요?',options:['햇빛만 받아 스스로 양분을 만들어요.','죽은 생물체나 배출물을 분해해 양분을 얻어요.','다른 동물을 사냥하는 일만 해요.','생태계에서 아무 역할도 하지 않아요.'],answer:'죽은 생물체나 배출물을 분해해 양분을 얻어요.',explanation:'분해자는 주로 죽은 생물체나 배출물을 분해해 양분을 얻어요. 그 과정에서 다른 생물이 양분을 이용할 수 있게 해요.'},
 {id:5,type:'ox',topic:'먹이 관계의 화살표',question:'개구리가 메뚜기를 먹는 관계는 ‘개구리 → 메뚜기’로 나타내요.',options:['O','X'],answer:'X',explanation:'화살표는 먹히는 생물에서 먹는 생물로 향해요. 따라서 메뚜기 → 개구리가 바른 방향이에요.'},
 {id:6,type:'short',topic:'소비자',question:'다른 생물을 먹이로 하여 살아가는 생물을 무엇이라고 하나요?',answer:'소비자',accepted:['소비자','소비자입니다','소비자예요','소비자에요'],hint:'세 글자로 써요.',explanation:'소비자는 다른 생물을 먹이로 하여 살아가요. 풀을 먹는 메뚜기도, 메뚜기를 먹는 개구리도 소비자예요.'},
 {id:7,type:'order',topic:'먹이사슬',question:'메뚜기는 풀을 먹고, 개구리는 메뚜기를 먹어요. 생산자부터 먹이사슬을 완성해 보세요.',items:['개구리','풀','메뚜기'],answer:['풀','메뚜기','개구리'],hint:'아래 낱말을 순서대로 눌러요. 고른 낱말을 다시 누르면 뺄 수 있어요.',explanation:'풀 → 메뚜기 → 개구리 순서예요. 스스로 양분을 만드는 생산자인 풀에서 시작해, 먹히는 쪽에서 먹는 쪽으로 연결해요.'},
 {id:8,type:'initial',topic:'먹이그물',question:'여러 먹이사슬이 그물처럼 복잡하게 얽힌 관계를 무엇이라고 하나요?',initial:'ㅁ ㅇ ㄱ ㅁ',answer:'먹이그물',accepted:['먹이그물','먹이그물입니다','먹이그물이에요'],hint:'초성을 보고 네 글자로 써요.',explanation:'여러 먹이사슬이 얽힌 관계를 먹이그물이라고 해요. 자연의 먹이 관계는 한 줄로만 이어지지 않아요.'},
 {id:9,type:'choice',topic:'생태계 보전',question:'연못과 주변 생물을 보호하는 행동으로 가장 알맞은 것은 무엇일까요?',options:['관찰한 생물을 모두 집으로 가져가요.','남은 음료를 연못에 부어요.','쓰레기를 되가져오고 생물의 사는 곳을 훼손하지 않아요.','생물이 잘 보이게 주변 풀을 모두 뽑아요.'],answer:'쓰레기를 되가져오고 생물의 사는 곳을 훼손하지 않아요.',explanation:'쓰레기와 오염을 줄이고 생물의 서식지를 지키는 행동이 생태계 보전에 도움이 돼요.'},
 {id:10,type:'essay',topic:'먹이그물과 안정성',question:'먹이그물이 복잡하면, 어떤 먹이가 줄어들었을 때 생물이 살아가는 데 왜 도움이 될까요?',answer:'어떤 먹이가 줄어들어도 다른 먹이를 먹고 살아갈 수 있기 때문이에요.',hint:'먹이가 줄었을 때 다른 먹이를 어떻게 이용하는지 한 문장으로 써요.',rubric:['먹이가 줄거나 사라지는 상황을 설명했어요.','다른 먹이를 먹을 수 있다는 이유를 설명했어요.'],explanation:'먹이 관계가 여러 갈래이면 어떤 먹이가 줄어도 다른 먹이를 이용할 수 있어요. 그래서 환경 변화의 영향을 줄이고 생태계를 안정적으로 유지하는 데 도움이 돼요. 모든 생물이 반드시 살아남는다는 뜻은 아니에요.'}
];
if(typeof module !== 'undefined') module.exports = {questions:window.QUIZ_QUESTIONS,config:window.QUIZ_CONFIG};
