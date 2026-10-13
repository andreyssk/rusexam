import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api, unwrap, type AssetType } from '@/shared/api'

/** The asset library (admin), optionally only one type. */
export function useAssets(type?: AssetType) {
  return useQuery({
    queryKey: ['assets', type ?? 'all'],
    queryFn: () => unwrap(api.GET('/admin/assets', { params: { query: { type } } })),
  })
}

/** An asset's file as an object URL (fetched with the session's token, since <audio src> and <img src> cannot send it). */
export function useAssetUrl(assetId: number) {
  const query = useQuery({
    queryKey: ['asset-file', assetId],
    queryFn: () => unwrap(api.GET('/assets/{assetID}/file', { params: { path: { assetID: assetId } }, parseAs: 'blob' })),
    staleTime: Infinity,
  })
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!query.data) return setUrl(null)
    const u = URL.createObjectURL(query.data)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [query.data])
  return { url, isPending: query.isPending, error: query.error }
}
