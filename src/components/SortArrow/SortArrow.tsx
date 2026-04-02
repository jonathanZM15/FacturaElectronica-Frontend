import React from 'react';

export type SortDirection = 'asc' | 'desc';

type Props = {
  active: boolean;
  direction?: SortDirection;
  sizePx?: number;
};

const SortArrow: React.FC<Props> = ({ active, direction, sizePx = 26 }) => {
  const symbol = active ? (direction === 'asc' ? '↑' : '↓') : '↕';

  return (
    <span
      aria-hidden="true"
      style={{
        opacity: active ? 1 : 0.5,
        fontSize: sizePx,
        lineHeight: 1,
        display: 'inline-block'
      }}
    >
      {symbol}
    </span>
  );
};

export default SortArrow;
