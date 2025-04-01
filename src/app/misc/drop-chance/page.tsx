"use client";

import { useState, useEffect } from 'react';

export default function DropChanceCalculator() {
  const [percentValue, setPercentValue] = useState<number>(0);
  const [attemptsValue, setAttemptsValue] = useState<number>(0);
  const [maxAttemptsValue, setMaxAttemptsValue] = useState<number>(100);
  const [desiredDropsValue, setDesiredDropsValue] = useState<number>(1);
  const [desiredDropsRangeValue, setDesiredDropsRangeValue] = useState<[number, number]>([1, 2]);
  const [toggleState, setToggleState] = useState<number>(0);
  const [result, setResult] = useState<string>('');

  // Binomial coefficient function with additional safeguards for large numbers
  const binomialCoefficient = (n: number, k: number): number => {
    // Handle edge cases to prevent NaN results
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (n <= 0) return 0;

    // For large numbers, use logarithms to avoid overflow
    if (n > 1000 || k > 100) {
      let logResult = 0;
      for (let i = n - k + 1; i <= n; i++) {
        logResult += Math.log(i);
      }
      for (let i = 1; i <= k; i++) {
        logResult -= Math.log(i);
      }
      return Math.exp(logResult);
    }
    
    // For smaller numbers, use the direct calculation
    let coeff = 1;
    for (let x = n - k + 1; x <= n; x++) coeff *= x;
    for (let x = 1; x <= k; x++) coeff /= x;
    return coeff;
  };

  // Binomial probability function
  const binomialProbability = (n: number, k: number, p: number): number => {
    return binomialCoefficient(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  };

  // Alternative calculation for cumulative binomial probability using logs
  const calculateCumulativeProbability = (n: number, k: number, p: number, isAtLeast: boolean): number => {
    // For large numbers, approximate with normal distribution
    if (n > 1000) {
      const mean = n * p;
      const stdDev = Math.sqrt(n * p * (1 - p));
      
      // For at least k successes, use complementary cumulative distribution
      if (isAtLeast) {
        // P(X ≥ k) = 1 - P(X < k)
        const z = (k - 0.5 - mean) / stdDev; // continuity correction
        return 1 - normalCDF(z);
      } else {
        // For exactly k successes
        const z1 = (k - 0.5 - mean) / stdDev; // continuity correction
        const z2 = (k + 0.5 - mean) / stdDev; // continuity correction
        return normalCDF(z2) - normalCDF(z1);
      }
    }
    
    // For smaller numbers, use direct calculation
    if (isAtLeast) {
      // P(X ≥ k) = 1 - P(X < k)
      let cumProb = 0;
      for (let i = 0; i < k; i++) {
        cumProb += binomialProbability(n, i, p);
      }
      return 1 - cumProb;
    } else {
      // For exactly k successes
      return binomialProbability(n, k, p);
    }
  };
  
  // Standard normal cumulative distribution function
  const normalCDF = (z: number): number => {
    // Approximation of the normal CDF
    if (z < -6) return 0;
    if (z > 6) return 1;
    
    let sum = 0;
    let term = z;
    for (let i = 3; sum + term !== sum; i += 2) {
      sum += term;
      term = term * z * z / i;
    }
    
    return 0.5 + sum * Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  };

  useEffect(() => {
    // Ensure values are valid numbers
    if (isNaN(percentValue) || isNaN(attemptsValue) || 
        isNaN(desiredDropsValue) || 
        isNaN(desiredDropsRangeValue[0]) || isNaN(desiredDropsRangeValue[1])) {
      setResult("Please enter valid values for all fields.");
      return;
    }
    
    // Handle special cases to prevent NaN
    if (attemptsValue === 0) {
      setResult("With 0 attempts, there is a 0% chance of getting any drops.");
      return;
    }

    const p = percentValue / 100;
    let chance = 0;

    try {
      if (toggleState % 2 === 0) {
        // Single desired drops mode
        if (desiredDropsValue > attemptsValue) {
          setResult(`It's impossible to get more drops (${desiredDropsValue}) than attempts (${attemptsValue}).`);
          return;
        }
        
        // Use safe calculation method
        const prob = calculateCumulativeProbability(attemptsValue, desiredDropsValue, p, true);
        chance = Math.max(prob * 100, 0);

        const attemptsText = attemptsValue === 1 ? 'try' : 'tries';
        const dropsText = desiredDropsValue === 1 ? 'time' : 'times';

        setResult(`There is a <strong>${chance.toFixed(1)}%</strong> chance that you will receive the ${percentValue}% drop at least ${desiredDropsValue} ${dropsText} in ${attemptsValue} ${attemptsText}.`);
      } else {
        // Range desired drops mode
        if (desiredDropsRangeValue[0] > attemptsValue) {
          setResult(`It's impossible to get more drops than attempts (${attemptsValue}).`);
          return;
        }
        
        const cappedMax = Math.min(desiredDropsRangeValue[1], attemptsValue);
        
        // Calculate probability for range
        let cumulativeProbability = 0;
        for (let k = desiredDropsRangeValue[0]; k <= cappedMax; k++) {
          cumulativeProbability += calculateCumulativeProbability(attemptsValue, k, p, false);
        }
        chance = Math.max(cumulativeProbability * 100, 0);

        const attemptsText = attemptsValue === 1 ? 'try' : 'tries';
        const rangeText = desiredDropsRangeValue[1] === 1 ? 'time' : 'times';

        setResult(`There is a <strong>${chance.toFixed(1)}%</strong> chance that you will receive the ${percentValue}% drop between ${desiredDropsRangeValue[0]} and ${desiredDropsRangeValue[1]} ${rangeText} in ${attemptsValue} ${attemptsText}.`);
      }
      
      // Ensure the final chance is a valid number
      if (isNaN(chance)) {
        // This is a fallback in case calculations still produce NaN
        chance = 0;
        console.error("Calculation produced NaN. Using fallback value of 0%.");
      }
      
    } catch (error) {
      console.error("Calculation error:", error);
      setResult("Error in calculation. Please try different values.");
    }
  }, [percentValue, attemptsValue, desiredDropsValue, desiredDropsRangeValue, toggleState]);

  // Toggle button text
  const getButtonText = () => {
    if (toggleState % 2 === 0) {
      const rangeText = desiredDropsRangeValue[1] === 1 ? "time" : "times";
      return `Change to drop between ${desiredDropsRangeValue[0]} and ${desiredDropsRangeValue[1]} ${rangeText}`;
    } else {
      const singleText = desiredDropsValue === 1 ? "time" : "times";
      return `Change to drop at least ${desiredDropsValue} ${singleText}`;
    }
  };

  // Handle range slider change
  const handleRangeChange = (index: number, value: number) => {
    const newRange = [...desiredDropsRangeValue] as [number, number];
    newRange[index] = value;
    
    // Make sure first value is not greater than second value
    if (index === 0 && newRange[0] > newRange[1]) {
      newRange[1] = newRange[0];
    } else if (index === 1 && newRange[1] < newRange[0]) {
      newRange[0] = newRange[1];
    }
    
    setDesiredDropsRangeValue(newRange);
  };

  // Change function name to match the toggle style
  const toggleDropMode = () => {
    setToggleState(toggleState + 1);
  };

  // Update the handler to enforce the cap
  useEffect(() => {
    // Cap desiredDropsValue to attemptsValue
    if (desiredDropsValue > attemptsValue) {
      setDesiredDropsValue(attemptsValue);
    }
    
    // Cap desiredDropsRangeValue[1] to attemptsValue
    if (desiredDropsRangeValue[1] > attemptsValue) {
      setDesiredDropsRangeValue([
        desiredDropsRangeValue[0],
        attemptsValue
      ]);
    }
  }, [attemptsValue, desiredDropsValue, desiredDropsRangeValue]);

  // Handle max attempts input change with upper limit
  const handleMaxAttemptsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Number(e.target.value);
    if (newMax > 0 && newMax <= 1000000) {
      setMaxAttemptsValue(newMax);
      
      // If current attempts value is larger than newMax, adjust it
      if (attemptsValue > newMax) {
        setAttemptsValue(newMax);
      }
    }
  };

  return (
    <div className="container">
      <div className="simulation-layout justify-center">
        <div className="drop-chance-container">
          <div className="control-group">
            {/* Add toggle buttons similar to McCabe-Thiele */}
            <div className="parameter-toggle">
              <button
                type="button"
                onClick={toggleDropMode}
                className={`toggle-btn ${toggleState % 2 === 0 ? 'active' : ''}`}
              >
                At Least
              </button>
              <button
                type="button"
                onClick={toggleDropMode}
                className={`toggle-btn ${toggleState % 2 === 1 ? 'active' : ''}`}
              >
                Range
              </button>
            </div>

            <div className="slider-group">
              <label htmlFor="percent-slider">
                Drop Percentage: {percentValue}%
              </label>
              <input
                id="percent-slider"
                type="range"
                min="0"
                max="100"
                step="1"
                value={percentValue}
                onChange={(e) => setPercentValue(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  background: '#4DA6FF33',
                  appearance: 'auto' as React.CSSProperties['appearance'],
                  WebkitAppearance: 'auto' as React.CSSProperties['WebkitAppearance'],
                }}
              />
            </div>

            <div className="slider-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                <span>Number of Attempts: {attemptsValue}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  (Max:
                  <input 
                    type="number"
                    value={maxAttemptsValue}
                    onChange={handleMaxAttemptsChange}
                    min="1"
                    max="1000000"
                    style={{
                      width: '60px',
                      height: '24px',
                      color: 'var(--text-color)',
                      margin: '0 4px',
                      padding: '0 4px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      background: 'transparent'
                    }}
                  />
                  )
                </span>
              </div>
              <input
                id="attempts-slider"
                type="range"
                min="0"
                max={maxAttemptsValue}
                step="1"
                value={attemptsValue}
                onChange={(e) => setAttemptsValue(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  background: '#4DA6FF33',
                  appearance: 'auto' as React.CSSProperties['appearance'],
                  WebkitAppearance: 'auto' as React.CSSProperties['WebkitAppearance'],
                }}
              />
            </div>

            {toggleState % 2 === 0 ? (
              <div className="slider-group">
                <label htmlFor="desired-drops-slider">
                  Desired Number of Drops: at least {desiredDropsValue}
                </label>
                <input
                  id="desired-drops-slider"
                  type="range"
                  min="0"
                  max={attemptsValue}
                  step="1"
                  value={desiredDropsValue}
                  onChange={(e) => setDesiredDropsValue(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    background: '#4DA6FF33',
                    appearance: 'auto' as React.CSSProperties['appearance'],
                    WebkitAppearance: 'auto' as React.CSSProperties['WebkitAppearance'],
                  }}
                />
              </div>
            ) : (
              <div className="slider-group">
                <label htmlFor="range-min">
                  Desired Drops Range: {desiredDropsRangeValue[0]} to {desiredDropsRangeValue[1]}
                </label>
                <div className="range-sliders">
                  <div className="mini-slider-group">
                    <label className="text-xs">Min:</label>
                    <input
                      id="range-min"
                      type="range"
                      min="0"
                      max={attemptsValue}
                      step="1"
                      value={desiredDropsRangeValue[0]}
                      onChange={(e) => handleRangeChange(0, Number(e.target.value))}
                      style={{
                        width: '100%',
                        height: '20px',
                        background: '#4DA6FF33',
                        appearance: 'auto' as React.CSSProperties['appearance'],
                        WebkitAppearance: 'auto' as React.CSSProperties['WebkitAppearance'],
                      }}
                    />
                  </div>
                  <div className="mini-slider-group">
                    <label className="text-xs">Max:</label>
                    <input
                      id="range-max"
                      type="range"
                      min="0"
                      max={attemptsValue}
                      step="1"
                      value={desiredDropsRangeValue[1]}
                      onChange={(e) => handleRangeChange(1, Number(e.target.value))}
                      style={{
                        width: '100%',
                        height: '20px',
                        background: '#4DA6FF33',
                        appearance: 'auto' as React.CSSProperties['appearance'],
                        WebkitAppearance: 'auto' as React.CSSProperties['WebkitAppearance'],
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="result-container">
            <div className="result-text" dangerouslySetInnerHTML={{ __html: result }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
