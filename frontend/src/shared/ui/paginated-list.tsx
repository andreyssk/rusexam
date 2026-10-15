import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '@/shared/lib/i18n'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { Button } from './button'
import { Spinner } from './spinner'
import { ErrorMessage, Loading } from './states'

export type Page<T> = { items: T[]; total: number }

type Props<T> = {
  /** One page of data by page number (1-based); used on desktop. */
  usePage: (page: number, pageSize: number) => UseQueryResult<Page<T>>
  /** The same data as one growing list; used on phones. */
  useInfinite: (pageSize: number) => UseInfiniteQueryResult<InfiniteData<Page<T>>>
  /** Renders the loaded items; the list around them (and the empty state) is handled here. */
  children: (items: T[]) => ReactNode
  empty: ReactNode
  desktopPageSize?: number
  mobilePageSize?: number
}

/** A list that is paged with page numbers on desktop and scrolls endlessly on phones. */
export function PaginatedList<T>(props: Props<T>) {
  const desktop = useMediaQuery('(min-width: 768px)')
  return desktop ? <Paged {...props} /> : <Infinite {...props} />
}

function Paged<T>({ usePage, children, empty, desktopPageSize = 10 }: Props<T>) {
  const { t } = useI18n()
  const [page, setPage] = useState(1)
  const { data, isPending, error, isFetching } = usePage(page, desktopPageSize)

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  if (data.total === 0) return <>{empty}</>

  const pages = Math.max(1, Math.ceil(data.total / desktopPageSize))
  return (
    <div className="space-y-3">
      <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>{children(data.items)}</div>
      {pages > 1 && (
        <nav aria-label={t('pagination.label')} className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={16} /> {t('pagination.prev')}
          </Button>
          <span className="text-sm font-bold tabular-nums text-muted-foreground">{t('pagination.page', { p: page, n: pages })}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            {t('pagination.next')} <ChevronRight size={16} />
          </Button>
        </nav>
      )}
    </div>
  )
}

function Infinite<T>({ useInfinite, children, empty, mobilePageSize = 15 }: Props<T>) {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfinite(mobilePageSize)
  const sentinel = useRef<HTMLDivElement>(null)

  // The next page loads when the end of the list comes (nearly) into view.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNextPage) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, data])

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  const items = data.pages.flatMap((p) => p.items)
  if (items.length === 0) return <>{empty}</>

  return (
    <div className="space-y-2">
      {children(items)}
      {hasNextPage && (
        <div ref={sentinel} className="flex h-12 items-center justify-center text-muted-foreground">
          {isFetchingNextPage && <Spinner size={20} />}
        </div>
      )}
    </div>
  )
}
