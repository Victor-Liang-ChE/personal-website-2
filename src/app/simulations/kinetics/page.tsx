"use client";
import React, { useState, useEffect, KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';

// Import Plotly dynamically to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Function to detect unique species in the order they appear
function detectUniqueSpeciesOrdered(reactions: string[]): string[] {
  const orderedSpecies: string[] = [];
  const uniqueSpecies = new Set<string>();
  
  for (const reaction of reactions) {
    if (!reaction) continue;
    
    // Split the reaction into reactants and products
    const [reactants, products] = reaction.split('->');
    
    // Extract species from reactants and products
    const reactantSpecies = reactants.split('+').map(species => 
      species.trim().replace(/^\d*\*?/, ''));
    
    const productSpecies = products.split('+').map(species => 
      species.trim().replace(/^\d*\*?/, ''));
    
    // Add species to the ordered list if they are not already in the set
    for (const species of [...reactantSpecies, ...productSpecies]) {
      if (!uniqueSpecies.has(species)) {
        uniqueSpecies.add(species);
        orderedSpecies.push(species);
      }
    }
  }
  
  return orderedSpecies;
}

// Function to format species names with subscripted numbers
function formatSpecies(species: string): React.ReactNode {
  const parts = species.split(/(\d+)/);
  return (
    <>
      {parts.map((part, i) => 
        part.match(/^\d+$/) ? <sub key={i}>{part}</sub> : part
      )}
    </>
  );
}

// Replace the RK4 solver with the Adaptive RK45 solver
/**
 * Adaptive RK45 solver using the Dormand–Prince method.
 *
 * @param dydt - The derivative function f(t, y) that returns an array of derivatives.
 * @param y0 - Initial conditions (array of numbers).
 * @param tSpan - [t0, tf] time span for the simulation.
 * @param tol - Tolerance for the error estimate (default 1e-6).
 * @param h_initial - Initial step size (default 0.1).
 * @param maxSteps - Maximum number of steps allowed (default 10000).
 * @returns Object containing arrays of time points (t) and corresponding states (y). y is an array of arrays, where each inner array represents the state at a specific time point.
 */
function solveODERK45(
  dydt: (t: number, y: number[]) => number[],
  y0: number[],
  tSpan: [number, number],
  tol: number = 1e-6,
  h_initial: number = 0.1,
  maxSteps: number = 10000
): { t: number[]; y: number[][] } {
  const [t0, tf] = tSpan;
  let t = t0;
  let y = y0.slice(); // copy initial state
  const t_arr = [t];
  const y_arr = [y.slice()]; // y_arr stores states at each time step

  // Adaptive step parameters
  let h = h_initial;
  const safety = 0.84;
  const minFactor = 0.2;
  const maxFactor = 5.0;

  // Dormand–Prince coefficients (RK45)
  // c values
  const c2 = 1/5, c3 = 3/10, c4 = 4/5, c5 = 8/9, c6 = 1, c7 = 1;
  // a coefficients (lower-triangular matrix)
  const a21 = 1/5;
  const a31 = 3/40,  a32 = 9/40;
  const a41 = 44/45, a42 = -56/15, a43 = 32/9;
  const a51 = 19372/6561, a52 = -25360/2187, a53 = 64448/6561, a54 = -212/729;
  const a61 = 9017/3168,  a62 = -355/33,    a63 = 46732/5247, a64 = 49/176,  a65 = -5103/18656;
  const a71 = 35/384,   a72 = 0,          a73 = 500/1113,  a74 = 125/192, a75 = -2187/6784, a76 = 11/84;
  // b coefficients for the 5th‑order solution
  const b1 = 35/384, b2 = 0, b3 = 500/1113, b4 = 125/192, b5 = -2187/6784, b6 = 11/84, b7 = 0;
  // b* coefficients for the 4th‑order solution
  const b1s = 5179/57600, b2s = 0, b3s = 7571/16695, b4s = 393/640, b5s = -92097/339200, b6s = 187/2100, b7s = 1/40;

  let stepCount = 0;
  while (t < tf && stepCount < maxSteps) {
    // Adjust final step if necessary
    if (t + h > tf) {
      h = tf - t;
    }
    if (h <= 0) break; // Prevent infinite loop if h becomes non-positive

    // Compute the RK stages:
    const k1 = dydt(t, y);
    const y2 = y.map((yi, i) => yi + h * a21 * k1[i]);
    const k2 = dydt(t + c2 * h, y2);
    const y3 = y.map((yi, i) => yi + h * (a31 * k1[i] + a32 * k2[i]));
    const k3 = dydt(t + c3 * h, y3);
    const y4 = y.map((yi, i) => yi + h * (a41 * k1[i] + a42 * k2[i] + a43 * k3[i]));
    const k4 = dydt(t + c4 * h, y4);
    const y5 = y.map((yi, i) => yi + h * (a51 * k1[i] + a52 * k2[i] + a53 * k3[i] + a54 * k4[i]));
    const k5 = dydt(t + c5 * h, y5);
    const y6 = y.map((yi, i) => yi + h * (a61 * k1[i] + a62 * k2[i] + a63 * k3[i] + a64 * k4[i] + a65 * k5[i]));
    const k6 = dydt(t + c6 * h, y6);
    const y7 = y.map((yi, i) => yi + h * (a71 * k1[i] + a72 * k2[i] + a73 * k3[i] + a74 * k4[i] + a75 * k5[i] + a76 * k6[i]));
    const k7 = dydt(t + c7 * h, y7);

    // Compute 5th-order solution
    const y5th = y.map((yi, i) =>
      yi + h * (b1 * k1[i] + b2 * k2[i] + b3 * k3[i] + b4 * k4[i] + b5 * k5[i] + b6 * k6[i] + b7 * k7[i])
    );
    // Compute 4th-order solution
    const y4th = y.map((yi, i) =>
      yi + h * (b1s * k1[i] + b2s * k2[i] + b3s * k3[i] + b4s * k4[i] + b5s * k5[i] + b6s * k6[i] + b7s * k7[i])
    );

    // Estimate the error using the maximum absolute difference
    let error = 0;
    for (let i = 0; i < y.length; i++) {
      error = Math.max(error, Math.abs(y5th[i] - y4th[i]));
    }
    error = error || 1e-10; // Avoid division by zero if error is exactly 0

    // If error is within tolerance, accept the step
    if (error <= tol) {
      t += h;
      y = y5th.slice();
      t_arr.push(t);
      y_arr.push(y.slice());
    }

    // Adjust the step size for the next iteration.
    const factor = safety * Math.pow(tol / error, 1 / 5);
    const factorClamped = Math.min(maxFactor, Math.max(minFactor, factor));
    h = h * factorClamped;
    stepCount++;
  }

  if (stepCount >= maxSteps) {
    console.warn(`RK45 solver reached maximum steps (${maxSteps})`);
  }

  // Transpose y_arr to match the previous format (rows = species, cols = time points)
  const numSpecies = y0.length;
  const numTimePoints = t_arr.length;
  const y_transposed: number[][] = Array.from({ length: numSpecies }, () => Array(numTimePoints).fill(0));
  for (let i = 0; i < numTimePoints; i++) {
    for (let j = 0; j < numSpecies; j++) {
      y_transposed[j][i] = y_arr[i][j];
    }
  }

  return { t: t_arr, y: y_transposed };
}

// Function to generate the reaction graph
function reactionGraphing(
  reactions: string[], 
  ks: number[], 
  C0: Record<string, number>
): any {
  // Check that the number of ks elements matches the number of reactions
  if (ks.length !== reactions.length) {
    throw new Error("The number of rate constants does not match the number of reactions.");
  }

  // Extract unique species from reactions in the order they appear
  const orderedSpecies = detectUniqueSpeciesOrdered(reactions);

  // Check that all unique species are present in C0
  const missingSpecies = orderedSpecies.filter(species => !C0.hasOwnProperty(species));
  if (missingSpecies.length > 0) {
    throw new Error(`The following species are missing in C0: ${missingSpecies.join(', ')}`);
  }

  // Define the system of ODEs
  function odes(t: number, y: number[]): number[] {
    const dydt = new Array(orderedSpecies.length).fill(0);
    const concentrations: Record<string, number> = {};
    
    orderedSpecies.forEach((species, i) => {
      concentrations[species] = y[i];
    });
    
    reactions.forEach((reaction, i) => {
      if (!reaction) return;
      
      const [reactants, products] = reaction.split('->');
      const reactantSpecies: [string, number][] = [];
      
      reactants.split('+').forEach(species => {
        const match = species.trim().match(/^(\d*)(\w+)$/);
        if (!match) return;
        
        const [, coeff, sp] = match;
        const coefficient = coeff ? parseInt(coeff) : 1;
        reactantSpecies.push([sp, coefficient]);
      });
      
      // Calculate the reaction rate
      const rate = ks[i] * reactantSpecies.reduce((prod, [sp, coeff]) => 
        prod * Math.pow(concentrations[sp], coeff), 1);
      
      // Update differential forms
      reactantSpecies.forEach(([sp, coeff]) => {
        dydt[orderedSpecies.indexOf(sp)] -= rate * coeff;
      });
      
      products.split('+').forEach(product => {
        const match = product.trim().match(/^(\d*)(\w+)$/);
        if (!match) return;
        
        const [, coeff, sp] = match;
        const coefficient = coeff ? parseInt(coeff) : 1;
        dydt[orderedSpecies.indexOf(sp)] += rate * coefficient;
      });
    });
    
    return dydt;
  }

  // Initial concentrations
  const y0 = orderedSpecies.map(species => C0[species]);

  // Time span for the simulation
  const tSpan: [number, number] = [0, 10];
  // numPoints is not needed for adaptive solver, but we need initial step size and tolerance
  const initial_h = 0.01; // Smaller initial step might be better
  const tolerance = 1e-5; // Adjust tolerance as needed

  // Solve the ODEs using the RK45 solver
  const solution = solveODERK45(odes, y0, tSpan, tolerance, initial_h); // Updated function call

  // Determine the steady state time (using the new solution format)
  const maxConcentration = Math.max(...solution.y.flat()); // Use flat() on the transposed array
  const relativeTolerance = maxConcentration * 1e-4;
  
  let steadyStateTime = tSpan[1];
  for (let i = 1; i < solution.t.length; i++) {
    // Access solution.y[speciesIndex][timeIndex]
    const concentrationDiff = orderedSpecies.map((_, j) => 
      Math.abs(solution.y[j][i] - solution.y[j][i-1])); 
    
    if (concentrationDiff.every(diff => diff < relativeTolerance)) {
      steadyStateTime = solution.t[i];
      break;
    }
  }

  // Format species names with subscripted numbers in the legend
  const traces = orderedSpecies.map((species, i) => ({
    x: solution.t,
    y: solution.y[i], // Access the i-th row (species) of the transposed solution
    type: 'scatter',
    mode: 'lines',
    name: species.replace(/(\d+)/g, '<sub>$1</sub>'), 
    hovertemplate: `${species.replace(/(\d+)/g, '<sub>$1</sub>')}: %{y:.2f}<extra></extra>` 
  }));

  // Calculate dynamic y-axis range with buffer
  const allYValues = solution.y.flat();
  const minY = Math.min(0, ...allYValues); 
  const maxY = Math.max(...allYValues);
  const yRange = [minY, maxY * 1.1 + 1e-9]; 

  // Ensure subscripted numbers in the legend and make axes visible
  const layout = {
    title: {
      text: 'Concentration Profiles',
      font: { size: 24, family: 'Merriweather Sans', color: 'white' }
    },
    xaxis: {
      title: { text: 'Time', font: { size: 18, family: 'Merriweather Sans', color: 'white' } },
      showgrid: true, // Ensure grid is visible
      zeroline: true,
      zerolinecolor: 'white',
      zerolinewidth: 2,
      showline: true,
      linecolor: 'white',
      linewidth: 2,
      ticks: 'outside',
      ticklen: 8,
      tickwidth: 2,
      tickcolor: 'white',
      tickfont: { size: 14, family: 'Merriweather Sans', color: 'white' },
      range: [0, steadyStateTime] // Dynamically set x-axis range
    },
    yaxis: {
      title: { text: 'Concentration', font: { size: 18, family: 'Merriweather Sans', color: 'white' } },
      showgrid: true, // Ensure grid is visible
      zeroline: true,
      zerolinecolor: 'white',
      zerolinewidth: 2,
      showline: true,
      linecolor: 'white',
      linewidth: 2,
      ticks: 'outside',
      ticklen: 8,
      tickwidth: 2,
      tickcolor: 'white',
      tickfont: { size: 14, family: 'Merriweather Sans', color: 'white' },
      range: yRange // Dynamically set y-axis range
    },
    legend: {
      font: { color: 'white', family: 'Merriweather Sans' },
      bgcolor: 'rgba(0,0,0,0.2)'
    },
    template: 'plotly_dark',
    plot_bgcolor: '#08306b',
    paper_bgcolor: '#08306b',
    autosize: false,
    width: 600,
    height: 600
  };

  return { data: traces, layout };
}

export default function KineticsPage() {
  // Default reaction setup
  const defaultReaction = '2H2 + O2 -> 2H2O';
  const defaultReactants = '2H2 + O2';
  const defaultProducts = '2H2O';
  const defaultRateConstant = 1;
  const defaultSpecies = detectUniqueSpeciesOrdered([defaultReaction]);
  const defaultConcentrations: Record<string, number | ''> = {};
  defaultSpecies.forEach(sp => { defaultConcentrations[sp] = 1; });

  const [reactionInputs, setReactionInputs] = useState<{ 
    reaction: string; 
    reactants: string;
    products: string;
    rateConstant: number | '' 
  }[]>([{ 
    reaction: defaultReaction, 
    reactants: defaultReactants,
    products: defaultProducts,
    rateConstant: defaultRateConstant 
  }]);
  // Start with confirmed state and detected species/concentrations
  const [confirmedReactions, setConfirmedReactions] = useState<boolean>(true); 
  const [species, setSpecies] = useState<string[]>(defaultSpecies);
  const [concentrations, setConcentrations] = useState<Record<string, number | ''>>(defaultConcentrations);
  const [plotData, setPlotData] = useState<any>(null);
  const [showGraph, setShowGraph] = useState<boolean>(true); // Show graph initially
  
  // Generate initial plot on mount
  useEffect(() => {
    const initialPlotData = reactionGraphing(
      [defaultReaction], 
      [defaultRateConstant], 
      defaultConcentrations as Record<string, number>
    );
    setPlotData(initialPlotData);
  }, []); // Empty dependency array ensures this runs only once on mount

  // Set the page title in the Navbar
  useEffect(() => {
    const title = document.querySelector('.page-title');
    if (title) {
      title.textContent = 'Reaction Kinetics Simulator';
    }
    const navbar = document.querySelector('.navbar-wrapper');
    if (navbar) {
      navbar.classList.add('with-title');
    }
  }, []);

  // Add a reaction input field
  const addReactionInput = () => {
    setReactionInputs([...reactionInputs, { 
      reaction: '', 
      reactants: '',
      products: '',
      rateConstant: 1 
    }]);
  };

  // Remove a reaction input field
  const removeReactionInput = () => {
    if (reactionInputs.length > 1) {
      setReactionInputs(reactionInputs.slice(0, -1));
    }
  };

  // Handle reaction input change
  const handleReactionChange = (index: number, field: 'reactants' | 'products' | 'rateConstant', value: string | number) => {
    const newInputs = [...reactionInputs];
    newInputs[index] = { ...newInputs[index] };
    
    if (field === 'reactants') {
      newInputs[index].reactants = value as string;
      newInputs[index].reaction = `${value} -> ${newInputs[index].products}`;
    } else if (field === 'products') {
      newInputs[index].products = value as string;
      newInputs[index].reaction = `${newInputs[index].reactants} -> ${value}`;
    } else {
      newInputs[index].rateConstant = value === '' ? 1 : Number(value);
    }
    
    setReactionInputs(newInputs);
  };

  // Handle keyboard events for reaction inputs to trigger confirm button
  const handleReactionKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmReactions(); // Trigger confirm button
    }
  };

  // Handle keyboard events for concentration inputs
  const handleConcentrationKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && allFieldsFilled()) {
      e.preventDefault();
      submitForm();
    }
  };

  // Confirm reactions and update plot
  const confirmReactions = () => {
    const validReactions = reactionInputs
      .filter(input => input.reaction.trim() !== '')
      .map(input => input.reaction);
    
    if (validReactions.length > 0) {
      const detectedSpecies = detectUniqueSpeciesOrdered(validReactions);
      setSpecies(detectedSpecies); // Update the species list
      
      // Prepare the concentrations for the plot
      const currentConcentrationsState = { ...concentrations }; // Get current state
      const concentrationsForPlot: Record<string, number> = {};
      const nextConcentrationsState: Record<string, number | ''> = {};

      detectedSpecies.forEach(sp => {
        const currentValue = currentConcentrationsState.hasOwnProperty(sp) 
                             ? currentConcentrationsState[sp] 
                             : 1; // Default to 1 if new
        nextConcentrationsState[sp] = currentValue; // Update state for UI
        concentrationsForPlot[sp] = typeof currentValue === 'number' ? currentValue : 1; // Ensure number for plot
      });
      
      setConcentrations(nextConcentrationsState); // Update the concentration state for UI
      setConfirmedReactions(true); 

      // Get current rate constants
      const validRateConstants = reactionInputs
        .filter(input => input.reaction.trim() !== '')
        .map(input => typeof input.rateConstant === 'number' ? input.rateConstant : 1);

      // Immediately regenerate the plot with the new species and prepared concentrations
      submitForm(validReactions, validRateConstants, concentrationsForPlot); 

    } else {
      // Handle case where there are no valid reactions after confirm
      setSpecies([]);
      setConcentrations({});
      setPlotData(null);
      setShowGraph(false);
      setConfirmedReactions(false);
    }
  };

  // Handle concentration input change
  const handleConcentrationChange = (species: string, value: number | '') => {
    setConcentrations({ ...concentrations, [species]: value === '' ? 0 : Number(value) });
  };

  // Submit the form and generate the graph
  // Modify to accept optional arguments for direct use in confirmReactions
  const submitForm = (
    reactionsToUse?: string[], 
    ksToUse?: number[], 
    concentrationsToUse?: Record<string, number>
  ) => {
    // Use provided arguments if available, otherwise use state
    const validReactions = reactionsToUse ?? reactionInputs
      .filter(input => input.reaction.trim() !== '')
      .map(input => input.reaction);
    
    const validRateConstants = ksToUse ?? reactionInputs
      .filter(input => input.reaction.trim() !== '')
      .map(input => typeof input.rateConstant === 'number' ? input.rateConstant : 1);
    
    const validConcentrations = concentrationsToUse ?? (() => {
        const stateConcentrations: Record<string, number> = {};
        for (const [sp, conc] of Object.entries(concentrations)) {
            stateConcentrations[sp] = typeof conc === 'number' ? conc : 1; // Default to 1 if empty
        }
        return stateConcentrations;
    })();

    // Ensure all necessary species have concentrations before plotting
    const currentSpecies = detectUniqueSpeciesOrdered(validReactions);
    const allSpeciesPresent = currentSpecies.every(sp => validConcentrations.hasOwnProperty(sp));

    if (!allSpeciesPresent) {
        console.error("Concentration data is not ready for all species yet.");
        // Optionally alert the user or handle this state
        // alert("Concentration data is missing for some species. Please adjust inputs.");
        return; // Prevent plotting if data is incomplete
    }
    
    try {
      const plotResult = reactionGraphing(validReactions, validRateConstants, validConcentrations);
      setPlotData(plotResult);
      setShowGraph(true);
    } catch (error) {
      console.error("Error generating plot:", error);
      alert(`Error generating plot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Check if all required fields are filled
  const allFieldsFilled = () => {
    const reactionsValid = reactionInputs.some(input => 
      input.reaction.trim() !== '');
      
    const concentrationsValid = species.length > 0 && 
      species.every(sp => concentrations[sp] !== '');
      
    return reactionsValid && concentrationsValid;
  };

  // Format slider value display to 2 decimal places
  const formatSliderValue = (value: number): string => {
    return value.toFixed(2);
  };

  // Handle slider change without debounce
  const handleSliderChange = (type: string, index: number | string, value: number) => {
    // Update state immediately
    if (type === 'rateConstant') {
      // Need to update reactionInputs state directly here or call handleReactionChange
      // Let's call handleReactionChange for consistency
      handleReactionChange(index as number, 'rateConstant', value);
    } else if (type === 'concentration') {
      // Call handleConcentrationChange to update state
      handleConcentrationChange(index as string, value);
    }

    // Trigger graph update immediately after state update is likely processed
    // Use a microtask (Promise.resolve) to ensure state update is flushed before submitForm reads it
    Promise.resolve().then(() => {
        if (allFieldsFilled()) {
            submitForm(); // Call without arguments to use current state
        }
    });
  };

  return (
    <div className="container p-4">
      {/* Main layout with flex container */}
      <div className="simulation-layout">
        {/* Left side - Controls */}
        <div className="simulation-controls">
          {/* Reaction inputs box */}
          <div className="control-group">
            <div className="mb-4">
              {reactionInputs.map((input, index) => (
                <div key={index} className="reaction-input mb-6">
                  <div className="elementary-reaction-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <input
                      value={input.reactants}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleReactionChange(index, 'reactants', e.target.value)}
                      onKeyDown={(e) => handleReactionKeyDown(e, index)}
                      placeholder="2H2 + O2"
                      className="elementary-reaction-input"
                      style={{ flex: '1', minWidth: '100px' }}
                    />
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 4px', color: 'var(--text-color)' }}>
                      →
                    </div>
                    <input
                      value={input.products}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleReactionChange(index, 'products', e.target.value)}
                      onKeyDown={(e) => handleReactionKeyDown(e, index)}
                      placeholder="2H2O"
                      className="elementary-reaction-input"
                      style={{ flex: '1', minWidth: '100px' }}
                    />
                  </div>
                  
                  <div className="slider-group">
                    <label className="flex justify-between">
                      <span>Rate Constant: </span>
                      <span>{formatSliderValue(Number(input.rateConstant))}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.01"
                      value={input.rateConstant}
                      onChange={(e) => handleSliderChange('rateConstant', index, parseFloat(e.target.value))}
                      className="kinetics-slider"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-4 mb-4">
              <button 
                onClick={addReactionInput} 
                className="submit-btn bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
              >
                Add Reaction
              </button>
              <button 
                onClick={removeReactionInput} 
                className="submit-btn bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
                disabled={reactionInputs.length <= 1}
              >
                Remove Last Reaction
              </button>
              <button 
                onClick={confirmReactions}
                className="submit-btn bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              >
                Confirm
              </button>
            </div>
          </div>
          
          {/* Initial concentrations box - always show if species exist */}
          {species.length > 0 && (
            <div className="control-group">
              <h3 className="text-xl mb-4">Initial Concentrations</h3>
              <div className="flex flex-col gap-4 mb-4">
                {species.map((sp) => (
                  <div key={sp} className="slider-group">
                    <label className="flex justify-between">
                      <span>{formatSpecies(sp)}: </span>
                      <span>{formatSliderValue(Number(concentrations[sp] || 0))}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.01"
                      value={concentrations[sp] || 0}
                      onChange={(e) => handleSliderChange('concentration', sp, parseFloat(e.target.value))}
                      onKeyDown={handleConcentrationKeyDown}
                      className="kinetics-slider"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right side - Graph - Show if plotData exists */}
        <div className="simulation-display">
          {plotData ? (
            <div className="simulation-graph">
              <Plot
                data={plotData.data}
                layout={plotData.layout}
                config={{ responsive: true }}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="empty-plot">
              Loading graph... 
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .simulation-layout {
          display: flex;
          flex-direction: row;
          gap: 2rem;
          margin-top: 1rem;
        }
        
        .simulation-controls {
          flex: 0 0 350px;
          min-width: 320px;
          max-width: 400px;
        }
        
        .control-group {
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background-color: var(--simulation-card-bg);
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .simulation-display {
          flex: 1;
          min-height: 600px;
          display: flex;
          flex-direction: column;
        }
        
        .empty-plot {
          height: 600px;
          width: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #08306b;
          color: white;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
        }
        
        .slider-group {
          margin-bottom: 1rem;
          width: 100%;
        }

        .slider-group label {
          display: flex;
          width: 100%;
          margin-bottom: 0.5rem;
        }

        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 165, 0, 0.3);
          margin: 10px 0;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: orange;
          cursor: pointer;
          border: none;
        }

        input[type="range"]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: orange;
          cursor: pointer;
          border: none;
        }

        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          border-radius: 2px;
        }

        input[type="range"]::-moz-range-track {
          width: 100%;
          height: 4px;
          border-radius: 2px;
        }
        
        @media (max-width: 1024px) {
          .simulation-layout {
            flex-direction: column;
          }
          
          .simulation-controls {
            max-width: 100%;
          }
          
          .empty-plot, .simulation-graph {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
