import Link from 'next/link';
export default function NotFound() { return <main className="message-page"><h1>找不到这张卡片</h1><p>请检查链接、卡片路由或 GitHub 内容的访问权限。</p><Link className="btn" href="/">返回首页</Link></main>; }
