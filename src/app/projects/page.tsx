import type {Metadata} from "next";
import {ProjectCard} from "@/components/project-card";
import {projects} from "@/data/projects";
import {canonical} from "@/config/site";
export const metadata:Metadata={title:"开源项目",description:"工具、系统与实验项目的公开索引。",alternates:{canonical:canonical("/projects/")}};
export default function ProjectsPage(){return <section className="container page-section"><div className="page-intro"><span className="eyebrow">SELECTED WORK / OPEN SOURCE</span><h1>做过的项目<span className="title-period">.</span></h1><p>从问题定义到可运行的系统，持续记录实现与改进。</p></div><div className="project-grid">{projects.map((project,index)=><ProjectCard key={project.name} project={project} index={index+1}/>)}</div></section>}
