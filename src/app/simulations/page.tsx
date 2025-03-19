import React from 'react';
import Link from 'next/link';

export default function SimulationsPage() {
  return (
    <div className="container">
      <div className="content-container">
        <h1 className="page-title">Chemical Engineering Simulations</h1>
        
        <div className="simulations-grid">
          {/* TxyPxy Diagrams Card */}
          <a href="/simulations/txy-pxy" className="simulation-card">
            <div className="simulation-image">TxyPxy Diagrams</div>
            <div className="simulation-content">
              <h3 className="simulation-title">TxyPxy Diagrams</h3>
              <p className="simulation-description">
                Visualize temperature-composition (Txy) and pressure-composition (Pxy) phase diagrams for binary mixtures with adjustable parameters.
              </p>
            </div>
          </a>
          
          {/* McCabe-Thiele Method Card */}
          <a href="/simulations/mccabe-thiele" className="simulation-card">
            <div className="simulation-image">McCabe-Thiele Method</div>
            <div className="simulation-content">
              <h3 className="simulation-title">McCabe-Thiele Method</h3>
              <p className="simulation-description">
                Interactive tool for analyzing distillation processes using the McCabe-Thiele method. Calculate theoretical stages needed for separation.
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
