import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as d3 from 'd3'
import { api, timeAgo } from './api'
import InfoTooltip from './InfoTooltip'
import PanelState from './PanelState'
import { poolColor } from './poolColors'
import BlockDetailModal from './BlockDetailModal'

const SOURCE_STROKE = {
  viewkey_proof: 'var(--color-success)',
  pool_api: 'var(--color-info)',
  pool_api_unproven: 'var(--color-warn)',
  coinbase_heuristic: 'var(--color-purple)',
}
const sourceStroke = (src) => SOURCE_STROKE[src] || 'var(--color-dim)'
const SOURCE_LEGEND = ['viewkey_proof', 'pool_api', 'pool_api_unproven', 'coinbase_heuristic', 'none']

const poolShortName = (pool) => (pool || 'unknown').replace(/\.(com|org|net|pro|eu|xyz|stream|io)$/, '')

const BLOCK_W = 82
const BLOCK_H = 52
const GAP_X = 30
const STEP = BLOCK_W + GAP_X
const CANONICAL_Y = 80
const FORK_Y = 180
const LANE_H = 100
const CHUNK = 250
const BUFFER = 45
const MAX_VISIBLE = 280
const COVERAGE_START = 3490000

const chunkToFor = (h, tip) => {
  const to = (Math.floor(h / CHUNK) + 1) * CHUNK - 1
  return tip && to > tip ? tip : to
}

const countLanes = (map) => {
  const byHash = new Map()
  const orphans = []
  for (const e of map.values()) {
    if (e.canonical) byHash.set(e.canonical.hash, e.canonical)
    for (const o of e.orphans) { byHash.set(o.hash, o); orphans.push(o) }
  }
  if (orphans.length === 0) return 0
  orphans.sort((a, b) => a.height - b.height)
  const branchOf = new Map()
  const spans = []
  for (const o of orphans) {
    const parent = byHash.get(o.prev_hash)
    const pb = parent && !parent.is_canonical ? branchOf.get(parent.hash) : null
    if (pb) { pb.end = o.height; branchOf.set(o.hash, pb) }
    else { const br = { start: o.height, end: o.height }; spans.push(br); branchOf.set(o.hash, br) }
  }
  const laneEnd = []
  for (const br of spans) {
    const lane = laneEnd.findIndex(v => v < br.start - 1)
    if (lane === -1) laneEnd.push(br.end)
    else laneEnd[lane] = br.end
  }
  return laneEnd.length
}

