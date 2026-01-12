'use client'

import React from 'react'
import { Minus, Plus } from 'lucide-react'
import './NumberInput.css'

function NumberInput({ value, onChange, min = 0, max = 99, step = 1, label, disabled = false }) {
  const handleIncrement = () => {
    if (!disabled && value < max) {
      onChange(Math.min(value + step, max))
    }
  }

  const handleDecrement = () => {
    if (!disabled && value > min) {
      onChange(Math.max(value - step, min))
    }
  }

  const handleInputChange = (e) => {
    const newValue = parseInt(e.target.value) || min
    const clampedValue = Math.max(min, Math.min(max, newValue))
    onChange(clampedValue)
  }

  return (
    <div className="number-input">
      {label && <label className="number-input-label">{label}</label>}
      <div className="number-input-controls">
        <button
          type="button"
          className="number-input-btn minus-btn"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          aria-label="Decrementa"
        >
          <Minus size={18} />
        </button>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="number-input-field"
          aria-label={label || 'Valore numerico'}
        />
        <button
          type="button"
          className="number-input-btn plus-btn"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          aria-label="Incrementa"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

export default NumberInput
