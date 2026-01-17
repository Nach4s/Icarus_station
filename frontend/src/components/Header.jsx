import React, { useState, useEffect } from 'react'
import { Satellite, Wifi, WifiOff, Menu, X } from 'lucide-react'

const Header = ({ stationName, missionId, connected }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Station Name */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
                <Satellite className="w-6 h-6 text-primary" />
              </div>
              {connected && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-status-nominal rounded-full border-2 border-space-dark" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-white tracking-wide">
                {stationName || 'ICARUS'}
              </h1>
              <p className="text-xs text-gray-400 font-mono tracking-wider">
                {missionId || 'MISSION-2026'}
              </p>
            </div>
          </div>

          {/* Center - Time Display (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-white tracking-wider">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </p>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
                Station Time
              </p>
            </div>
          </div>

          {/* Right side - Connection Status */}
          <div className="flex items-center gap-4">
            {/* Time on mobile */}
            <div className="md:hidden text-right">
              <p className="text-sm font-mono text-white">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </p>
            </div>

            {/* Connection indicator */}
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300
              ${connected
                ? 'bg-status-nominal/10 border border-status-nominal/30'
                : 'bg-status-critical/10 border border-status-critical/30'}
            `}>
              {connected ? (
                <>
                  <Wifi className="w-4 h-4 text-status-nominal" />
                  <span className="text-sm font-medium text-status-nominal hidden sm:inline">
                    ONLINE
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-status-critical" />
                  <span className="text-sm font-medium text-status-critical hidden sm:inline">
                    OFFLINE
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
