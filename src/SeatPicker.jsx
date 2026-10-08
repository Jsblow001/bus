import React from 'react';

export default function SeatPicker({
  totalSeats = 31, // 일반 27석 + 맨뒷줄 4석 = 총 31석 (또는 28인승 우등버스의 경우 28~31번 배치)
  occupiedSeats = [3, 7, 12],
  selectedSeats = [],
  onToggleSeat,
}) {
  // 1 ~ 27번 좌석 (3석 x 9줄)
  const regularRows = 9;

  return (
    <div style={styles.busLayout}>
      <div style={styles.driverSection}>운전석</div>

      {/* 1 ~ 27번 좌석 그리드 (2석 - 통로 - 1석) */}
      <div style={styles.seatGrid}>
        {Array.from({ length: regularRows }).map((_, rowIndex) => {
          const seat1 = rowIndex * 3 + 1;
          const seat2 = rowIndex * 3 + 2;
          const seat3 = rowIndex * 3 + 3;

          return (
            <React.Fragment key={rowIndex}>
              {/* 왼쪽 1열 */}
              <SeatButton
                seatNum={seat1}
                isOccupied={occupiedSeats.includes(seat1)}
                isSelected={selectedSeats.includes(seat1)}
                onToggleSeat={onToggleSeat}
              />

              {/* 왼쪽 2열 */}
              <SeatButton
                seatNum={seat2}
                isOccupied={occupiedSeats.includes(seat2)}
                isSelected={selectedSeats.includes(seat2)}
                onToggleSeat={onToggleSeat}
              />

              {/* 가운데 통로 */}
              <div style={{ width: '16px' }} />

              {/* 오른쪽 3열 */}
              <SeatButton
                seatNum={seat3}
                isOccupied={occupiedSeats.includes(seat3)}
                isSelected={selectedSeats.includes(seat3)}
                onToggleSeat={onToggleSeat}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* 맨 뒷줄 (28, 29, 30, 31번): 통로 없이 4석 나란히 배치 */}
      <div style={styles.lastRowGrid}>
        {[28, 29, 30, 31].map((seatNum) => (
          <SeatButton
            key={seatNum}
            seatNum={seatNum}
            isOccupied={occupiedSeats.includes(seatNum)}
            isSelected={selectedSeats.includes(seatNum)}
            onToggleSeat={onToggleSeat}
          />
        ))}
      </div>
    </div>
  );
}

// 좌석 개별 버튼 컴포넌트
function SeatButton({ seatNum, isOccupied, isSelected, onToggleSeat }) {
  return (
    <button
      disabled={isOccupied}
      onClick={() => onToggleSeat(seatNum)}
      style={{
        ...styles.seat,
        backgroundColor: isOccupied ? '#ccc' : isSelected ? '#2b6cb0' : '#edf2f7',
        color: isSelected ? '#fff' : '#000',
        cursor: isOccupied ? 'not-allowed' : 'pointer',
      }}
    >
      {seatNum}
    </button>
  );
}

const styles = {
  busLayout: {
    border: '2px solid #a0aec0',
    borderRadius: '12px',
    padding: '16px',
    width: '270px',
    margin: '0 auto',
  },
  driverSection: {
    textAlign: 'right',
    fontWeight: 'bold',
    paddingBottom: '12px',
    borderBottom: '1px dashed #cbd5e0',
  },
  seatGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 60px 1fr', // 2석 - 통로(16px) - 1석
    gap: '8px',
    marginTop: '16px',
    alignItems: 'center',
  },
  lastRowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)', // 맨 뒷줄 4석 나란히 배치
    gap: '6px',
    marginTop: '8px',
  },
  seat: {
    height: '40px',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '13px',
  },
};