export default function ChainForkVisualizer() {
  const { t } = useTranslation()
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const zoomRef = useRef(null)
  const rafRef = useRef(null)
  const hasInteractedRef = useRef(false)
  const pendingFocusRef = useRef(null)
  const highlightRef = useRef(null)

  const blocksRef = useRef(new Map())
  const rangeRef = useRef({ min: null, max: null })
  const tipRef = useRef(0)
  const anchorRef = useRef(null)
  const reorgsRef = useRef(new Set())
  const inflightRef = useRef(new Set())
  const attemptedRef = useRef(new Set())

  const [status, setStatus] = useState('loading')
  const [version, setVersion] = useState(0)
  const [stats, setStats] = useState({ blocks: 0, reorgs: 0, hasOrphans: false, lanes: 0 })
  const [tooltip, setTooltip] = useState(null)
  const [selected, setSelected] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [searchError, setSearchError] = useState('')

  const bump = () => setVersion(v => v + 1)

  const mergeBlocks = useCallback((list) => {
    const map = blocksRef.current
    for (const b of list) {
      let entry = map.get(b.height)
      if (!entry) { entry = { canonical: null, orphans: [] }; map.set(b.height, entry) }
      if (b.is_canonical) entry.canonical = b
      else if (!entry.orphans.some(o => o.hash === b.hash)) entry.orphans.push(b)
      if (b.is_fork_point) reorgsRef.current.add(b.height)
      const r = rangeRef.current
      if (r.min === null || b.height < r.min) r.min = b.height
      if (r.max === null || b.height > r.max) r.max = b.height
    }
  }, [])

  const fetchChunk = useCallback((to) => {
    const key = to == null ? 'tip' : to
    if (inflightRef.current.has(key)) return Promise.resolve()
    inflightRef.current.add(key)
    attemptedRef.current.add(key)
    if (to != null) queueMicrotask(() => setLoadingMore(true))
    return api.chainForkWindow(CHUNK, to)
      .then(d => {
        tipRef.current = d.tip_height || tipRef.current
        if (anchorRef.current == null && d.tip_height) anchorRef.current = d.tip_height
        if (d && d.blocks && d.blocks.length > 0) {
          mergeBlocks(d.blocks)
          let orphans = false
          for (const e of blocksRef.current.values()) { if (e.orphans.length) { orphans = true; break } }
          setStats({ blocks: blocksRef.current.size, reorgs: reorgsRef.current.size, hasOrphans: orphans, lanes: countLanes(blocksRef.current) })
          setStatus('ok')
          bump()
        } else if (blocksRef.current.size === 0) {
          setStatus('empty')
        }
      })
      .catch(() => { if (blocksRef.current.size === 0) setStatus('error') })
      .finally(() => { inflightRef.current.delete(key); if (to != null) setLoadingMore(false) })
  }, [mergeBlocks])

  useEffect(() => {
    let id = null
    const poll = () => { attemptedRef.current.delete('tip'); fetchChunk(null) }
    const start = () => { if (!id) id = setInterval(poll, 30000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVisibility = () => {
      if (document.hidden) stop()
      else { poll(); start() }
    }
    fetchChunk(null)
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [fetchChunk])

  const hasOrphans = stats.hasOrphans
  const contentTop = CANONICAL_Y - 34
  const contentBottom = hasOrphans
    ? FORK_Y + Math.max(0, stats.lanes - 1) * LANE_H + BLOCK_H + 14
    : CANONICAL_Y + BLOCK_H + 42
  const panelH = Math.max(210, contentBottom - contentTop + 48)

  const render = useCallback(() => {
    const node = svgRef.current
    if (!node || blocksRef.current.size === 0) return
    const W = Math.round(node.getBoundingClientRect().width) || 900
    const H = isFullscreen ? Math.round(window.innerHeight * 0.8) : panelH

    const centerTy = (k) => (H - (contentBottom - contentTop) * k) / 2 - contentTop * k

    const sourceWord = (src) => t('fork.evi.' + (src || 'none'), { defaultValue: '' })
    const anchor = anchorRef.current ?? tipRef.current ?? 0
    const worldX = (h) => (h - anchor) * STEP

    const svg = d3.select(node)
    const prevT = d3.zoomTransform(node)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    const g = svg.append('g')
    const labels = g.append('g')
    const content = g.append('g')
    contentRef.current = content

    labels.append('text').attr('class', 'row-label-c')
      .attr('fill', 'var(--color-success)').attr('font-size', '11px').attr('font-weight', '600')
      .text(t('fork.canonical'))
    labels.append('text').attr('class', 'row-label-o')
      .attr('fill', 'var(--color-danger)').attr('font-size', '11px').attr('font-weight', '600')
      .text(t('fork.orphans'))

    const drawBlock = (block, y, isOrphan) => {
      const x = worldX(block.height)
      const blockG = content.append('g').style('cursor', 'pointer')
        .on('mouseenter', (event) => setTooltip({ x: event.clientX, y: event.clientY, block, isOrphan, agoSeconds: Math.floor(Date.now() / 1000) - block.timestamp_unix }))
        .on('mousemove', (event) => setTooltip(prev => prev ? { ...prev, x: event.clientX, y: event.clientY } : null))
        .on('mouseleave', () => setTooltip(null))
        .on('click', (event) => {
          event.stopPropagation()
          setTooltip(null)
          setInteracted(true)
          setSelected({ block, isOrphan, agoSeconds: Math.floor(Date.now() / 1000) - block.timestamp_unix })
        })

      const pool = block.miner_pool
      const historical = !isOrphan && block.height < COVERAGE_START && !block.pool_source && (!pool || pool === 'unknown')
      const accent = isOrphan ? 'var(--color-danger)' : (historical ? 'var(--color-dim)' : poolColor(pool))
      const evi = sourceStroke(block.pool_source)
      const cardStroke = isOrphan ? 'var(--color-danger)' : (block.is_fork_point ? 'var(--color-warn)' : 'var(--color-border-strong)')
      const cardStrokeW = isOrphan || block.is_fork_point ? 1.5 : 1
      const X0 = x + 10

      if (highlightRef.current === block.height && !isOrphan) {
        const ring = blockG.append('rect')
          .attr('x', x - 4).attr('y', y - 4).attr('width', BLOCK_W + 8).attr('height', BLOCK_H + 8).attr('rx', 8)
          .attr('fill', 'none').attr('stroke', 'var(--color-accent)').attr('stroke-width', 2.5)
        ring.append('animate').attr('attributeName', 'opacity').attr('values', '1;0.25;1').attr('dur', '1.1s').attr('repeatCount', 'indefinite')
      }

      blockG.append('rect').attr('x', x).attr('y', y).attr('width', BLOCK_W).attr('height', BLOCK_H).attr('rx', 5)
        .attr('fill', 'var(--color-card)').attr('fill-opacity', isOrphan ? 0.55 : (historical ? 0.5 : 1))
        .attr('stroke', cardStroke).attr('stroke-width', cardStrokeW)
      blockG.append('rect').attr('x', x + 2.5).attr('y', y + 3).attr('width', 3.5).attr('height', BLOCK_H - 6).attr('rx', 1.75).attr('fill', accent)
      blockG.append('text').attr('x', X0).attr('y', y + 13).attr('fill', accent).attr('font-size', '7.5px').attr('font-weight', '500').text(historical && (!pool || pool === 'unknown') ? t('fork.historical') : poolShortName(pool))
      blockG.append('text').attr('x', X0).attr('y', y + 30).attr('fill', isOrphan ? 'var(--color-danger)' : (historical ? 'var(--color-text-secondary)' : 'var(--color-text)')).attr('font-size', '12.5px').attr('font-weight', '600').attr('font-family', 'var(--font-mono)').text(block.height)
      blockG.append('text').attr('x', X0).attr('y', y + 40).attr('fill', 'var(--color-dim)').attr('font-size', '7.5px').attr('font-family', 'var(--font-mono)').text(block.hash.slice(0, 6))
      if (block.pool_source) {
        blockG.append('rect').attr('x', X0).attr('y', y + BLOCK_H - 8.5).attr('width', 5).attr('height', 5).attr('rx', 1.5).attr('fill', evi)
        blockG.append('text').attr('x', X0 + 8).attr('y', y + BLOCK_H - 4.5).attr('fill', 'var(--color-text-secondary)').attr('font-size', '7px').text(sourceWord(block.pool_source))
      }
      if (block.merge_mining > 0) {
        blockG.append('text').attr('x', x + BLOCK_W - 6).attr('y', y + 13).attr('text-anchor', 'end').attr('fill', 'var(--color-accent)').attr('font-size', '7px').attr('font-weight', '700').text('MM')
      }
    }

    const MAX_SPAN = MAX_VISIBLE + 2 * BUFFER
    const drawCulled = (transform) => {
      const k = transform.k
      const visMinX = (0 - transform.x) / k
      const visMaxX = (W - transform.x) / k
      let drawMin = anchor + Math.floor(visMinX / STEP) - BUFFER
      let drawMax = anchor + Math.ceil(visMaxX / STEP) + BUFFER
      if (drawMax - drawMin > MAX_SPAN) {
        const c = Math.round((drawMin + drawMax) / 2)
        drawMin = c - Math.floor(MAX_SPAN / 2)
        drawMax = c + Math.floor(MAX_SPAN / 2)
      }

      for (let h = Math.max(0, drawMin); h <= drawMax + CHUNK; h += CHUNK) {
        const to = chunkToFor(h, tipRef.current)
        if (to >= 0 && !attemptedRef.current.has(to)) fetchChunk(to)
      }

      content.selectAll('*').remove()

      const lo = Math.max(0, drawMin)
      const hi = drawMax
      const map = blocksRef.current

      const canon = []
      for (let h = lo; h <= hi; h++) {
        const e = map.get(h)
        if (e && e.canonical) canon.push(e.canonical)
      }
      const step = Math.max(1, Math.floor((hi - lo) / 10))
      for (const b of canon) {
        if (b.height % step === 0) {
          const x = worldX(b.height) + BLOCK_W / 2
          const iso = new Date(b.timestamp_unix * 1000).toISOString()
          content.append('line').attr('x1', x).attr('y1', CANONICAL_Y + BLOCK_H + 8).attr('x2', x).attr('y2', CANONICAL_Y + BLOCK_H + 14).attr('stroke', 'var(--color-dim)').attr('stroke-width', 1)
          content.append('text').attr('x', x).attr('y', CANONICAL_Y + BLOCK_H + 26).attr('text-anchor', 'middle').attr('fill', 'var(--color-text-secondary)').attr('font-size', '9.5px').attr('font-family', 'var(--font-mono)')
            .text(iso.slice(0, 10))
          content.append('text').attr('x', x).attr('y', CANONICAL_Y + BLOCK_H + 37).attr('text-anchor', 'middle').attr('fill', 'var(--color-dim)').attr('font-size', '9px').attr('font-family', 'var(--font-mono)')
            .text(iso.slice(11, 16) + ' UTC')
        }
      }
      for (let i = 0; i < canon.length - 1; i++) {
        if (canon[i + 1].height === canon[i].height + 1) {
          content.append('line')
            .attr('x1', worldX(canon[i].height) + BLOCK_W).attr('y1', CANONICAL_Y + BLOCK_H / 2)
            .attr('x2', worldX(canon[i + 1].height)).attr('y2', CANONICAL_Y + BLOCK_H / 2)
            .attr('stroke', 'var(--color-success)').attr('stroke-width', 2)
        }
      }
      const byHash = new Map()
      const orphanList = []
      for (let h = lo; h <= hi; h++) {
        const e = map.get(h)
        if (!e) continue
        if (e.canonical) byHash.set(e.canonical.hash, e.canonical)
        for (const o of e.orphans) { byHash.set(o.hash, o); orphanList.push(o) }
      }
      orphanList.sort((a, b) => a.height - b.height)

      const branchOf = new Map()
      const branches = []
      for (const o of orphanList) {
        const parent = byHash.get(o.prev_hash)
        const parentBranch = parent && !parent.is_canonical ? branchOf.get(parent.hash) : null
        if (parentBranch) {
          parentBranch.blocks.push(o)
          branchOf.set(o.hash, parentBranch)
        } else {
          const br = { blocks: [o], ancestor: parent && parent.is_canonical ? parent : null, lane: 0 }
          branches.push(br)
          branchOf.set(o.hash, br)
        }
      }

      const laneEnd = []
      for (const br of branches) {
        const start = br.blocks[0].height
        const end = br.blocks[br.blocks.length - 1].height
        let lane = laneEnd.findIndex(v => v < start - 1)
        if (lane === -1) { lane = laneEnd.length; laneEnd.push(end) } else { laneEnd[lane] = end }
        br.lane = lane
      }
      const laneY = (lane) => FORK_Y + lane * LANE_H

      for (const br of branches) {
        const y = laneY(br.lane)
        const first = br.blocks[0]
        const fx = worldX(first.height)
        if (br.ancestor) {
          const ax = worldX(br.ancestor.height) + BLOCK_W
          const ay = CANONICAL_Y + BLOCK_H / 2
          const my = (ay + y + BLOCK_H / 2) / 2
          content.append('path')
            .attr('d', `M ${ax} ${ay} C ${ax + GAP_X * 0.7} ${ay}, ${fx - GAP_X * 0.7} ${my}, ${fx} ${y + BLOCK_H / 2}`)
            .attr('stroke', 'var(--color-danger)').attr('stroke-width', 2).attr('fill', 'none')
          content.append('circle')
            .attr('cx', ax).attr('cy', ay).attr('r', 3.5)
            .attr('fill', 'var(--color-warn)').attr('stroke', 'var(--color-card)').attr('stroke-width', 1)
        } else {
          content.append('path')
            .attr('d', `M ${fx + BLOCK_W / 2} ${CANONICAL_Y + BLOCK_H} L ${fx + BLOCK_W / 2} ${y}`)
            .attr('stroke', 'var(--color-danger)').attr('stroke-width', 2).attr('stroke-dasharray', '4 3').attr('fill', 'none')
        }
        for (let i = 0; i < br.blocks.length - 1; i++) {
          const a = br.blocks[i]
          const b = br.blocks[i + 1]
          if (b.height !== a.height + 1) continue
          content.append('line')
            .attr('x1', worldX(a.height) + BLOCK_W).attr('y1', y + BLOCK_H / 2)
            .attr('x2', worldX(b.height)).attr('y2', y + BLOCK_H / 2)
            .attr('stroke', 'var(--color-danger)').attr('stroke-width', 2)
        }
        if (br.blocks.length > 1) {
          const last = br.blocks[br.blocks.length - 1]
          content.append('text')
            .attr('x', (fx + worldX(last.height) + BLOCK_W) / 2).attr('y', y - 7)
            .attr('text-anchor', 'middle').attr('fill', 'var(--color-danger)')
            .attr('font-size', '9.5px').attr('font-weight', '600')
            .text(t('fork.branchDepth', { count: br.blocks.length, defaultValue: `${br.blocks.length} blocs` }))
        }
      }
      if (COVERAGE_START > lo && COVERAGE_START <= hi + 1) {
        const bx = worldX(COVERAGE_START) - GAP_X / 2
        content.append('line')
          .attr('x1', bx).attr('y1', CANONICAL_Y - 34).attr('x2', bx).attr('y2', FORK_Y + BLOCK_H + 8)
          .attr('stroke', 'var(--color-accent)').attr('stroke-width', 1.5).attr('stroke-dasharray', '5 4').attr('opacity', 0.75)
        content.append('text')
          .attr('x', bx - 8).attr('y', CANONICAL_Y - 24).attr('text-anchor', 'end')
          .attr('fill', 'var(--color-accent)').attr('font-size', '10px').attr('font-weight', '600')
          .text('← ' + t('fork.historical'))
        content.append('text')
          .attr('x', bx + 8).attr('y', CANONICAL_Y - 24).attr('text-anchor', 'start')
          .attr('fill', 'var(--color-accent)').attr('font-size', '10px').attr('font-weight', '600')
          .text(t('fork.coverageBoundary') + ' →')
      }

      for (const b of canon) drawBlock(b, CANONICAL_Y, false)
      for (const br of branches) {
        const y = laneY(br.lane)
        for (const orphan of br.blocks) drawBlock(orphan, y, true)
      }

      const labelX = Math.max(worldX(lo) + 4, visMinX + 6)
      labels.select('.row-label-c').attr('x', labelX).attr('y', CANONICAL_Y - 8)
      labels.select('.row-label-o').attr('x', labelX).attr('y', FORK_Y - 8).attr('opacity', hasOrphans ? 1 : 0)
    }

    const kMin = W / (MAX_VISIBLE * STEP)
    const kInit = W / (9 * STEP)
    const zoom = d3.zoom().scaleExtent([Math.min(kMin, kInit), 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        if (event.sourceEvent) { hasInteractedRef.current = true }
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            drawCulled(d3.zoomTransform(node))
          })
        }
      })
    zoomRef.current = zoom
    svg.call(zoom)

    const focusTransform = (h, k) => {
      const cx = worldX(h) + BLOCK_W / 2
      const tx = W / 2 - cx * k
      const ty = centerTy(k)
      return d3.zoomIdentity.translate(tx, ty).scale(k)
    }

    let T
    if (pendingFocusRef.current != null) {
      const h = pendingFocusRef.current
      pendingFocusRef.current = null
      T = focusTransform(h, kInit)
      svg.call(zoom.transform, T)
      drawCulled(T)
      return
    } else if (hasInteractedRef.current && prevT && prevT.k !== 1) {
      T = prevT
    } else {
      const tip = tipRef.current
      const tx = W - 24 - (worldX(tip) + BLOCK_W) * kInit
      const ty = centerTy(kInit)
      T = d3.zoomIdentity.translate(tx, ty).scale(kInit)
    }
    svg.call(zoom.transform, T)
    drawCulled(T)
  }, [t, isFullscreen, hasOrphans, panelH, contentTop, contentBottom, fetchChunk])

  useEffect(() => { render() }, [render, version])

  const handleZoomIn = () => { if (zoomRef.current && svgRef.current) d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, 1.4) }
  const handleZoomOut = () => { if (zoomRef.current && svgRef.current) d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, 0.7) }
  const handleReset = () => { hasInteractedRef.current = false; highlightRef.current = null; anchorRef.current = tipRef.current; bump() }
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen) containerRef.current.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const focusHeight = useCallback((h) => {
    hasInteractedRef.current = true
    anchorRef.current = h
    highlightRef.current = h
    pendingFocusRef.current = h
    setInteracted(true)
    bump()
    setTimeout(() => { highlightRef.current = null; bump() }, 4500)
  }, [])

  const goToHeight = useCallback(async (height) => {
    if (height == null || Number.isNaN(height)) return false
    if (tipRef.current && height > tipRef.current) return false
    if (!blocksRef.current.get(height)?.canonical) {
      await fetchChunk(chunkToFor(height, tipRef.current))
    }
    if (!blocksRef.current.get(height)?.canonical) return false
    focusHeight(height)
    return true
  }, [fetchChunk, focusHeight])

  const handleSearch = useCallback(async (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearchError('')
    let height
    if (/^\d+$/.test(q)) {
      height = parseInt(q, 10)
    } else if (/^[0-9a-fA-F]{64}$/.test(q)) {
      try { const d = await api.blockDetail(q); height = d.height } catch { setSearchError(t('fork.searchNotFound')); return }
    } else {
      setSearchError(t('fork.searchInvalid')); return
    }
    if (height == null || Number.isNaN(height)) { setSearchError(t('fork.searchInvalid')); return }
    const ok = await goToHeight(height)
    if (!ok) setSearchError(t('fork.searchNotFound'))
  }, [query, t, goToHeight])

  useEffect(() => {
    const onFocusBlock = (e) => {
      const height = e.detail?.height
      if (height == null) return
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      goToHeight(height)
    }
    window.addEventListener('mm:focus-block', onFocusBlock)
    return () => window.removeEventListener('mm:focus-block', onFocusBlock)
  }, [goToHeight])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    const node = svgRef.current
    if (!node) return
    let raf = null
    const ro = new ResizeObserver(() => { if (!raf) raf = requestAnimationFrame(() => { raf = null; bump() }) })
    ro.observe(node)
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [])

  const subtitle =
    status === 'ok'
      ? ''
      : status === 'error'
        ? t('state.apiError')
        : status === 'empty'
          ? t('state.waitingSync')
          : t('state.loading')

  return (
    <div
      ref={containerRef}
      className="rounded-lg border p-4 sm:p-6 mb-4"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2 gap-y-3">
        <div>
          <h3 className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            {t('fork.title')}<InfoTooltip text={t('info.fork')} />
          </h3>
          {(subtitle || loadingMore) && (
            <p className="text-xs mt-1" style={{ color: status === 'error' ? 'var(--color-warn)' : 'var(--color-dim)' }}>
              {subtitle}{loadingMore ? (subtitle ? ` · ${t('fork.loadingMore')}` : t('fork.loadingMore')) : ''}
            </p>
          )}
        </div>

        {status === 'ok' && (
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-wrap sm:justify-end">
            <form onSubmit={handleSearch} className="flex items-center gap-1 flex-1 sm:flex-none min-w-0">
              <div className="relative flex-1 min-w-0">
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); if (searchError) setSearchError('') }}
                  placeholder={t('fork.searchPlaceholder')}
                  spellCheck={false}
                  className="text-xs rounded border pl-2 pr-2 py-1.5 w-full sm:w-52 outline-none focus:ring-1"
                  style={{ background: 'var(--color-bg)', borderColor: searchError ? 'var(--color-danger)' : 'var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <button type="submit" className="p-1.5 rounded border text-xs" style={ctrlStyle} title={t('fork.search')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            </form>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleZoomOut} className="p-1.5 rounded border text-xs" style={ctrlStyle} title={t('fork.zoomOut')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <button onClick={handleZoomIn} className="p-1.5 rounded border text-xs" style={ctrlStyle} title={t('fork.zoomIn')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <button onClick={handleReset} className="p-1.5 rounded border text-xs" style={ctrlStyle} title={t('fork.reset')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <button onClick={toggleFullscreen} className="p-1.5 rounded border text-xs" style={ctrlStyle} title={t('fork.fullscreen')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {searchError && (
        <p className="text-xs mb-2" style={{ color: 'var(--color-danger)' }}>{searchError}</p>
      )}

      {status === 'ok' ? (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', background: 'var(--color-bg)' }}>
          <svg
            ref={svgRef}
            style={{ width: '100%', height: isFullscreen ? '80vh' : `${panelH}px`, display: 'block', cursor: 'grab' }}
          />
          {!interacted && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs rounded-full border px-3 py-1.5 pointer-events-none"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-dim)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                <path
                  d="M8.6 2.6c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v8.2c.3-.4.8-.7 1.4-.7.8 0 1.4.5 1.6 1.2.3-.3.8-.5 1.3-.5.8 0 1.5.6 1.7 1.3.3-.2.7-.4 1.1-.4 1 0 1.8.8 1.8 1.8v3.7c0 3.2-2.6 5.8-5.8 5.8h-2.6c-1.7 0-3.3-.8-4.4-2.1l-3.5-4.3c-.6-.8-.5-1.9.2-2.5.7-.6 1.8-.5 2.4.2l1.2 1.4z"
                  fill="currentColor"
                  stroke="var(--color-card)"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
              {t('fork.clickHint')}
            </div>
          )}
        </div>
      ) : (
        <div style={{ borderRadius: '8px', background: 'var(--color-bg)' }}>
          <PanelState status={status} variant="chart" height={300} />
        </div>
      )}

      {status === 'ok' && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--color-dim)' }}>
            {t('fork.legendTitle')}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {SOURCE_LEGEND.map(src => (
              <div key={src} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-dim)' }}>
                <span
                  className="rounded-sm shrink-0"
                  style={{ width: 10, height: 10, background: src === 'none' ? 'var(--color-dim)' : sourceStroke(src) }}
                />
                {t('prov.label.' + src)}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-dim)' }}>
              <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ background: 'var(--color-card)', border: '2px solid var(--color-danger)' }} />
              {t('fork.orphans')}
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-dim)' }}>
              <span className="shrink-0 font-bold" style={{ fontSize: 11, color: 'var(--color-accent)' }}>MM</span>
              {t('fork.mergeMined')}
            </div>
          </div>
        </div>
      )}

      {tooltip && (
        <div
          className="fixed z-50 rounded-lg border p-3 text-xs pointer-events-none shadow-lg"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            background: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border-strong)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-mono)',
            maxWidth: '260px',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: poolColor(tooltip.block.miner_pool) }} />
            <span style={{ color: tooltip.isOrphan ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
              {tooltip.isOrphan ? t('fork.orphanBlock') : t('fork.canonicalBlock')}
            </span>
          </div>
          <div>{t('fork.tipHeight')}: {tooltip.block.height.toLocaleString()}</div>
          <div className="truncate">{t('fork.tipHash')}: {tooltip.block.hash.slice(0, 16)}...</div>
          <div>{t('fork.tipPool')}: {tooltip.block.miner_pool || 'unknown'}</div>
          <div>{t('fork.tipTx')}: {tooltip.block.tx_count}</div>
          <div>{t('fork.tipTime')}: {timeAgo(tooltip.agoSeconds)}</div>
          {tooltip.block.merge_mining > 0 && (
            <div>{t('fork.tipMerge')}</div>
          )}
        </div>
      )}

      <BlockDetailModal selected={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

const ctrlStyle = {
  background: 'var(--color-card)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-secondary)',
}
