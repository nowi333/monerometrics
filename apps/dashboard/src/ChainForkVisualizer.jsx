import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as d3 from 'd3'
import { api, timeAgo } from './api'
import InfoTooltip from './InfoTooltip'
import PanelState from './PanelState'
import { poolColor } from './poolColors'
import BlockDetailModal from './BlockDetailModal'

export default function ChainForkVisualizer() {
  const { t } = useTranslation()
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const gRef = useRef(null)
  const zoomRef = useRef(null)
  const hasInteractedRef = useRef(false)
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [tooltip, setTooltip] = useState(null)
  const [selected, setSelected] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)



  const hasOrphans = !!data && data.blocks.some(b => !b.is_canonical)



  useEffect(() => {
    let cancelled = false
    let hasData = false
    const load = () => {
      api.chainForkWindow(200)
        .then(d => {
          if (cancelled) return
          if (d && d.blocks && d.blocks.length > 0) { hasData = true; setData(d); setStatus('ok') }
          else { hasData = false; setData(null); setStatus('empty') }
        })
        .catch(() => { if (!cancelled && !hasData) { setData(null); setStatus('error') } })
    }
    load()
    const id = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])


  const BLOCK_W = 64
  const BLOCK_H = 40
  const GAP_X = 36
  const CANONICAL_Y = 80
  const FORK_Y = 180
  const MARGIN_LEFT = 40


  const render = useCallback(() => {
    if (!data || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const canonical = data.blocks
      .filter(b => b.is_canonical)
      .sort((a, b) => a.height - b.height)
    const orphans = data.blocks.filter(b => !b.is_canonical)

    if (canonical.length === 0) return

    const minHeight = canonical[0].height
    const width = MARGIN_LEFT * 2 + canonical.length * (BLOCK_W + GAP_X)


    const height = orphans.length > 0 ? 280 : 150

    svg.attr('viewBox', `0 0 ${Math.max(width, 800)} ${height}`)


    const g = svg.append('g').attr('class', 'zoom-group')
    gRef.current = g

    const xPos = (h) => MARGIN_LEFT + (h - minHeight) * (BLOCK_W + GAP_X)


    const timeAxis = g.append('g').attr('class', 'time-axis')
    const tickEvery = Math.max(1, Math.floor(canonical.length / 8))
    canonical.forEach((b, i) => {
      if (i % tickEvery === 0) {
        const x = xPos(b.height) + BLOCK_W / 2
        timeAxis.append('line')
          .attr('x1', x).attr('y1', CANONICAL_Y + BLOCK_H + 8)
          .attr('x2', x).attr('y2', CANONICAL_Y + BLOCK_H + 14)
          .attr('stroke', 'var(--color-dim)').attr('stroke-width', 1)
        const d = new Date(b.timestamp_unix * 1000)
        timeAxis.append('text')
          .attr('x', x).attr('y', CANONICAL_Y + BLOCK_H + 28)
          .attr('text-anchor', 'middle')
          .attr('fill', 'var(--color-dim)')
          .attr('font-size', '10px')
          .attr('font-family', 'var(--font-mono)')
          .text(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      }
    })


    for (let i = 0; i < canonical.length - 1; i++) {
      const x1 = xPos(canonical[i].height) + BLOCK_W
      const x2 = xPos(canonical[i + 1].height)
      g.append('line')
        .attr('x1', x1).attr('y1', CANONICAL_Y + BLOCK_H / 2)
        .attr('x2', x2).attr('y2', CANONICAL_Y + BLOCK_H / 2)
        .attr('stroke', 'var(--color-success)')
        .attr('stroke-width', 2)
    }


    orphans.forEach(orphan => {
      const x = xPos(orphan.height)
      g.append('path')
        .attr('d', `M ${x + BLOCK_W / 2} ${CANONICAL_Y + BLOCK_H} L ${x + BLOCK_W / 2} ${FORK_Y}`)
        .attr('stroke', 'var(--color-danger)')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4 3')
        .attr('fill', 'none')
    })


    const drawBlock = (block, y, isOrphan) => {
      const x = xPos(block.height)
      const blockG = g.append('g')
        .attr('class', 'block')
        .style('cursor', 'pointer')
        .on('mouseenter', (event) => {
          setTooltip({
            x: event.clientX,
            y: event.clientY,
            block,
            isOrphan,

            agoSeconds: Math.floor(Date.now() / 1000) - block.timestamp_unix,
          })
        })
        .on('mousemove', (event) => {
          setTooltip(prev => prev ? { ...prev, x: event.clientX, y: event.clientY } : null)
        })
        .on('mouseleave', () => setTooltip(null))
        .on('click', (event) => {
          event.stopPropagation()
          setTooltip(null)
          setSelected({
            block,
            isOrphan,
            agoSeconds: Math.floor(Date.now() / 1000) - block.timestamp_unix,
          })
        })

      blockG.append('rect')
        .attr('x', x).attr('y', y)
        .attr('width', BLOCK_W).attr('height', BLOCK_H)
        .attr('rx', 4)
        .attr('fill', isOrphan ? 'var(--color-card)' : poolColor(block.miner_pool))
        .attr('fill-opacity', isOrphan ? 0.3 : 0.85)
        .attr('stroke', isOrphan ? 'var(--color-danger)' : poolColor(block.miner_pool))
        .attr('stroke-width', block.is_fork_point ? 2.5 : 1)

      blockG.append('text')
        .attr('x', x + BLOCK_W / 2).attr('y', y + 17)
        .attr('text-anchor', 'middle')
        .attr('fill', isOrphan ? 'var(--color-danger)' : '#fff')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('font-family', 'var(--font-mono)')
        .text(block.height.toString().slice(-4))

      blockG.append('text')
        .attr('x', x + BLOCK_W / 2).attr('y', y + 31)
        .attr('text-anchor', 'middle')
        .attr('fill', isOrphan ? 'var(--color-danger)' : 'rgba(255,255,255,0.7)')
        .attr('font-size', '8px')
        .attr('font-family', 'var(--font-mono)')
        .text(block.hash.slice(0, 6))
    }

    canonical.forEach(b => drawBlock(b, CANONICAL_Y, false))
    orphans.forEach(b => drawBlock(b, FORK_Y, true))


    g.append('text')
      .attr('x', 4).attr('y', CANONICAL_Y - 8)
      .attr('fill', 'var(--color-success)')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text(t('fork.canonical'))

    if (orphans.length > 0) {
      g.append('text')
        .attr('x', 4).attr('y', FORK_Y - 8)
        .attr('fill', 'var(--color-danger)')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(t('fork.orphans'))
    }


    const zoom = d3.zoom()
      .scaleExtent([0.3, 20])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        if (event.sourceEvent) hasInteractedRef.current = true
      })
    zoomRef.current = zoom
    svg.call(zoom)

    if (hasInteractedRef.current) {


      g.attr('transform', d3.zoomTransform(svgRef.current))
    } else {

      const viewW = Math.max(width, 800)
      const initialScale = 13
      const initialX = viewW - width * initialScale - MARGIN_LEFT * initialScale



      const rowCenterY = CANONICAL_Y + BLOCK_H / 2
      const initialY = height / 2 - initialScale * rowCenterY
      svg.call(zoom.transform, d3.zoomIdentity.translate(initialX, initialY).scale(initialScale))
    }
  }, [data, t])

  useEffect(() => {
    render()
  }, [render])


  const handleZoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, 1.4)
    }
  }
  const handleZoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, 0.7)
    }
  }
  const handleReset = () => {
    hasInteractedRef.current = false
    render()
  }
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const activePools = data
    ? [...new Set(data.blocks.map(b => b.miner_pool || 'unknown'))]
    : []

  const subtitle =
    status === 'ok'
      ? t('fork.stats', { blocks: data.blocks_count, reorgs: data.reorgs_count })
      : status === 'error'
        ? t('state.apiError')
        : status === 'empty'
          ? t('state.waitingSync')
          : t('state.loading')

  return (
    <div
      ref={containerRef}
      className="rounded-lg border p-6 mb-4"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
      {}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            {t('fork.title')}<InfoTooltip text={t('info.fork')} />
          </h3>
          <p className="text-xs mt-1" style={{ color: status === 'error' ? 'var(--color-warn)' : 'var(--color-dim)' }}>
            {subtitle}
          </p>
        </div>

        {}
        {status === 'ok' && (
          <div className="flex items-center gap-1">
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
        )}
      </div>

      {}
      {status === 'ok' ? (
        <div style={{ overflow: 'hidden', borderRadius: '8px', background: 'var(--color-bg)' }}>
          <svg
            ref={svgRef}
            style={{ width: '100%', height: isFullscreen ? '80vh' : (hasOrphans ? '300px' : '170px'), display: 'block', cursor: 'grab' }}
          />
        </div>
      ) : (
        <div style={{ borderRadius: '8px', background: 'var(--color-bg)' }}>
          <PanelState status={status} variant="chart" height={300} />
        </div>
      )}

      {}
      {status === 'ok' && (
        <div className="flex flex-wrap gap-3 mt-4">
          {activePools.map(pool => (
            <div key={pool} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-dim)' }}>
              <span className="w-3 h-3 rounded-sm" style={{ background: poolColor(pool) }} />
              {pool}
            </div>
          ))}
        </div>
      )}

      {}
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
        </div>
      )}

      {}
      <BlockDetailModal selected={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

const ctrlStyle = {
  background: 'var(--color-card)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-secondary)',
}
