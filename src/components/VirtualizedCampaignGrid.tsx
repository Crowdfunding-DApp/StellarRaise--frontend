'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Campaign } from '@/lib/soroban'

interface VirtualizedCampaignGridProps {
  campaigns: Campaign[]
  renderCard: (campaign: Campaign, index: number) => React.ReactNode
  columnCount?: number
  gap?: number
  overscan?: number
}

const CARD_HEIGHT = 480

export function VirtualizedCampaignGrid({
  campaigns,
  renderCard,
  columnCount = 3,
  gap = 32,
  overscan = 2,
}: VirtualizedCampaignGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })
  const [isScrolling, setIsScrolling] = useState(false)
  const [columnCount_, setColumnCount_] = useState(columnCount)

  const estimatedRowHeight = CARD_HEIGHT + gap

  // Calculate visible range based on scroll position
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, clientHeight } = containerRef.current

    const visibleRowStart = Math.max(
      0,
      Math.floor((scrollTop - CARD_HEIGHT) / estimatedRowHeight)
    )
    const visibleRowEnd = Math.ceil(
      (scrollTop + clientHeight + CARD_HEIGHT) / estimatedRowHeight
    )

    const itemsPerRow = columnCount_
    const start = Math.max(0, visibleRowStart * itemsPerRow - overscan * itemsPerRow)
    const end = Math.min(
      campaigns.length,
      visibleRowEnd * itemsPerRow + overscan * itemsPerRow
    )

    setVisibleRange({ start, end })
    setIsScrolling(true)
  }, [campaigns.length, columnCount_, overscan, estimatedRowHeight])

  // Debounce scroll end detection
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout>()
  const debouncedScrollEnd = useCallback(() => {
    if (scrollEndTimeoutRef.current) {
      clearTimeout(scrollEndTimeoutRef.current)
    }
    scrollEndTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 150)
  }, [])

  // Handle scroll events
  const handleScrollWithDebounce = useCallback(() => {
    handleScroll()
    debouncedScrollEnd()
  }, [handleScroll, debouncedScrollEnd])

  // Handle resize to update column count
  const handleResize = useCallback(() => {
    if (!containerRef.current) return
    const width = containerRef.current.offsetWidth

    let newColumnCount = columnCount
    if (width < 768) {
      newColumnCount = 1
    } else if (width < 1024) {
      newColumnCount = 2
    } else {
      newColumnCount = 3
    }

    setColumnCount_(newColumnCount)
  }, [columnCount])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Use requestAnimationFrame to avoid setState in effect directly
    const handleInitialResize = () => {
      const width = container.offsetWidth
      let newColumnCount = columnCount
      if (width < 768) {
        newColumnCount = 1
      } else if (width < 1024) {
        newColumnCount = 2
      } else {
        newColumnCount = 3
      }
      setColumnCount_(newColumnCount)
    }

    requestAnimationFrame(() => {
      handleInitialResize()
    })

    // Add event listeners
    container.addEventListener('scroll', handleScrollWithDebounce, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScrollWithDebounce)
      window.removeEventListener('resize', handleResize)
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current)
      }
    }
  }, [handleScrollWithDebounce, handleResize, columnCount])

  // Trigger initial scroll calculation when dependencies change
  useEffect(() => {
    handleScroll()
  }, [handleScroll])

  // Memoize all items with visibility state
  const allItems = useMemo(() => {
    return Array.from({ length: campaigns.length }, (_, i) => ({
      index: i,
      campaign: campaigns[i],
      isVisible: i >= visibleRange.start && i < visibleRange.end,
    }))
  }, [campaigns, visibleRange])

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto overflow-x-hidden"
      role="region"
      aria-label="Campaign grid"
      aria-busy={isScrolling}
    >
      <div
        className="grid px-4 md:px-0"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, 350px), 1fr))`,
          gap: `${gap}px`,
          padding: '2rem 1rem',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {allItems.map((item) => (
          <div
            key={item.index}
            data-testid={`campaign-card-${item.index}`}
            role={item.isVisible ? 'article' : undefined}
            aria-label={item.isVisible ? `Campaign: ${item.campaign.title}` : undefined}
            tabIndex={item.isVisible ? 0 : -1}
            aria-hidden={!item.isVisible}
            style={{
              minHeight: item.isVisible ? 'auto' : `${CARD_HEIGHT}px`,
              visibility: item.isVisible ? 'visible' : 'hidden',
              position: item.isVisible ? 'relative' : 'absolute',
            }}
          >
            {item.isVisible && renderCard(item.campaign, item.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
