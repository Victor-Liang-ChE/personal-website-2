import React from 'react';

export default function SimulationsPage() {
  return (
    <div className="container">
      <div className="content-container">
        <div className="simulations-grid">
          {/* Kinetics Simulator Card */}
          <a href="/simulations/kinetics" className="simulation-card">
            <div className="simulation-image">Kinetics Simulator</div>
            <div className="simulation-content">
              <h3 className="simulation-title">Kinetics Simulator</h3>
              <p className="simulation-description">
                Interactive simulator for chemical reaction kinetics. Model various reaction types and visualize concentration profiles over time with adjustable parameters.
              </p>
            </div>
          </a>
          
          {/* McCabe-Thiele Method Card */}
          <a href="/simulations/mccabe-thiele" className="simulation-card">
            <div className="simulation-image">McCabe-Thiele Method</div>
            <div className="simulation-content">
              <h3 className="simulation-title">McCabe-Thiele Method</h3>
              <p className="simulation-description">
                Select components (e.g., methanol and water), specify operating conditions, and visualize distillation processes. The tool identifies the most volatile component and generates accurate equilibrium diagrams.
              </p>
            </div>
          </a>
          
          {/* Process Control Card - Updated */}
          <a href="/simulations/process-control" className="simulation-card">
            <div className="simulation-image">Process Control</div>
            <div className="simulation-content">
              <h3 className="simulation-title">Process Control</h3>
              <p className="simulation-description">
                Simulate process control systems with various inputs and disturbances. Understand system dynamics and control strategies in chemical processes.
              </p>
            </div>
          </a>
          
          {/* PID Tuning Card - Updated */}
          <a href="/simulations/pid-tuning" className="simulation-card">
            <div className="simulation-image">PID Tuning</div>
            <div className="simulation-content">
              <h3 className="simulation-title">PID Tuning</h3>
              <p className="simulation-description">
                Interactive PID controller tuning simulation. Adjust proportional, integral, and derivative parameters and observe system response in real-time.
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
