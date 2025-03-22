import React from 'react';
import Link from "next/link";

export default function MiscPage() {
  const projects = [
    { name: "Drop Chance", path: "/misc/drop-chance" },
    { name: "Japanese Lyrics Analyzer", path: "/misc/japanese-lyrics" },
    { name: "Portola Menu", path: "/misc/portola-menu" },
    { name: "Chemical Engineering Economics", path: "/misc/chem-econ" },
    { name: "LaTeX Constructor & Converter", path: "/misc/latex" },
    { name: "Sandbox", path: "/misc/sandbox" },
    { name: "Chemistry Tools", path: "/misc/chemistry" },
    { name: "YouTube Downloader", path: "/misc/youtube" }
  ];

  return (
    <div className="container">
      <h1 className="page-title">Miscellaneous Projects</h1>
      
      <div className="misc-grid">
        {projects.map((project, index) => (
          <Link href={project.path} key={index} className="misc-card">
            {project.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
