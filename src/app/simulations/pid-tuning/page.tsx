"use client";
import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Select from 'react-select'; // Using react-select for better dropdowns

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// --- Model Definitions ---
interface TuningParams { K?: number; tau?: number; theta?: number; tau_c?: number; }
interface CalculatedParams { Kc: number | null; tauI: number | null; tauD: number | null; }
interface ModelInfo {
    expression: string;
    calculateParams: (params: TuningParams) => CalculatedParams;
    requiredParams: (keyof TuningParams)[];
}

const modelParameters: Record<string, ModelInfo> = {
    "IMC_PI": {
        expression: '$\\frac{Ke^{-\\theta s}}{\\tau s + 1}$',
        requiredParams: ['K', 'tau', 'theta', 'tau_c'],
        calculateParams: ({ K = 1, tau = 1, theta = 1, tau_c = 1 }) => {
            tau = Math.max(tau, 1e-9);
            theta = Math.max(theta, 1e-9);
            tau_c = Math.max(tau_c, 1e-9);
            K = Math.max(K, 1e-9);
            return {
                Kc: tau / (K * (tau_c + theta)),
                tauI: tau,
                tauD: null
            };
        }
    },
    "AMIGO_PI": {
        expression: '$\\frac{Ke^{-\\theta s}}{\\tau s + 1}$',
        requiredParams: ['K', 'tau', 'theta'],
        calculateParams: ({ K = 1, tau = 1, theta = 1 }) => {
            tau = Math.max(tau, 1e-9);
            theta = Math.max(theta, 1e-9);
            K = Math.max(K, 1e-9);
            const Kc = (0.15 / K) + (0.35 - theta * tau / (theta + tau)**2) * (tau / K / theta);
            const tauI = 0.35 * theta + (13 * theta * tau**2) / (tau**2 + 12 * theta * tau + 7 * theta**2 + 1e-9);
            return { Kc, tauI, tauD: null };
        }
    },
    "AMIGO_PID": {
        expression: '$\\frac{Ke^{-\\theta s}}{\\tau s + 1}$',
        requiredParams: ['K', 'tau', 'theta'],
        calculateParams: ({ K = 1, tau = 1, theta = 1 }) => {
            tau = Math.max(tau, 1e-9);
            theta = Math.max(theta, 1e-9);
            K = Math.max(K, 1e-9);
            const Kc = (1 / K) * (0.2 + 0.45 * tau / theta);
            const tauI = (0.4 * theta + 0.8 * tau) * theta / (theta + 0.1 * tau + 1e-9);
            const tauD = 0.5 * theta * tau / (0.3 * theta + tau + 1e-9);
            return { Kc, tauI, tauD };
        }
    },
    "ITAE_PI": { // Assuming Disturbance Rejection for ITAE PI
        expression: '$\\frac{Ke^{-\\theta s}}{\\tau s + 1}$',
        requiredParams: ['K', 'tau', 'theta'],
        calculateParams: ({ K = 1, tau = 1, theta = 1 }) => {
            tau = Math.max(tau, 1e-9);
            theta = Math.max(theta, 1e-9);
            K = Math.max(K, 1e-9);
            const theta_tau = theta / tau;
            const Kc = (0.859 * Math.pow(theta_tau, -0.977)) / K;
            const tauI = tau / (0.674 * Math.pow(theta_tau, -0.680));
            return { Kc, tauI, tauD: null };
        }
    },
    "ITAE_PID": { // Assuming Disturbance Rejection for ITAE PID
        expression: '$\\frac{Ke^{-\\theta s}}{\\tau s + 1}$',
        requiredParams: ['K', 'tau', 'theta'],
        calculateParams: ({ K = 1, tau = 1, theta = 1 }) => {
            tau = Math.max(tau, 1e-9);
            theta = Math.max(theta, 1e-9);
            K = Math.max(K, 1e-9);
            const theta_tau = theta / tau;
            const Kc = (1.357 * Math.pow(theta_tau, -0.947)) / K;
            const tauI = tau / (0.842 * Math.pow(theta_tau, -0.738));
            const tauD = tau * (0.381 * Math.pow(theta_tau, 0.995));
            return { Kc, tauI, tauD };
        }
    }
};

