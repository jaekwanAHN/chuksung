-- CS 퀴즈 샘플 문항 (카테고리별 5개)

-- frontend
INSERT INTO public.quiz_questions (category_id, question, difficulty, tags, "order") VALUES
  ('frontend', '브라우저 렌더링 파이프라인(Critical Rendering Path)의 주요 단계를 설명해 주세요.', 'intermediate', ARRAY['브라우저', '렌더링', 'DOM'], 1),
  ('frontend', '이벤트 버블링(Event Bubbling)과 이벤트 캡처링(Event Capturing)의 차이를 설명해 주세요.', 'beginner', ARRAY['이벤트', 'DOM'], 2),
  ('frontend', '클로저(Closure)란 무엇이며, 실무에서 어떻게 활용되나요?', 'intermediate', ARRAY['JavaScript', '함수'], 3),
  ('frontend', 'Virtual DOM이란 무엇이며, 실제 DOM과 비교했을 때 어떤 이점이 있나요?', 'beginner', ARRAY['React', 'DOM', '성능'], 4),
  ('frontend', 'CSS에서 BFC(Block Formatting Context)란 무엇이며, 어떤 상황에서 생성되나요?', 'advanced', ARRAY['CSS', '레이아웃'], 5);

-- network
INSERT INTO public.quiz_questions (category_id, question, difficulty, tags, "order") VALUES
  ('network', 'HTTP/1.1과 HTTP/2의 주요 차이점을 설명해 주세요.', 'intermediate', ARRAY['HTTP', '프로토콜'], 1),
  ('network', 'TCP 3-way handshake 과정을 설명해 주세요.', 'beginner', ARRAY['TCP', '연결'], 2),
  ('network', 'DNS 조회 과정을 순서대로 설명해 주세요.', 'intermediate', ARRAY['DNS', '도메인'], 3),
  ('network', 'CORS(Cross-Origin Resource Sharing)란 무엇이며, 브라우저에서 어떻게 처리되나요?', 'intermediate', ARRAY['CORS', '보안', '브라우저'], 4),
  ('network', 'REST API와 GraphQL의 주요 차이점을 설명해 주세요.', 'beginner', ARRAY['REST', 'GraphQL', 'API'], 5);

-- data-structure
INSERT INTO public.quiz_questions (category_id, question, difficulty, tags, "order") VALUES
  ('data-structure', '해시 테이블에서 충돌(Collision)이 발생하는 이유와 해결 방법을 설명해 주세요.', 'intermediate', ARRAY['해시', '충돌'], 1),
  ('data-structure', '스택(Stack)과 큐(Queue)의 차이점과 각각의 사용 사례를 설명해 주세요.', 'beginner', ARRAY['스택', '큐'], 2),
  ('data-structure', '이진 탐색 트리(BST)의 특성과 탐색 시간 복잡도를 설명해 주세요.', 'intermediate', ARRAY['트리', 'BST', '시간복잡도'], 3),
  ('data-structure', '배열(Array)과 연결 리스트(Linked List)의 시간 복잡도를 비교해 주세요.', 'beginner', ARRAY['배열', '연결리스트', '시간복잡도'], 4),
  ('data-structure', '힙(Heap) 자료구조란 무엇이며, 우선순위 큐와의 관계를 설명해 주세요.', 'intermediate', ARRAY['힙', '우선순위큐'], 5);

-- os
INSERT INTO public.quiz_questions (category_id, question, difficulty, tags, "order") VALUES
  ('os', '프로세스(Process)와 스레드(Thread)의 차이점을 설명해 주세요.', 'beginner', ARRAY['프로세스', '스레드'], 1),
  ('os', '교착상태(Deadlock)의 발생 조건 4가지를 설명해 주세요.', 'intermediate', ARRAY['교착상태', '동기화'], 2),
  ('os', '페이지 교체 알고리즘(LRU, FIFO, OPT)의 특징과 차이점을 설명해 주세요.', 'advanced', ARRAY['메모리', '페이징', '알고리즘'], 3),
  ('os', '컨텍스트 스위칭(Context Switching)이란 무엇이며, 오버헤드가 발생하는 이유는 무엇인가요?', 'intermediate', ARRAY['스케줄링', '컨텍스트'], 4),
  ('os', '세마포어(Semaphore)와 뮤텍스(Mutex)의 차이점을 설명해 주세요.', 'intermediate', ARRAY['동기화', '임계구역'], 5);

