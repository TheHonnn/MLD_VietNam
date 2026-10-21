import React, { useEffect, useState } from 'react';

export const QuizTimer = React.memo(({ deadline, onExpire }: { deadline: number; onExpire: () => void }) => {
  const [seconds,setSeconds] = useState(() => Math.max(0,Math.ceil((deadline-performance.now())/1000)));
  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0,Math.ceil((deadline-performance.now())/1000));
      setSeconds(remaining);
      if (remaining === 0) onExpire();
    };
    update();
    const timer = window.setInterval(update,1000);
    document.addEventListener('visibilitychange',update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange',update); };
  }, [deadline,onExpire]);
  return <p role="timer">Thời gian còn lại: {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</p>;
});
