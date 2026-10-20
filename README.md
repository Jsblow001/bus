# 🚌 풀스택 버스 예매 시스템 (Bus Booking App)

Oracle DB, Node.js Express, React를 기반으로 구축된 버스 예매 애플리케이션입니다.  
다중 사용자 환경을 고려한 **동시성 처리(트랜잭션 및 유니크 제약조건)**와 **실시간 중복 로그인 방지(세션 Polling)** 기능을 갖추고 있습니다.

---

## 📌 주요 기능 (Key Features)

### 1. 🚌 버스 운행 시간표 조회 & 노선 선택
- 출발지, 도착지, 탑승 날짜(한국 시간대 KST 기준)를 기반으로 운행 시간표 동적 조회
- 출발지와 도착지 동일 선택 방지 및 과거 날짜 선택 제한(`min` 속성 연동)

### 2. 🪑 실시간 좌석 선택 (Seat Picker)
- 회차별 이미 예매 완료된 좌석 정보(`PAID` 상태) 동적 조회 및 선택 불가 처리
- 실시간 좌석 토글 선택 기능 및 선택 매수·최종 결제 금액 자동 계산

### 3. 💳 안전한 결제 처리 및 동시성 중복 예매 방지
- **원자적 트랜잭션(Transaction) 처리:** 좌석 선점 검증 후 예매 정보 `INSERT` 및 `COMMIT/ROLLBACK` 수행
- **동시성 방지:** Oracle DB의 `UNIQUE` 제약조건(`UK_SCHEDULE_SEAT`)을 통해 동일 좌석에 대한 동시 승인 시 한쪽 요청 차단 후 안전한 예외 처리

### 4. 👤 간편 로그인 및 실시간 중복 로그인 감지 (Session Tracker)
- **간편 사용자 전환 UI:** 로그인 상태가 아닐 경우 좌석 선택 단계 진입 차단 및 사용자 선택 유도
- **단일 세션 보장 (Single Session Token):** 다른 기기/브라우저에서 동일 계정으로 로그인 시 DB의 `CURRENT_TOKEN`을 갱신
- **실시간 강제 로그아웃 (Polling):** 프론트엔드에서 주기적으로 세션을 검증하여 기존 접속 중인 브라우저를 자동으로 세션 만료 및 로그아웃 처리

---

## 🛠 기술 스택 (Tech Stack)

### Frontend
- **Framework:** React.js (Create React App)
- **HTTP Client:** Fetch API
- **Styling:** Inline CSS / Styled Components

### Backend
- **Runtime:** Node.js (Express.js)
- **Database Driver:** `node-oracledb`
- **Utilities:** `dotenv`, `cors`, `uuid`

### Database
- **DBMS:** Oracle Database (XE Express Edition)
- **Tables:** `USERS`, `SCHEDULES`, `RESERVATIONS`
- **Key Concepts:** Identity Column, Foreign Keys, Unique Constraint, Session Token Column (`CURRENT_TOKEN`)

---

## 📁 프로젝트 구조 (Project Structure)

```text
bus/
├── package.json               # root scripts (concurrently 실행 환경 설정)
├── .gitignore                 # node_modules, .env 등 무시 설정
├── README.md                  # 프로젝트 설명 문서
├── bus-backend/               # Node.js Express 백엔드
│   ├── server.js              # RESTful API 및 Oracle DB 연동
│   ├── .env                   # DB 접속 정보 및 서버 포트 설정
│   └── package.json
└── bus-frontend/              # React 프론트엔드
    ├── src/
    │   ├── BusBookingApp.jsx  # 메인 스텝별 예매 및 세션 제어 컴포넌트
    │   ├── SeatPicker.jsx     # 좌석 그리드 UI 컴포넌트
    │   └── App.js
    ├── .env                   # REACT_APP_API_URL 백엔드 주소 설정
    └── package.json
```

## 🚀 시작하기 (Getting Started)

### 1. Prerequisites (선택 사항)

Node.js (v16 이상 권장)
Oracle Database 19c / 21c XE

### 2. Database (Oracle DB)

```text
1. 회원 정보 테이블 (USERS)
CREATE TABLE USERS (
    USER_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- 회원 고유 번호 (PK, 자동증가)
    NAME VARCHAR2(50) NOT NULL,                              -- 회원 이름
    EMAIL VARCHAR2(100) NOT NULL UNIQUE,                     -- 이메일 주소 (중복 불가)
    PHONE VARCHAR2(20) NOT NULL,                             -- 전화번호
    CREATED_AT DATE DEFAULT SYSDATE NOT NULL                 -- 가입 일시
    CURRENT_TOKEN VARCHAR2(250);                             -- 회원 로그인 토큰
);

2. 노선/운행 일정 테이블 (SCHEDULES)
CREATE TABLE SCHEDULES (
    SCHEDULE_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- 운행 회차 ID (PK, 자동증가)
    DEPARTURE_STATION VARCHAR2(50) NOT NULL,                     -- 출발지 터미널명
    ARRIVAL_STATION VARCHAR2(50) NOT NULL,                       -- 도착지 터미널명
    DEPARTURE_TIME DATE NOT NULL,                                -- 출발 일시
    ARRIVAL_TIME DATE NOT NULL,                                  -- 도착 일시
    BUS_GRADE VARCHAR2(20) CHECK (BUS_GRADE IN ('일반', '우등', '프리미엄')), -- 버스 등급
    PRICE NUMBER(10, 0) NOT NULL,                                -- 탑승 요금
    TOTAL_SEATS NUMBER DEFAULT 28 NOT NULL                      -- 전체 좌석 수
);

3. 예약 정보 테이블 (RESERVATIONS)
CREATE TABLE RESERVATIONS (
    RESERVATION_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- 예약 번호 (PK, 자동증가)
    USER_ID NUMBER NOT NULL,                                        -- 회원 ID (FK)
    SCHEDULE_ID NUMBER NOT NULL,                                    -- 운행 회차 ID (FK)
    SEAT_NUMBER NUMBER NOT NULL,                                    -- 좌석 번호
    PAYMENT_STATUS VARCHAR2(20) DEFAULT 'PAID' CHECK (PAYMENT_STATUS IN ('PENDING', 'PAID', 'CANCELLED')), -- 결제 상태
    RESERVED_AT DATE DEFAULT SYSDATE NOT NULL,                      -- 예약 일시
    
    CONSTRAINT FK_RES_USER FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID), -- USERS 외래키 연결
    CONSTRAINT FK_RES_SCHEDULE FOREIGN KEY (SCHEDULE_ID) REFERENCES SCHEDULES(SCHEDULE_ID), -- SCHEDULES 외래키 연결
    CONSTRAINT UK_SCHEDULE_SEAT UNIQUE (SCHEDULE_ID, SEAT_NUMBER) -- 회차별 좌석 중복 예약 방지 (유니크)
);
```

### 3. 환경 변수 설정 (.env)

```text
- bus-backend/.env
PORT=5000
DB_USER=bus_user
DB_PASSWORD=your_password
DB_CONNECT_STRING=localhost:1521/xepdb1

- bus-frontend/.env
REACT_APP_API_URL=http://localhost:5000
```

### 4. 의존성 패키지 설치 및 실행

1. 백엔드 서버 실행:
```text
cd bus-backend
npm start
```
2. 프론트엔드 개발 서버 실행:
```text
cd bus-frontend
npm start
```