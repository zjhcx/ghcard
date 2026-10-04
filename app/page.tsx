import { Github } from '@/components/github-icon';
import { Search } from '@/components/search';
export default function Home() { return <main className="home"><div className="home-mark"><Github size={32}/></div><h1>一个链接，一张卡片。</h1><p className="home-subtitle">把 GitHub 上的精彩，变成一张简洁的卡片。</p><Search /><p className="supported">User <span>·</span> Organization <span>·</span> Repository <span>·</span> Release <span>·</span> Commit <span>·</span> Pull Request <span>·</span> Issue</p></main>; }
