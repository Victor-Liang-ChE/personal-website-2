"use client"

import Image from 'next/image';
import React from 'react';

// URLs
const githubLogoUrl = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
const linkedinLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png";
const ucsbLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/d/d4/UC_Santa_Barbara_logo.svg";
const pythonLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg";
const javascriptLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png";
const html5LogoUrl = "https://upload.wikimedia.org/wikipedia/commons/6/61/HTML5_logo_and_wordmark.svg";
const css3LogoUrl = "https://upload.wikimedia.org/wikipedia/commons/d/d5/CSS3_logo_and_wordmark.svg";
const dashLogoUrl = "https://dash.gallery/dash-cytoscape-phylogeny/assets/dash-logo.png";

export default function HomePage() {
  return (
    <div className="container">
      <div className="bio-container">
        <h1>Hi, I&apos;m Victor Liang</h1>
        <h2>Chemical Engineering Optimization & Predictive Modeling Specialist</h2>
        
        <div className="bio-section">
          <p className="bio-paragraph" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            Languages and Frameworks: 
            <span className="lang-icons">
              <Image 
                src={pythonLogoUrl} 
                alt="Python"
                width={25}
                height={25}
              />
              <Image 
                src={javascriptLogoUrl} 
                alt="JavaScript"
                width={25}
                height={25}
              />
              <Image 
                src={html5LogoUrl} 
                alt="HTML5"
                width={30}
                height={30}
              />
              <Image 
                src={css3LogoUrl} 
                alt="CSS3"
                width={35}
                height={35}
              />
              <Image 
                src={dashLogoUrl} 
                alt="Dash"
                width={70}
                height={20}
                className="dash-logo"
              />
            </span>
          </p>
          
          <p className="bio-paragraph">Python Packages: NumPy, SciPy, Pandas, Matplotlib, Scikit-learn, Plotly, RegEx, Control, and BeautifulSoup4. 📦</p>
          
          <p className="bio-paragraph" style={{ display: 'flex', alignItems: 'center' }}>
            Currently a senior at the University of California, Santa Barbara. 
            <Image 
              src={ucsbLogoUrl} 
              alt="UCSB Logo" 
              width={25}
              height={25}
              className="ucsb-logo"
            />
          </p>
          
          <p className="bio-paragraph">Will pursue a masters degree in materials science next year. 🎓</p>
          
          <p className="bio-paragraph">Want to contact me? victorliang@ucsb.edu 📧</p>
          
          <p className="bio-paragraph">Under heavy construction, but take a look around! 😄</p>
        </div>
        
        <div className="social-links">
          <a href="https://github.com/Victor-Liang-ChE" target="_blank" rel="noopener noreferrer">
            <Image 
              src={githubLogoUrl} 
              alt="GitHub" 
              width={30}
              height={30}
              style={{ margin: '0 10px' }}
            />
          </a>
          <a href="https://www.linkedin.com/in/victor-liang-567238231/" target="_blank" rel="noopener noreferrer">
            <Image 
              src={linkedinLogoUrl} 
              alt="LinkedIn" 
              width={30}
              height={30}
              style={{ margin: '0 10px' }}
            />
          </a>
        </div>
      </div>
      
      {/* Featured Simulations Section */}
      <div className="simulations-showcase">
        <h2 className="simulations-title">Featured Simulations</h2>
        <div className="simulations-grid">
          <a href="/simulations/kinetics" className="simulation-card">
            <div className="simulation-image">Kinetics Simulator</div>
            <div className="simulation-content">
              <h3 className="simulation-title">Kinetics Simulator</h3>
              <p className="simulation-description">
                Interactive simulator for chemical reaction kinetics. Model various reaction types and visualize concentration profiles over time with adjustable parameters.
              </p>
            </div>
          </a>
          
          <a href="/simulations/mccabe-thiele" className="simulation-card">
            <div className="simulation-image">McCabe-Thiele Method</div>
            <div className="simulation-content">
              <h3 className="simulation-title">McCabe-Thiele Method</h3>
              <p className="simulation-description">
                Select components (e.g., methanol and water), specify operating conditions, and visualize distillation processes. The tool identifies the most volatile component and generates accurate equilibrium diagrams.
              </p>
            </div>
          </a>
          
          <a href="/simulations/process-control" className="simulation-card">
            <div className="simulation-image">Process Control</div>
            <div className="simulation-content">
              <h3 className="simulation-title">Process Control</h3>
              <p className="simulation-description">
                Simulate process control systems with various inputs and disturbances. Understand system dynamics and control strategies in chemical processes.
              </p>
            </div>
          </a>
          
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
