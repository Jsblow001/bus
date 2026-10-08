const express = require('express');
const cors = require('cors');
const oracledb = require('oracledb');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 오라클 DB 접속 설정
const dbConfig = {
  user: process.env.DB_USER || 'bus_user',
  password: process.env.DB_PASSWORD || 'qwer1234$',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/xepdb1',
};

// [API 1] 운행 시간표 조회
app.get('/api/schedules', async (req, res) => {
  const { departure, arrival, date } = req.query;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `
      SELECT SCHEDULE_ID, 
             TO_CHAR(DEPARTURE_TIME, 'HH24:MI') AS DEPARTURE_TIME, 
             BUS_GRADE, 
             PRICE, 
             TOTAL_SEATS
      FROM SCHEDULES
      WHERE DEPARTURE_STATION = :departure
        AND ARRIVAL_STATION = :arrival
        AND TRUNC(DEPARTURE_TIME) = TO_DATE(:searchDate, 'YYYY-MM-DD')
      ORDER BY DEPARTURE_TIME ASC
    `;

    const result = await connection.execute(
      sql,
      { departure, arrival, searchDate: date },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json(result.rows);
  } catch (err) {
    console.error('시간표 조회 오류:', err);
    res.status(500).json({ error: 'DB 시간표 조회 실패' });
  } finally {
    if (connection) await connection.close();
  }
});

// [API 2] 특정 회차(scheduleId)의 이미 예약된 좌석 목록 조회
app.get('/api/reservations/seats', async (req, res) => {
  const { scheduleId } = req.query;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `
      SELECT SEAT_NUMBER 
      FROM RESERVATIONS 
      WHERE SCHEDULE_ID = :scheduleId 
        AND PAYMENT_STATUS = 'PAID'
    `;

    const result = await connection.execute(sql, { scheduleId });
    const occupiedSeats = result.rows.map((row) => row[0]);

    res.json({ occupiedSeats });
  } catch (err) {
    console.error('예약 좌석 조회 오류:', err);
    res.status(500).json({ error: 'DB 좌석 데이터 조회 실패' });
  } finally {
    if (connection) await connection.close();
  }
});

// [API 3] 예매 요청 및 중복 방지 (트랜잭션)
app.post('/api/book', async (req, res) => {
  const { userId, scheduleId, seatNumbers } = req.body;

  if (!userId || !scheduleId || !seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    return res.status(400).json({ error: '올바른 예매 정보를 입력해 주세요.' });
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // 1. 중복 좌석 체크
    const checkSql = `
      SELECT SEAT_NUMBER 
      FROM RESERVATIONS 
      WHERE SCHEDULE_ID = :scheduleId 
        AND PAYMENT_STATUS = 'PAID'
        AND SEAT_NUMBER IN (${seatNumbers.map((_, i) => `:seat${i}`).join(',')})
    `;

    const bindParams = { scheduleId };
    seatNumbers.forEach((seat, idx) => {
      bindParams[`seat${idx}`] = seat;
    });

    const checkResult = await connection.execute(checkSql, bindParams, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    if (checkResult.rows.length > 0) {
      const takenSeats = checkResult.rows.map((row) => row.SEAT_NUMBER).join(', ');
      return res.status(409).json({
        error: `선택하신 좌석 중 이미 예매 완료된 좌석(${takenSeats}번)이 포함되어 있습니다.`,
      });
    }

    // 2. 예매 데이터 INSERT (IDENTITY 자동증가 사용)
    const insertSql = `
      INSERT INTO RESERVATIONS (USER_ID, SCHEDULE_ID, SEAT_NUMBER, PAYMENT_STATUS, RESERVED_AT)
      VALUES (:userId, :scheduleId, :seatNum, 'PAID', SYSDATE)
    `;

    for (const seatNum of seatNumbers) {
      await connection.execute(insertSql, {
        userId,
        scheduleId,
        seatNum,
      });
    }

    await connection.commit();
    console.log(`[예매 성공] SCHEDULE_ID: ${scheduleId}, SEATS: ${seatNumbers.join(', ')}`);

    return res.json({ success: true, message: '예매가 성공적으로 완료되었습니다.' });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('롤백 오류:', rbErr);
      }
    }

    // UNIQUE 제약조건 위반(UK_SCHEDULE_SEAT) 예외 처리
    if (err.code === 'ORA-00001') {
      return res.status(409).json({ error: '이미 다른 사용자가 선점한 좌석입니다.' });
    }

    console.error('예매 처리 오류:', err);
    return res.status(500).json({ error: '예매 처리 중 DB 오류가 발생했습니다.' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('DB 연결 해제 실패:', closeErr);
      }
    }
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`백엔드 서버가 ${process.env.PORT || 5000}번 포트에서 실행 중입니다.`);
});