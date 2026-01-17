import React, { useState, useEffect, useRef } from 'react'
import { Apple, Droplets, Flame, Pill, Clock, ChevronDown, ChevronUp, Utensils } from 'lucide-react'

const NutritionPanel = ({ nutrition, config }) => {
  const [mealScheduleExpanded, setMealScheduleExpanded] = useState(true)
  const [displayedNutrition, setDisplayedNutrition] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const lastUpdateTime = useRef(Date.now())

  if (!nutrition) {
    return (
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-center justify-center py-8">
          <Apple className="w-8 h-8 text-primary animate-pulse mr-3" />
          <p className="text-gray-400">Loading nutrition data...</p>
        </div>
      </div>
    )
  }

  if (!config || !nutrition.requirements) {
    return (
      <div className="glass-card p-6">
        <p className="text-status-critical">Nutrition data unavailable</p>
      </div>
    )
  }

  const generateStableValues = (baseRequirements) => {
    if (!baseRequirements) return null

    const gently = (current, min, max) => {
      const variation = current * (Math.random() * 0.06 - 0.03)
      const newValue = current + variation
      return Math.max(min, Math.min(max, newValue))
    }

    return {
      calories: {
        ...baseRequirements.calories,
        current: Math.round(gently(baseRequirements.calories?.current ?? 2475, 2450, 2500))
      },
      protein: {
        ...baseRequirements.protein,
        current: parseFloat(gently(baseRequirements.protein?.current ?? 95, 90, 100).toFixed(1))
      },
      water: {
        ...baseRequirements.water,
        current: parseFloat(gently(baseRequirements.water?.current ?? 1.9, 1.8, 2.0).toFixed(2))
      },
      vitamins: {
        ...baseRequirements.vitamins,
        current: Math.round(gently(baseRequirements.vitamins?.current ?? 97, 95, 100))
      }
    }
  }

  useEffect(() => {
    if (nutrition?.requirements && !displayedNutrition) {
      setDisplayedNutrition(generateStableValues(nutrition.requirements))
      lastUpdateTime.current = Date.now()
    }
  }, [nutrition, displayedNutrition])

  useEffect(() => {
    if (!nutrition?.requirements) return

    const updateInterval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTime.current

      if (timeSinceLastUpdate >= 60000) {
        setIsUpdating(true)
        const newValues = generateStableValues(displayedNutrition || nutrition.requirements)

        setTimeout(() => {
          setDisplayedNutrition(newValues)
          setIsUpdating(false)
          lastUpdateTime.current = now
        }, 100)
      }
    }, 1000)

    return () => clearInterval(updateInterval)
  }, [nutrition, displayedNutrition])

  const getStatusStyles = (current, optimal, threshold) => {
    const percentage = (current / optimal) * 100
    if (percentage >= 95) return { color: 'text-status-nominal', bg: 'bg-status-nominal', label: 'Optimal' }
    if (percentage >= 80) return { color: 'text-status-warning', bg: 'bg-status-warning', label: 'Warning' }
    return { color: 'text-status-critical', bg: 'bg-status-critical', label: 'Low' }
  }

  const requirements = displayedNutrition || nutrition?.requirements

  const nutrients = [
    { name: 'Calories', icon: Flame, data: requirements?.calories, gradient: 'from-orange-500 to-red-500' },
    { name: 'Protein', icon: Apple, data: requirements?.protein, gradient: 'from-green-500 to-emerald-500' },
    { name: 'Water', icon: Droplets, data: requirements?.water, gradient: 'from-blue-500 to-cyan-500' },
    { name: 'Vitamins', icon: Pill, data: requirements?.vitamins, gradient: 'from-purple-500 to-violet-500' }
  ]

  // Circular progress component
  const CircularProgress = ({ percentage, color, size = 80 }) => {
    const strokeWidth = 6
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (percentage / 100) * circumference

    return (
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
    )
  }

  return (
    <div className="space-y-6">
      {/* Nutrient Cards */}
      <div className="glass-card p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-status-nominal/10">
            <Apple className="w-6 h-6 text-status-nominal" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Nutrition Status</h2>
            <p className="text-sm text-gray-400">Daily intake monitoring</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {nutrients.filter(n => n.data).map((nutrient) => {
            const percentage = ((nutrient.data?.current ?? 0) / (nutrient.data?.optimal ?? 100)) * 100
            const status = getStatusStyles(nutrient.data?.current ?? 0, nutrient.data?.optimal ?? 100, 10)
            const Icon = nutrient.icon

            return (
              <div key={nutrient.name} className={`glass-card glass-card-hover p-4 text-center transition-all duration-500 ${isUpdating ? 'opacity-70' : ''}`}>
                {/* Icon */}
                <div className={`w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br ${nutrient.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Value */}
                <div className={`text-2xl font-display font-bold ${status.color} mb-1`}>
                  {nutrient.data?.current ?? 'N/A'}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  / {nutrient.data?.optimal} {nutrient.data?.unit}
                </div>

                {/* Progress bar */}
                <div className="progress-bar mb-2">
                  <div
                    className={`progress-fill ${percentage >= 95 ? 'nominal' : percentage >= 80 ? 'warning' : 'critical'}`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>

                {/* Label */}
                <div className="text-xs font-medium text-gray-400">{nutrient.name}</div>
              </div>
            )
          })}
        </div>

        {nutrition?.last_check && (
          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <span className="text-xs text-gray-500">Last check: {nutrition.last_check}</span>
          </div>
        )}
      </div>

      {/* Meal Schedule */}
      {nutrition?.meal_schedule && nutrition.meal_schedule.length > 0 && (
        <div className="glass-card p-6 animate-slide-up">
          <div
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => setMealScheduleExpanded(!mealScheduleExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Utensils className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-white">Meal Schedule</h2>
                <p className="text-sm text-gray-400">Daily meal plan</p>
              </div>
            </div>
            {mealScheduleExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {mealScheduleExpanded && (
            <div className="space-y-3">
              {nutrition.meal_schedule.map((meal, index) => (
                <div key={index} className="glass-card p-4 flex items-center gap-4 hover:border-primary/30 transition-all">
                  <div className="text-2xl">{meal.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-primary">{meal.time}</span>
                      <span className="text-white font-medium">{meal.meal}</span>
                    </div>
                    <p className="text-sm text-gray-400">{meal.menu}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NutritionPanel
