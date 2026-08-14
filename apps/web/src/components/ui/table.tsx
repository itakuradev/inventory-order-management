'use client';

import type { ReactNode } from 'react';
import type { SortOrder } from '@logimaster/contracts';

export function SortableHeader<TKey extends string>({
  label,
  sortKey,
  currentKey,
  currentOrder,
  onChange,
  align = 'left',
}: {
  label: string;
  sortKey: TKey;
  currentKey: TKey;
  currentOrder: SortOrder;
  onChange: (key: TKey, order: SortOrder) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentKey === sortKey;
  const nextOrder: SortOrder = isActive && currentOrder === 'asc' ? 'desc' : 'asc';

  return (
    <th scope="col" className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onChange(sortKey, nextOrder)}
        className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
      >
        {label}
        <span className={`text-[10px] ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
          {isActive && currentOrder === 'desc' ? '降順' : '昇順'}
        </span>
      </button>
    </th>
  );
}

export function TableHeader({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 font-medium text-slate-600 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = buildPageNumbers(page, lastPage);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
      <PageButton disabled={page <= 1} onClick={() => onPageChange(1)} label="最初" />
      <PageButton disabled={page <= 1} onClick={() => onPageChange(page - 1)} label="前へ" />
      {pageNumbers.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          aria-current={pageNumber === page ? 'page' : undefined}
          className={`min-w-9 rounded-md border px-3 py-1.5 text-sm ${
            pageNumber === page
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {pageNumber}
        </button>
      ))}
      <PageButton disabled={page >= lastPage} onClick={() => onPageChange(page + 1)} label="次へ" />
      <PageButton disabled={page >= lastPage} onClick={() => onPageChange(lastPage)} label="最後" />
      <select
        aria-label="1ページあたりの表示件数"
        value={pageSize}
        onChange={(event) => onPageSizeChange(Number(event.target.value))}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
      >
        {[10, 20, 50].map((size) => (
          <option key={size} value={size}>
            {size}件 / ページ
          </option>
        ))}
      </select>
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
    >
      {label}
    </button>
  );
}

/** 現在ページの前後2ページ分だけを表示する。 */
function buildPageNumbers(page: number, lastPage: number): number[] {
  const start = Math.max(1, Math.min(page - 2, lastPage - 4));
  const end = Math.min(lastPage, start + 4);
  const numbers: number[] = [];
  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    numbers.push(pageNumber);
  }
  return numbers;
}
