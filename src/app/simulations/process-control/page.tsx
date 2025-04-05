"use client";
import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Helper function for calculating response
const calculateResponse = (
  order: 'first' | 'second',
  func: 'step' | 'ramp',
  K: number,
  M: number,
  tau: number,
  zeta: number | null,
  t_max: number = 50,
  num_points: number = 200
): { t: number[], y: number[], y_input: number[], metrics: Record<string, number | null> } => {
  const t = Array.from({ length: num_points }, (_, i) => i * t_max / (num_points - 1));
  let y = Array(num_points).fill(0);
  let y_input = Array(num_points).fill(0);
  let metrics: Record<string, number | null> = {
    peak_time: null,
    overshoot: null,
    oscillation_period: null,
    decay_ratio: null,
  };

  tau = Math.max(tau, 1e-9); // Avoid division by zero

  if (order === 'first') {
    if (func === 'step') {
      y = t.map(ti => K * M * (1 - Math.exp(-ti / tau)));
      y_input = y_input.map(() => M);
    } else if (func === 'ramp') {
      y = t.map(ti => K * M * (tau * (Math.exp(-ti / tau) - 1) + ti));
      y_input = t.map(ti => M * ti);
    }
  } else if (order === 'second' && zeta !== null) {
    if (func === 'step') {
      y_input = y_input.map(() => M);
      if (zeta < 1) {
        const wd = Math.sqrt(1 - zeta**2) / tau;
        const exp_term = (ti: number) => Math.exp(-zeta * ti / tau);
        const cos_term = (ti: number) => Math.cos(wd * ti);
        const sin_term = (ti: number) => Math.sin(wd * ti);
        y = t.map(ti => K * M * (1 - exp_term(ti) * (cos_term(ti) + (zeta / Math.sqrt(1 - zeta**2)) * sin_term(ti))));

        metrics.peak_time = Math.PI * tau / Math.sqrt(1 - zeta**2);
        metrics.overshoot = Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta**2));
        metrics.oscillation_period = 2 * Math.PI * tau / Math.sqrt(1 - zeta**2);
        metrics.decay_ratio = metrics.overshoot**2;

      } else if (zeta === 1) {
        y = t.map(ti => K * M * (1 - (1 + ti / tau) * Math.exp(-ti / tau)));
      } else { // zeta > 1
        const r1 = (-zeta + Math.sqrt(zeta**2 - 1)) / tau;
        const r2 = (-zeta - Math.sqrt(zeta**2 - 1)) / tau;
        y = t.map(ti => K * M * (1 - (r1 * Math.exp(r2 * ti) - r2 * Math.exp(r1 * ti)) / (r1 - r2)));
      }
    }
    // Ramp for second order is disabled in UI, so no calculation needed here
  }

  return { t, y, y_input, metrics };
};


