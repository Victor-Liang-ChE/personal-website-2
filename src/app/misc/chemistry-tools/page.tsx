'use client';

import React, { useState, useEffect } from 'react';

// Interface types for our components
interface ChemicalFormulaPart {
  text: string;
  isSubscript: boolean;
}

interface Compound {
  compound: string;
  coefficient: number;
  display: [string, boolean][]; // Tuple of [text, isSubscript]
}

interface ReactionData {
  reactants: Compound[];
  products: Compound[];
}

interface MolarMasses {
  [compound: string]: number | null;
}

interface InputData {
  [compound: string]: {
    moles?: number;
    grams?: number;
    molar_mass?: number;
  };
}

interface StoichiometryResults {
  limiting_reactant: string;
  reactants: {
    [compound: string]: {
      initial_moles: number;
      used_moles: number;
      excess_moles: number;
      initial_grams?: number;
      used_grams?: number;
      excess_grams?: number;
    };
  };
  products: {
    [compound: string]: {
      produced_moles: number;
      produced_grams?: number;
    };
  };
  conversion_percentage: number;
}

// Component to render chemical formulas with subscripts
const ChemicalFormula: React.FC<{ formula: string }> = ({ formula }) => {
  const formatFormula = (formula: string): ChemicalFormulaPart[] => {
    const parts: ChemicalFormulaPart[] = [];
    let i = 0;

    // Handle coefficient at beginning (e.g., 2H2O)
    const coeffMatch = formula.match(/^(\d+)([A-Za-z(].*)$/);
    if (coeffMatch) {
      parts.push({ text: coeffMatch[1], isSubscript: false });
      formula = coeffMatch[2];
    }

    while (i < formula.length) {
      if (formula[i] === '(') {
        // Handle parentheses
        let parenDepth = 1;
        let j = i + 1;
        while (j < formula.length && parenDepth > 0) {
          if (formula[j] === '(') parenDepth++;
          if (formula[j] === ')') parenDepth--;
          j++;
        }

        parts.push({ text: formula.substring(i, j), isSubscript: false });
        i = j;

        // Check for subscript after parenthesis
        let subscript = '';
        while (i < formula.length && /\d/.test(formula[i])) {
          subscript += formula[i];
          i++;
        }
        if (subscript) {
          parts.push({ text: subscript, isSubscript: true });
        }
      } else if (/[A-Z]/.test(formula[i])) {
        // Handle element symbol
        let element = formula[i];
        i++;

        // Handle lowercase letters in element symbol
        while (i < formula.length && /[a-z]/.test(formula[i])) {
          element += formula[i];
          i++;
        }

        parts.push({ text: element, isSubscript: false });

        // Handle subscripts
        let subscript = '';
        while (i < formula.length && /\d/.test(formula[i])) {
          subscript += formula[i];
          i++;
        }
        if (subscript) {
          parts.push({ text: subscript, isSubscript: true });
        }
      } else {
        // Handle other characters
        parts.push({ text: formula[i], isSubscript: false });
        i++;
      }
    }

    return parts;
  };

  const parts = formatFormula(formula);

  return (
    <span>
      {parts.map((part, index) => 
        part.isSubscript ? 
          <sub key={index}>{part.text}</sub> : 
          <span key={index}>{part.text}</span>
      )}
    </span>
  );
};

export default function ChemistryTools() {
  const [activeTab, setActiveTab] = useState<string>('stoichiometry');

  return (
    <div className="container">
      <div className="simulation-layout">
        <div className="drop-chance-container" style={{ width: '100%', maxWidth: '1000px' }}>
          <div className="parameter-toggle" style={{ marginBottom: '2rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('stoichiometry')}
              className={`toggle-btn ${activeTab === 'stoichiometry' ? 'active' : ''}`}
            >
              Stoichiometry Calculator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('molecular')}
              className={`toggle-btn ${activeTab === 'molecular' ? 'active' : ''}`}
            >
              Molecular Visualization
            </button>
          </div>

          {activeTab === 'stoichiometry' && <StoichiometryCalculator />}
          {activeTab === 'molecular' && <MolecularVisualization />}
        </div>
      </div>
    </div>
  );
}

// Stoichiometry Calculator Component
const StoichiometryCalculator: React.FC = () => {
  const [equation, setEquation] = useState<string>('');
  const [reactionData, setReactionData] = useState<ReactionData | null>(null);
  const [molarMasses, setMolarMasses] = useState<MolarMasses>({});
  const [inputData, setInputData] = useState<InputData>({});
  const [conversionPercentage, setConversionPercentage] = useState<number>(100);
  const [showConversion, setShowConversion] = useState<boolean>(false);
  const [results, setResults] = useState<StoichiometryResults | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputModes, setInputModes] = useState<Record<string, 'moles' | 'grams'>>({});

  const handleEquationSubmit = async () => {
    if (!equation) {
      setErrorMessage("Please enter a reaction equation.");
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/chemistry/parse-reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equation })
      });

      const data = await response.json();

      if (!data.success) {
        setErrorMessage(data.message);
        setReactionData(null);
      } else {
        setReactionData(data.reaction_data);
        setMolarMasses(data.molar_masses);
        
        // Initialize input data with empty values
        const newInputData: InputData = {};
        [...data.reaction_data.reactants, ...data.reaction_data.products].forEach(item => {
          newInputData[item.compound] = {
            molar_mass: data.molar_masses[item.compound]
          };
        });
        
        setInputData(newInputData);
      }
    } catch (error) {
      setErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (compound: string, field: 'moles' | 'grams', value: number | null) => {
    setInputData(prevData => ({
      ...prevData,
      [compound]: {
        ...prevData[compound],
        [field]: value
      }
    }));
  };

  const toggleInputMode = (compound: string) => {
    setInputModes(prev => ({
      ...prev,
      [compound]: prev[compound] === 'moles' ? 'grams' : 'moles'
    }));
    // Clear both input fields when switching
    handleInputChange(compound, 'moles', null);
    handleInputChange(compound, 'grams', null);
  };

  const handleCalculate = async () => {
    setErrorMessage('');
    
    // Validate that at least one reactant has an amount
    const hasAmount = Object.entries(inputData).some(([compound, data]) => {
      const isReactant = reactionData?.reactants.some(r => r.compound === compound);
      return isReactant && (data.moles !== undefined || data.grams !== undefined);
    });

    if (!hasAmount) {
      setErrorMessage("Please provide at least one reactant amount.");
      return;
    }

    setIsLoading(true);

    try {
      // Do the calculation
      const results = calculateStoichiometry(reactionData!, inputData, showConversion ? conversionPercentage : 100);
      setResults(results);
    } catch (error) {
      setErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Frontend implementation of calculate_stoichiometry
  const calculateStoichiometry = (
    reaction: ReactionData, 
    inputData: InputData, 
    conversionPercentage: number
  ): StoichiometryResults => {
    const reactants = reaction.reactants;
    const products = reaction.products;
    
    // Get input amounts
    const reactantAmounts: Record<string, { moles: number; coefficient: number; moles_per_coefficient: number }> = {};
    
    for (const reactant of reactants) {
      const compound = reactant.compound;
      if (compound in inputData) {
        const data = inputData[compound];
        const moles = data.moles;
        const grams = data.grams;
        const molarMass = data.molar_mass;

        console.log(`Processing ${compound}:`, {
          moles,
          grams,
          molarMass
        });
        
        // Calculate moles either from direct input or from grams
        let molesFromInput: number | undefined = undefined;
        
        if (moles !== undefined && moles !== null) {
          // Use directly input moles
          molesFromInput = moles;
        } else if (grams !== undefined && grams !== null && molarMass !== undefined && molarMass > 0) {
          // Convert grams to moles
          molesFromInput = grams / molarMass;
          console.log(`Converted ${grams}g of ${compound} to ${molesFromInput} moles using molar mass ${molarMass}`);
        }

        // Only add to reactantAmounts if we have valid moles
        if (molesFromInput !== undefined && !isNaN(molesFromInput)) {
          reactantAmounts[compound] = {
            moles: molesFromInput,
            coefficient: reactant.coefficient,
            moles_per_coefficient: molesFromInput / reactant.coefficient
          };
          console.log(`Added ${compound} to reactantAmounts:`, reactantAmounts[compound]);
        } else {
          console.log(`${compound} skipped: no valid moles value`);
        }
      }
    }
    
    console.log('Final reactantAmounts:', reactantAmounts);

    // If fewer than one reactant has amounts, display error
    if (Object.keys(reactantAmounts).length < 1) {
      throw new Error("Please provide amount data for at least one reactant");
    }
    
    // Find limiting reactant
    let limitingCompound = '';
    let limitingData = null;
    let minMolesPerCoef = Infinity;
    
    for (const compound in reactantAmounts) {
      const data = reactantAmounts[compound];
      if (data.moles_per_coefficient < minMolesPerCoef) {
        minMolesPerCoef = data.moles_per_coefficient;
        limitingCompound = compound;
        limitingData = data;
      }
    }
    
    if (!limitingData) {
      throw new Error("No limiting reactant found");
    }
    
    // Apply conversion percentage
    const conversion = conversionPercentage / 100.0;
    
    // Calculate results
    const results: StoichiometryResults = {
      limiting_reactant: limitingCompound,
      reactants: {},
      products: {},
      conversion_percentage: conversionPercentage
    };
    
    // Calculate reactant amounts
    for (const reactant of reactants) {
      const compound = reactant.compound;
      const coef = reactant.coefficient;
      const molarMass = inputData[compound]?.molar_mass;
      
      if (compound in reactantAmounts) {
        const moles = reactantAmounts[compound].moles;
        // Apply conversion factor to used moles
        const usedMoles = limitingData.moles_per_coefficient * coef * conversion;
        const excessMoles = Math.max(0, moles - usedMoles);
        
        results.reactants[compound] = {
          initial_moles: moles,
          used_moles: usedMoles,
          excess_moles: excessMoles
        };
        
        if (molarMass) {
          results.reactants[compound].initial_grams = moles * molarMass;
          results.reactants[compound].used_grams = usedMoles * molarMass;
          results.reactants[compound].excess_grams = excessMoles * molarMass;
        }
      }
    }
    
    // Calculate product amounts
    for (const product of products) {
      const compound = product.compound;
      const coef = product.coefficient;
      const molarMass = inputData[compound]?.molar_mass;
      
      const producedMoles = limitingData.moles_per_coefficient * coef * conversion;
      
      results.products[compound] = {
        produced_moles: producedMoles
      };
      
      if (molarMass) {
        results.products[compound].produced_grams = producedMoles * molarMass;
      }
    }
    
    return results;
  };

  useEffect(() => {
    if (reactionData && showConversion) {
      handleCalculate();
    }
  }, [conversionPercentage]); // Add effect to recalculate when conversion changes

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Stoichiometry Calculator</h2>
      
      <div className="control-group">
        <div className="input-group horizontal-input-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="reaction-equation">Chemical Reaction Equation (e.g. '2H2 + O2 → 2H2O'):</label>
          <input 
            id="reaction-equation"
            type="text"
            value={equation}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEquation(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleEquationSubmit()}
            style={{ flexGrow: 1 }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <button 
            onClick={handleEquationSubmit}
            className="submit-btn"
            style={{ maxWidth: '150px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Add Reaction'}
          </button>
        </div>

        {errorMessage && (
          <div className="error-message">{errorMessage}</div>
        )}

        {reactionData && (
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <div style={{ marginRight: '0.5rem' }}>Reaction:</div>
            <div>
              {reactionData.reactants.map((reactant, index) => (
                <React.Fragment key={`reactant-${index}`}>
                  {index > 0 && <span> + </span>}
                  <ChemicalFormula formula={reactant.coefficient > 1 ? `${reactant.coefficient}${reactant.compound}` : reactant.compound} />
                </React.Fragment>
              ))}
              <span> → </span>
              {reactionData.products.map((product, index) => (
                <React.Fragment key={`product-${index}`}>
                  {index > 0 && <span> + </span>}
                  <ChemicalFormula formula={product.coefficient > 1 ? `${product.coefficient}${product.compound}` : product.compound} />
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {reactionData && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ width: '100%' }}>
              <h3>Reactants</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {reactionData.reactants.map((reactant, index) => {
                  const compound = reactant.compound;
                  const molarMass = molarMasses[compound];
                  const mode = inputModes[compound] || 'moles';
                  
                  return (
                    <div 
                      key={`reactant-input-${index}`}
                      className="control-group"
                      style={{ 
                        flex: '1 0 250px', 
                        padding: '1rem',
                        marginBottom: '1rem'
                      }}
                    >
                      <div style={{ 
                        fontSize: '1.1rem', 
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ChemicalFormula formula={compound} />
                          {molarMass ? ` (${molarMass.toFixed(2)} g/mol)` : ''}
                          {results?.limiting_reactant === compound ? ' (Limiting)' : ''}
                        </div>
                        
                        <div className="parameter-toggle" style={{ margin: 0 }}>
                          <button
                            type="button"
                            onClick={() => toggleInputMode(compound)}
                            className={`toggle-btn ${mode === 'moles' ? 'active' : ''}`}
                          >
                            Moles
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleInputMode(compound)}
                            className={`toggle-btn ${mode === 'grams' ? 'active' : ''}`}
                          >
                            Grams
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: '1rem' }}>
                        {mode === 'moles' && (
                          <div className="input-group">
                            <input
                              type="number"
                              placeholder="moles"
                              min="0"
                              step="0.001"
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value === '' ? null : Number(e.target.value);
                                handleInputChange(compound, 'moles', value);
                              }}
                              value={inputData[compound]?.moles ?? ''}
                              style={{ width: '100%' }}
                            />
                          </div>
                        )}
                        
                        {mode === 'grams' && (
                          <div className="input-group">
                            <input
                              type="number"
                              placeholder="grams"
                              min="0" 
                              step="0.001"
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value === '' ? null : Number(e.target.value);
                                handleInputChange(compound, 'grams', value);
                              }}
                              value={inputData[compound]?.grams ?? ''}
                              style={{ width: '100%' }}
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Results display */}
                      {results && results.reactants[compound] && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.5rem' }}>
                          <div>
                            Used: {results.reactants[compound].used_moles.toFixed(3)} mol
                            {results.reactants[compound].used_grams !== undefined && 
                              ` (${results.reactants[compound].used_grams.toFixed(3)} g)`}
                          </div>
                          <div>
                            Excess: {results.reactants[compound].excess_moles.toFixed(3)} mol
                            {results.reactants[compound].excess_grams !== undefined && 
                              ` (${results.reactants[compound].excess_grams.toFixed(3)} g)`}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div style={{ width: '100%' }}>
              <h3>Products</h3>
              <div className="control-group" style={{ marginBottom: '1rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginRight: '1rem' }}>
                    <input 
                      type="checkbox"
                      checked={showConversion}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowConversion(e.target.checked)} 
                      style={{ marginRight: '0.5rem' }}
                    />
                    Specify Conversion
                  </label>
                  
                  {showConversion && (
                    <div style={{ flex: 1 }}>
                      <div>Conversion: {conversionPercentage}%</div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={conversionPercentage}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConversionPercentage(Number(e.target.value))}
                        style={{ 
                          width: '100%',
                          height: '8px',
                          borderRadius: '4px',
                          background: 'linear-gradient(to right, #4a90e2 0%, #4a90e2 ' + conversionPercentage + '%, #2c3e50 ' + conversionPercentage + '%, #2c3e50 100%)',
                          WebkitAppearance: 'none',
                          appearance: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {reactionData.products.map((product, index) => {
                    const compound = product.compound;
                    const molarMass = molarMasses[compound];
                    
                    return (
                      <div 
                        key={`product-input-${index}`}
                        style={{ 
                          flex: '1 0 250px',
                          padding: '1rem',
                          marginBottom: '1rem',
                          borderTop: '1px solid rgba(255,255,255,0.2)'
                        }}
                      >
                        <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                          <ChemicalFormula formula={compound} />
                          {molarMass ? ` (${molarMass.toFixed(2)} g/mol)` : ''}
                        </div>
                        
                        {/* Results display */}
                        {results && results.products[compound] && (
                          <div style={{ marginTop: '1rem' }}>
                            <div>
                              Produced: {results.products[compound].produced_moles.toFixed(3)} mol
                              {results.products[compound].produced_grams !== undefined && 
                                ` (${results.products[compound].produced_grams.toFixed(3)} g)`}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={handleCalculate}
              className="submit-btn"
              style={{ minWidth: '120px' }}
              disabled={isLoading}
            >
              {isLoading ? 'Calculating...' : 'Calculate'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Molecular Visualization Component
const MolecularVisualization: React.FC = () => {
  const [chemicalName, setChemicalName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [viewerHtml, setViewerHtml] = useState<string>('');
  const [actualName, setActualName] = useState<string>('');
  
  const handleVisualize = async () => {
    if (!chemicalName.trim()) {
      setError("Please enter a chemical name");
      return;
    }
    
    setLoading(true);
    setError('');
    setViewerHtml('');
    setActualName('');
    
    try {
      const response = await fetch('/api/chemistry/visualize-molecule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: chemicalName.trim() })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.message);
      } else {
        setViewerHtml(data.viewer_html);
        setActualName(data.chemical_name || chemicalName);
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Molecular Structure Visualization</h2>
      
      <div className="control-group" style={{ marginBottom: '1.5rem' }}>
        <div className="input-group horizontal-input-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="chemical-name">Enter chemical name:</label>
          <input
            id="chemical-name"
            type="text"
            value={chemicalName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChemicalName(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleVisualize()}
            placeholder="e.g., aspirin, ethanol, caffeine"
            style={{ flexGrow: 1 }}
          />
        </div>
        
        <button 
          onClick={handleVisualize}
          className="submit-btn"
          style={{ maxWidth: '120px' }}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Visualize'}
        </button>
      </div>
      
      {error && (
        <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>
      )}
      
      {actualName && (
        <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>{actualName}</h3>
      )}
      
      {viewerHtml ? (
        <div className="control-group" style={{ padding: 0, overflow: 'hidden', height: '500px' }}>
          <iframe
            srcDoc={viewerHtml}
            title="Molecule Viewer"
            style={{ 
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          />
        </div>
      ) : (
        <div 
          className="control-group" 
          style={{ 
            height: '400px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          }}
        >
          {loading ? "Loading molecule..." : "Enter a chemical name and click Visualize to display its 3D structure"}
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.8 }}>
        You can rotate, zoom, and pan the molecule using your mouse.
      </div>
    </div>
  );
};
