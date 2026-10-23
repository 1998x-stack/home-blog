import type { Project } from "@/data/projects";
export function ProjectCard({project, index}: {project: Project; index: number}) {
  return <article className="project-card"><div className="project-top"><span className="eyebrow">{project.category}</span><span className="project-num">{String(index).padStart(2,"0")}</span></div>
    <h3><a href={project.href} target="_blank" rel="noopener noreferrer">{project.name} ↗</a></h3>
    <p>{project.description}</p>
    <div className="project-tech">{project.technologies.map((tech) => <span key={tech}>{tech}</span>)}</div>
  </article>;
}
