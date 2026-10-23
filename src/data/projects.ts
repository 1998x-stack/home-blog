export type Project = {
  name: string;
  category: string;
  description: string;
  href: string;
  technologies: string[];
  status: "active" | "exploring";
};

// Edit this list to curate the public project showcase.
export const projects: Project[] = [
  {
    name: "Home Blog",
    category: "WEB / OPEN SOURCE",
    description: "Git 驱动、静态导出的 Next.js 技术博客，面向家庭服务器部署。",
    href: "https://github.com/1998x-stack/home-blog",
    technologies: ["Next.js", "TypeScript", "Docker"],
    status: "active",
  },
  {
    name: "Nebula Notebook",
    category: "DEVELOPER TOOLS",
    description: "Web Notebook 实验项目：交互式计算体验与执行环境的工程设计。",
    href: "https://github.com/1998x-stack/Nebula-Notebook",
    technologies: ["Notebook", "Web", "Python"],
    status: "exploring",
  },
  {
    name: "Distributed Web Search",
    category: "DISTRIBUTED SYSTEMS",
    description: "分布式抓取、索引与检索的系统实验和部署方案。",
    href: "https://github.com/1998x-stack/distributed-web-search",
    technologies: ["Search", "Docker", "Distributed"],
    status: "exploring",
  },
];