// --- FOPTD Step Response Calculation ---
const calculateFOPTDStepResponse = (
    K: number, tau: number, theta: number, M: number, t_max: number = 30, num_points: number = 200
): { t: number[], y: number[] } => {
    const t = Array.from({ length: num_points }, (_, i) => i * t_max / (num_points - 1));
    tau = Math.max(tau, 1e-9); // Avoid division by zero

    const y = t.map(ti => {
        if (ti < theta) {
            return 0;
        } else {
            return K * M * (1 - Math.exp(-(ti - theta) / tau));
        }
    });
    return { t, y };
};

// --- Dropdown Options ---
const methodOptions = [
    { value: 'IMC', label: 'IMC' },
    { value: 'AMIGO', label: 'AMIGO' },
    { value: 'ITAE', label: 'ITAE (Disturbance)' }
];

const modelOptionsMap: Record<string, { value: string; label: string }[]> = {
    IMC: [{ value: 'PI', label: 'PI Controller' }],
    AMIGO: [{ value: 'PI', label: 'PI Controller' }, { value: 'PID', label: 'PID Controller' }],
    ITAE: [{ value: 'PI', label: 'PI Controller' }, { value: 'PID', label: 'PID Controller' }],
};

// --- React Select Styles --- (Optional: Customize appearance)
const selectStyles = {
    control: (provided: any) => ({
        ...provided,
        backgroundColor: 'var(--simulation-card-bg)',
        borderColor: 'var(--accent-color)',
        color: 'var(--text-color)',
        marginBottom: '1rem',
        minWidth: '250px',
    }),
    menu: (provided: any) => ({
        ...provided,
        backgroundColor: 'var(--card-bg)',
    }),
    option: (provided: any, state: { isSelected: boolean; isFocused: boolean }) => ({
        ...provided,
        backgroundColor: state.isSelected ? 'var(--accent-color)' : state.isFocused ? 'var(--medium-blue)' : 'var(--card-bg)',
        color: 'var(--text-color)',
        ':active': {
            backgroundColor: 'var(--accent-color)',
        },
    }),
    singleValue: (provided: any) => ({
        ...provided,
        color: 'var(--text-color)',
    }),
    input: (provided: any) => ({
        ...provided,
        color: 'var(--text-color)',
    }),
    placeholder: (provided: any) => ({
        ...provided,
        color: 'rgba(255, 255, 255, 0.7)', // Adjust placeholder color if needed
    }),
};


