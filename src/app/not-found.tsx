import Link from "next/link";
export default function NotFound(){return <section className="container not-found"><span className="eyebrow">ERROR / 404</span><h1>这里暂时没有内容。</h1><p>链接可能已经变更，或者文章尚未发布。</p><Link className="button-primary" href="/">返回首页 →</Link></section>}
