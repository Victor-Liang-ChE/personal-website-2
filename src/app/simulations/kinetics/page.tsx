"use client";
import React, { useState, useEffect, KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

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

// 4th-order Runge-Kutta method for ODE solving
function solveODE(
  dydt: (t: number, y: number[]) => number[], 
  y0: number[], 
  tSpan: [number, number], 
  numPoints: number
): { t: number[], y: number[][] } {
  const [t0, tf] = tSpan;
  const h = (tf - t0) / numPoints;
  const t = Array(numPoints + 1).fill(0).map((_, i) => t0 + i * h);
  const y: number[][] = Array(y0.length).fill(0).map(() => Array(numPoints + 1).fill(0));
  
  // Set initial conditions
  y0.forEach((val, i) => { y[i][0] = val; });
  
  // RK4 integration
  for (let i = 0; i < numPoints; i++) {
    const ti = t[i];
    const yi = y0.map((_, j) => y[j][i]);
    
    const k1 = dydt(ti, yi);
    const k2 = dydt(ti + h/2, yi.map((yij, j) => yij + k1[j] * h/2));
    const k3 = dydt(ti + h/2, yi.map((yij, j) => yij + k2[j] * h/2));
    const k4 = dydt(ti + h, yi.map((yij, j) => yij + k3[j] * h));
    
    for (let j = 0; j < y0.length; j++) {
      y[j][i + 1] = yi[j] + (h/6) * (k1[j] + 2*k2[j] + 2*k3[j] + k4[j]);
    }
  }
  
  return { t, y };
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
  const numPoints = 100;

  // Solve the ODEs using RK4
  const solution = solveODE(odes, y0, tSpan, numPoints);

  // Determine the steady state time
  const maxConcentration = Math.max(...solution.y.flatMap(arr => arr));
  const relativeTolerance = maxConcentration * 1e-4;
  
  let steadyStateTime = tSpan[1];
  for (let i = 1; i < solution.t.length; i++) {
    const concentrationDiff = orderedSpecies.map((_, j) => 
      Math.abs(solution.y[j][i] - solution.y[j][i-1]));
    
    if (concentrationDiff.every(diff => diff < relativeTolerance)) {
      steadyStateTime = solution.t[i];
      break;
    }
  }

  // Create the plotly data
  const traces = orderedSpecies.map((species, i) => ({
    x: solution.t,
    y: solution.y[i],
    type: 'scatter',
    mode: 'lines',
    name: species
  }));

  // Define the layout
  const layout = {
    title: {
      text: 'Concentrations vs. Time',
      font: { size: 24, family: 'Merriweather Sans', color: 'white' }
    },
    xaxis: {
      title: 'Time',
      showgrid: false,
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
      titlefont: { size: 18, family: 'Merriweather Sans', color: 'white' },
      tickfont: { size: 14, family: 'Merriweather Sans', color: 'white' },
    },
    yaxis: {
      title: 'Concentration',
      showgrid: false,
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
      titlefont: { size: 18, family: 'Merriweather Sans', color: 'white' },
      tickfont: { size: 14, family: 'Merriweather Sans', color: 'white' },
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
  const [reactionInputs, setReactionInputs] = useState<{ 
    reaction: string; 
    reactants: string;
    products: string;
    rateConstant: number | '' 
  }[]>([{ 
    reaction: '', 
    reactants: '',
    products: '',
    rateConstant: 1 
  }]);
  const [confirmedReactions, setConfirmedReactions] = useState<boolean>(false);
  const [species, setSpecies] = useState<string[]>([]);
  const [concentrations, setConcentrations] = useState<Record<string, number | ''>>({});
  const [plotData, setPlotData] = useState<any>(null);
  const [showGraph, setShowGraph] = useState<boolean>(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Set the page title in the Navbar
  useEffect(() => {
    const title = document.querySelector('.page-title');
    if (title) {
      title.textContent = 'Reaction Kinetics Simulator';
    }
    
    // Update navbar layout to ensure title is visible
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

  // Handle keyboard events for reaction inputs
  const handleReactionKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmReactions();
    }
  };

  // Handle keyboard events for concentration inputs
  const handleConcentrationKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && allFieldsFilled()) {
      e.preventDefault();
      submitForm();
    }
  };

  // Confirm reactions and detect species
  const confirmReactions = () => {
    const validReactions = reactionInputs
      .filter(input => input.reaction.trim() !== '')
      .map(input => input.reaction);
    
    if (validReactions.length > 0) {
      const detectedSpecies = detectUniqueSpeciesOrdered(validReactions);
      setSpecies(detectedSpecies);
      
      // Initialize concentrations
      const initialConcentrations: Record<string, number | ''> = {};
      detectedSpecies.forEach(species => {
        initialConcentrations[species] = 1; // Default value of 1
      });
      setConcentrations(initialConcentrations);
      
      setConfirmedReactions(true);
    }
  };

  // Handle concentration input change
  const handleConcentrationChange = (species: string, value: number | '') => {
    setConcentrations({ ...concentrations, [species]: value === '' ? 0 : Number(value) });
  };

  // Submit the form and generate the graph
  const submitForm = () => {
    const validReactions = reactionInputs
      .filter(input => input.reaction.trim() !== '')
      .map(input => input.reaction);
    
    const validRateConstants = reactionInputs
      .filter(input => input.reaction.trim() !== '')
      .map(input => typeof input.rateConstant === 'number' ? input.rateConstant : 1);
    
    const validConcentrations: Record<string, number> = {};
    for (const [species, concentration] of Object.entries(concentrations)) {
      validConcentrations[species] = typeof concentration === 'number' ? concentration : 1;
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

  // Handle slider change with debounce
  const handleSliderChange = (type: string, index: number | string, value: number) => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
  
    setDebounceTimeout(setTimeout(() => {
      if (type === 'rateConstant') {
        handleReactionChange(index as number, 'rateConstant', value);
      } else if (type === 'concentration') {
        handleConcentrationChange(index as string, value);
      }
      // Trigger graph update if all fields are filled
      if (allFieldsFilled()) {
        submitForm();
      }
    }, 100)); // 100ms debounce
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
                  <div className="horizontal-input-group" style={{ alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', gap: '8px' }}>
                      <input
                        value={input.reactants}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleReactionChange(index, 'reactants', e.target.value)}
                        onKeyDown={(e) => handleReactionKeyDown(e, index)}
                        placeholder="2H2 + O2"
                        className="elementary-reaction-input"
                        style={{ flexGrow: 1 }}
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
                        style={{ flexGrow: 1 }}
                      />
                    </div>
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
            
            <div className="flex flex-wrap gap-2 mb-4">
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
                Remove Reaction
              </button>
              <button 
                onClick={confirmReactions}
                className="submit-btn bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              >
                Confirm
              </button>
            </div>
          </div>
          
          {/* Initial concentrations box (appears after confirming reactions) */}
          {confirmedReactions && (
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
              
              <button 
                onClick={submitForm} 
                disabled={!allFieldsFilled()}
                className="submit-btn bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded w-full disabled:opacity-50"
              >
                Generate Plot
              </button>
            </div>
          )}
        </div>

        {/* Right side - Graph */}
        <div className="simulation-display">
          {showGraph && plotData ? (
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
              {confirmedReactions ? 
                "Adjust initial concentrations and click 'Generate Plot'" : 
                "Enter reactions and click 'Confirm' to start"}
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
        
        .submit-btn {
          min-width: 100px;
        }
        
        .reaction-input {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
          background-color: rgba(0, 0, 0, 0.1);
        }
        
        .elementary-reaction-input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: white;
          font-family: 'Merriweather Sans', sans-serif;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .elementary-reaction-input:focus {
          outline: none;
          border-color: #4DA6FF;
          box-shadow: 0 0 0 2px rgba(77, 166, 255, 0.2);
        }

        .elementary-reaction-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .kinetics-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          background: rgba(77, 166, 255, 0.2);
          border-radius: 3px;
          outline: none;
          margin: 10px 0;
          background-image: linear-gradient(#4DA6FF, #4DA6FF);
          background-repeat: no-repeat;
        }

        .kinetics-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          background: #4DA6FF;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.1s;
        }

        .kinetics-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .kinetics-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #4DA6FF;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.1s;
        }

        .kinetics-slider::-moz-range-thumb:hover {
          transform: scale(1.1);
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