export default function PIDTuningPage() {
    const [selectedMethod, setSelectedMethod] = useState<{ value: string; label: string } | null>(null);
    const [selectedModelType, setSelectedModelType] = useState<{ value: string; label: string } | null>(null);
    const [sliderValues, setSliderValues] = useState<TuningParams>({ K: 1, tau: 1, theta: 1, tau_c: 1 });
    const [calculatedParams, setCalculatedParams] = useState<CalculatedParams>({ Kc: null, tauI: null, tauD: null });
    const [plotData, setPlotData] = useState<any>(null);
    const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

    // Set the page title
    useEffect(() => {
        const title = document.querySelector('.page-title');
        if (title) title.textContent = 'PID Tuning Rules';
        const navbar = document.querySelector('.navbar-wrapper');
        if (navbar) navbar.classList.add('with-title');
    }, []);

    // Update Model Info and Reset Model Type when Method changes
    useEffect(() => {
        setSelectedModelType(null); // Reset model selection
        setCalculatedParams({ Kc: null, tauI: null, tauD: null }); // Reset params
        setPlotData(null); // Clear plot
        setModelInfo(null); // Clear model info
    }, [selectedMethod]);

    // Update Calculations and Plot when selections or sliders change
    useEffect(() => {
        if (selectedMethod && selectedModelType) {
            const modelKey = `${selectedMethod.value}_${selectedModelType.value}`;
            const currentModelInfo = modelParameters[modelKey];
            setModelInfo(currentModelInfo);

            if (currentModelInfo) {
                const params = currentModelInfo.calculateParams(sliderValues);
                setCalculatedParams(params);

                // Calculate and plot FOPTD response
                const { t, y } = calculateFOPTDStepResponse(
                    sliderValues.K ?? 1,
                    sliderValues.tau ?? 1,
                    sliderValues.theta ?? 1,
                    1 // Assuming step magnitude M=1 for open-loop visualization
                );

                const traces = [{ x: t, y: y, mode: 'lines', name: 'FOPTD Response', line: { color: 'yellow' } }];
                const layout = {
                    title: { text: 'Open-Loop FOPTD Step Response', x: 0.5, font: { size: 20, family: 'Merriweather Sans', color: 'white' } },
                    xaxis: { title: 'Time', titlefont: { size: 18, family: 'Merriweather Sans', color: 'white' }, tickfont: { size: 14, color: 'white' }, showgrid: true, zeroline: true, linecolor: 'white', tickcolor: 'white', zerolinecolor: 'white' },
                    yaxis: { title: 'Output', titlefont: { size: 18, family: 'Merriweather Sans', color: 'white' }, tickfont: { size: 14, color: 'white' }, showgrid: true, zeroline: true, linecolor: 'white', tickcolor: 'white', zerolinecolor: 'white' },
                    legend: { font: { color: 'white' }, bgcolor: 'rgba(0,0,0,0.2)' },
                    template: 'plotly_dark',
                    plot_bgcolor: '#08306b',
                    paper_bgcolor: '#08306b',
                    autosize: true,
                    margin: { l: 60, r: 20, t: 60, b: 60 }
                };
                setPlotData({ data: traces, layout });

            } else {
                setCalculatedParams({ Kc: null, tauI: null, tauD: null });
                setPlotData(null);
            }
        } else {
            setModelInfo(null);
            setCalculatedParams({ Kc: null, tauI: null, tauD: null });
            setPlotData(null);
        }
    }, [selectedMethod, selectedModelType, sliderValues]);

    const handleSliderChange = (param: keyof TuningParams, value: number) => {
        setSliderValues(prev => ({ ...prev, [param]: value }));
    };

    const formatSliderValue = (value: number | null | undefined, decimals: number = 1): string => {
        return typeof value === 'number' ? value.toFixed(decimals) : '';
    };

    const formatCalcValue = (value: number | null, decimals: number = 2): string => {
        return value !== null ? value.toFixed(decimals) : 'N/A';
    };

    const currentModelOptions = selectedMethod ? modelOptionsMap[selectedMethod.value] : [];

    // Dynamically render sliders based on requiredParams
    const renderSliders = () => {
        if (!modelInfo) return null;
        return modelInfo.requiredParams.map(param => (
            <div key={param} className="slider-group">
                <label className="flex justify-between">
                    <span>{param === 'tau_c' ? 'τc' : param}:</span>
                    <span>{formatSliderValue(sliderValues[param])}</span>
                </label>
                <input
                    type="range"
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={sliderValues[param] ?? 1}
                    onChange={(e) => handleSliderChange(param, parseFloat(e.target.value))}
                    className="kinetics-slider" // Reuse slider style
                />
            </div>
        ));
    };

    return (
        <div className="container p-4">
            <div className="simulation-layout" style={{ alignItems: 'flex-start' }}>
                {/* Left Controls */}
                <div className="simulation-controls">
                    <div className="control-group">
                        <h3 className="text-xl mb-4">Tuning Method</h3>
                        <Select
                            options={methodOptions}
                            value={selectedMethod}
                            onChange={setSelectedMethod}
                            placeholder="Select Tuning Method..."
                            styles={selectStyles}
                            isClearable={false}
                        />
                        {selectedMethod && (
                            <>
                                <h3 className="text-xl mb-4 mt-4">Controller Type</h3>
                                <Select
                                    options={currentModelOptions}
                                    value={selectedModelType}
                                    onChange={setSelectedModelType}
                                    placeholder="Select Controller..."
                                    styles={selectStyles}
                                    isClearable={false}
                                    isDisabled={!selectedMethod}
                                />
                            </>
                        )}
                    </div>

                    {modelInfo && (
                        <div className="control-group">
                            <h3 className="text-xl mb-4">Model Parameters</h3>
                            {renderSliders()}
                        </div>
                    )}
                </div>

                {/* Right Display */}
                <div className="simulation-display flex-grow flex flex-col items-center">
                    {modelInfo && (
                         <div className="control-group w-full max-w-[700px] mb-4 text-center">
                            <h3 className="text-xl mb-2">Model</h3>
                            {/* Use a component or library that supports MathJax/KaTeX if needed */}
                            <p className="text-lg">{modelInfo.expression.replace(/\$/g, '')}</p> {/* Basic display */}
                         </div>
                    )}
                    {plotData ? (
                        <div className="simulation-graph w-full" style={{ minHeight: '500px' }}>
                            <Plot
                                data={plotData.data}
                                layout={plotData.layout}
                                useResizeHandler={true}
                                style={{ width: '100%', height: '100%' }}
                                config={{ responsive: true }}
                            />
                        </div>
                    ) : (
                         selectedMethod && selectedModelType && <div className="empty-plot" style={{width: '100%', maxWidth: '700px'}}>Calculating...</div>
                    )}
                    {calculatedParams.Kc !== null && (
                        <div className="control-group mt-4 w-full max-w-[700px]">
                            <h3 className="text-xl mb-2 text-center">Calculated Tuning Parameters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <div className="result-item p-2">
                                    <span className="result-label block">Kc:</span>
                                    <span className="result-value">{formatCalcValue(calculatedParams.Kc)}</span>
                                </div>
                                <div className="result-item p-2">
                                    <span className="result-label block">τI:</span>
                                    <span className="result-value">{formatCalcValue(calculatedParams.tauI)}</span>
                                </div>
                                {selectedModelType?.value === 'PID' && (
                                    <div className="result-item p-2">
                                        <span className="result-label block">τD:</span>
                                        <span className="result-value">{formatCalcValue(calculatedParams.tauD)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Add necessary styles */}
            <style jsx>{`
                .simulation-layout { display: flex; flex-direction: row; gap: 2rem; margin-top: 1rem; }
                .simulation-controls { flex: 0 0 350px; min-width: 320px; }
                .simulation-display { flex: 1; min-width: 400px; display: flex; flex-direction: column; align-items: center; }
                .simulation-graph { width: 100%; max-width: 700px; aspect-ratio: 1 / 1; margin-bottom: 1rem; }
                .control-group { margin-bottom: 1.5rem; padding: 1.5rem; background-color: var(--simulation-card-bg); border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .slider-group { margin-bottom: 1rem; width: 100%; }
                .slider-group label { display: flex; justify-content: space-between; width: 100%; margin-bottom: 0.5rem; }
                input[type="range"].kinetics-slider { width: 100%; cursor: pointer; }
                .result-item { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
                .result-label { font-size: 0.9rem; }
                .result-value { font-weight: bold; font-size: 1.1rem; }
                .empty-plot { height: 500px; display: flex; align-items: center; justify-content: center; background-color: #08306b; color: white; border-radius: 8px; padding: 2rem; text-align: center; }

                @media (max-width: 1024px) {
                  .simulation-layout { flex-direction: column; }
                  .simulation-controls { max-width: 100%; flex-basis: auto; }
                  .simulation-graph { max-width: 100%; aspect-ratio: unset; min-height: 400px; }
                }
            `}</style>
        </div>
    );
}
