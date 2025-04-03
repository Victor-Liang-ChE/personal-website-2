'use client';

import React, { useState, useEffect } from 'react';

interface ChemicalFormulaPart {
  text: string;
  isSubscript: boolean;
}

interface Compound {
  compound: string;
  coefficient: number;
}

interface ReactionData {
  reactants: Compound[];
  products: Compound[];
}

interface MolarMasses {
  [compound: string]: number;
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

// Helper function for significant figures
const formatToSigFigs = (num: number, sigFigs: number = 3): string => {
  if (num === 0 || isNaN(num)) return "0";
  
  // Convert to string in scientific notation to handle all magnitudes
  const scientificStr = num.toExponential(sigFigs - 1);
  
  // Split into coefficient and exponent
  const [coefficient, exponent] = scientificStr.split('e').map(parseFloat);
  
  // If the exponent is between -3 and 5, use fixed notation
  if (exponent >= -3 && exponent <= 5) {
    return Number(scientificStr).toFixed(Math.max(0, sigFigs - Math.floor(Math.log10(Math.abs(num))) - 1));
  }
  
  return scientificStr;
};

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
        <div style={{ width: '100%', maxWidth: '1000px' }}>
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
  const [hasCalculated, setHasCalculated] = useState<boolean>(false);
  const [previousResults, setPreviousResults] = useState<StoichiometryResults | null>(null);
  const [animatedFields, setAnimatedFields] = useState<Set<string>>(new Set());
  const [previousLimitingReactant, setPreviousLimitingReactant] = useState<string | null>(null);
  const [reactants, setReactants] = useState<string>('');
  const [products, setProducts] = useState<string>('');
  
  // Function to check if a value has changed and needs animation
  const hasValueChanged = (key: string, newValue: number, oldValue: number | undefined): boolean => {
    if (oldValue === undefined) return true;
    return Math.abs(newValue - oldValue) > 0.00001; // Use small epsilon for floating point comparison
  };

