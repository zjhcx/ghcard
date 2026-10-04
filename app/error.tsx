'use client';
export default function ErrorPage({ reset }: {
    reset: () => void;
}) { return <main className="message-page"><h1>卡片加载失败</h1><p>请重试，或返回首页输入其他 GitHub 链接。</p><button className="btn" onClick={reset}>重新加载</button><a className="btn" href="/">返回首页</a></main>; }
