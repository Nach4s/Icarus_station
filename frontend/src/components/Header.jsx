import React, { useState, useEffect } from 'react'
import { Satellite, Wifi, WifiOff } from 'lucide-react'

const Header = ({ stationName, missionId, connected }) => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="bg-gradient-to-r from-nasa-blue to-space-blue border-b-2 border-space-cyan shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Satellite className="w-10 h-10 text-space-cyan" />
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">
                {stationName}
              </h1>
              <p className="text-sm text-gray-300 font-mono">
                Mission ID: {missionId}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider">
                Station Time
              </p>
              <p className="text-lg font-mono text-white">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </p>
              <p className="text-xs text-gray-400 font-mono">
                {currentTime.toLocaleDateString('en-US')}
              </p>
            </div>
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              connected ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'
            }`}>
              {connected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium text-green-400">CONNECTED</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-medium text-red-400">DISCONNECTED</span>
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
