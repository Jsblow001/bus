import React, { useState, useEffect } from 'react';
import SeatPicker from './SeatPicker';

export default function BusBookingApp() {
  const [step, setStep] = useState(0);

  const [search, setSearch] = useState({
    departure: '서울경부',
    arrival: '부산',
    date: '2026-10-10',
  });

  const [schedules, setSchedules] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]); // 선택한 좌석 배열
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // 결제 진행 중 상태

  const terminals = ['서울경부', '동서울', '부산', '대전', '광주', '대구', '강릉', '전주'];

  // STEP 0 -> STEP 1: 시간표 조회
  const handleSearch = async (e) => {
    e.preventDefault();
    if (search.departure === search.arrival) {
      alert('출발지와 도착지는 서로 다르게 선택해 주세요.');
      return;
    }

    try {
      const queryParams = new URLSearchParams(search).toString();
      const response = await fetch(`http://localhost:5000/api/schedules?${queryParams}`);
      if (!response.ok) throw new Error('시간표 조회 실패');

      const data = await response.json();
      setSchedules(data);
      setSelectedBus(null);
      setSelectedSeats([]); // 검색 시 이전 선택 좌석 초기화
      setStep(1);
    } catch (err) {
      console.error(err);
      alert('시간표 데이터를 불러오는 중 오류가 발생했습니다.');
    }
  };

  // STEP 2 진입 시: 해당 버스 회차의 이미 예약된 좌석 목록 조회
  useEffect(() => {
    if (step === 2 && selectedBus) {
      fetch(`http://localhost:5000/api/reservations/seats?scheduleId=${selectedBus.SCHEDULE_ID}`)
        .then((res) => res.json())
        .then((data) => setOccupiedSeats(data.occupiedSeats || []))
        .catch((err) => {
          console.error('예약된 좌석 조회 실패:', err);
          setOccupiedSeats([]);
        });
    }
  }, [step, selectedBus]);

  // 좌석 선택/해제 토글
  const handleToggleSeat = (seatNum) => {
    if (selectedSeats.includes(seatNum)) {
      setSelectedSeats(selectedSeats.filter((num) => num !== seatNum));
    } else {
      setSelectedSeats([...selectedSeats, seatNum]);
    }
  };

  // 버스 회차 선택 핸들러
  const handleSelectBus = (bus) => {
    setSelectedBus(bus);
    setSelectedSeats([]);
  };

  // STEP 2 -> STEP 3: 좌석 선택 완료 후 결제 확인 창으로 이동
  const handleGoToPayment = () => {
    if (selectedSeats.length === 0) return alert('좌석을 1개 이상 선택해 주세요.');
    setStep(3); // 결제 확인 창 단계로 이동
  };

  // STEP 3: 결제 확인 창에서 최종 결제 승인 요청
  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1, // 테스트 회원 ID
          scheduleId: selectedBus.SCHEDULE_ID,
          seatNumbers: selectedSeats,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStep(4); // 예매 완료 화면으로 이동
      } else {
        // 💡 중복 결제 실패 시 경고창 후 STEP 2(좌석 선택)로 이동
        alert(result.error || '선택하신 좌석이 이미 예매 완료되었거나 결제 처리에 실패했습니다.');

        // 예약된 좌석 목록 최신화
        const updatedSeatsRes = await fetch(
          `http://localhost:5000/api/reservations/seats?scheduleId=${selectedBus.SCHEDULE_ID}`
        );
        const updatedSeatsData = await updatedSeatsRes.json();
        setOccupiedSeats(updatedSeatsData.occupiedSeats || []);

        // 선택 좌석 초기화 후 좌석 선택 창으로 되돌림
        setSelectedSeats([]);
        setStep(2);
      }
    } catch (err) {
      console.error('결제 요청 오류:', err);
      alert('서버와 통신 중 에러가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = selectedSeats.length * (selectedBus?.PRICE || 0);

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <h1>🚌 버스 예매 시스템</h1>

      {/* STEP 0: 출발지 / 도착지 / 날짜 선택 */}
      {step === 0 && (
        <form onSubmit={handleSearch} style={cardStyle}>
          <h2>출발지 & 도착지 선택</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>출발지</label>
            <select
              value={search.departure}
              onChange={(e) => setSearch({ ...search, departure: e.target.value })}
              style={selectStyle}
            >
              {terminals.map((term) => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>도착지</label>
            <select
              value={search.arrival}
              onChange={(e) => setSearch({ ...search, arrival: e.target.value })}
              style={selectStyle}
            >
              {terminals.map((term) => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>가는 날</label>
            <input
              type="date"
              value={search.date}
              onChange={(e) => setSearch({ ...search, date: e.target.value })}
              style={selectStyle}
            />
          </div>

          <button type="submit" style={btnStyle}>시간표 조회하기</button>
        </form>
      )}

      {/* STEP 1: 노선 확인 및 시간표 선택 */}
      {step === 1 && (
        <div>
          <button
            onClick={() => {
              setSelectedSeats([]);
              setSelectedBus(null);
              setStep(0);
            }}
            style={backBtnStyle}
          >
            ← 노선 다시 선택
          </button>

          <div style={cardStyle}>
            <h3>선택한 노선 정보</h3>
            <p><strong>출발지:</strong> {search.departure} ➔ <strong>도착지:</strong> {search.arrival}</p>
            <p><strong>날짜:</strong> {search.date}</p>
          </div>

          <h3>운행 시간표 선택</h3>
          {schedules.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#718096', padding: '20px 0' }}>
              해당 조건의 운행 시간표가 존재하지 않습니다.
            </p>
          ) : (
            schedules.map((bus) => (
              <div
                key={bus.SCHEDULE_ID}
                onClick={() => handleSelectBus(bus)}
                style={{
                  ...cardStyle,
                  border: selectedBus?.SCHEDULE_ID === bus.SCHEDULE_ID ? '2px solid #3182ce' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    <strong>{bus.DEPARTURE_TIME}</strong> ({bus.BUS_GRADE})
                  </span>
                  <span>{bus.PRICE.toLocaleString()}원</span>
                </div>
              </div>
            ))
          )}

          <button
            disabled={!selectedBus}
            onClick={() => setStep(2)}
            style={{
              ...btnStyle,
              backgroundColor: selectedBus ? '#3182ce' : '#cbd5e0',
              cursor: selectedBus ? 'pointer' : 'not-allowed',
            }}
          >
            좌석 선택하러 가기
          </button>
        </div>
      )}

      {/* STEP 2: 좌석 선택 */}
      {step === 2 && (
        <div>
          <button
            onClick={() => {
              setSelectedSeats([]);
              setStep(1);
            }}
            style={backBtnStyle}
          >
            ← 시간표 다시 선택
          </button>
          <h3>
            좌석 선택 ({search.departure} ➔ {search.arrival}, {selectedBus?.DEPARTURE_TIME} 출발)
          </h3>

          <SeatPicker
            totalSeats={31}
            occupiedSeats={occupiedSeats}
            selectedSeats={selectedSeats}
            onToggleSeat={handleToggleSeat}
          />

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p>
              선택한 좌석:{' '}
              <strong>
                {selectedSeats.length > 0
                  ? selectedSeats.slice().sort((a, b) => a - b).join(', ') + '번'
                  : '미선택'}
              </strong>
            </p>
            <p>총 예매 매수: <strong>{selectedSeats.length}매</strong></p>
            <p>결제 예정 금액: <strong>{totalAmount.toLocaleString()}원</strong></p>
            <button
              disabled={selectedSeats.length === 0}
              onClick={handleGoToPayment}
              style={{
                ...btnStyle,
                backgroundColor: selectedSeats.length > 0 ? '#3182ce' : '#cbd5e0',
                cursor: selectedSeats.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              결제 정보 확인하기 ➔
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: 결제 정보 확인 및 최종 결제 창 */}
      {step === 3 && (
        <div>
          <button onClick={() => setStep(2)} style={backBtnStyle}>
            ← 좌석 다시 선택
          </button>

          <div style={{ ...cardStyle, border: '2px solid #3182ce' }}>
            <h2>💳 결제 정보 확인</h2>
            <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />

            <div style={infoRowStyle}>
              <span><strong>노선 정보:</strong></span>
              <span>{search.departure} ➔ {search.arrival}</span>
            </div>
            <div style={infoRowStyle}>
              <span><strong>탑승 일시:</strong></span>
              <span>{search.date} {selectedBus?.DEPARTURE_TIME}</span>
            </div>
            <div style={infoRowStyle}>
              <span><strong>버스 등급:</strong></span>
              <span>{selectedBus?.BUS_GRADE}</span>
            </div>
            <div style={infoRowStyle}>
              <span><strong>선택 좌석:</strong></span>
              <span>{selectedSeats.slice().sort((a, b) => a - b).join(', ')}번 ({selectedSeats.length}매)</span>
            </div>

            <hr style={{ border: '0', borderTop: '1px dashed #cbd5e0', margin: '16px 0' }} />

            <div style={{ ...infoRowStyle, fontSize: '18px', color: '#2b6cb0' }}>
              <span><strong>최종 결제 금액:</strong></span>
              <span><strong>{totalAmount.toLocaleString()}원</strong></span>
            </div>

            <div style={{ marginTop: '20px', backgroundColor: '#ebf8ff', padding: '12px', borderRadius: '6px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#2c5282' }}>
                💡 [결제 확인 및 승인] 버튼을 누르시면 예매가 최종 확정됩니다.
              </p>
            </div>

            <button
              disabled={isSubmitting}
              onClick={handleConfirmPayment}
              style={{
                ...btnStyle,
                backgroundColor: isSubmitting ? '#cbd5e0' : '#38a169',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? '결제 처리 중...' : '결제 확인 및 승인'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: 예매 완료 결과 창 */}
      {step === 4 && (
        <div style={{ ...cardStyle, textAlign: 'center', backgroundColor: '#f0fff4', border: '2px solid #38a169' }}>
          <h2>🎉 결제 및 예매가 완료되었습니다!</h2>
          <p>
            <strong>일정:</strong> {search.departure} ➔ {search.arrival} ({search.date} {selectedBus?.DEPARTURE_TIME})
          </p>
          <p>
            <strong>좌석:</strong> {selectedSeats.slice().sort((a, b) => a - b).join(', ')}번 ({selectedBus?.BUS_GRADE})
          </p>
          <p><strong>총 결제 금액:</strong> {totalAmount.toLocaleString()}원</p>
          <button
            onClick={() => {
              setStep(0);
              setSelectedSeats([]);
              setSelectedBus(null);
            }}
            style={btnStyle}
          >
            처음으로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}

const cardStyle = { padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', backgroundColor: '#fff' };
const btnStyle = {
  width: '100%',
  padding: '14px',
  backgroundColor: '#3182ce',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '16px',
};
const backBtnStyle = {
  marginBottom: '16px',
  padding: '8px 12px',
  border: '1px solid #cbd5e0',
  borderRadius: '6px',
  backgroundColor: '#edf2f7',
  cursor: 'pointer',
  fontWeight: 'bold',
};
const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: '6px' };
const selectStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '15px' };
const infoRowStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '15px' };