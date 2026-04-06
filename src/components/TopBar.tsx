import { FileText, Settings } from 'lucide-react';

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#0e0e0e] shadow-none flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-[#00E676]" />
        <h1 className="font-lexend text-2xl font-bold tracking-tight text-[#00E676] uppercase">
          {title}
        </h1>
      </div>
      <button className="hover:bg-[#131313] transition-colors p-2 rounded-full active:scale-95 duration-100">
        <Settings className="w-6 h-6 text-gray-400" />
      </button>
    </header>
  );
}
