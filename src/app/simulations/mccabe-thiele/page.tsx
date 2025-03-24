'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Data } from 'plotly.js';

interface PlotlyWrapperProps {
  data: Data[];
  layout: Record<string, unknown>;
  config?: Record<string, unknown>;
  style?: React.CSSProperties;
}

// Create a wrapper component to handle Plotly properly
const PlotlyComponent = dynamic(() => import('react-plotly.js').then(mod => {
  const Plot = mod.default;
  return function PlotWrapper(props: PlotlyWrapperProps) {
    return <Plot {...props} />;
  };
}), {
  ssr: false,
  loading: () => (
    <div className="loading-plot">
      <p>Loading McCabe-Thiele diagram...</p>
    </div>
  )
});

export default function McCabeThielePage() {
  // State for component inputs
  const [comp1, setComp1] = useState('methanol');
  const [comp2, setComp2] = useState('water');
  const [temperatureC, setTemperatureC] = useState(27); // Temperature in Celsius
  const [pressureBar, setPressureBar] = useState(1); // Pressure in bar
  const [useTemperature, setUseTemperature] = useState(true);
  
  // State for McCabe-Thiele parameters
  const [xd, setXd] = useState(0.9); // Distillate composition
  const [xb, setXb] = useState(0.1); // Bottoms composition
  const [xf, setXf] = useState(0.5); // Feed composition
  const [q, setQ] = useState(1.0);   // Feed quality (saturated liquid)
  const [r, setR] = useState(1.5);   // Reflux ratio
  
  // State for plot data and rendering control
  const [equilibriumData, setEquilibriumData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plotReady, setPlotReady] = useState(false);
  const [volatilityInfo, setVolatilityInfo] = useState<string | null>(null);
  
  // State for calculation results
  const [stages, setStages] = useState<number | null>(null);
  const [feedStage, setFeedStage] = useState<number | null>(null);
  
  // State for the plot data
  const [plotData, setPlotData] = useState<any[]>([]);
  const [plotLayout, setPlotLayout] = useState<any>({});
  
  useEffect(() => {
    // Set plot as ready when component mounts on client
    setPlotReady(true);
    // Automatically load methanol/water VLE data on page load
    fetchVLEData();
  }, []);
  
  // Add this effect to reset the navbar styling when component unmounts
  useEffect(() => {
    // Clean up function will run when component unmounts
    return () => {
      // Force a rerender of the navbar by triggering a small DOM change
      const navbar = document.querySelector('.navbar-wrapper');
      if (navbar) {
        navbar.classList.add('resetting');
        setTimeout(() => {
          navbar.classList.remove('resetting');
        }, 10);
      }
    };
  }, []);
  
  const fetchVLEData = React.useCallback(async () => {
    console.log("DEBUG: fetchVLEData called with components:", comp1, comp2);
    console.log(`DEBUG: Using ${useTemperature ? 'temperature' : 'pressure'} mode with value ${useTemperature ? temperatureC : pressureBar}`);
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("DEBUG: Preparing API call to McCabe-Thiele endpoint");
      
      // Use the actual API endpoint in your website
      const response = await fetch('/api/mccabe-thiele', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comp1: comp1,
          comp2: comp2,
          temperature: useTemperature ? temperatureC : null,
          pressure: !useTemperature ? pressureBar : null,
        }),
      });
      console.log(`DEBUG: API response status: ${response.status}`);
      
      const data = await response.json();
      console.log(`DEBUG: API response received. Success: ${!data.error}`);
      
      if (data.error) {
        console.error("DEBUG ERROR: API returned error:", data.error);
        throw new Error(data.error);
      }

      console.log(`DEBUG: VLE data received. Points: ${data.x_values?.length || 0}`);
      console.log(`DEBUG: Temperature: ${data.temperature}K, Pressure: ${data.pressure ? data.pressure/1e5 + 'bar' : 'Not specified'}`);
      console.log("DEBUG: Volatility info:", data.volatility);
      
      // Set volatility information
      setVolatilityInfo(data.volatility?.message || `${comp1} / ${comp2} VLE data`);
      
      // Use the received equilibrium data
      const xValues = data.x_values || [];
      const yValues = data.y_values || [];
      
      console.log(`DEBUG: First few x values: ${xValues.slice(0, 5).join(', ')}`);
      console.log(`DEBUG: First few y values: ${yValues.slice(0, 5).join(', ')}`);
      
      // Set the equilibrium data
      setEquilibriumData({
        x: xValues,
        y: yValues,
        polyCoeffs: data.poly_coeffs || []
      });
      
      console.log("DEBUG: Generating plot with VLE data");
      // Generate the plot data
      generatePlotData(xValues, yValues);
      console.log("DEBUG: Plot generation complete");
      
    } catch (err) {
      console.error("DEBUG ERROR: Error fetching VLE data:", err);
      setError(`Failed to load equilibrium data. ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setLoading(false);
      console.log("DEBUG: fetchVLEData completed");
    }
  }, [comp1, comp2, useTemperature, temperatureC, pressureBar]);

  const generatePlotData = React.useCallback((xValues: number[], yValues: number[]) => {
    // Generate equilibrium line
    const equilibriumLine = {
      x: xValues,
      y: yValues,
      type: 'scatter',
      mode: 'lines',
      name: 'Equilibrium Line',
      line: { color: 'yellow', width: 2 },
      hovertemplate: 'x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>'
    };
    
    // Generate y=x line
    const yxLine = {
      x: [0, 1],
      y: [0, 1], 
      type: 'scatter',
      mode: 'lines',
      name: 'y = x Line',
      line: { color: 'white', width: 1, dash: 'dot' },
      hovertemplate: 'x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>'
    };
    
    // Helper function to find intersection with equilibrium curve
    const findEquilibriumIntersection = (slope: number, intercept: number, startX: number, endX: number, direction: 'increasing' | 'decreasing'): [number, number] | null => {
      // Create points along the line
      const step = 0.001; // Small step for precision
      let currentX = startX;
      
      while ((direction === 'increasing' && currentX <= endX) || (direction === 'decreasing' && currentX >= endX)) {
        const lineY = slope * currentX + intercept;
        
        // Find equilibrium y at this x through interpolation
        let eqY = 0;
        for (let i = 0; i < xValues.length - 1; i++) {
          if (xValues[i] <= currentX && xValues[i+1] >= currentX) {
            const fraction = (currentX - xValues[i]) / (xValues[i+1] - xValues[i]);
            eqY = yValues[i] + fraction * (yValues[i+1] - yValues[i]);
            break;
          }
        }
        
        // Check if line crosses equilibrium
        if ((direction === 'increasing' && lineY >= eqY) || (direction === 'decreasing' && lineY <= eqY)) {
          return [currentX, lineY];
        }
        
        currentX += direction === 'increasing' ? step : -step;
      }
      
      return null; // No intersection found
    };
    
    // Generate rectifying section line
    const rectifyingSlope = r / (r + 1);
    const rectifyingIntercept = xd / (r + 1);
    
    // Find where rectifying section meets equilibrium curve
    const rectEqIntersection = findEquilibriumIntersection(
      rectifyingSlope, 
      rectifyingIntercept,
      0, // Start from x=0
      xd, // End at xd
      'increasing' // Direction
    );
    
    // Generate feed line
    let feedSlope: number;
    if (q === 1) {
      feedSlope = 1000; // Very large slope instead of infinite
    } else {
      feedSlope = q / (q - 1);
    }
    const feedIntercept = q === 1 ? -1000 * xf + xf : -xf / (q - 1);
    
    // Find intersection point of rectifying and feed lines
    let xIntersect: number;
    let yIntersect: number;
    
    xIntersect = (feedIntercept - rectifyingIntercept) / (rectifyingSlope - feedSlope);
    yIntersect = rectifyingSlope * xIntersect + rectifyingIntercept;
    
    // Check if the rectifying line should stop at the intersection with feed line
    const rectEndX = (xIntersect > 0 && xIntersect < xd) ? xIntersect : 
                     (rectEqIntersection ? rectEqIntersection[0] : xd);
    
    const rectifyingX = [];
    const rectifyingY = [];
    
    // Generate points for rectifying line from xd down to either intersection or equilibrium
    for (let i = 0; i <= 100; i++) {
      const x = xd - (i / 100) * (xd - rectEndX);
      if (x < rectEndX) break;
      rectifyingX.push(x);
      rectifyingY.push(rectifyingSlope * x + rectifyingIntercept);
    }
    
    const rectifyingLine = {
      x: rectifyingX,
      y: rectifyingY,
      type: 'scatter',
      mode: 'lines',
      name: 'Rectifying Section',
      line: { color: 'orange', width: 2 },
      hovertemplate: 'x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>'
    };
    
    // For feed line with very high slope (q=1 or near 1)
    const feedX = [];
    const feedY = [];
    
    // For near-vertical lines (q very close to 1)
    if (Math.abs(feedSlope) > 100) {
      // Create a straight vertical line from feed point (xf, xf) on the y=x line
      // down to the intersection with the operating lines (rectifying and stripping)
      feedX.push(xf);
      feedY.push(xf); // Start at feed point on y=x line, y equals x
  
      // The feed line should go to the intersection point (xIntersect, yIntersect)
      // Ensure yIntersect is within the valid range (y >= 0)
      if (yIntersect >= 0) {
        feedX.push(xIntersect);
        feedY.push(yIntersect);
      } else {
        // If the intersection is below the chart (y < 0), stop at y=0
        feedX.push(xf);
        feedY.push(0);
      }
    } else {
      // For non-vertical feed lines (unchanged logic)
      const feedDirection = feedSlope > 0 ? 'increasing' : 'decreasing';
      const yxIntersectX = (feedIntercept) / (1 - feedSlope);
      const validYXIntersect = yxIntersectX >= 0 && yxIntersectX <= 1;
  
      feedX.push(xf);
      feedY.push(xf); // Feed point is on y=x line
  
      if (validYXIntersect && yxIntersectX != xf) {
        if (feedDirection === 'increasing' && yxIntersectX > xf) {
          feedX.push(yxIntersectX);
          feedY.push(yxIntersectX);
        } else if (feedDirection === 'decreasing' && yxIntersectX < xf) {
          feedX.push(yxIntersectX);
          feedY.push(yxIntersectX);
        } else {
          feedX.push(xIntersect);
          feedY.push(yIntersect);
        }
      } else {
        feedX.push(xIntersect);
        feedY.push(yIntersect);
      }
  
      if (feedX[feedX.length - 1] !== xIntersect || feedY[feedY.length - 1] !== yIntersect) {
        feedX.push(xIntersect);
        feedY.push(yIntersect);
      }
    }
  
    const feedLine = {
      x: feedX,
      y: feedY,
      type: 'scatter',
      mode: 'lines',
      name: 'Feed Section',
      line: { color: 'red', width: 2 },
      hovertemplate: 'Feed Line<br>x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>',
    };
    
    // Generate stripping section line
    const strippingSlope = (yIntersect - xb) / (xIntersect - xb);
    
    // Find where stripping section meets equilibrium curve
    const stripEqIntersection = findEquilibriumIntersection(
      strippingSlope,
      xb - strippingSlope * xb, // Intercept
      xb, // Start from xb
      xIntersect, // End at intersection point
      'increasing' // Direction
    );
    
    const strippingX = [];
    const strippingY = [];
    
    // Generate points from bottom to intersection, stopping at equilibrium if needed
    for (let i = 0; i <= 100; i++) {
      const x = xb + (i / 100) * (xIntersect - xb);
      // Stop if we've passed the intersection or hit the equilibrium
      if (x > xIntersect || (stripEqIntersection && x > stripEqIntersection[0])) break;
      strippingX.push(x);
      strippingY.push(strippingSlope * (x - xb) + xb);
    }
    
    const strippingLine = {
      x: strippingX,
      y: strippingY,
      type: 'scatter',
      mode: 'lines',
      name: 'Stripping Section',
      line: { color: 'green', width: 2 },
      hovertemplate: 'x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>'
    };
    
    // Update key points with specific names
    const keyPoints = {
      x: [xd, xb, xf],
      y: [xd, xb, xf],
      type: 'scatter',
      mode: 'markers',
      textposition: 'top center',
      marker: { 
        color: ['orange', 'green', 'red'], 
        size: 10,
        symbol: ['circle', 'circle', 'circle'] 
      },
      name: 'Key Points',
      showlegend: false,
      text: ['Distillate', 'Bottoms', 'Feed'],
      hovertemplate: '%{text}<br>x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>'
    };
    
    // Calculate stages
    let stageCount = 0;
    let feedStageCount = 0;
    let currentX = xd;
    let currentY = xd;
    const stageLines: Array<any> = [];
    let previousSectionIsRectifying = true; // Track which section we were in previously
    
    // Perform McCabe-Thiele iterations
    while (currentX > xb + 0.01 && stageCount < 20) {
      // Find intersection with equilibrium curve
      let intersectX = 0;
      let intersectY = 0;
      
      // Simple linear interpolation to find intersection
      for (let i = 0; i < xValues.length - 1; i++) {
        if (yValues[i] <= currentY && yValues[i+1] >= currentY) {
          const fraction = (currentY - yValues[i]) / (yValues[i+1] - yValues[i]);
          intersectX = xValues[i] + fraction * (xValues[i+1] - xValues[i]);
          intersectY = currentY;
          break;
        }
      }
      
      // Add horizontal stage line - with increased thickness
      stageLines.push({
        x: [currentX, intersectX],
        y: [currentY, currentY],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'white', width: 2 }, // Increased width from 1 to 2
        showlegend: false
      });
      
      // Move vertically to operating line or y=x line
      let nextY: number;
      const currentSectionIsRectifying = intersectX > xIntersect;
      
      if (currentSectionIsRectifying) {
        // In rectifying section
        nextY = rectifyingSlope * intersectX + rectifyingIntercept;
      } else {
        // In stripping section
        nextY = strippingSlope * (intersectX - xb) + xb;
      }
      
      // Detect transition from stripping to rectifying section (or vice versa)
      // The feed stage is the first stage that begins in the rectifying section
      if (currentSectionIsRectifying !== previousSectionIsRectifying) {
        // We've crossed the feed line - this is the feed stage
        feedStageCount = stageCount + 1;
      }

      // Update previous section for next iteration
      previousSectionIsRectifying = currentSectionIsRectifying;

      // Check if this is the last stage (near xb or almost at the max number of stages)
      const isLastStage = (intersectX <= xb + 0.05) || (stageCount >= 19);
      
      if (isLastStage) {
        // For the last stage, stop at the y=x line
        const yxLineY = intersectX; // On y=x line, y equals x
        
        // Add vertical stage line that stops at y=x line - with increased thickness
        stageLines.push({
          x: [intersectX, intersectX],
          y: [intersectY, yxLineY],
          type: 'scatter',
          mode: 'lines',
          line: { color: 'white', width: 2 }, // Increased width from 1 to 2
          showlegend: false
        });
        
        // Update current position to be on the y=x line
        currentX = intersectX;
        currentY = yxLineY;
      } else {
        // Add normal vertical stage line - with increased thickness
        stageLines.push({
          x: [intersectX, intersectX],
          y: [intersectY, nextY],
          type: 'scatter',
          mode: 'lines',
          line: { color: 'white', width: 2 }, // Increased width from 1 to 2
          showlegend: false
        });
        
        // Update current position
        currentX = intersectX;
        currentY = nextY;
      }
      
      stageCount++;
    }
    
    // If no feed stage was found (e.g., if we're always in the rectifying section)
    if (feedStageCount === 0) {
      feedStageCount = stageCount; // Set to total number of stages
    }
    
    // Update state with calculation results
    setStages(stageCount);
    setFeedStage(feedStageCount);
    
    // Combine all plot data
    const plotData = [
      equilibriumLine,
      yxLine,
      rectifyingLine,
      feedLine,
      strippingLine,
      keyPoints,
      ...stageLines
    ];

    // Capitalize first letter of components for plot title
    const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    const comp1Capitalized = capitalizeFirst(comp1);
    const comp2Capitalized = capitalizeFirst(comp2);
    
    // Get the more volatile component for axis labels
    const moreVolatile = volatilityInfo?.includes(`${comp1} is more volatile`) ? comp1 : comp2;
    
    // Set the plot layout with rounded corners and tick marks every 0.1
    const plotLayout = {
      title: {
        text: `McCabe-Thiele Diagram for ${comp1Capitalized} + ${comp2Capitalized} at ${useTemperature ? temperatureC + ' °C' : pressureBar + ' bar'}`,
        font: { color: 'white', family: 'Merriweather Sans', size: 18 }
      },
      xaxis: {
        title: {
          text: `Liquid mole fraction ${moreVolatile}`,
          font: { color: 'white', family: 'Merriweather Sans', size: 16 }
        },
        zerolinecolor: 'white',
        tickfont: { color: 'white', family: 'Merriweather Sans', size: 14 },
        tickmode: 'linear',
        ticks: 'inside', 
        ticklen: 8,
        tickwidth: 2,
        tickcolor: 'white',
        dtick: 0.1,
        tick0: 0,
        range: [0, 1],
        tickformat: '.1f'
      },
      yaxis: {
        title: {
          text: `Vapor mole fraction ${moreVolatile}`,
          font: { color: 'white', family: 'Merriweather Sans', size: 16 }
        },
        zerolinecolor: 'white',
        tickfont: { color: 'white', family: 'Merriweather Sans', size: 14 },
        tickmode: 'linear',
        ticks: 'inside', 
        ticklen: 8,
        tickwidth: 2,
        tickcolor: 'white',
        dtick: 0.1,
        tick0: 0,
        range: [0, 1],
        tickformat: '.1f'
      },
      legend: {
        x: 0.95,
        y: 0.05,
        xanchor: 'right',
        yanchor: 'bottom',
        bgcolor: 'rgba(0,0,0,0.5)',
        font: { color: 'white', family: 'Merriweather Sans', size: 12 }
      },
      plot_bgcolor: '#08306b',
      paper_bgcolor: '#08306b',
      hovermode: 'closest',
      autosize: true,
      height: 600,
      margin: { l: 50, r: 30, t: 60, b: 40 },
    };
    
    // Update state with plot data and layout
    setPlotData(plotData);
    setPlotLayout(plotLayout);
  }, [xd, xb, xf, q, r, equilibriumData, volatilityInfo]);

  // Format feed quality description
  const getFeedQualityState = () => {
    if (q === 1) return "Saturated Liquid";
    if (q === 0) return "Saturated Vapor";
    if (q > 1) return "Subcooled Liquid";
    if (q > 0 && q < 1) return "Partially Vaporized";
    return "Super Heated Vapor";
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVLEData();
  };
  
  // Toggle between temperature and pressure
  const toggleParameter = () => {
    setUseTemperature(!useTemperature);
  };
  
  // Ensure xd > xf > xb constraint
  const updateCompositions = (type: 'xd' | 'xf' | 'xb', value: number) => {
    if (type === 'xd') {
      // Ensure distillate composition is at least 0.01 more than feed composition
      if (value < xf + 0.01) {
        setXd(xf + 0.01);
      } else {
        setXd(value);
      }
    } else if (type === 'xf') {
      setXf(value);
    } else if (type === 'xb') {
      // Ensure bottoms composition is at least 0.01 less than feed composition
      if (value > xf - 0.01) {
        setXb(xf - 0.01);
      } else {
        setXb(value);
      }
    }
  };

  useEffect(() => {
    if (equilibriumData?.x && equilibriumData?.y) {
      generatePlotData(equilibriumData.x, equilibriumData.y);
    }
  }, [equilibriumData, generatePlotData]);

  return (
    <div className="container">
      <div className="simulation-layout">
        {/* Inputs Panel */}
        <div className="simulation-controls">
          <form onSubmit={handleSubmit}>
            <div className="control-group">
              <div className="component-row">
                <div className="component-inputs">
                  <div className="input-group horizontal-input-group">
                    <label htmlFor="comp1">Component 1:</label>
                    <input 
                      id="comp1"
                      type="text"
                      value={comp1}
                      onChange={(e) => setComp1(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="input-group horizontal-input-group">
                    <label htmlFor="comp2">Component 2:</label>
                    <input 
                      id="comp2"
                      type="text"
                      value={comp2}
                      onChange={(e) => setComp2(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="parameter-toggle">
                <button
                  type="button"
                  onClick={toggleParameter}
                  className={`toggle-btn ${useTemperature ? 'active' : ''}`}
                >
                  Temperature
                </button>
                <button
                  type="button"
                  onClick={toggleParameter}
                  className={`toggle-btn ${!useTemperature ? 'active' : ''}`}
                >
                  Pressure
                </button>
              </div>
              
              {useTemperature ? (
                <div className="input-group horizontal-input-group">
                  <label htmlFor="temperature">Temperature (°C):</label>
                  <input 
                    id="temperature"
                    type="number"
                    value={temperatureC}
                    onChange={(e) => setTemperatureC(Number(e.target.value))}
                    min="0"
                    step="1"
                    required
                  />
                </div>
              ) : (
                <div className="input-group horizontal-input-group">
                  <label htmlFor="pressure">Pressure (bar):</label>
                  <input 
                    id="pressure"
                    type="number"
                    value={pressureBar}
                    onChange={(e) => setPressureBar(Number(e.target.value))}
                    min="0"
                    step="0.1"
                    required
                  />
                </div>
              )}
              
              <div className="input-group submit-group">
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Calculating...' : 'Update Graph'}
                </button>
              </div>
            </div>
          </form>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="control-group">
            <div className="slider-group">
              <label htmlFor="xd">
                Distillate Composition: x<sub>D</sub> = {xd.toFixed(2)}
              </label>
              <input
                id="xd"
                type="range"
                min="0.02"
                max="0.99"
                step="0.01"
                value={xd}
                onChange={(e) => updateCompositions('xd', Number(e.target.value))}
              />
            </div>
            
            <div className="slider-group">
              <label htmlFor="xb">
                Bottoms Composition: x<sub>B</sub> = {xb.toFixed(2)}
              </label>
              <input
                id="xb"
                type="range"
                min="0.01"
                max="0.98"
                step="0.01"
                value={xb}
                onChange={(e) => updateCompositions('xb', Number(e.target.value))}
              />
            </div>
            
            <div className="slider-group">
              <label htmlFor="xf">
                Feed Composition: x<sub>F</sub> = {xf.toFixed(2)}
              </label>
              <input
                id="xf"
                type="range"
                min="0.02"
                max="0.98"
                step="0.01"
                value={xf}
                onChange={(e) => {
                  const newXf = Number(e.target.value);
                  
                  // Ensure feed is between xb and xd with minimum spacing
                  if (newXf >= xd - 0.01) {
                    setXd(newXf + 0.01);
                  }
                  
                  if (newXf <= xb + 0.01) {
                    setXb(newXf - 0.01);
                  }
                  
                  setXf(newXf);
                }}
              />
            </div>
            
            <div className="slider-group">
              <label htmlFor="q">
                Feed Quality: q = {q.toFixed(2)} 
                <span title={getFeedQualityState()} className="info-tooltip">ⓘ</span>
              </label>
              <input
                id="q"
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={q}
                onChange={(e) => setQ(Number(e.target.value))}
              />
            </div>
            
            <div className="slider-group">
              <label htmlFor="r">
                Reflux Ratio: R = {r.toFixed(2)}
              </label>
              <input
                id="r"
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={r}
                onChange={(e) => setR(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        
        {/* Plot Panel */}
        <div className="simulation-display">
          <div className="simulation-graph">
            {plotReady ? (
              equilibriumData ? (
                <PlotlyComponent
                  data={plotData}
                  layout={plotLayout}
                  config={{ responsive: true }}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="empty-plot">
                  <p>
                    {loading 
                      ? "Calculating VLE data..." 
                      : "Select components and operating conditions, then click Submit to generate the McCabe-Thiele diagram."}
                  </p>
                </div>
              )
            ) : (
              <div className="empty-plot">
                <p>Loading Plotly.js...</p>
              </div>
            )}
          </div>
          
          {stages !== null && (
            <div className="results-container">
              <div className="results-grid">
                <div className="result-item">
                  <div className="result-label">Number of Stages</div>
                  <div className="result-value">{stages}</div>
                </div>
                <div className="result-item">
                  <div className="result-label">Feed Stage</div>
                  <div className="result-value">{feedStage}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
