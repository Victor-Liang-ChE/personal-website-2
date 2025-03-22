'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Create a wrapper component to handle Plotly properly
const PlotlyComponent = dynamic(() => import('react-plotly.js').then(mod => {
  const Plot = mod.default;
  return function PlotWrapper(props: any) {
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
  const [minimumStages, setMinimumStages] = useState<number | null>(null);
  const [minimumReflux, setMinimumReflux] = useState<number | null>(null);
  
  // State for the plot data
  const [plotData, setPlotData] = useState<any[]>([]);
  const [plotLayout, setPlotLayout] = useState<any>({});
  
  // Convert Celsius to Kelvin for calculations
  const getTemperatureK = () => temperatureC + 273.15;
  
  // Convert bar to Pascal for calculations
  const getPressurePa = () => pressureBar * 100000;
  
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
  
  // Function to determine component volatility through API
  const getComponentVolatility = async (comp1: string, comp2: string) => {
    try {
      // In a real implementation, this would call an API endpoint to get boiling points
      // For now, we'll simulate an API call with timeout
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simulate API response with component volatility information
      // In a real implementation, this would call a Python backend using thermo library
      const response = {
        moreVolatile: comp1.toLowerCase() === 'methanol' ? comp1 : comp2,
        bp1: 0, // These would be retrieved from the API
        bp2: 0
      };
      
      return {
        message: `${response.moreVolatile} is more volatile`,
        moreVolatile: response.moreVolatile,
        bp1: response.bp1,
        bp2: response.bp2
      };
    } catch (error) {
      console.error("Error fetching component volatility:", error);
      return {
        message: `Could not determine volatility for ${comp1} or ${comp2}`,
        moreVolatile: null,
        bp1: null,
        bp2: null
      };
    }
  };
  
  // Function to fetch VLE data from the API
  const fetchVLEData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In production, this would call an API endpoint
      // For now, we'll simulate a successful response with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get volatility information
      const volatility = await getComponentVolatility(comp1, comp2);
      setVolatilityInfo(volatility.message);
      
      // Create mock equilibrium data (simplified example)
      // In a real implementation, this would come from the API
      const xValues = Array.from({ length: 101 }, (_, i) => i / 100);
      const yValues = xValues.map(x => {
        // Simple VLE model for demonstration
        // In real implementation, this would be calculated by the Python backend
        return (1.5 * x) / (1 + 0.5 * x);
      });
      
      // Set the equilibrium data
      setEquilibriumData({
        x: xValues,
        y: yValues,
        polyCoeffs: [1.5, 0] // Simple polynomial coefficients for demo
      });
      
      // Generate the plot data
      generatePlotData(xValues, yValues);
      
    } catch (err) {
      console.error("Error fetching VLE data:", err);
      setError("Failed to load equilibrium data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Function to generate plot data based on McCabe-Thiele method
  const generatePlotData = (xValues: number[], yValues: number[]) => {
    // Generate equilibrium line
    const equilibriumLine = {
      x: xValues,
      y: yValues,
      type: 'scatter',
      mode: 'lines',
      name: 'Equilibrium Line',
      line: { color: 'yellow', width: 2 }
    };
    
    // Generate y=x line
    const yxLine = {
      x: [0, 1],
      y: [0, 1],
      type: 'scatter',
      mode: 'lines',
      name: 'y = x Line',
      line: { color: 'white', width: 1, dash: 'dot' }
    };
    
    // Generate rectifying section line
    const rectifyingSlope = r / (r + 1);
    const rectifyingIntercept = xd / (r + 1);
    const rectifyingX = Array.from({ length: 101 }, (_, i) => i / 100);
    const rectifyingY = rectifyingX.map(x => rectifyingSlope * x + rectifyingIntercept);
    
    const rectifyingLine = {
      x: rectifyingX,
      y: rectifyingY,
      type: 'scatter',
      mode: 'lines',
      name: 'Rectifying Line',
      line: { color: 'orange', width: 2 }
    };
    
    // Generate feed line
    let feedSlope: number;
    if (q === 1) {
      feedSlope = Number.POSITIVE_INFINITY; // Vertical line
    } else {
      feedSlope = q / (q - 1);
    }
    const feedIntercept = -xf / (q - 1);
    
    const feedX = Array.from({ length: 101 }, (_, i) => i / 100);
    const feedY = feedSlope === Number.POSITIVE_INFINITY 
      ? feedX.map(() => 0) // Will be adjusted in layout
      : feedX.map(x => feedSlope * x + feedIntercept);
    
    const feedLine = {
      x: feedX,
      y: feedY,
      type: 'scatter',
      mode: 'lines',
      name: 'Feed Line',
      line: { color: 'red', width: 2 }
    };
    
    // Find intersection point of rectifying and feed lines
    let xIntersect: number;
    let yIntersect: number;
    
    if (feedSlope === Number.POSITIVE_INFINITY) {
      xIntersect = xf;
      yIntersect = rectifyingSlope * xf + rectifyingIntercept;
    } else {
      xIntersect = (feedIntercept - rectifyingIntercept) / (rectifyingSlope - feedSlope);
      yIntersect = rectifyingSlope * xIntersect + rectifyingIntercept;
    }
    
    // Generate stripping section line
    const strippingSlope = (yIntersect - xb) / (xIntersect - xb);
    const strippingX = Array.from({ length: 101 }, (_, i) => xb + (i / 100) * (xIntersect - xb));
    const strippingY = strippingX.map(x => strippingSlope * (x - xb) + xb);
    
    const strippingLine = {
      x: strippingX,
      y: strippingY,
      type: 'scatter',
      mode: 'lines',
      name: 'Stripping Line',
      line: { color: 'green', width: 2 }
    };
    
    // Generate key points
    const keyPoints = {
      x: [xd, xb, xf],
      y: [xd, xb, xf],
      type: 'scatter',
      mode: 'markers',
      marker: { 
        color: ['orange', 'green', 'red'], 
        size: 10,
        symbol: ['square', 'circle', 'diamond'] 
      },
      name: 'Key Points',
      showlegend: false
    };
    
    // Calculate stages
    let stageCount = 0;
    let feedStageCount = 0;
    let currentX = xd;
    let currentY = xd;
    const stageLines: Array<any> = [];
    
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
      
      // Add horizontal stage line
      stageLines.push({
        x: [currentX, intersectX],
        y: [currentY, currentY],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'white', width: 1 },
        showlegend: false
      });
      
      // Move vertically to operating line
      let nextY: number;
      
      if (intersectX > xIntersect) {
        // In rectifying section
        nextY = rectifyingSlope * intersectX + rectifyingIntercept;
        if (feedStageCount === 0) feedStageCount = stageCount + 1;
      } else {
        // In stripping section
        nextY = strippingSlope * (intersectX - xb) + xb;
      }
      
      // Add vertical stage line
      stageLines.push({
        x: [intersectX, intersectX],
        y: [intersectY, nextY],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'white', width: 1 },
        showlegend: false
      });
      
      // Update current position
      currentX = intersectX;
      currentY = nextY;
      stageCount++;
    }
    
    // Update state with calculation results
    setStages(stageCount);
    setFeedStage(feedStageCount);
    
    // Set the minimum stages using a simplified Fenske equation
    // In a real implementation, this would be calculated based on the relative volatility
    setMinimumStages(Math.ceil(stageCount * 0.6));
    
    // Set the minimum reflux ratio
    // In a real implementation, this would be calculated using Underwood equation
    setMinimumReflux(r * 0.7);
    
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
    
    // Set the plot layout
    const plotLayout = {
      title: {
        text: `McCabe-Thiele Diagram for ${comp1Capitalized} + ${comp2Capitalized} at ${useTemperature ? temperatureC + ' °C' : pressureBar + ' bar'}`,
        font: { color: 'white', family: 'Merriweather Sans', size: 18 }
      },
      xaxis: {
        title: `Liquid mole fraction ${comp1}`,
        titlefont: { color: 'white', size: 16 },
        range: [0, 1],
        gridcolor: 'transparent', // Remove grid
        zerolinecolor: 'white',
        tickfont: { color: 'white', size: 14 },
        dtick: 0.1, // Tick marks every 0.1
        showgrid: false,
        fixedrange: true // Prevent user from zooming beyond 0-1 range
      },
      yaxis: {
        title: `Vapor mole fraction ${comp1}`,
        titlefont: { color: 'white', size: 16 },
        range: [0, 1],
        scaleanchor: 'x',
        scaleratio: 1,
        gridcolor: 'transparent', // Remove grid
        zerolinecolor: 'white',
        tickfont: { color: 'white', size: 14 },
        dtick: 0.1, // Tick marks every 0.1
        showgrid: false,
        fixedrange: true // Prevent user from zooming beyond 0-1 range
      },
      legend: {
        x: 0.95, // Move to right
        y: 0.05, // Move to bottom
        xanchor: 'right',
        yanchor: 'bottom',
        bgcolor: 'rgba(0,0,0,0.5)',
        font: { color: 'white', size: 12 }
      },
      plot_bgcolor: '#08306b',
      paper_bgcolor: '#08306b',
      hovermode: 'closest',
      autosize: true, // Allow the plot to resize with container
      height: 600,
      margin: { l: 60, r: 30, t: 60, b: 60 }
    };
    
    // Update state with plot data and layout
    setPlotData(plotData);
    setPlotLayout(plotLayout);
  };

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

  return (
    <div className="container">
      <div className="simulation-layout">
        {/* Inputs Panel */}
        <div className="simulation-controls">
          <form onSubmit={handleSubmit}>
            <div className="control-group">
              <div className="component-row">
                <div className="component-inputs">
                  <div className="input-group">
                    <label htmlFor="comp1">Component 1:</label>
                    <input 
                      id="comp1"
                      type="text"
                      value={comp1}
                      onChange={(e) => setComp1(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="input-group">
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
                
                {volatilityInfo && (
                  <div className="volatility-info">
                    {volatilityInfo}
                  </div>
                )}
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
                <div className="input-group temperature-input">
                  <label htmlFor="temperature" className="temp-label">Temperature (°C):</label>
                  <input 
                    id="temperature"
                    type="number"
                    value={temperatureC}
                    onChange={(e) => setTemperatureC(Number(e.target.value))}
                    min="0"
                    step="1"
                    required
                    style={{ width: '120px' }} // Make input smaller
                  />
                </div>
              ) : (
                <div className="input-group temperature-input">
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
                min="0"
                max="1"
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
                min="0"
                max="1"
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
                min="0"
                max="1"
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
                Feed Quality: q = {q.toFixed(2)} <span className="quality-state">({getFeedQualityState()})</span>
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
              <h3>Results</h3>
              <div className="results-grid">
                <div className="result-item">
                  <span>Number of Stages: </span>
                  <strong>{stages}</strong>
                </div>
                <div className="result-item">
                  <span>Feed Stage: </span>
                  <strong>{feedStage}</strong>
                </div>
                {minimumStages !== null && (
                  <div className="result-item">
                    <span>Minimum Stages: </span>
                    <strong>{minimumStages.toFixed(2)}</strong>
                  </div>
                )}
                {minimumReflux !== null && (
                  <div className="result-item">
                    <span>Minimum Reflux: </span>
                    <strong>{minimumReflux.toFixed(2)}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem;
        }
        
        .content-container {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 1.5rem;
          overflow-x: hidden; /* Prevent horizontal scrolling */
        }
        
        .simulation-layout {
          display: flex;
          flex-direction: row;
          gap: 2rem;
          margin-top: 1rem;
          width: 100%;
          overflow-x: hidden; /* Prevent horizontal scrolling */
        }
        
        @media (max-width: 1200px) {
          .simulation-layout {
            flex-direction: column;
          }
        }
        
        .component-row {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        
        .component-inputs {
          flex: 0 0 60%;
        }
        
        .volatility-info {
          flex: 0 0 35%;
          background-color: rgba(77, 166, 255, 0.1);
          padding: 0.5rem;
          border-radius: 4px;
          margin-top: 1.5rem;
          min-height: 2rem;
          display: flex;
          align-items: center;
          font-style: italic;
          align-self: center;
        }
        
        .simulation-controls {
          flex: 0 0 350px;
          min-width: 320px;
          max-width: 400px;
        }
        
        .simulation-display {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          min-width: 0; /* Critical for preventing flex children from expanding beyond parent */
        }
        
        .simulation-graph {
          width: 100%;
          min-height: 600px;
          overflow: hidden;
        }
        
        .control-group {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }
        
        .input-group {
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }
        
        .temperature-input {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .temperature-input label {
          flex: 1;
        }

        .temperature-input input {
          flex: 1;
          width: auto !important;
        }
        
        .input-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          margin-right: 0.5rem;
          white-space: nowrap;
        }
        
        .input-group input[type="text"],
        .input-group input[type="number"] {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #4DA6FF;
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text-color, white);
          border-radius: 4px;
        }
        
        .parameter-toggle {
          display: flex;
          margin: 1rem 0;
        }
        
        .toggle-btn {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #4DA6FF;
          background-color: transparent;
          color: white;
          cursor: pointer;
        }
        
        .toggle-btn:first-child {
          border-radius: 4px 0 0 4px;
        }
        
        .toggle-btn:last-child {
          border-radius: 0 4px 4px 0;
        }
        
        .toggle-btn.active {
          background-color: #4DA6FF;
          color: white;
        }
        
        .submit-btn {
          padding: 0.75rem 1rem;
          background-color: #4DA6FF;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          width: 100%;
          transition: background-color 0.2s;
        }
        
        .submit-btn:hover:not(:disabled) {
          background-color: #3284d6;
        }
        
        .submit-btn:disabled {
          background-color: #666;
          cursor: not-allowed;
        }
        
        .slider-group {
          margin-bottom: 1.25rem;
        }
        
        .slider-group label {
          display: block;
          margin-bottom: 0.5rem;
        }
        
        .slider-group input[type="range"] {
          width: 100%;
          margin-top: 0.5rem;
        }

        .quality-state {
          font-size: 1em;
          font-weight: normal;
          margin-left: 0.5rem;
        }
        
        .results-container {
          margin-top: 1.5rem;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 1rem;
        }
        
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          overflow-x: hidden;
        }
        
        
        .empty-plot {
          height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #08306b;
          color: white;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
        }
        
        .loading-plot {
          height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #08306b;
          color: white;
          border-radius: 8px;
          padding: 2rem;
        }
        
        .error-message {
          color: #ff6b6b;
          margin-bottom: 1rem;
          padding: 0.5rem;
          background-color: rgba(255, 107, 107, 0.1);
          border-radius: 4px;
        }
        
        .temp-label {
          white-space: nowrap;
          margin-right: 0.5rem;
        }
        
        .temp-input {
          width: 120px;
        }
        
        .result-item {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.75rem;
          border-radius: 4px;
          word-break: break-word;
          overflow-wrap: break-word;
        }
      `}</style>
    </div>
  );
}
