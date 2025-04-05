import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import the Next.js Image component

export default function SimulationsPage() {
  const simulations = [
    {
      title: "McCabe-Thiele Method",
      description: "Select components (e.g., methanol and water), specify operating conditions, and visualize distillation processes. The tool identifies the most volatile component and generates accurate equilibrium diagrams.",
      link: "/simulations/mccabe-thiele",
      imageSrc: "/images/simulations/mccabe_thumbnail.png" // Path to your image in the public folder
    },
    {
      title: "Reaction Kinetics Simulator",
      description: "Model elementary reaction steps, input initial concentrations and rate constants, and visualize concentration profiles over time using an adaptive ODE solver.",
      link: "/simulations/kinetics",
      imageSrc: "/images/simulations/kinetics_thumbnail.png" // Placeholder - replace if you have an image
    },
     {
      title: "Process Control Simulator",
      description: "Explore the dynamic response (step or ramp) of first and second-order systems by adjusting gain, time constant, and damping ratio.",
      link: "/simulations/process-control",
      imageSrc: "/images/simulations/process_control_thumbnail.png" // Placeholder
    },
    {
      title: "PID Tuning Rules",
      description: "Calculate PID controller parameters (Kc, τI, τD) using various tuning rules (IMC, AMIGO, ITAE) based on First-Order Plus Dead Time (FOPTD) model parameters.",
      link: "/simulations/pid-tuning",
      imageSrc: "/images/simulations/pid_thumbnail.png" // Placeholder
    },
    // Add other simulations here
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="simulations-grid">
        {simulations.map((sim, index) => (
          <Link href={sim.link} key={index} className="simulation-card block">
            <div className="simulation-image"> 
              <Image
                src={sim.imageSrc}
                alt={`${sim.title} Simulation Thumbnail`}
                width={400} // Provide a base width (will be constrained by container)
                height={180} // Provide the explicit height matching the container
                className="w-full h-full object-cover" // Use Tailwind classes for sizing and object-fit
                unoptimized={true} 
              />
            </div>
            <div className="simulation-content">
              <h2 className="simulation-title">{sim.title}</h2>
              <p className="simulation-description">{sim.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