-- security
INSERT INTO public.quiz_questions (category_id, question, difficulty, tags, "order") VALUES
  ('security', 'XSS(Cross-Site Scripting) 공격이란 무엇이며, 방어 방법을 설명해 주세요.', 'beginner', ARRAY['XSS', '웹보안'], 1),
  ('security', 'CSRF(Cross-Site Request Forgery) 공격 원리와 방어 방법을 설명해 주세요.', 'intermediate', ARRAY['CSRF', '웹보안'], 2),
  ('security', 'SQL Injection이란 무엇이며, 방어 방법을 설명해 주세요.', 'beginner', ARRAY['SQL', '인젝션', 'DB보안'], 3),
  ('security', 'JWT(JSON Web Token)의 구조와 인증 흐름을 설명해 주세요.', 'intermediate', ARRAY['JWT', '인증', '토큰'], 4),
  ('security', 'HTTPS가 HTTP보다 안전한 이유를 TLS 핸드셰이크 과정과 함께 설명해 주세요.', 'intermediate', ARRAY['HTTPS', 'TLS', '암호화'], 5);

-- database
INSERT INTO public.quiz_questions (category_id, question, difficulty, tags, "order") VALUES
  ('database', '트랜잭션의 ACID 속성을 설명해 주세요.', 'beginner', ARRAY['트랜잭션', 'ACID'], 1),
  ('database', '인덱스(Index)란 무엇이며, 쓰기 성능에 미치는 영향은 무엇인가요?', 'intermediate', ARRAY['인덱스', '성능'], 2),
  ('database', '정규화(Normalization)의 목적과 1NF, 2NF, 3NF를 설명해 주세요.', 'intermediate', ARRAY['정규화', '스키마설계'], 3),
  ('database', 'N+1 쿼리 문제란 무엇이며, 어떻게 해결할 수 있나요?', 'intermediate', ARRAY['ORM', '쿼리최적화'], 4),
  ('database', '관계형 데이터베이스(RDBMS)와 NoSQL의 차이점과 각각의 사용 사례를 설명해 주세요.', 'beginner', ARRAY['RDBMS', 'NoSQL', '설계'], 5);

-- software-design
INSERT INTO public.quiz_questions (category_id, question, difficulty, tags, "order") VALUES
  ('software-design', 'SOLID 원칙이란 무엇인지 각 원칙을 설명해 주세요.', 'intermediate', ARRAY['SOLID', '객체지향'], 1),
  ('software-design', 'MVC, MVP, MVVM 패턴의 차이점을 설명해 주세요.', 'intermediate', ARRAY['아키텍처', '패턴'], 2),
  ('software-design', '의존성 주입(Dependency Injection)이란 무엇이며, 어떤 이점이 있나요?', 'intermediate', ARRAY['DI', '결합도'], 3),
  ('software-design', '단일 책임 원칙(SRP)을 위반하는 예시와 이를 개선하는 방법을 설명해 주세요.', 'beginner', ARRAY['SRP', '리팩터링'], 4),
  ('software-design', '옵저버(Observer) 패턴이란 무엇이며, 언제 사용하나요?', 'intermediate', ARRAY['디자인패턴', '옵저버'], 5);

-- devtools
INSERT INTO public.quiz_questions (category_id, question, difficulty, tags, "order") VALUES
  ('devtools', 'Git의 merge와 rebase의 차이점과 각각의 사용 시나리오를 설명해 주세요.', 'intermediate', ARRAY['Git', '버전관리'], 1),
  ('devtools', 'Docker란 무엇이며, 가상 머신(VM)과 어떻게 다른가요?', 'beginner', ARRAY['Docker', '컨테이너'], 2),
  ('devtools', 'CI/CD 파이프라인이란 무엇이며, 왜 중요한가요?', 'beginner', ARRAY['CI/CD', '자동화'], 3),
  ('devtools', '브라우저 개발자 도구의 Performance 탭에서 확인할 수 있는 정보와 활용 방법을 설명해 주세요.', 'intermediate', ARRAY['DevTools', '성능', '프로파일링'], 4),
  ('devtools', '웹팩(Webpack)의 역할과 주요 개념(번들링, 로더, 플러그인)을 설명해 주세요.', 'intermediate', ARRAY['Webpack', '번들러', '빌드도구'], 5);
