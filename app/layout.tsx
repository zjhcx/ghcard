import type { Metadata } from 'next';
import Link from 'next/link';
import { Github } from '@/components/github-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import './globals.css';
export const metadata: Metadata = { title: 'GitHub Cards', description: '将 GitHub 用户、组织、仓库、Release、Commit、PR 和 Issue 链接转换为简洁卡片。' };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return <html lang="zh-CN" suppressHydrationWarning><body><header className="topbar"><Link className="brand" href="/"><Github size={22}/><span>GitHub Cards</span></Link><ThemeToggle /></header>{children}<footer className="site-footer">Made for your GitHub links.</footer></body></html>;
}
