'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle() {
    const [dark, setDark] = useState(false);
    useEffect(() => { const saved = localStorage.getItem('theme'); const value = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; setDark(value); document.documentElement.dataset.theme = value ? 'dark' : 'light'; }, []);
    return <button className="theme-btn row" aria-label={dark ? '切换浅色主题' : '切换深色主题'} onClick={() => { const value = !dark; setDark(value); document.documentElement.dataset.theme = value ? 'dark' : 'light'; localStorage.setItem('theme', value ? 'dark' : 'light'); }}>{dark ? <Sun size={16}/> : <Moon size={16}/>}</button>;
}
