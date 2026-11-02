import { Pagination as BsPagination } from 'react-bootstrap';

export default function Pagination({ page, pages, total, onChange }) {
  const end = Math.min(pages, Math.max(1, page - 2) + 4);
  const start = Math.max(1, end - 4);
  const numbers = [];

  for (let n = start; n <= end; n += 1) {
    numbers.push(n);
  }

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
      <small className="text-muted">{total} record(s)</small>
      {pages > 1 && (
        <BsPagination size="sm" className="mb-0">
          <BsPagination.Prev disabled={page === 1} onClick={() => onChange(page - 1)} />
          {numbers.map((n) => (
            <BsPagination.Item key={n} active={n === page} onClick={() => onChange(n)}>
              {n}
            </BsPagination.Item>
          ))}
          <BsPagination.Next disabled={page === pages} onClick={() => onChange(page + 1)} />
        </BsPagination>
      )}
    </div>
  );
}