  const handleCalculate = async () => {
    setErrorMessage('');
    
    // Validate that at least one reactant has an amount
    const hasAmount = Object.entries(inputData).some(([compound, data]) => {
      const isReactant = reactionData?.reactants.some(r => r.compound === compound);
      return isReactant && (data.moles !== undefined || data.grams !== undefined);
    });

    if (!hasAmount && !hasCalculated) {
      setErrorMessage("Please provide at least one reactant amount.");
      return;
    }

    setIsLoading(true);
    // Store previous results for change detection
    setPreviousResults(results);
    // Store previous limiting reactant for change detection
    setPreviousLimitingReactant(results?.limiting_reactant || null);
    
    try {
      // Do the calculation
      const newResults = calculateStoichiometry(reactionData!, inputData, showConversion ? conversionPercentage : 100);

      // Always animate when Calculate is pressed, not just for the first calculation
      const changedFields = new Set<string>();
      
      // Mark all values for animation
      Object.keys(newResults.reactants).forEach(compound => {
        changedFields.add('used_moles_' + compound);
        changedFields.add('excess_moles_' + compound);
        changedFields.add('used_grams_' + compound);
        changedFields.add('excess_grams_' + compound);
      });
      
      Object.keys(newResults.products).forEach(compound => {
        changedFields.add('produced_moles_' + compound);
        changedFields.add('produced_grams_' + compound);
      });
      
      setAnimatedFields(changedFields);
      setResults(newResults);
      setHasCalculated(true);
    } catch (error) {
      setErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to render values with animation if they've changed
  const renderAnimatedValue = (key: string, value: string): React.ReactNode => {
    const shouldAnimate = animatedFields.has(key);
    return (
      <span className={shouldAnimate ? 'value-changed' : ''}>
        {value}
      </span>
    );
  };

  // Function to render the limiting reactant indicator with animation if it's changed
  const renderLimitingIndicator = (compound: string): React.ReactNode => {
    const isLimiting = results?.limiting_reactant === compound;
    const limitingChanged = isLimiting && previousLimitingReactant !== null && previousLimitingReactant !== compound;
    
    if (!isLimiting) return <></>;
    
    return (
      <span className={limitingChanged ? 'limiting-changed' : ''} style={{ fontWeight: 'bold' }}> (Limiting)</span>
    );
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
      const data = inputData[compound] || {};
      const moles = data.moles ?? 0;
      const grams = data.grams ?? 0;
      const molarMass = data.molar_mass;

      console.log(`Processing ${compound}:`, {
        moles,
        grams,
        molarMass
      });
      
      // Calculate moles either from direct input or from grams
      let molesFromInput: number = 0;
      
      if (data.moles !== undefined) {
        molesFromInput = moles;
      } else if (data.grams !== undefined && molarMass !== undefined && molarMass > 0) {
        molesFromInput = grams / molarMass;
      }
      // Note: if both are undefined, molesFromInput remains 0

      reactantAmounts[compound] = {
        moles: molesFromInput,
        coefficient: reactant.coefficient,
        moles_per_coefficient: molesFromInput / reactant.coefficient
      };
    }
    
    console.log('Final reactantAmounts:', reactantAmounts);

    // If all reactants have zero moles, display error
    if (Object.values(reactantAmounts).every(data => data.moles === 0)) {
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

  const toggleInputMode = (compound: string, newMode: 'moles' | 'grams') => {
    // Only toggle if user clicks the inactive mode
    if (inputModes[compound] !== newMode) {
      setInputModes(prev => ({
        ...prev,
        [compound]: newMode
      }));
      // Clear both input fields when switching
      handleInputChange(compound, 'moles', null);
      handleInputChange(compound, 'grams', null);
    }
  };

  const handleEquationSubmit = async () => {
    // Validate both reactants and products are provided
    if (!reactants.trim()) {
      setErrorMessage('Please enter reactants');
      return;
    }
    
    if (!products.trim()) {
      setErrorMessage('Please enter products');
      return;
    }
    
    // Combine reactants and products to form the equation
    const fullEquation = `${reactants} → ${products}`;
    setEquation(fullEquation);
    
    setErrorMessage('');
    setIsLoading(true);
    setReactionData(null);
    setResults(null);
    setInputData({});
    
    try {
      // Parse the reaction equation
      const parsed = parseReactionEquation(fullEquation);
      
      if (!parsed) {
        throw new Error('Invalid reaction equation format');
      }
      
      // Try to fetch molar masses for all compounds
      const compounds = [...parsed.reactants, ...parsed.products];
      const molarMassesData: MolarMasses = {};
      
      for (const compound of compounds) {
        try {
          const molarMass = await calculateMolarMass(compound.compound);
          molarMassesData[compound.compound] = molarMass;
          
          // Store molar mass in input data for each compound
          setInputData(prev => ({
            ...prev,
            [compound.compound]: {
              ...prev[compound.compound],
              molar_mass: molarMass
            }
          }));
        } catch (error) {
          console.error(`Error getting molar mass for ${compound.compound}:`, error);
          throw new Error(`Could not calculate molar mass for ${compound.compound}`);
        }
      }
      
      setMolarMasses(molarMassesData);
      setReactionData(parsed);
      
    } catch (error) {
      setErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to parse a chemical reaction equation
  const parseReactionEquation = (equation: string): ReactionData | null => {
    // Basic format: aA + bB → cC + dD
    // Where a, b, c, d are coefficients and A, B, C, D are chemical compounds
    const sides = equation.split(/→|->|→/);
    
    if (sides.length !== 2) {
      return null;
    }
    
    const [reactantsSide, productsSide] = sides;
    
    const parseCompounds = (side: string): Compound[] => {
      return side
        .split('+')
        .map(part => part.trim())
        .filter(part => part)
        .map(part => {
          // Extract coefficient and compound
          const match = part.match(/^(\d*)(.+)$/);
          
          if (!match) return null;
          
          const [, coeffStr, compound] = match;
          const coefficient = coeffStr ? parseInt(coeffStr, 10) : 1;
          
          return { compound: compound.trim(), coefficient };
        })
        .filter((item): item is Compound => item !== null);
    };
    
    const reactants = parseCompounds(reactantsSide);
    const products = parseCompounds(productsSide);
    
    if (reactants.length === 0 || products.length === 0) {
      return null;
    }
    
    return { reactants, products };
  };
  
  // Function to calculate the molar mass of a compound
  const calculateMolarMass = async (compound: string): Promise<number> => {
    try {
      // For more complex compounds, try to use an API
      const apiUrl = `/api/chemistry/molar-mass?compound=${encodeURIComponent(compound)}`;
      
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success && data.molar_mass) {
          return data.molar_mass;
        }
      } catch (error) {
        console.warn('API call failed, falling back to local calculation', error);
      }
      
      // Enhanced local calculation with parentheses support
      return calculateMolarMassLocal(compound, elementMasses);
    } catch (error) {
      console.error('Error calculating molar mass:', error);
      throw error;
    }
  };

  // Helper function to calculate molar mass with support for parentheses
  const calculateMolarMassLocal = (formula: string, elementMasses: Record<string, number>): number => {
    let i = 0;
    
    // Recursive function to process formula segments (handles nested parentheses)
    const processSegment = (): number => {
      let segmentMass = 0;
      let currentElement = '';
      let currentCount = '';
      
      while (i < formula.length) {
        const char = formula[i];
        
        if (char === '(') {
          // Skip the opening parenthesis
          i++;
          // Process the content inside parentheses
          const subMass = processSegment();
          // Look for a multiplier after the closing parenthesis
          let multiplier = '';
          while (i < formula.length && /\d/.test(formula[i])) {
            multiplier += formula[i];
            i++;
          }
          // Multiply the submass by the multiplier (or 1 if no multiplier)
          const mult = multiplier ? parseInt(multiplier, 10) : 1;
          segmentMass += subMass * mult;
          continue;
        }
        
        if (char === ')') {
          // End of current segment, move past the closing parenthesis
          i++;
          // Return the mass of this segment for multiplication by any following number
          return segmentMass;
        }
        
        if (char.match(/[A-Z]/)) {
          // Process previous element if exists
          if (currentElement) {
            const count = currentCount ? parseInt(currentCount, 10) : 1;
            if (!elementMasses[currentElement]) {
              throw new Error(`Unknown element: ${currentElement}`);
            }
            segmentMass += elementMasses[currentElement] * count;
            currentElement = '';
            currentCount = '';
          }
          
          currentElement = char;
          i++;
        } else if (char.match(/[a-z]/)) {
          currentElement += char;
          i++;
        } else if (char.match(/\d/)) {
          currentCount += char;
          i++;
        } else {
          // Skip other characters
          i++;
        }
      }
      
      // Process the last element in this segment
      if (currentElement) {
        const count = currentCount ? parseInt(currentCount, 10) : 1;
        if (!elementMasses[currentElement]) {
          throw new Error(`Unknown element: ${currentElement}`);
        }
        segmentMass += elementMasses[currentElement] * count;
      }
      
      return segmentMass;
    };
    
    // Start processing the formula
    return processSegment();
  };

  const handleInputChange = (compound: string, inputType: 'moles' | 'grams', value: number | null) => {
    setInputData(prev => {
      // Get current data for this compound
      const currentData = prev[compound] || {};
      
      // Create updated data without modifying empty inputs
      const newData = {
        ...currentData,
        [inputType]: value === null ? undefined : value
      };
      
      return {
        ...prev,
        [compound]: newData
      };
    });
  };

  return (
    <div>
      <div className="control-group reaction-input-container">
        <div className="horizontal-input-group" style={{ alignItems: 'center' }}>
          <label>Reaction:</label>
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', gap: '8px' }}>
            <input 
              type="text"
              value={reactants}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReactants(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleEquationSubmit()}
              placeholder="2H2 + O2"
              style={{ flexGrow: 1 }}
            />
            <div style={{ 
              fontSize: '1.2rem', 
              fontWeight: 'bold', 
              margin: '0 4px', 
              color: 'var(--text-color)' 
            }}>
              →
            </div>
            <input 
              type="text"
              value={products}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProducts(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleEquationSubmit()}
              placeholder="2H2O"
              style={{ flexGrow: 1 }}
            />
          </div>
          
          <button 
            onClick={handleEquationSubmit}
            className="submit-btn"
            style={{ width: 'auto', minWidth: '120px', flexShrink: 0 }}
            disabled={isLoading || !reactants.trim() || !products.trim()}
          >
            {isLoading ? 'Processing...' : 'Add Reaction'}
          </button>
        </div>

        {reactionData && (
          <div className="reaction-display" style={{ display: 'flex', alignItems: 'center' }}>
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
                  <ChemicalFormula formula={product.coefficient > 1 ? `${product.coefficient}${product.compound}` : product.coefficient === 0 ? '0' : product.compound} />
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        
        {errorMessage && (
          <div className="error-message">{errorMessage}</div>
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
                        marginBottom: '1rem'
                      }}
                    >
                      <div style={{ 
                        fontSize: '1.1rem', 
                        marginBottom: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <ChemicalFormula formula={compound} />
                          {molarMass ? ` (${formatToSigFigs(molarMass)} g/mol)` : ''}
                          {renderLimitingIndicator(compound)}
                        </div>
                        
                        <div className="parameter-toggle" style={{ margin: 0 }}>
                          <button
                            type="button"
                            onClick={() => toggleInputMode(compound, 'moles')}
                            className={`toggle-btn ${mode === 'moles' ? 'active' : ''}`}
                          >
                            Moles
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleInputMode(compound, 'grams')}
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
                              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                  handleCalculate();
                                }
                              }}
                              value={inputData[compound]?.moles ?? ''}
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
                              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                  handleCalculate();
                                }
                              }}
                              value={inputData[compound]?.grams ?? ''}
                            />
                          </div>
                        )}
                      </div>
                      
                      {results && results.reactants[compound] && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.5rem' }}>
                          <div style={{ display: 'flex' }}>
                            <div style={{ width: '50%' }}>
                              Used: {mode === 'moles' 
                                ? renderAnimatedValue(`used_moles_${compound}`, `${formatToSigFigs(results.reactants[compound].used_moles)} mol`)
                                : renderAnimatedValue(`used_grams_${compound}`, `${formatToSigFigs(results.reactants[compound].used_grams!)} g`)}
                            </div>
                            <div style={{ width: '50%', paddingLeft: '10px', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                              Excess: {mode === 'moles'
                                ? renderAnimatedValue(`excess_moles_${compound}`, `${formatToSigFigs(results.reactants[compound].excess_moles)} mol`)
                                : renderAnimatedValue(`excess_grams_${compound}`, `${formatToSigFigs(results.reactants[compound].excess_grams!)} g`)}
                            </div>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {reactionData.products.map((product, index) => {
                  const compound = product.compound;
                  const molarMass = molarMasses[compound];
                  
                  return (
                    <div 
                      key={`product-input-${index}`}
                      className="control-group"
                      style={{ 
                        flex: '1 0 250px',
                        marginBottom: '1rem'
                      }}
                    >
                      <div style={{ 
                        fontSize: '1.1rem', 
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap'
                      }}>
                        <div>
                          <ChemicalFormula formula={compound} />
                          {molarMass ? ` (${formatToSigFigs(molarMass)} g/mol)` : ''}
                        </div>
                        {index === 0 && hasCalculated && (
                          <div className="conversion-controls">
                            <label>
                              <input 
                                type="checkbox"
                                checked={showConversion}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowConversion(e.target.checked)} 
                                style={{ marginRight: '0.5rem' }}
                              />
                              Conversion:
                            </label>
                            
                            <div className="conversion-slider">
                              {showConversion && (
                                <>
                                  <div className="conversion-percent-display">
                                    {conversionPercentage}%
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={conversionPercentage}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConversionPercentage(Number(e.target.value))}
                                    style={{ 
                                      background: 'linear-gradient(to right, #4a90e2 0%, #4a90e2 ' + conversionPercentage + '%, #2c3e50 ' + conversionPercentage + '%, #2c3e50 100%)',
                                      WebkitAppearance: 'none',
                                      appearance: 'none',
                                      cursor: 'pointer',
                                      height: '8px',
                                      borderRadius: '4px'
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {results && results.products[compound] && (
                        <div style={{ marginTop: '1rem' }}>
                          <div>
                            Produced: {renderAnimatedValue(
                              `produced_grams_${compound}`, 
                              `${formatToSigFigs(results.products[compound].produced_grams!)} g (${formatToSigFigs(results.products[compound].produced_moles)} mol)`
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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

// Atomic masses for element calculations
const elementMasses: Record<string, number> = {
  'H': 1.008,
  'He': 4.0026,
  'Li': 6.94,
  'Be': 9.0122,
  'B': 10.81,
  'C': 12.011,
  'N': 14.007,
  'O': 15.999,
  'F': 18.998,
  'Ne': 20.180,
  'Na': 22.990,
  'Mg': 24.305,
  'Al': 26.982,
  'Si': 28.085,
  'P': 30.974,
  'S': 32.06,
  'Cl': 35.45,
  'Ar': 39.948,
  'K': 39.098,
  'Ca': 40.078,
  'Sc': 44.956,
  'Ti': 47.867,
  'V': 50.942,
  'Cr': 51.996,
  'Mn': 54.938,
  'Fe': 55.845,
  'Co': 58.933,
  'Ni': 58.693,
  'Cu': 63.546,
  'Zn': 65.38,
  'Ga': 69.723,
  'Ge': 72.630,
  'As': 74.922,
  'Se': 78.971,
  'Br': 79.904,
  'Kr': 83.798,
  'Rb': 85.468,
  'Sr': 87.62,
  'Y': 88.906,
  'Zr': 91.224,
  'Nb': 92.906,
  'Mo': 95.95,
  'Tc': 97.0,
  'Ru': 101.07,
  'Rh': 102.91,
  'Pd': 106.42,
  'Ag': 107.87,
  'Cd': 112.41,
  'In': 114.82,
  'Sn': 118.71,
  'Sb': 121.76,
  'Te': 127.60,
  'I': 126.90,
  'Xe': 131.29,
  'Cs': 132.91,
  'Ba': 137.33,
  'La': 138.91,
  'Ce': 140.12,
  'Pr': 140.91,
  'Nd': 144.24,
  'Pm': 145.0,
  'Sm': 150.36,
  'Eu': 151.96,
  'Gd': 157.25,
  'Tb': 158.93,
  'Dy': 162.50,
  'Ho': 164.93,
  'Er': 167.26,
  'Tm': 168.93,
  'Yb': 173.05,
  'Lu': 174.97,
  'Hf': 178.49,
  'Ta': 180.95,
  'W': 183.84,
  'Re': 186.21,
  'Os': 190.23,
  'Ir': 192.22,
  'Pt': 195.08,
  'Au': 196.97,
  'Hg': 200.59,
  'Tl': 204.38,
  'Pb': 207.2,
  'Bi': 208.98,
  'Po': 209.0,
  'At': 210.0,
  'Rn': 222.0,
  'Fr': 223.0,
  'Ra': 226.0,
  'Ac': 227.0,
  'Th': 232.04,
  'Pa': 231.04,
  'U': 238.03,
  'Np': 237.0,
  'Pu': 244.0,
  'Am': 243.0,
  'Cm': 247.0,
  'Bk': 247.0,
  'Cf': 251.0,
  'Es': 252.0,
  'Fm': 257.0,
  'Md': 258.0,
  'No': 259.0,
  'Lr': 262.0,
  'Rf': 267.0,
  'Db': 268.0,
  'Sg': 271.0,
  'Bh': 272.0,
  'Hs': 270.0,
  'Mt': 276.0,
  'Ds': 281.0,
  'Rg': 280.0,
  'Cn': 285.0,
  'Nh': 284.0,
  'Fl': 289.0,
  'Mc': 288.0,
  'Lv': 293.0,
  'Ts': 294.0,
  'Og': 294.0
};
