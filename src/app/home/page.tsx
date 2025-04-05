"use client"

import Image from 'next/image';
import React from 'react';
import Link from 'next/link'; // Import Link

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
          
          {/* McCabe-Thiele Card */}
          <Link href="/simulations/mccabe-thiele" className="simulation-card block">
            <div className="simulation-image">
              <Image
                src="/images/simulations/mccabe_thumbnail.png" // Path from simulations page
                alt="McCabe-Thiele Method Thumbnail"
                width={400} 
                height={180} 
                className="w-full h-full object-cover" 
                unoptimized={true} 
              />
            </div>
            <div className="simulation-content">
              <h3 className="simulation-title">McCabe-Thiele Method</h3>
              <p className="simulation-description">
                Select components (e.g., methanol and water), specify operating conditions, and visualize distillation processes. The tool identifies the most volatile component and generates accurate equilibrium diagrams.
              </p>
            </div>
          </Link>

          {/* Kinetics Simulator Card */}
          <Link href="/simulations/kinetics" className="simulation-card block">
            <div className="simulation-image">
              <Image
                src="/images/simulations/kinetics_thumbnail.png" // Updated path
                alt="Kinetics Simulator Thumbnail"
                width={400} 
                height={180} 
                className="w-full h-full object-cover" 
                unoptimized={true} 
              />
            </div>
            <div className="simulation-content">
              <h3 className="simulation-title">Kinetics Simulator</h3>
              <p className="simulation-description">
                Model elementary reaction steps, input initial concentrations and rate constants, and visualize concentration profiles over time using an adaptive ODE solver.
              </p>
            </div>
          </Link>
          
          {/* Process Control Card */}
          <Link href="/simulations/process-control" className="simulation-card block">
            <div className="simulation-image">
               <Image
                src="/images/simulations/process_control_thumbnail.png" // Placeholder path
                alt="Process Control Thumbnail"
                width={400} 
                height={180} 
                className="w-full h-full object-cover" 
                unoptimized={true} 
              />
            </div>
            <div className="simulation-content">
              <h3 className="simulation-title">Process Control</h3>
              <p className="simulation-description">
                Explore the dynamic response (step or ramp) of first and second-order systems by adjusting gain, time constant, and damping ratio.
              </p>
            </div>
          </Link>
          
          {/* PID Tuning Card */}
          <Link href="/simulations/pid-tuning" className="simulation-card block">
            <div className="simulation-image">
               <Image
                src="/images/simulations/pid_thumbnail.png" // Placeholder path
                alt="PID Tuning Thumbnail"
                width={400} 
                height={180} 
                className="w-full h-full object-cover" 
                unoptimized={true} 
              />
            </div>
            <div className="simulation-content">
              <h3 className="simulation-title">PID Tuning</h3>
              <p className="simulation-description">
                Calculate PID controller parameters (Kc, τI, τD) using various tuning rules (IMC, AMIGO, ITAE) based on First-Order Plus Dead Time (FOPTD) model parameters.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