export default function ProcessDynamicsPage() {
  const [order, setOrder] = useState<'first' | 'second'>('first');
  const [func, setFunc] = useState<'step' | 'ramp'>('step');
  const [K, setK] = useState(1);
  const [M, setM] = useState(1);
  const [tau, setTau] = useState(1);
  const [zeta, setZeta] = useState<number | null>(1); // Zeta only relevant for second order
  const [lockYAxis, setLockYAxis] = useState(false);
  const [yAxisRange, setYAxisRange] = useState<[number, number] | null>(null);
  const [plotData, setPlotData] = useState<any>(null);
  const [metrics, setMetrics] = useState<Record<string, number | null>>({});

  // Set the page title
  useEffect(() => {
    const title = document.querySelector('.page-title');
    if (title) title.textContent = 'Process Dynamics Simulator';
    const navbar = document.querySelector('.navbar-wrapper');
    if (navbar) navbar.classList.add('with-title');
  }, []);

  // Update plot when parameters change
  useEffect(() => {
    const { t, y, y_input, metrics: calculatedMetrics } = calculateResponse(order, func, K, M, tau, zeta);
    setMetrics(calculatedMetrics);

    const traces = [
      { x: t, y: y, mode: 'lines', name: 'System Response', line: { color: 'yellow' } },
      { x: t, y: y_input, mode: 'lines', name: 'Input', line: { color: 'red', dash: 'dot' } }
    ];

    let currentYRange: [number, number] | undefined = undefined;
    if (lockYAxis && yAxisRange) {
        currentYRange = yAxisRange;
    } else {
        const minY = Math.min(0, ...y, ...y_input);
        const maxY = Math.max(1, ...y, ...y_input); // Ensure range is at least 0-1
        const buffer = (maxY - minY) * 0.1 || 0.1;
        currentYRange = [minY - buffer, maxY + buffer];
        if (!lockYAxis) {
            setYAxisRange(currentYRange); // Store the calculated range if not locked
        }
    }


    const layout = {
      title: {
        text: `${order === 'first' ? 'First' : 'Second'} Order ${func === 'step' ? 'Step' : 'Ramp'} Response`,
        x: 0.5,
        font: { size: 24, family: 'Merriweather Sans', color: 'white' }
      },
      xaxis: {
        title: 'Time',
        titlefont: { size: 18, family: 'Merriweather Sans', color: 'white' },
        tickfont: { size: 14, family: 'Merriweather Sans', color: 'white' },
        range: [0, 50], // Fixed x-axis range
        showgrid: true, zeroline: true, linecolor: 'white', tickcolor: 'white', zerolinecolor: 'white'
      },
      yaxis: {
        title: 'Response / Input',
        titlefont: { size: 18, family: 'Merriweather Sans', color: 'white' },
        tickfont: { size: 14, family: 'Merriweather Sans', color: 'white' },
        range: currentYRange,
        showgrid: true, zeroline: true, linecolor: 'white', tickcolor: 'white', zerolinecolor: 'white'
      },
      legend: { font: { color: 'white' }, bgcolor: 'rgba(0,0,0,0.2)' },
      template: 'plotly_dark',
      plot_bgcolor: '#08306b',
      paper_bgcolor: '#08306b',
      autosize: true, // Let Plotly handle sizing within its container
      margin: { l: 60, r: 20, t: 80, b: 60 } // Adjust margins
    };

    setPlotData({ data: traces, layout });

  }, [order, func, K, M, tau, zeta, lockYAxis]); // Re-run effect when these change

  const handleOrderChange = (newOrder: 'first' | 'second') => {
    setOrder(newOrder);
    if (newOrder === 'first') {
      setZeta(null); // Zeta not needed for first order
      if (func === 'ramp') setFunc('step'); // Reset to step if ramp was selected (as ramp is disabled for 2nd)
    } else {
      setZeta(1); // Default zeta for second order
    }
  };

  const handleFuncChange = (newFunc: 'step' | 'ramp') => {
    if (order === 'second' && newFunc === 'ramp') return; // Prevent selecting ramp for second order
    setFunc(newFunc);
  };

  const formatSliderValue = (value: number | null, decimals: number = 1): string => {
    return value !== null ? value.toFixed(decimals) : '';
  };

  return (
    <div className="container p-4">
      <div className="simulation-layout" style={{ alignItems: 'flex-start' }}>
        {/* Left Controls */}
        <div className="simulation-controls">
          <div className="control-group">
            <h3 className="text-xl mb-4">System Order</h3>
            <div className="flex gap-2 mb-4">
              <button onClick={() => handleOrderChange('first')} className={`submit-btn py-2 px-4 rounded ${order === 'first' ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}>1st Order</button>
              <button onClick={() => handleOrderChange('second')} className={`submit-btn py-2 px-4 rounded ${order === 'second' ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}>2nd Order</button>
            </div>

            <h3 className="text-xl mb-4">Input Function</h3>
            <div className="flex gap-2 mb-4">
              <button onClick={() => handleFuncChange('step')} className={`submit-btn py-2 px-4 rounded ${func === 'step' ? 'bg-green-700' : 'bg-green-600 hover:bg-green-700'}`}>Step</button>
              <button
                onClick={() => handleFuncChange('ramp')}
                className={`submit-btn py-2 px-4 rounded ${func === 'ramp' ? 'bg-green-700' : 'bg-green-600 hover:bg-green-700'} ${order === 'second' ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={order === 'second'}
              >
                Ramp
              </button>
            </div>
          </div>

          <div className="control-group">
            <h3 className="text-xl mb-4">Parameters</h3>
            {/* K Slider */}
            <div className="slider-group">
              <label className="flex justify-between"><span>Gain (K):</span><span>{formatSliderValue(K)}</span></label>
              <input type="range" min="0.1" max="10" step="0.1" value={K} onChange={(e) => setK(parseFloat(e.target.value))} className="kinetics-slider" />
            </div>
            {/* M Slider */}
            <div className="slider-group">
              <label className="flex justify-between"><span>Magnitude (M):</span><span>{formatSliderValue(M)}</span></label>
              <input type="range" min="0.1" max="10" step="0.1" value={M} onChange={(e) => setM(parseFloat(e.target.value))} className="kinetics-slider" />
            </div>
            {/* Tau Slider */}
            <div className="slider-group">
              <label className="flex justify-between"><span>Time Constant (τ):</span><span>{formatSliderValue(tau)}</span></label>
              <input type="range" min="0.1" max="10" step="0.1" value={tau} onChange={(e) => setTau(parseFloat(e.target.value))} className="kinetics-slider" />
            </div>
            {/* Zeta Slider (Conditional) */}
            {order === 'second' && (
              <div className="slider-group">
                <label className="flex justify-between"><span>Damping Ratio (ζ):</span><span>{formatSliderValue(zeta, 2)}</span></label>
                <input type="range" min="0" max="2" step="0.01" value={zeta ?? 1} onChange={(e) => setZeta(parseFloat(e.target.value))} className="kinetics-slider" />
              </div>
            )}
             <div className="flex items-center mt-4">
                <input type="checkbox" id="lock-y" checked={lockYAxis} onChange={(e) => setLockYAxis(e.target.checked)} className="mr-2"/>
                <label htmlFor="lock-y">Lock Y-axis</label>
            </div>
          </div>
        </div>

        {/* Right Graph & Metrics */}
        <div className="simulation-display flex-grow flex flex-col items-center"> {/* Use flex-grow */}
          {plotData ? (
            <div className="simulation-graph w-full" style={{ minHeight: '500px' }}> {/* Ensure graph container takes width */}
              <Plot
                data={plotData.data}
                layout={plotData.layout}
                useResizeHandler={true} // Enable automatic resizing
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true }}
              />
            </div>
          ) : (
            <div className="empty-plot">Loading graph...</div>
          )}
           {/* Metrics Display (Conditional) */}
           {order === 'second' && func === 'step' && zeta !== null && zeta < 1 && (
            <div className="control-group mt-4 w-full max-w-[600px]"> {/* Match graph width */}
              <h3 className="text-xl mb-2">Performance Metrics</h3>
              <p>Peak Time: {metrics.peak_time?.toFixed(2) ?? 'N/A'}</p>
              <p>Overshoot Ratio: {metrics.overshoot?.toFixed(2) ?? 'N/A'}</p>
              <p>Oscillation Period: {metrics.oscillation_period?.toFixed(2) ?? 'N/A'}</p>
              <p>Decay Ratio: {metrics.decay_ratio?.toFixed(2) ?? 'N/A'}</p>
            </div>
          )}
        </div>
      </div>
      {/* Add necessary styles if not already in globals.css */}
      <style jsx>{`
        .simulation-layout {
          display: flex;
          flex-direction: row; /* Default: controls left, graph right */
          gap: 2rem;
          margin-top: 1rem;
        }
        .simulation-controls {
          flex: 0 0 350px; /* Fixed width for controls */
          min-width: 320px;
        }
        .simulation-display {
          flex: 1; /* Takes remaining space */
          min-width: 400px; /* Minimum width for the graph area */
          display: flex;
          flex-direction: column;
          align-items: center; /* Center graph and metrics */
        }
        .simulation-graph {
             width: 100%;
             max-width: 700px; /* Max width for the graph */
             aspect-ratio: 1 / 1; /* Maintain square aspect ratio */
             margin-bottom: 1rem; /* Space below graph */
        }
        .control-group {
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background-color: var(--simulation-card-bg);
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
         .slider-group {
          margin-bottom: 1rem;
          width: 100%;
        }
        .slider-group label {
          display: flex;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 0.5rem;
        }
        /* Basic slider styling (customize further if needed) */
        input[type="range"].kinetics-slider {
           width: 100%;
           cursor: pointer;
           /* Add more styles from globals.css if needed */
        }
        /* Add spacing for buttons */
        .control-group .flex.gap-2 button {
          margin-right: 0.5rem; /* Add right margin to buttons within flex gap-2 */
          padding: 0.5rem 1rem; /* Add padding to buttons */
        }
        .control-group .flex.gap-2 button:last-child {
          margin-right: 0; /* Remove margin from the last button */
        }


        @media (max-width: 1024px) {
          .simulation-layout {
            flex-direction: column;
          }
          .simulation-controls {
            max-width: 100%;
            flex-basis: auto; /* Allow controls to resize */
          }
           .simulation-graph {
             max-width: 100%; /* Allow graph to fill width */
             aspect-ratio: unset; /* Allow aspect ratio to change */
             min-height: 400px; /* Ensure minimum height */
           }
        }
      `}</style>
    </div>
  );
}
