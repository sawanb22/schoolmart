export const tableStyles = {
  table: 'w-full text-left border-collapse text-sm text-stone-700',
  thead: 'bg-stone-50/90 border-b border-stone-200 text-stone-600',
  th: 'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-600 select-none',
  tbody: 'divide-y divide-stone-100 bg-white',
  tr: 'hover:bg-stone-50/70 transition-colors',
  td: 'px-4 py-3.5 text-sm text-stone-700 align-middle',
  actionBtn:
    'inline-flex items-center justify-center p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200 disabled:opacity-40 disabled:pointer-events-none',
} as const;

export type TableStyles = typeof tableStyles;
