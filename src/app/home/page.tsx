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

// Inline styles
const styles = {
  container: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem',
  },
  contentContainer: {
    marginBottom: '2rem',
    width: '100%',
  },
  heroSection: {
    marginBottom: '1rem',
    width: '100%',
  },
  introText: {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
    textAlign: 'left' as const,
  },
  heroSubtitle: {
    fontSize: '1.5rem',
    color: 'var(--text-secondary)',
    fontWeight: 400,
    marginBottom: '0.5rem',
    marginTop: 0,
    textAlign: 'left' as const,
  },
  bioSection: {
    fontSize: '1.1rem',
    lineHeight: 1.6,
    width: '100%',
  },
  bioParagraph: {
    marginBottom: '0.5rem',
  },
  langIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginLeft: '10px',
  },
  socialLinks: {
    display: 'flex' as const,
    justifyContent: 'center' as const,
    gap: '1rem',
    marginTop: '1rem',
  },
  simulationsShowcase: {
    marginTop: '2rem',
    width: '100%',
  },
  simulationsHeader: {
    fontSize: '1.8rem',
    fontWeight: 600,
    marginBottom: '1rem',
    textAlign: 'center' as 'center', // Type assertion to fix TypeScript error
  },
  simulationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginTop: '1rem',
  },
  simulationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    textDecoration: 'none',
    color: 'inherit',
  },
  simulationImage: {
    height: '150px',
    backgroundColor: '#4DA6FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    color: 'white',
  },
  simulationContent: {
    padding: '1.25rem',
  },
  simulationTitle: {
    marginTop: 0,
    marginBottom: '0.75rem',
  },
  simulationDescription: {
    fontSize: '0.9rem',
    opacity: 0.8,
    margin: 0,
  },
  dashLogo: {
    filter: 'brightness(0) invert(1)',
  },
  ucsbLogo: {
    filter: 'var(--logo-filter, brightness(0) invert(1))',
    marginLeft: '5px'
  }
};

export default function HomePage() {
  return (
    <div style={styles.container}>
      <div style={styles.contentContainer}>
        <div style={styles.heroSection}>
          <h1 style={styles.introText}>Hi, I&apos;m Victor</h1>
          <h2 style={styles.heroSubtitle}>Chemical Engineering and Materials Science Simulation Engineer</h2>
        </div>
        
        <div style={styles.bioSection}>
          <p style={{ ...styles.bioParagraph, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            Languages and Frameworks: 
            <span style={styles.langIcons}>
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
                  width={40}
                  height={40}
                  style={styles.dashLogo}
              />
            </span>
          </p>
          
          <p style={styles.bioParagraph}>Python Packages: NumPy, SciPy, Pandas, Matplotlib, Scikit-learn, Plotly, RegEx, Control, and BeautifulSoup4. 📦</p>
          
          <p style={{ ...styles.bioParagraph, display: 'flex', alignItems: 'center' }}>
            Currently a senior at the University of California, Santa Barbara. 
            <Image 
                src={ucsbLogoUrl} 
                alt="UCSB Logo" 
                width={25}
                height={25}
                style={styles.ucsbLogo}
            />
          </p>
          
          <p style={styles.bioParagraph}>Will pursue a masters degree in materials science next year. 🎓</p>
          
          <p style={styles.bioParagraph}>Want to contact me? victorliang@ucsb.edu 📧</p>
          
          <p style={styles.bioParagraph}>Under heavy construction, but take a look around! 😄</p>
        </div>
        
        <div style={styles.socialLinks}>
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
      <div style={styles.simulationsShowcase}>
        <h2 style={styles.simulationsHeader}>Featured Simulations</h2>
        <div style={styles.simulationsGrid}>
          <a href="/simulations/kinetics" style={styles.simulationCard}>
            <div style={styles.simulationImage}>Kinetics Simulator</div>
            <div style={styles.simulationContent}>
              <h3 style={styles.simulationTitle}>Kinetics Simulator</h3>
              <p style={styles.simulationDescription}>
                Interactive simulator for chemical reaction kinetics. Model various reaction types and visualize concentration profiles over time with adjustable parameters.
              </p>
            </div>
          </a>
          
          <a href="/simulations/mccabe-thiele" style={styles.simulationCard}>
            <div style={styles.simulationImage}>McCabe-Thiele Method</div>
            <div style={styles.simulationContent}>
              <h3 style={styles.simulationTitle}>McCabe-Thiele Method</h3>
              <p style={styles.simulationDescription}>
                Select components (e.g., methanol and water), specify operating conditions, and visualize distillation processes. The tool identifies the most volatile component and generates accurate equilibrium diagrams.
              </p>
            </div>
          </a>
          
          <a href="/simulations/process-control" style={styles.simulationCard}>
            <div style={styles.simulationImage}>Process Control</div>
            <div style={styles.simulationContent}>
              <h3 style={styles.simulationTitle}>Process Control</h3>
              <p style={styles.simulationDescription}>
                Simulate process control systems with various inputs and disturbances. Understand system dynamics and control strategies in chemical processes.
              </p>
            </div>
          </a>
          
          <a href="/simulations/pid-tuning" style={styles.simulationCard}>
            <div style={styles.simulationImage}>PID Tuning</div>
            <div style={styles.simulationContent}>
              <h3 style={styles.simulationTitle}>PID Tuning</h3>
              <p style={styles.simulationDescription}>
                Interactive PID controller tuning simulation. Adjust proportional, integral, and derivative parameters and observe system response in real-time.
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
